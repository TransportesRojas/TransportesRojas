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

public class ClienteService
{
    private readonly IDbContextFactory<TransportesRojasDbContext> _factory;
    private readonly ILogger<ClienteService> _logger;
    private readonly ResiliencePipeline _pipeline;

    public ClienteService(
        IDbContextFactory<TransportesRojasDbContext> factory,
        ILogger<ClienteService> logger)
    {
        _factory = factory;
        _logger = logger;
        _pipeline = PollyPolicies.CrearPipelineSerializacion(logger);
    }

    public async Task<List<ClienteResponse>> GetClientesAsync(int skip = 0, int take = 100)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        return await ctx.Clientes
            .AsNoTracking()
            .OrderBy(c => c.Id)
            .Skip(skip)
            .Take(take)
            .Select(c => new ClienteResponse(
                c.Id, c.UsuarioId, c.Nombre, c.ApellidoPaterno, c.ApellidoMaterno,
                c.Telefono, c.Email, c.Activo))
            .ToListAsync();
    }

    public async Task<ClienteResponse?> GetClienteByIdAsync(long id)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var c = await ctx.Clientes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return c is null ? null : new ClienteResponse(
            c.Id, c.UsuarioId, c.Nombre, c.ApellidoPaterno, c.ApellidoMaterno,
            c.Telefono, c.Email, c.Activo);
    }

    public async Task<ClienteResponse> CreateClienteAsync(CrearClienteModel model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                if (string.IsNullOrWhiteSpace(model.Email))
                    throw new InvalidOperationException("El email es requerido para crear la cuenta de usuario del cliente.");

                var existeEmail = await ctx.Usuarios.AnyAsync(u => u.Email == model.Email, ct);
                if (existeEmail)
                    throw new InvalidOperationException($"Ya existe un usuario con el email '{model.Email}'");

                string nombrePart = (model.Nombre ?? "XX").PadRight(2, 'X').Substring(0, 2);
                string apellidoPart = (model.ApellidoPaterno ?? "XX").PadRight(2, 'X').Substring(0, 2);
                string letras = $"{char.ToUpper(nombrePart[0])}{char.ToLower(nombrePart[1])}{char.ToLower(apellidoPart[0])}{char.ToUpper(apellidoPart[1])}";
                string telefonoPart = string.IsNullOrWhiteSpace(model.Telefono) ? "00000000" : model.Telefono;
                string passwordGenerada = $"{letras}{telefonoPart}";

                var passwordHasher = new Microsoft.AspNetCore.Identity.PasswordHasher<object>();
                var nuevoUsuario = new Usuario
                {
                    Email = model.Email,
                    PasswordHash = passwordHasher.HashPassword(new { }, passwordGenerada),
                    TipoUsuario = Backend.BDFolder.TipoUsuario.Cliente,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                ctx.Usuarios.Add(nuevoUsuario);
                await ctx.SaveChangesAsync(ct);

                var nuevoCliente = new Cliente
                {
                    UsuarioId = nuevoUsuario.Id,
                    Nombre = model.Nombre,
                    ApellidoPaterno = model.ApellidoPaterno,
                    ApellidoMaterno = model.ApellidoMaterno,
                    Telefono = model.Telefono,
                    Email = model.Email,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                ctx.Clientes.Add(nuevoCliente);
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Cliente creado. Id={Id}", nuevoCliente.Id);
                return new ClienteResponse(
                    nuevoCliente.Id, nuevoCliente.UsuarioId, nuevoCliente.Nombre,
                    nuevoCliente.ApellidoPaterno, nuevoCliente.ApellidoMaterno,
                    nuevoCliente.Telefono, nuevoCliente.Email, nuevoCliente.Activo);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al crear cliente.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> UpdateClienteAsync(long id, ActualizarClienteModel model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var cliente = await ctx.Clientes.FindAsync(new object[] { id }, ct);
                if (cliente is null) return false;

                cliente.Nombre = model.Nombre;
                cliente.ApellidoPaterno = model.ApellidoPaterno;
                cliente.ApellidoMaterno = model.ApellidoMaterno;
                cliente.Telefono = model.Telefono;
                cliente.Email = model.Email;

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Cliente actualizado. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al actualizar cliente.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> DeleteClienteAsync(long id)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var cliente = await ctx.Clientes.FindAsync(new object[] { id }, ct);
                if (cliente is null) return false;

                var tieneEnvios = await ctx.Envios.AnyAsync(e => e.RemitenteId == id || e.DestinatarioClienteId == id, ct);
                if (tieneEnvios)
                    throw new InvalidOperationException("No se puede eliminar el cliente porque tiene envíos asociados.");

                cliente.Activo = false;
                
                if (cliente.UsuarioId != null)
                {
                    var usuario = await ctx.Usuarios.FindAsync(new object[] { cliente.UsuarioId }, ct);
                    if (usuario != null)
                        usuario.Activo = false;
                }
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Cliente eliminado. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al eliminar cliente.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }
}
