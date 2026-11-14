using System.Data;
using Backend.BDFolder;
using Backend.Exceptions;
using Backend.Helpers;
using Backend.Models;
using Backend.Policies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Polly;

namespace Backend.Services;

public class UsuarioService
{
    private readonly IDbContextFactory<TransportesRojasDbContext> _factory;
    private readonly ILogger<UsuarioService> _logger;
    private readonly ResiliencePipeline _pipeline;
    private readonly PasswordHasher<object> _passwordHasher = new();

    public UsuarioService(
        IDbContextFactory<TransportesRojasDbContext> factory,
        ILogger<UsuarioService> logger)
    {
        _factory = factory;
        _logger = logger;
        _pipeline = PollyPolicies.CrearPipelineSerializacion(logger);
    }

    public async Task<List<UsuarioResponse>> GetUsuariosAsync(int skip = 0, int take = 100)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        return await ctx.Usuarios
            .AsNoTracking()
            .OrderBy(u => u.Id)
            .Skip(skip)
            .Take(take)
            .Select(u => new UsuarioResponse(u.Id, u.Email, u.TipoUsuario.ToString(), u.Activo, u.UltimoAcceso))
            .ToListAsync();
    }

    public async Task<UsuarioResponse?> GetUsuarioByIdAsync(long id)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var u = await ctx.Usuarios.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return u is null ? null : new UsuarioResponse(u.Id, u.Email, u.TipoUsuario.ToString(), u.Activo, u.UltimoAcceso);
    }

    public async Task<UsuarioResponse> CreateUsuarioAsync(CrearUsuarioModel model)
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

                if (!Enum.TryParse<TipoUsuario>(model.TipoUsuario, true, out var tipoUsuario))
                    throw new InvalidOperationException($"Tipo de usuario inválido: '{model.TipoUsuario}'. Valores válidos: Empleado, Cliente, Sistema");

                var nuevoUsuario = new Usuario
                {
                    Email = model.Email,
                    PasswordHash = _passwordHasher.HashPassword(new { }, model.Password),
                    TipoUsuario = tipoUsuario,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                ctx.Usuarios.Add(nuevoUsuario);
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Usuario creado. Id={Id}", nuevoUsuario.Id);
                return new UsuarioResponse(nuevoUsuario.Id, nuevoUsuario.Email, nuevoUsuario.TipoUsuario.ToString(), nuevoUsuario.Activo, nuevoUsuario.UltimoAcceso);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al crear usuario.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> UpdateUsuarioAsync(long id, ActualizarUsuarioModel model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var usuario = await ctx.Usuarios.FindAsync(new object[] { id }, ct);
                if (usuario is null) return false;

                var existeEmail = await ctx.Usuarios.AnyAsync(u => u.Email == model.Email && u.Id != id, ct);
                if (existeEmail)
                    throw new InvalidOperationException($"Ya existe otro usuario con el email '{model.Email}'");

                if (!Enum.TryParse<TipoUsuario>(model.TipoUsuario, true, out var tipoUsuario))
                    throw new InvalidOperationException($"Tipo de usuario inválido: '{model.TipoUsuario}'. Valores válidos: Empleado, Cliente, Sistema");

                usuario.Email = model.Email;
                usuario.TipoUsuario = tipoUsuario;

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Usuario actualizado. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al actualizar usuario.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> DeleteUsuarioAsync(long id)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var usuario = await ctx.Usuarios.FindAsync(new object[] { id }, ct);
                if (usuario is null) return false;

                var tieneEmpleado = await ctx.Empleados.AnyAsync(e => e.UsuarioId == id, ct);
                if (tieneEmpleado)
                    throw new InvalidOperationException("No se puede eliminar el usuario porque tiene un empleado asociado.");

                var tieneCliente = await ctx.Clientes.AnyAsync(c => c.UsuarioId == id, ct);
                if (tieneCliente)
                    throw new InvalidOperationException("No se puede eliminar el usuario porque tiene un cliente asociado.");

                ctx.Usuarios.Remove(usuario);
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Usuario eliminado. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al eliminar usuario.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> CambiarPasswordAsync(long id, string passwordActual, string passwordNueva)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var usuario = await ctx.Usuarios.FindAsync(new object[] { id }, ct);
                if (usuario is null) return false;

                var verificacion = _passwordHasher.VerifyHashedPassword(new { }, usuario.PasswordHash, passwordActual);
                if (verificacion == PasswordVerificationResult.Failed)
                {
                    throw new InvalidOperationException("La contraseña actual no es correcta.");
                }

                usuario.PasswordHash = _passwordHasher.HashPassword(new { }, passwordNueva);

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Contraseña actualizada exitosamente para Usuario Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al cambiar contraseña.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }
}
