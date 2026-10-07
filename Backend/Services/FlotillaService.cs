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

public class FlotillaService
{
    private readonly IDbContextFactory<TransportesRojasDbContext> _factory;
    private readonly ILogger<FlotillaService> _logger;
    private readonly ResiliencePipeline _pipeline;

    public FlotillaService(
        IDbContextFactory<TransportesRojasDbContext> factory,
        ILogger<FlotillaService> logger)
    {
        _factory = factory;
        _logger = logger;
        _pipeline = PollyPolicies.CrearPipelineSerializacion(logger);
    }

    public async Task<List<FlotillaResponse>> GetFlotillasAsync(int skip = 0, int take = 100)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        return await ctx.Flotillas
            .AsNoTracking()
            .OrderBy(f => f.Id)
            .Skip(skip)
            .Take(take)
            .Select(f => new FlotillaResponse(f.Id, f.Nombre, f.Codigo, f.SucursalId, f.SupervisorId, f.Activo))
            .ToListAsync();
    }

    public async Task<FlotillaResponse?> GetFlotillaByIdAsync(long id)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var f = await ctx.Flotillas.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return f is null ? null : new FlotillaResponse(
            f.Id, f.Nombre, f.Codigo, f.SucursalId, f.SupervisorId, f.Activo);
    }

    public async Task<FlotillaResponse> CreateFlotillaAsync(CrearFlotillaModel model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                if (model.Codigo is not null)
                {
                    var existeCodigo = await ctx.Flotillas.AnyAsync(f => f.Codigo == model.Codigo, ct);
                    if (existeCodigo)
                        throw new InvalidOperationException($"Ya existe una flotilla con el código '{model.Codigo}'");
                }

                var nueva = new Flotilla
                {
                    Nombre = model.Nombre,
                    Codigo = model.Codigo,
                    SucursalId = model.SucursalId,
                    SupervisorId = model.SupervisorId,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                ctx.Flotillas.Add(nueva);
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Flotilla creada. Id={Id}", nueva.Id);
                return new FlotillaResponse(
                    nueva.Id, nueva.Nombre, nueva.Codigo, nueva.SucursalId, nueva.SupervisorId, nueva.Activo);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al crear flotilla.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> UpdateFlotillaAsync(long id, ActualizarFlotillaModel model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var flotilla = await ctx.Flotillas.FindAsync(new object[] { id }, ct);
                if (flotilla is null) return false;

                if (model.Codigo is not null)
                {
                    var existeCodigo = await ctx.Flotillas.AnyAsync(f => f.Codigo == model.Codigo && f.Id != id, ct);
                    if (existeCodigo)
                        throw new InvalidOperationException($"Ya existe otra flotilla con el código '{model.Codigo}'");
                }

                flotilla.Nombre = model.Nombre;
                flotilla.Codigo = model.Codigo;
                flotilla.SucursalId = model.SucursalId;
                flotilla.SupervisorId = model.SupervisorId;

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Flotilla actualizada. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al actualizar flotilla.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> DeleteFlotillaAsync(long id)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var flotilla = await ctx.Flotillas.FindAsync(new object[] { id }, ct);
                if (flotilla is null) return false;

                var tieneUnidades = await ctx.Unidades.AnyAsync(u => u.FlotillaId == id, ct);
                if (tieneUnidades)
                    throw new InvalidOperationException("No se puede eliminar la flotilla porque tiene unidades asignadas.");

                ctx.Flotillas.Remove(flotilla);
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Flotilla eliminada. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al eliminar flotilla.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }
}
