using System.Data;
using Backend.BDFolder;
using Backend.Exceptions;
using Backend.Helpers;
using Backend.Models;
using Backend.Policies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Polly;

namespace Backend.Services;

public class EmpleadoService
{
    private readonly IDbContextFactory<TransportesRojasDbContext> _factory;
    private readonly ILogger<EmpleadoService> _logger;
    private readonly ResiliencePipeline _pipeline;

    public EmpleadoService(
        IDbContextFactory<TransportesRojasDbContext> factory,
        ILogger<EmpleadoService> logger)
    {
        _factory = factory;
        _logger = logger;
        _pipeline = PollyPolicies.CrearPipelineSerializacion(logger);
    }

    public async Task<List<EmpleadoResponse>> GetEmpleadosAsync(int skip = 0, int take = 100)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        return await ctx.Empleados
            .AsNoTracking()
            .OrderBy(e => e.Id)
            .Skip(skip)
            .Take(take)
            .Select(e => new EmpleadoResponse(
                e.Id, e.UsuarioId, e.Nombre, e.ApellidoPaterno, e.ApellidoMaterno,
                e.Telefono, e.Email, e.SucursalId, e.FechaIngreso, e.Activo))
            .ToListAsync();
    }

    public async Task<EmpleadoResponse?> GetEmpleadoByIdAsync(long id)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var e = await ctx.Empleados.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return e is null ? null : new EmpleadoResponse(
            e.Id, e.UsuarioId, e.Nombre, e.ApellidoPaterno, e.ApellidoMaterno,
            e.Telefono, e.Email, e.SucursalId, e.FechaIngreso, e.Activo);
    }

    public async Task<EmpleadoResponse> CreateEmpleadoAsync(CrearEmpleadoCompleto model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var existeEmail = await ctx.Usuarios.AnyAsync(u => u.Email == model.Email, ct);
                if (existeEmail)
                    throw new InvalidOperationException($"Ya existe un usuario con el email '{model.Email}'");

                string nombrePart = (model.Nombre ?? "XX").PadRight(2, 'X').Substring(0, 2);
                string apellidoPart = (model.ApellidoPaterno ?? "XX").PadRight(2, 'X').Substring(0, 2);
                string letras = $"{char.ToUpper(nombrePart[0])}{char.ToLower(nombrePart[1])}{char.ToLower(apellidoPart[0])}{char.ToUpper(apellidoPart[1])}";
                string telefonoPart = string.IsNullOrWhiteSpace(model.Telefono) ? "00000000" : model.Telefono;
                string passwordGenerada = $"{letras}{telefonoPart}";

                _logger.LogInformation("================================================");
                _logger.LogInformation($"CONTRASEÑA GENERADA PARA EMPLEADO: {passwordGenerada}");
                _logger.LogInformation("================================================");

                var passwordHasher = new Microsoft.AspNetCore.Identity.PasswordHasher<object>();
                var nuevoUsuario = new Usuario
                {
                    Email = model.Email,
                    PasswordHash = passwordHasher.HashPassword(new { }, passwordGenerada),
                    TipoUsuario = Backend.BDFolder.TipoUsuario.Empleado,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                ctx.Usuarios.Add(nuevoUsuario);
                await ctx.SaveChangesAsync(ct);

                if (model.RolId.HasValue)
                {
                    var usuarioRol = new UsuarioRol
                    {
                        UsuarioId = nuevoUsuario.Id,
                        RolId = model.RolId.Value
                    };
                    ctx.UsuarioRoles.Add(usuarioRol);
                    await ctx.SaveChangesAsync(ct);
                }

                var nuevoEmpleado = new Empleado
                {
                    UsuarioId = nuevoUsuario.Id,
                    Nombre = model.Nombre,
                    ApellidoPaterno = model.ApellidoPaterno,
                    ApellidoMaterno = model.ApellidoMaterno,
                    Telefono = model.Telefono,
                    Email = model.Email,
                    SucursalId = model.SucursalId,
                    FechaIngreso = model.FechaIngreso,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                ctx.Empleados.Add(nuevoEmpleado);
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Empleado creado. Id={Id}", nuevoEmpleado.Id);
                return new EmpleadoResponse(
                    nuevoEmpleado.Id, nuevoEmpleado.UsuarioId, nuevoEmpleado.Nombre,
                    nuevoEmpleado.ApellidoPaterno, nuevoEmpleado.ApellidoMaterno,
                    nuevoEmpleado.Telefono, nuevoEmpleado.Email, nuevoEmpleado.SucursalId,
                    nuevoEmpleado.FechaIngreso, nuevoEmpleado.Activo);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al crear empleado.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> UpdateEmpleadoAsync(long id, ActualizarEmpleadoCompleto model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var empleado = await ctx.Empleados.FindAsync(new object[] { id }, ct);
                if (empleado is null) return false;

                empleado.Nombre = model.Nombre;
                empleado.ApellidoPaterno = model.ApellidoPaterno;
                empleado.ApellidoMaterno = model.ApellidoMaterno;
                empleado.Telefono = model.Telefono;
                empleado.Email = model.Email;
                empleado.SucursalId = model.SucursalId;
                empleado.FechaIngreso = model.FechaIngreso;

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Empleado actualizado. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al actualizar empleado.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> DeleteEmpleadoAsync(long id)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var empleado = await ctx.Empleados.FindAsync(new object[] { id }, ct);
                if (empleado is null) return false;

                var tienePuestos = await ctx.EmpleadosPuestosHistorial.AnyAsync(ep => ep.EmpleadoId == id, ct);
                if (tienePuestos)
                    throw new InvalidOperationException("No se puede eliminar el empleado porque tiene historial de puestos.");

                empleado.Activo = false;
                
                var usuario = await ctx.Usuarios.FindAsync(new object[] { empleado.UsuarioId }, ct);
                if (usuario != null)
                    usuario.Activo = false;
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Empleado eliminado. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al eliminar empleado.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }
}
