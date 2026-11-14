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

    public async Task<List<UnidadResponse>> GetUnidadesAsync(ContextoSeguridadUsuario? contextoRaw = null, int skip = 0, int take = 100)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var query = ctx.Unidades.AsNoTracking().Include(u => u.Flotilla).AsQueryable();

        if (contextoRaw is not null)
        {
            var contexto = await ClaimsUsuarioHelper.EnriquecerContextoAsync(ctx, contextoRaw);
            if (!contexto.TieneRol("Jefe", "RH"))
            {
                if (contexto.SucursalId.HasValue)
                {
                    var sucId = contexto.SucursalId.Value;
                    query = query.Where(u => u.FlotillaId == null || (u.Flotilla != null && u.Flotilla.SucursalId == sucId));
                }
            }
        }

        return await query
            .OrderBy(u => u.Id)
            .Skip(skip)
            .Take(take)
            .Select(u => new UnidadResponse(
                u.Id, u.FlotillaId, u.Placas, u.TipoVehiculo, u.Marca, u.Modelo,
                u.Anio, u.CapacidadKg, u.KmOdometroInicial, u.KmOdometroActual,
                u.Estado.ToString(), u.Activo, u.Flotilla != null ? u.Flotilla.Nombre : null))
            .ToListAsync();
    }

    public async Task<UnidadResponse?> GetUnidadByIdAsync(long id)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var u = await ctx.Unidades
            .AsNoTracking()
            .Include(u => u.Flotilla)
            .FirstOrDefaultAsync(x => x.Id == id);
        return u is null ? null : new UnidadResponse(
            u.Id, u.FlotillaId, u.Placas, u.TipoVehiculo, u.Marca, u.Modelo,
            u.Anio, u.CapacidadKg, u.KmOdometroInicial, u.KmOdometroActual,
            u.Estado.ToString(), u.Activo, u.Flotilla != null ? u.Flotilla.Nombre : null);
    }

    public async Task<UnidadResponse> CreateUnidadAsync(CrearUnidadModel model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                ValidacionEntradaHelper.ValidarAnioUnidad(model.Anio);
                ValidacionEntradaHelper.ValidarDecimalPositivo(model.CapacidadKg, "capacidad (kg)", 200_000m);
                ValidacionEntradaHelper.ValidarDecimalNoNegativo(model.KmOdometroInicial, "odómetro inicial", 5_000_000m);

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
                ValidacionEntradaHelper.ValidarAnioUnidad(model.Anio);
                ValidacionEntradaHelper.ValidarDecimalPositivo(model.CapacidadKg, "capacidad (kg)", 200_000m);
                ValidacionEntradaHelper.ValidarDecimalNoNegativo(model.KmOdometroActual, "odómetro actual", 5_000_000m);

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
                if (model.KmOdometroActual.HasValue)
                    unidad.KmOdometroActual = Math.Round(model.KmOdometroActual.Value, 2);

                if (!string.IsNullOrWhiteSpace(model.Estado) && Enum.TryParse<EstadoUnidad>(model.Estado, true, out var estadoParsed))
                    unidad.Estado = estadoParsed;

                if (model.Activo.HasValue)
                    unidad.Activo = model.Activo.Value;

                unidad.UpdatedAt = DateTimeOffset.UtcNow;

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

    public async Task<bool> RegistrarCierreDiaAsync(long id, decimal kmOdometroFinal, string? observaciones = null)
    {
        ValidacionEntradaHelper.ValidarDecimalNoNegativo(kmOdometroFinal, "kilometraje final de odómetro", 5_000_000m);

        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            var unidad = await ctx.Unidades.FindAsync(new object[] { id }, ct);
            if (unidad is null) return false;

            if (kmOdometroFinal < unidad.KmOdometroActual)
                throw new InvalidOperationException($"El kilometraje final ({kmOdometroFinal:F2} km) no puede ser menor al odómetro actual registrado ({unidad.KmOdometroActual:F2} km).");

            unidad.KmOdometroActual = Math.Round(kmOdometroFinal, 2);
            await ctx.SaveChangesAsync(ct);
            _logger.LogInformation("Cierre de jornada de unidad Id={Id}. Odómetro final={Km}, Obs={Obs}", id, kmOdometroFinal, observaciones);
            return true;
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
                var tieneRutas = await ctx.Rutas.AnyAsync(r => r.UnidadId == id, ct);

                if (tieneMantenimientos || tieneRutas)
                {
                    unidad.Activo = false;
                    unidad.Estado = EstadoUnidad.FueraServicio;
                    unidad.UpdatedAt = DateTimeOffset.UtcNow;
                }
                else
                {
                    ctx.Unidades.Remove(unidad);
                }

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Unidad desactivada o retirada. Id={Id}", id);
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
