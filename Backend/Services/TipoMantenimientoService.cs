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

public class TipoMantenimientoService
{
    private readonly IDbContextFactory<TransportesRojasDbContext> _factory;
    private readonly ILogger<TipoMantenimientoService> _logger;
    private readonly ResiliencePipeline _pipeline;

    public TipoMantenimientoService(
        IDbContextFactory<TransportesRojasDbContext> factory,
        ILogger<TipoMantenimientoService> logger)
    {
        _factory = factory;
        _logger = logger;
        _pipeline = PollyPolicies.CrearPipelineSerializacion(logger);
    }

    public async Task<List<TipoMantenimientoResponse>> GetTiposAsync(int skip = 0, int take = 100)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        return await ctx.TiposMantenimiento
            .AsNoTracking()
            .OrderBy(t => t.Id)
            .Skip(skip)
            .Take(take)
            .Select(t => new TipoMantenimientoResponse(
                t.Id, t.Nombre, t.Descripcion, t.KmIntervalo, t.AplicaATipoVehiculo, t.Activo))
            .ToListAsync();
    }

    public async Task<TipoMantenimientoResponse?> GetTipoByIdAsync(long id)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var tipo = await ctx.TiposMantenimiento
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);
        return tipo is null
            ? null
            : new TipoMantenimientoResponse(
                tipo.Id, tipo.Nombre, tipo.Descripcion, tipo.KmIntervalo, tipo.AplicaATipoVehiculo, tipo.Activo);
    }

    public async Task<TipoMantenimientoResponse> CreateTipoAsync(CrearTipoMantenimientoModel model)
    {
        ValidacionEntradaHelper.ValidarEnteroPositivo(model.KmIntervalo, "intervalo de kilometraje");

        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database
                .BeginTransactionAsync(IsolationLevel.Serializable, ct);
            try
            {
                var existeNombre = await ctx.TiposMantenimiento
                    .AnyAsync(t => t.Nombre == model.Nombre, ct);
                if (existeNombre)
                    throw new InvalidOperationException(
                        $"Ya existe un tipo de mantenimiento con el nombre '{model.Nombre}'.");

                var nuevo = new TipoMantenimiento
                {
                    Nombre = model.Nombre,
                    Descripcion = model.Descripcion,
                    KmIntervalo = model.KmIntervalo,
                    AplicaATipoVehiculo = model.AplicaATipoVehiculo
                };

                ctx.TiposMantenimiento.Add(nuevo);
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("TipoMantenimiento creado. Id={Id}, Nombre='{Nombre}'",
                    nuevo.Id, nuevo.Nombre);

                return new TipoMantenimientoResponse(
                    nuevo.Id, nuevo.Nombre, nuevo.Descripcion, nuevo.KmIntervalo, nuevo.AplicaATipoVehiculo, nuevo.Activo);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await RollbackSafeAsync(tx);
                throw new RetryableException("Conflicto de serialización al crear tipo de mantenimiento.", ex);
            }
            catch (InvalidOperationException)
            {
                await RollbackSafeAsync(tx);
                throw;
            }
            catch (Exception)
            {
                await RollbackSafeAsync(tx);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> UpdateTipoAsync(long id, ActualizarTipoMantenimientoModel model)
    {
        ValidacionEntradaHelper.ValidarEnteroPositivo(model.KmIntervalo, "intervalo de kilometraje");

        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database
                .BeginTransactionAsync(IsolationLevel.Serializable, ct);
            try
            {
                var tipo = await ctx.TiposMantenimiento.FindAsync(new object[] { id }, ct);
                if (tipo is null) return false;

                var existeNombre = await ctx.TiposMantenimiento
                    .AnyAsync(t => t.Nombre == model.Nombre && t.Id != id, ct);
                if (existeNombre)
                    throw new InvalidOperationException(
                        $"Ya existe otro tipo de mantenimiento con el nombre '{model.Nombre}'.");

                tipo.Nombre = model.Nombre;
                tipo.Descripcion = model.Descripcion;
                tipo.KmIntervalo = model.KmIntervalo;
                tipo.AplicaATipoVehiculo = model.AplicaATipoVehiculo;

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("TipoMantenimiento actualizado. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await RollbackSafeAsync(tx);
                throw new RetryableException("Conflicto de serialización al actualizar tipo de mantenimiento.", ex);
            }
            catch (InvalidOperationException)
            {
                await RollbackSafeAsync(tx);
                throw;
            }
            catch (Exception)
            {
                await RollbackSafeAsync(tx);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> DeleteTipoAsync(long id)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database
                .BeginTransactionAsync(IsolationLevel.Serializable, ct);
            try
            {
                var tipo = await ctx.TiposMantenimiento.FindAsync(new object[] { id }, ct);
                if (tipo is null) return false;

                var estaEnUso = await ctx.AlertasMantenimiento
                    .AnyAsync(a => a.TipoMantenimientoId == id, ct);
                if (estaEnUso)
                    throw new InvalidOperationException(
                        "No se puede eliminar el tipo de mantenimiento porque tiene alertas asociadas.");

                ctx.TiposMantenimiento.Remove(tipo);
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("TipoMantenimiento eliminado. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await RollbackSafeAsync(tx);
                throw new RetryableException("Conflicto de serialización al eliminar tipo de mantenimiento.", ex);
            }
            catch (InvalidOperationException)
            {
                await RollbackSafeAsync(tx);
                throw;
            }
            catch (Exception)
            {
                await RollbackSafeAsync(tx);
                throw;
            }
        }, CancellationToken.None);
    }

    private async Task RollbackSafeAsync(
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction tx)
    {
        try { await tx.RollbackAsync(); }
        catch (Exception rollbackEx)
        {
            _logger.LogWarning(rollbackEx, "Error durante rollback (puede ser esperado).");
        }
    }
}
