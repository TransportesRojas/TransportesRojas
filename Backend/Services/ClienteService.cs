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
    private readonly JwtService _jwtService;
    private readonly IEmailService _emailService;

    public ClienteService(
        IDbContextFactory<TransportesRojasDbContext> factory,
        ILogger<ClienteService> logger,
        JwtService jwtService,
        IEmailService emailService)
    {
        _factory = factory;
        _logger = logger;
        _pipeline = PollyPolicies.CrearPipelineSerializacion(logger);
        _jwtService = jwtService;
        _emailService = emailService;
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
                c.Telefono, c.Email, c.Activo, null, c.MotivoEdicion))
            .ToListAsync();
    }

    public async Task<ClienteResponse?> GetClienteByIdAsync(long id)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var c = await ctx.Clientes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return c is null ? null : new ClienteResponse(
            c.Id, c.UsuarioId, c.Nombre, c.ApellidoPaterno, c.ApellidoMaterno,
            c.Telefono, c.Email, c.Activo, null, c.MotivoEdicion);
    }

    public async Task<ClienteResponse> CreateClienteAsync(CrearClienteModel model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var telefonoNormalizado = ValidacionEntradaHelper.NormalizarTelefonoDiezDigitos(model.Telefono, obligatorio: false);
                var nombreLimpio = ValidacionEntradaHelper.ValidarNombrePersonaSinNumeros(model.Nombre, obligatorio: true, "nombre");
                var apPaternoLimpio = ValidacionEntradaHelper.ValidarNombrePersonaSinNumeros(model.ApellidoPaterno, obligatorio: true, "apellido paterno");
                var apMaternoLimpio = ValidacionEntradaHelper.ValidarNombrePersonaOpcionalSinNumeros(model.ApellidoMaterno, "apellido materno");

                if (string.IsNullOrWhiteSpace(model.Email))
                    throw new InvalidOperationException("El email es requerido para crear la cuenta de usuario del cliente.");

                var existeEmail = await ctx.Usuarios.AnyAsync(u => u.Email == model.Email, ct);
                if (existeEmail)
                    throw new InvalidOperationException($"Ya existe un usuario con el email '{model.Email}'");

                string nombrePart = (model.Nombre ?? "XX").PadRight(2, 'X').Substring(0, 2);
                string apellidoPart = (model.ApellidoPaterno ?? "XX").PadRight(2, 'X').Substring(0, 2);
                string letras = $"{char.ToUpper(nombrePart[0])}{char.ToLower(nombrePart[1])}{char.ToLower(apellidoPart[0])}{char.ToUpper(apellidoPart[1])}";
                string telefonoPart = string.IsNullOrWhiteSpace(telefonoNormalizado) ? "0000000" : telefonoNormalizado;
                string passwordGenerada = $"{letras}{telefonoPart}!";
                string passwordFinal = !string.IsNullOrWhiteSpace(model.Password) ? model.Password : passwordGenerada;

                _logger.LogInformation("================================================");
                _logger.LogInformation($"CONTRASEÑA GENERADA PARA CLIENTE: {passwordGenerada}");
                _logger.LogInformation("================================================");

                var passwordHasher = new Microsoft.AspNetCore.Identity.PasswordHasher<object>();
                var nuevoUsuario = new Usuario
                {
                    Email = model.Email,
                    PasswordHash = passwordHasher.HashPassword(new { }, passwordFinal),
                    TipoUsuario = Backend.BDFolder.TipoUsuario.Cliente,
                    Activo = false,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                ctx.Usuarios.Add(nuevoUsuario);
                await ctx.SaveChangesAsync(ct);

                var nuevoCliente = new Cliente
                {
                    UsuarioId = nuevoUsuario.Id,
                    Nombre = nombreLimpio,
                    ApellidoPaterno = apPaternoLimpio,
                    ApellidoMaterno = apMaternoLimpio,
                    Telefono = telefonoNormalizado,
                    Email = model.Email,
                    Activo = false,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                ctx.Clientes.Add(nuevoCliente);
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Cliente creado con estado PENDIENTE de activación. Id={Id}", nuevoCliente.Id);

                var tokenActivacion = _jwtService.GenerarTokenActivacion(nuevoUsuario.Id, nuevoUsuario.Email);
                try
                {
                    var nombreCompleto = $"{nuevoCliente.Nombre} {nuevoCliente.ApellidoPaterno}".Trim();
                    var enviado = await _emailService.EnviarCorreoActivacionClienteAsync(
                        nuevoCliente.Email ?? nuevoUsuario.Email,
                        string.IsNullOrWhiteSpace(nombreCompleto) ? "Cliente" : nombreCompleto,
                        passwordGenerada,
                        tokenActivacion);
                    _logger.LogInformation("Resultado envío correo de activación a {Email}: {Enviado}", nuevoCliente.Email, enviado);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error al enviar correo de activación a {Email}", nuevoCliente.Email);
                }
                return new ClienteResponse(
                    nuevoCliente.Id, nuevoCliente.UsuarioId, nuevoCliente.Nombre,
                    nuevoCliente.ApellidoPaterno, nuevoCliente.ApellidoMaterno,
                    nuevoCliente.Telefono, nuevoCliente.Email, nuevoCliente.Activo,
                    passwordGenerada);
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
                var telefonoNormalizado = ValidacionEntradaHelper.NormalizarTelefonoDiezDigitos(model.Telefono, obligatorio: false);
                var nombreLimpio = ValidacionEntradaHelper.ValidarNombrePersonaSinNumeros(model.Nombre, obligatorio: true, "nombre");
                var apPaternoLimpio = ValidacionEntradaHelper.ValidarNombrePersonaSinNumeros(model.ApellidoPaterno, obligatorio: true, "apellido paterno");
                var apMaternoLimpio = ValidacionEntradaHelper.ValidarNombrePersonaOpcionalSinNumeros(model.ApellidoMaterno, "apellido materno");

                var cliente = await ctx.Clientes.FindAsync(new object[] { id }, ct);
                if (cliente is null) return false;

                cliente.Nombre = nombreLimpio;
                cliente.ApellidoPaterno = apPaternoLimpio;
                cliente.ApellidoMaterno = apMaternoLimpio;
                cliente.Telefono = telefonoNormalizado;
                cliente.Email = model.Email;
                if (!string.IsNullOrWhiteSpace(model.MotivoEdicion))
                {
                    cliente.MotivoEdicion = model.MotivoEdicion.Trim();
                }

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

    public async Task<bool> DeleteClienteAsync(long id, string? motivo = null)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var cliente = await ctx.Clientes.FindAsync(new object[] { id }, ct);
                if (cliente is null) return false;

                var tieneEnviosPendientes = await ctx.Envios.AnyAsync(e =>
                    (e.RemitenteId == id || e.DestinatarioClienteId == id) &&
                    (e.Estado == EstadoEnvio.Registrado ||
                     e.Estado == EstadoEnvio.RecoleccionProgramada ||
                     e.Estado == EstadoEnvio.RecibidoSucursal ||
                     e.Estado == EstadoEnvio.AsignadoFlotilla ||
                     e.Estado == EstadoEnvio.EnRuta ||
                     e.Estado == EstadoEnvio.EnDevolucion ||
                     e.Estado == EstadoEnvio.Reprogramado), ct);

                if (tieneEnviosPendientes)
                    throw new InvalidOperationException("No es posible dar de baja la cuenta mientras existan envíos pendientes de concluir.");

                cliente.Activo = false;
                
                if (cliente.UsuarioId > 0)
                {
                    var usuario = await ctx.Usuarios.FindAsync(new object[] { cliente.UsuarioId }, ct);
                    if (usuario != null)
                    {
                        usuario.Activo = false;
                        usuario.UpdatedAt = DateTimeOffset.UtcNow;
                    }
                }
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Cliente dado de baja. Id={Id}, Motivo={Motivo}", id, motivo ?? "Sin especificar");
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
