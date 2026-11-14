using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApiTests;

public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options, 
        ILoggerFactory logger, 
        UrlEncoder encoder) 
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Context.Request.Headers.ContainsKey("Authorization"))
        {
            return Task.FromResult(AuthenticateResult.Fail("No token provided"));
        }

        var roleHeader = Context.Request.Headers["X-Test-Role"].FirstOrDefault() ?? "RH";
        var userId = Context.Request.Headers["X-Test-UserId"].FirstOrDefault() ?? "1";
        var tipoUsuario = Context.Request.Headers["X-Test-TipoUsuario"].FirstOrDefault();
        var empleadoId = Context.Request.Headers["X-Test-EmpleadoId"].FirstOrDefault();
        var clienteId = Context.Request.Headers["X-Test-ClienteId"].FirstOrDefault();
        var sucursalId = Context.Request.Headers["X-Test-SucursalId"].FirstOrDefault();
        var permisosHeader = Context.Request.Headers["X-Test-Permisos"].FirstOrDefault();

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new("usuario_id", userId)
        };

        foreach (var rol in roleHeader.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            claims.Add(new Claim(ClaimTypes.Role, rol));
            claims.Add(new Claim("rol", rol));
        }

        if (!string.IsNullOrWhiteSpace(tipoUsuario))
        {
            claims.Add(new Claim("tipo_usuario", tipoUsuario.Trim()));
        }

        if (!string.IsNullOrWhiteSpace(empleadoId))
        {
            claims.Add(new Claim("empleado_id", empleadoId.Trim()));
        }

        if (!string.IsNullOrWhiteSpace(clienteId))
        {
            claims.Add(new Claim("cliente_id", clienteId.Trim()));
        }

        if (!string.IsNullOrWhiteSpace(sucursalId))
        {
            claims.Add(new Claim("sucursal_id", sucursalId.Trim()));
        }

        if (!string.IsNullOrWhiteSpace(permisosHeader))
        {
            foreach (var perm in permisosHeader.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                claims.Add(new Claim("permiso", perm));
            }
        }

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "TestScheme");

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
