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

    public async Task<List<FlotillaResponse>> GetFlotillasAsync(ContextoSeguridadUsuario? contextoRaw = null, int skip = 0, int take = 100)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var query = ctx.Flotillas.AsNoTracking();

        if (contextoRaw is not null)
        {
            var contexto = await ClaimsUsuarioHelper.EnriquecerContextoAsync(ctx, contextoRaw);
            if (!contexto.TieneRol("Jefe", "RH"))
            {
                if (contexto.SucursalId.HasValue || contexto.EmpleadoId.HasValue)
                {
                    var sucId = contexto.SucursalId;
                    var empId = contexto.EmpleadoId;
                    query = query.Where(f =>
                        (sucId.HasValue && f.SucursalId == sucId.Value) ||
                        (empId.HasValue && f.SupervisorId == empId.Value));
                }
            }
        }

        return await query
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

    public async Task<List<EmpleadoOperativoOpcion>> GetSupervisoresOperativosAsync()
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        return await ctx.Empleados
            .AsNoTracking()
            .Where(e => e.Activo)
            .OrderBy(e => e.Nombre)
            .Select(e => new EmpleadoOperativoOpcion(
                e.Id,
                e.Nombre,
                e.ApellidoPaterno,
                e.ApellidoMaterno,
                e.PuestoHistorial.Where(ph => ph.FechaFin == null).Select(ph => ph.Puesto.Nombre).FirstOrDefault()
            ))
            .ToListAsync();
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
                if (model.Activo.HasValue)
                {
                    flotilla.Activo = model.Activo.Value;
                }
                flotilla.UpdatedAt = DateTimeOffset.UtcNow;

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

    // Asignaciones y resumen operativo

    public async Task<FlotillaAsignacionesResponse?> GetFlotillaAsignacionesAsync(long id)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var flotilla = await ctx.Flotillas.FindAsync(id);
        if (flotilla == null) return null;

        var unidadesAsignadas = await ctx.Unidades
            .Where(u => u.FlotillaId == id)
            .Select(u => u.Id)
            .ToListAsync();

        var choferesAsignados = await ctx.AsignacionesFlotillaChofer
            .Where(a => a.FlotillaId == id && a.Activo)
            .Select(a => a.ChoferId)
            .ToListAsync();

        var todasUnidades = await ctx.Unidades
            .AsNoTracking()
            .Where(u => u.Activo)
            .Select(u => new FlotillaUnidadOpcion(
                u.Id,
                u.Placas,
                u.TipoVehiculo,
                u.Modelo,
                u.FlotillaId != null && u.FlotillaId != id,
                u.Flotilla != null ? u.Flotilla.Nombre : null
            ))
            .ToListAsync();

        var queryChoferes = ctx.Empleados
            .AsNoTracking()
            .Where(e => e.Activo);

        if (flotilla.SucursalId.HasValue)
        {
            queryChoferes = queryChoferes.Where(e => e.SucursalId == flotilla.SucursalId.Value);
        }

        queryChoferes = queryChoferes.Where(e =>
            ctx.UsuarioRoles.Any(ur => ur.UsuarioId == e.UsuarioId && ur.Rol.Nombre.ToLower() == "chofer") ||
            e.PuestoHistorial.Any(ph => ph.FechaFin == null && ph.Puesto.Nombre.ToLower().Contains("chofer"))
        );

        var todosChoferes = await queryChoferes
            .Select(e => new FlotillaChoferOpcion(
                e.Id,
                $"TR-{e.Id.ToString().PadLeft(3, '0')}",
                $"{e.Nombre} {e.ApellidoPaterno} {e.ApellidoMaterno}".Trim(),
                ctx.AsignacionesFlotillaChofer.Any(a => a.ChoferId == e.Id && a.Activo && a.FlotillaId != id),
                ctx.AsignacionesFlotillaChofer
                    .Where(a => a.ChoferId == e.Id && a.Activo && a.FlotillaId != id)
                    .Select(a => a.Flotilla.Nombre)
                    .FirstOrDefault()
            ))
            .ToListAsync();

        return new FlotillaAsignacionesResponse(
            unidadesAsignadas,
            choferesAsignados,
            todasUnidades,
            todosChoferes
        );
    }

    public async Task<bool> AsignarFlotillaAsync(long id, AsignarFlotillaModel model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var flotilla = await ctx.Flotillas.FindAsync(new object[] { id }, ct);
                if (flotilla == null) return false;

                if (model.UnidadesIds != null)
                {
                    var unidadesParaQuitar = await ctx.Unidades
                        .Where(u => u.FlotillaId == id && !model.UnidadesIds.Contains(u.Id))
                        .ToListAsync(ct);
                    foreach (var u in unidadesParaQuitar)
                    {
                        u.FlotillaId = null;
                        u.UpdatedAt = DateTimeOffset.UtcNow;
                    }

                    var unidadesParaAgregar = await ctx.Unidades
                        .Where(u => model.UnidadesIds.Contains(u.Id))
                        .ToListAsync(ct);
                    foreach (var u in unidadesParaAgregar)
                    {
                        u.FlotillaId = id;
                        u.UpdatedAt = DateTimeOffset.UtcNow;
                    }
                }

                if (model.ChoferesIds != null)
                {
                    var hoy = DateOnly.FromDateTime(DateTime.UtcNow);

                    var asignacionesActivas = await ctx.AsignacionesFlotillaChofer
                        .Where(a => a.FlotillaId == id && a.Activo)
                        .ToListAsync(ct);

                    foreach (var asig in asignacionesActivas)
                    {
                        if (!model.ChoferesIds.Contains(asig.ChoferId))
                        {
                            asig.Activo = false;
                            asig.FechaFin = hoy;
                        }
                    }

                    foreach (var choferId in model.ChoferesIds)
                    {
                        var existente = asignacionesActivas.FirstOrDefault(a => a.ChoferId == choferId);
                        if (existente == null)
                        {
                            var otraAsignacion = await ctx.AsignacionesFlotillaChofer
                                .FirstOrDefaultAsync(a => a.ChoferId == choferId && a.Activo, ct);
                            if (otraAsignacion != null)
                            {
                                otraAsignacion.Activo = false;
                                otraAsignacion.FechaFin = hoy;
                            }

                            ctx.AsignacionesFlotillaChofer.Add(new AsignacionFlotillaChofer
                            {
                                FlotillaId = id,
                                ChoferId = choferId,
                                FechaInicio = hoy,
                                Activo = true,
                                CreatedAt = DateTimeOffset.UtcNow
                            });
                        }
                    }
                }

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                _logger.LogInformation("Asignaciones de flotilla actualizadas. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al asignar unidades y choferes.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<FlotillaResumenResponse?> GetFlotillaResumenAsync(long id)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var flotilla = await ctx.Flotillas
            .AsNoTracking()
            .Include(f => f.Sucursal)
            .Include(f => f.Supervisor)
            .Include(f => f.Unidades)
                .ThenInclude(u => u.Mantenimientos)
                    .ThenInclude(m => m.TipoMantenimiento)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (flotilla == null) return null;

        var unidades = flotilla.Unidades.Select(u => new FlotillaUnidadItem(
            u.Id,
            u.Placas,
            u.TipoVehiculo,
            u.Marca,
            u.Modelo,
            u.Anio,
            u.CapacidadKg,
            u.KmOdometroActual,
            u.Estado.ToString(),
            u.Activo
        )).ToList();

        var mantenimientos = flotilla.Unidades
            .SelectMany(u => u.Mantenimientos.Select(m => new FlotillaMantenimientoItem(
                m.Id,
                u.Id,
                u.Placas,
                m.TipoMantenimiento != null ? m.TipoMantenimiento.Nombre : "Servicio",
                m.FechaRealizado,
                m.KmAlMomento,
                m.Costo,
                m.Taller,
                m.Descripcion
            )))
            .OrderByDescending(m => m.FechaRealizado)
            .ToList();

        return new FlotillaResumenResponse(
            flotilla.Id,
            flotilla.Nombre,
            flotilla.Codigo,
            flotilla.SucursalId,
            flotilla.Sucursal?.Nombre,
            flotilla.SupervisorId,
            flotilla.Supervisor != null ? $"{flotilla.Supervisor.Nombre} {flotilla.Supervisor.ApellidoPaterno}".Trim() : null,
            flotilla.Activo,
            unidades,
            mantenimientos
        );
    }
}
