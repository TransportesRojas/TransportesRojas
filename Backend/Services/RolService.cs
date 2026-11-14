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

public class RolService
{
    private readonly IDbContextFactory<TransportesRojasDbContext> _factory;
    private readonly ILogger<RolService> _logger;
    private readonly ResiliencePipeline _pipeline;

    public RolService(
        IDbContextFactory<TransportesRojasDbContext> factory,
        ILogger<RolService> logger)
    {
        _factory = factory;
        _logger = logger;
        _pipeline = PollyPolicies.CrearPipelineSerializacion(logger);
    }

    // Consultas

    public async Task<List<RolResponse>> GetRolesAsync(int skip = 0, int take = 100)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var roles = await ctx.Roles
            .AsNoTracking()
            .Include(r => r.RolPermisos)
                .ThenInclude(rp => rp.Permiso)
            .OrderBy(r => r.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return roles.Select(r => new RolResponse(
            r.Id,
            r.Nombre,
            r.Descripcion,
            r.RolPermisos.Select(rp => new PermisoResumen(
                rp.Permiso.Id,
                rp.Permiso.Codigo,
                rp.Permiso.Nombre,
                rp.Permiso.Modulo
            )).ToList()
        )).ToList();
    }

    public async Task<RolResponse?> GetRolByIdAsync(long id)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var rol = await ctx.Roles
            .AsNoTracking()
            .Include(r => r.RolPermisos)
                .ThenInclude(rp => rp.Permiso)
            .FirstOrDefaultAsync(r => r.Id == id);

        return rol is null
            ? null
            : new RolResponse(
                rol.Id,
                rol.Nombre,
                rol.Descripcion,
                rol.RolPermisos.Select(rp => new PermisoResumen(
                    rp.Permiso.Id,
                    rp.Permiso.Codigo,
                    rp.Permiso.Nombre,
                    rp.Permiso.Modulo
                )).ToList());
    }

    public async Task<List<PermisoResumen>> GetPermisosPorRolAsync(long rolId)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        return await ctx.RolPermisos
            .AsNoTracking()
            .Where(rp => rp.RolId == rolId)
            .Include(rp => rp.Permiso)
            .Select(rp => new PermisoResumen(
                rp.Permiso.Id,
                rp.Permiso.Codigo,
                rp.Permiso.Nombre,
                rp.Permiso.Modulo
            ))
            .ToListAsync();
    }

    public async Task<List<PermisoRolItem>> GetPermisosConEstadoParaRolAsync(long rolId)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var asignados = await ctx.RolPermisos
            .AsNoTracking()
            .Where(rp => rp.RolId == rolId)
            .Select(rp => rp.PermisoId)
            .ToListAsync();

        var asignadosSet = new HashSet<long>(asignados);

        var todos = await ctx.Permisos
            .AsNoTracking()
            .OrderBy(p => p.Modulo)
            .ThenBy(p => p.Codigo)
            .ToListAsync();

        return todos.Select(p => new PermisoRolItem(
            p.Id,
            p.Codigo,
            p.Nombre,
            p.Modulo,
            p.Descripcion,
            asignadosSet.Contains(p.Id)
        )).ToList();
    }

    public async Task<RolResponse> CreateRolAsync(CrearRolModel model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database
                .BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var existeNombre = await ctx.Roles
                    .AnyAsync(r => r.Nombre == model.Nombre, ct);
                if (existeNombre)
                    throw new InvalidOperationException(
                        $"Ya existe un rol con el nombre '{model.Nombre}'.");

                var nuevoRol = new Rol
                {
                    Nombre = model.Nombre,
                    Descripcion = model.Descripcion
                };

                ctx.Roles.Add(nuevoRol);
                await ctx.SaveChangesAsync(ct);

                if (model.PermisoIds != null && model.PermisoIds.Count > 0)
                {
                    foreach (var pid in model.PermisoIds.Distinct())
                    {
                        ctx.RolPermisos.Add(new RolPermiso
                        {
                            RolId = nuevoRol.Id,
                            PermisoId = pid
                        });
                    }
                    await ctx.SaveChangesAsync(ct);
                }

                await tx.CommitAsync(ct);

                _logger.LogInformation("Rol creado exitosamente. Id={RolId}, Nombre='{Nombre}'",
                    nuevoRol.Id, nuevoRol.Nombre);

                return await GetRolByIdAsync(nuevoRol.Id) 
                    ?? new RolResponse(nuevoRol.Id, nuevoRol.Nombre, nuevoRol.Descripcion);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await RollbackSafeAsync(tx);
                throw new RetryableException(
                    "Conflicto de serialización al crear rol.", ex);
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

    public async Task<bool> UpdateRolAsync(long id, ActualizarRolModel model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database
                .BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var rol = await ctx.Roles
                    .Include(r => r.RolPermisos)
                    .FirstOrDefaultAsync(r => r.Id == id, ct);

                if (rol is null)
                    return false;

                var existeNombre = await ctx.Roles
                    .AnyAsync(r => r.Nombre == model.Nombre && r.Id != id, ct);
                if (existeNombre)
                    throw new InvalidOperationException(
                        $"Ya existe otro rol con el nombre '{model.Nombre}'.");

                rol.Nombre = model.Nombre;
                rol.Descripcion = model.Descripcion;

                if (model.PermisoIds != null)
                {
                    ctx.RolPermisos.RemoveRange(rol.RolPermisos);
                    foreach (var pid in model.PermisoIds.Distinct())
                    {
                        ctx.RolPermisos.Add(new RolPermiso
                        {
                            RolId = rol.Id,
                            PermisoId = pid
                        });
                    }
                }

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Rol actualizado exitosamente. Id={RolId}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await RollbackSafeAsync(tx);
                throw new RetryableException(
                    "Conflicto de serialización al actualizar rol.", ex);
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

    // Permisos y mutaciones

    public async Task<bool> AsignarPermisosAsync(long rolId, List<long> permisoIds)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database
                .BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var rol = await ctx.Roles
                    .Include(r => r.RolPermisos)
                    .FirstOrDefaultAsync(r => r.Id == rolId, ct);

                if (rol is null) return false;

                ctx.RolPermisos.RemoveRange(rol.RolPermisos);

                foreach (var pid in permisoIds.Distinct())
                {
                    ctx.RolPermisos.Add(new RolPermiso
                    {
                        RolId = rolId,
                        PermisoId = pid
                    });
                }

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Permisos asignados al rol {RolId}. Cantidad: {Count}", rolId, permisoIds.Count);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await RollbackSafeAsync(tx);
                throw new RetryableException(
                    "Conflicto de serialización al asignar permisos a rol.", ex);
            }
            catch
            {
                await RollbackSafeAsync(tx);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> DeleteRolAsync(long id)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database
                .BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var rol = await ctx.Roles.FindAsync(new object[] { id }, ct);
                if (rol is null)
                    return false;

                var estaEnUso = await ctx.UsuarioRoles
                    .AnyAsync(ur => ur.RolId == id, ct);
                if (estaEnUso)
                    throw new InvalidOperationException(
                        "No se puede eliminar el rol porque está asignado a uno o más usuarios.");

                ctx.Roles.Remove(rol);
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Rol eliminado exitosamente. Id={RolId}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await RollbackSafeAsync(tx);
                throw new RetryableException(
                    "Conflicto de serialización al eliminar rol.", ex);
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
        try
        {
            await tx.RollbackAsync();
        }
        catch (Exception rollbackEx)
        {
            _logger.LogWarning(rollbackEx,
                "Error durante el rollback de la transacción (puede ser esperado si la conexión ya se cerró).");
        }
    }
}