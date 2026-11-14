using System.Security.Claims;
using Backend.BDFolder;
using Microsoft.EntityFrameworkCore;

namespace Backend.Helpers;

public enum AlcanceVistaEnvios
{
    Ninguno = 0,
    ClientePropio = 1,
    OperadorRuta = 2,
    Sucursal = 3,
    Global = 4
}

public sealed class ContextoSeguridadUsuario
{
    public long? UsuarioId { get; init; }
    public long? EmpleadoId { get; init; }
    public long? ClienteId { get; init; }
    public long? SucursalId { get; init; }
    public string? Email { get; init; }
    public string? TipoUsuario { get; init; }
    public HashSet<string> Roles { get; init; } = new(StringComparer.OrdinalIgnoreCase);
    public HashSet<string> Permisos { get; init; } = new(StringComparer.OrdinalIgnoreCase);

    public bool EsCliente =>
        string.Equals(TipoUsuario, "Cliente", StringComparison.OrdinalIgnoreCase) ||
        (Roles.Contains("Cliente") && !TieneRolEmpleadoInterno());

    public bool EsEmpleado =>
        string.Equals(TipoUsuario, "Empleado", StringComparison.OrdinalIgnoreCase) ||
        TieneRolEmpleadoInterno();

    public bool TieneRol(params string[] roles) =>
        roles.Any(r => Roles.Contains(r));

    public bool TienePermiso(string codigoPermiso) =>
        Permisos.Contains(codigoPermiso);

    public bool TienePermisoORolRespaldo(string codigoPermiso, params string[] rolesRespaldo)
    {
        if (Permisos.Contains(codigoPermiso))
            return true;

        if (Permisos.Count == 0 && rolesRespaldo.Length > 0)
            return TieneRol(rolesRespaldo);

        return false;
    }

    public AlcanceVistaEnvios DeterminarAlcanceEnvios()
    {
        if (EsCliente)
            return AlcanceVistaEnvios.ClientePropio;

        if (TieneRol("Jefe"))
            return AlcanceVistaEnvios.Global;

        if (TieneRol("Personal administrativo", "Personal de sucursal", "Supervisor", "Jefe de flotilla"))
            return AlcanceVistaEnvios.Sucursal;

        if (TieneRol("Chofer"))
            return AlcanceVistaEnvios.OperadorRuta;

        if (Permisos.Any(p =>
                p.StartsWith("envio.", StringComparison.OrdinalIgnoreCase) ||
                p.Equals("ruta.planificar", StringComparison.OrdinalIgnoreCase) ||
                p.Equals("ruta.asignar_recursos", StringComparison.OrdinalIgnoreCase)))
        {
            return SucursalId.HasValue ? AlcanceVistaEnvios.Sucursal : AlcanceVistaEnvios.Global;
        }

        return AlcanceVistaEnvios.Ninguno;
    }

    private bool TieneRolEmpleadoInterno() =>
        TieneRol(
            "RH",
            "Supervisor",
            "Jefe de flotilla",
            "Chofer",
            "Personal administrativo",
            "Personal de sucursal",
            "Jefe");
}

public static class ClaimsUsuarioHelper
{
    public static ContextoSeguridadUsuario Extraer(ClaimsPrincipal? principal)
    {
        if (principal?.Identity?.IsAuthenticated != true)
        {
            return new ContextoSeguridadUsuario();
        }

        var roles = principal.Claims
            .Where(c => c.Type == ClaimTypes.Role || string.Equals(c.Type, "rol", StringComparison.OrdinalIgnoreCase))
            .Select(c => c.Value.Trim())
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var permisos = principal.Claims
            .Where(c => string.Equals(c.Type, "permiso", StringComparison.OrdinalIgnoreCase))
            .Select(c => c.Value.Trim())
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return new ContextoSeguridadUsuario
        {
            UsuarioId = ParseLongClaim(principal, "usuario_id") ?? ParseLongClaim(principal, ClaimTypes.NameIdentifier),
            EmpleadoId = ParseLongClaim(principal, "empleado_id"),
            ClienteId = ParseLongClaim(principal, "cliente_id"),
            SucursalId = ParseLongClaim(principal, "sucursal_id"),
            Email = principal.FindFirstValue(ClaimTypes.Email) ?? principal.FindFirstValue("email"),
            TipoUsuario = principal.FindFirstValue("tipo_usuario"),
            Roles = roles,
            Permisos = permisos
        };
    }

    private static long? ParseLongClaim(ClaimsPrincipal principal, string claimType)
    {
        var raw = principal.FindFirstValue(claimType);
        return long.TryParse(raw, out var val) ? val : null;
    }

    // Enriquecimiento desde base de datos

    public static async Task<ContextoSeguridadUsuario> EnriquecerContextoAsync(
        TransportesRojasDbContext ctx,
        ContextoSeguridadUsuario baseCtx,
        CancellationToken ct = default)
    {
        var empleadoId = baseCtx.EmpleadoId;
        var clienteId = baseCtx.ClienteId;
        var sucursalId = baseCtx.SucursalId;
        var tipoUsuario = baseCtx.TipoUsuario;

        if (baseCtx.UsuarioId.HasValue)
        {
            if (baseCtx.EsCliente && !clienteId.HasValue)
            {
                var cli = await ctx.Clientes
                    .AsNoTracking()
                    .Where(c => c.UsuarioId == baseCtx.UsuarioId.Value && c.Activo)
                    .Select(c => new { c.Id })
                    .FirstOrDefaultAsync(ct);

                if (cli is not null)
                    clienteId = cli.Id;
            }
            else if (baseCtx.EsEmpleado && (!empleadoId.HasValue || !sucursalId.HasValue))
            {
                var emp = await ctx.Empleados
                    .AsNoTracking()
                    .Where(e => e.UsuarioId == baseCtx.UsuarioId.Value && e.Activo)
                    .Select(e => new { e.Id, e.SucursalId })
                    .FirstOrDefaultAsync(ct);

                if (emp is not null)
                {
                    empleadoId ??= emp.Id;
                    sucursalId ??= emp.SucursalId;
                }
            }
        }

        return new ContextoSeguridadUsuario
        {
            UsuarioId = baseCtx.UsuarioId,
            EmpleadoId = empleadoId,
            ClienteId = clienteId,
            SucursalId = sucursalId,
            Email = baseCtx.Email,
            TipoUsuario = tipoUsuario,
            Roles = baseCtx.Roles,
            Permisos = baseCtx.Permisos
        };
    }
}

