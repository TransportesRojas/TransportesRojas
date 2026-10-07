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

public class UnidadService
{
    private readonly IDbContextFactory<TransportesRojasDbContext> _factory;
    private readonly ILogger<UnidadService> _logger;
    private readonly ResiliencePipeline _pipeline;

    public UnidadService(
        IDbContextFactory<TransportesRojasDbContext> factory,
        ILogger<UnidadService> logger)
    {
        _factory = factory;
        _logger = logger;
        _pipeline = PollyPolicies.CrearPipelineSerializacion(logger);
    }

    public async Task<List<UnidadResponse>> GetUnidadesAsync(int skip = 0, int take = 100)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        return await ctx.Unidades
            .AsNoTracking()
            .OrderBy(u => u.Id)
            .Skip(skip)
            .Take(take)
            .Select(u => new UnidadResponse(
                u.Id, u.FlotillaId, u.Placas, u.TipoVehiculo, u.Marca, u.Modelo,
                u.Anio, u.CapacidadKg, u.KmOdometroInicial, u.KmOdometroActual,
                u.Estado.ToString(), u.Activo))
            .ToListAsync();
    }

    public async Task<UnidadResponse?> GetUnidadByIdAsync(long id)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var u = await ctx.Unidades.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return u is null ? null : new UnidadResponse(
            u.Id, u.FlotillaId, u.Placas, u.TipoVehiculo, u.Marca, u.Modelo,
            u.Anio, u.CapacidadKg, u.KmOdometroInicial, u.KmOdometroActual,
            u.Estado.ToString(), u.Activo);
    }

    public async Task<UnidadResponse> CreateUnidadAsync(CrearUnidadModel model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var existePlacas = await ctx.Unidades.AnyAsync(u => u.Placas == model.Placas, ct);
                if (existePlacas)
                    throw new InvalidOperationException($"Ya existe una unidad con las placas '{model.Placas}'");

                var nueva = new Unidad
                {
                    FlotillaId = model.FlotillaId,
                    Placas = model.Placas,
                    TipoVehiculo = model.TipoVehiculo,
                    Marca = model.Marca,
                    Modelo = model.Modelo,
                    Anio = model.Anio,
                    CapacidadKg = model.CapacidadKg,
                    KmOdometroInicial = model.KmOdometroInicial,
                    KmOdometroActual = model.KmOdometroInicial ?? 0,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                ctx.Unidades.Add(nueva);
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Unidad creada. Id={Id}", nueva.Id);
                return new UnidadResponse(
                    nueva.Id, nueva.FlotillaId, nueva.Placas, nueva.TipoVehiculo, nueva.Marca, nueva.Modelo,
                    nueva.Anio, nueva.CapacidadKg, nueva.KmOdometroInicial, nueva.KmOdometroActual,
                    nueva.Estado.ToString(), nueva.Activo);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al crear unidad.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> UpdateUnidadAsync(long id, ActualizarUnidadModel model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var unidad = await ctx.Unidades.FindAsync(new object[] { id }, ct);
                if (unidad is null) return false;

                var existePlacas = await ctx.Unidades.AnyAsync(u => u.Placas == model.Placas && u.Id != id, ct);
                if (existePlacas)
                    throw new InvalidOperationException($"Ya existe otra unidad con las placas '{model.Placas}'");

                unidad.FlotillaId = model.FlotillaId;
                unidad.Placas = model.Placas;
                unidad.TipoVehiculo = model.TipoVehiculo;
                unidad.Marca = model.Marca;
                unidad.Modelo = model.Modelo;
                unidad.Anio = model.Anio;
                unidad.CapacidadKg = model.CapacidadKg;

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Unidad actualizada. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al actualizar unidad.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> DeleteUnidadAsync(long id)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var unidad = await ctx.Unidades.FindAsync(new object[] { id }, ct);
                if (unidad is null) return false;

                var tieneMantenimientos = await ctx.Mantenimientos.AnyAsync(m => m.UnidadId == id, ct);
                if (tieneMantenimientos)
                    throw new InvalidOperationException("No se puede eliminar la unidad porque tiene mantenimientos registrados.");

                ctx.Unidades.Remove(unidad);
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Unidad eliminada. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al eliminar unidad.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }
}
