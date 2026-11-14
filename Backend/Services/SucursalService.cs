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

public class SucursalService
{
    private readonly IDbContextFactory<TransportesRojasDbContext> _factory;
    private readonly ILogger<SucursalService> _logger;
    private readonly ResiliencePipeline _pipeline;

    public SucursalService(
        IDbContextFactory<TransportesRojasDbContext> factory,
        ILogger<SucursalService> logger)
    {
        _factory = factory;
        _logger = logger;
        _pipeline = PollyPolicies.CrearPipelineSerializacion(logger);
    }

    public async Task<List<SucursalResponse>> GetSucursalesAsync(int skip = 0, int take = 100)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var sucursales = await ctx.Sucursales
            .AsNoTracking()
            .Include(s => s.Direccion)
            .Include(s => s.Responsable)
            .Include(s => s.Horarios)
            .OrderBy(s => s.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return sucursales.Select(s => new SucursalResponse(
            s.Id,
            s.Nombre,
            s.Direccion?.Calle,
            s.Direccion?.Municipio,
            s.Direccion?.Estado,
            s.Direccion?.CodigoPostal,
            s.Telefono,
            s.Direccion?.Calle,
            s.Direccion?.Municipio,
            s.NombreCorto,
            s.Codigo,
            s.Email,
            s.Cobertura,
            s.ResponsableId,
            s.Responsable != null ? $"{s.Responsable.Nombre} {s.Responsable.ApellidoPaterno}".Trim() : null,
            s.Horarios.OrderBy(h => h.DiaSemana).Select(h => new HorarioSucursalItem(
                h.DiaSemana,
                h.HoraApertura,
                h.HoraCierre,
                h.EsDiaDescanso
            )).ToList())).ToList();
    }

    public async Task<SucursalResponse?> GetSucursalByIdAsync(long id)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var sucursal = await ctx.Sucursales
            .AsNoTracking()
            .Include(s => s.Direccion)
            .Include(s => s.Responsable)
            .Include(s => s.Horarios)
            .FirstOrDefaultAsync(s => s.Id == id);

        return sucursal is null
            ? null
            : new SucursalResponse(
                sucursal.Id,
                sucursal.Nombre,
                sucursal.Direccion?.Calle,
                sucursal.Direccion?.Municipio,
                sucursal.Direccion?.Estado,
                sucursal.Direccion?.CodigoPostal,
                sucursal.Telefono,
                sucursal.Direccion?.Calle,
                sucursal.Direccion?.Municipio,
                sucursal.NombreCorto,
                sucursal.Codigo,
                sucursal.Email,
                sucursal.Cobertura,
                sucursal.ResponsableId,
                sucursal.Responsable != null ? $"{sucursal.Responsable.Nombre} {sucursal.Responsable.ApellidoPaterno}".Trim() : null,
                sucursal.Horarios.OrderBy(h => h.DiaSemana).Select(h => new HorarioSucursalItem(
                    h.DiaSemana,
                    h.HoraApertura,
                    h.HoraCierre,
                    h.EsDiaDescanso
                )).ToList());
    }

    // Registro, edición y baja

    public async Task<SucursalResponse> CreateSucursalAsync(CrearSucursalModel model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database
                .BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var telefonoNormalizado = ValidacionEntradaHelper.NormalizarTelefonoDiezDigitos(model.Telefono, obligatorio: false);
                var cpNormalizado = ValidacionEntradaHelper.NormalizarCodigoPostal(model.CodigoPostal, obligatorio: false);

                var existeNombre = await ctx.Sucursales
                    .AnyAsync(s => s.Nombre == model.Nombre, ct);
                if (existeNombre)
                    throw new InvalidOperationException(
                        $"Ya existe una sucursal con el nombre '{model.Nombre}'.");

                var calle = model.ObtenerCalle();
                var ciudad = model.ObtenerCiudad();

                var nueva = new Sucursal
                {
                    Nombre = model.Nombre,
                    NombreCorto = model.NombreCorto,
                    Codigo = model.Codigo,
                    Email = model.Email,
                    Cobertura = model.Cobertura,
                    ResponsableId = model.ResponsableId,
                    Telefono = telefonoNormalizado,
                    Direccion = new Direccion
                    {
                        Calle = calle,
                        Municipio = ciudad,
                        Estado = model.Estado,
                        CodigoPostal = cpNormalizado
                    }
                };

                if (model.Horarios != null && model.Horarios.Count > 0)
                {
                    foreach (var h in model.Horarios)
                    {
                        nueva.Horarios.Add(new HorarioSucursal
                        {
                            DiaSemana = h.DiaSemana,
                            HoraApertura = h.HoraApertura,
                            HoraCierre = h.HoraCierre,
                            EsDiaDescanso = h.EsDiaDescanso
                        });
                    }
                }

                ctx.Sucursales.Add(nueva);
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Sucursal creada. Id={Id}, Nombre='{Nombre}'",
                    nueva.Id, nueva.Nombre);

                return new SucursalResponse(
                    nueva.Id,
                    nueva.Nombre,
                    nueva.Direccion.Calle,
                    nueva.Direccion.Municipio,
                    nueva.Direccion.Estado,
                    nueva.Direccion.CodigoPostal,
                    nueva.Telefono,
                    nueva.Direccion.Calle,
                    nueva.Direccion.Municipio,
                    nueva.NombreCorto,
                    nueva.Codigo,
                    nueva.Email,
                    nueva.Cobertura,
                    nueva.ResponsableId,
                    null,
                    nueva.Horarios.OrderBy(h => h.DiaSemana).Select(h => new HorarioSucursalItem(
                        h.DiaSemana,
                        h.HoraApertura,
                        h.HoraCierre,
                        h.EsDiaDescanso
                    )).ToList());
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await RollbackSafeAsync(tx);
                throw new RetryableException("Conflicto de serialización al crear sucursal.", ex);
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

    public async Task<bool> UpdateSucursalAsync(long id, ActualizarSucursalModel model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database
                .BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var telefonoNormalizado = ValidacionEntradaHelper.NormalizarTelefonoDiezDigitos(model.Telefono, obligatorio: false);
                var cpNormalizado = ValidacionEntradaHelper.NormalizarCodigoPostal(model.CodigoPostal, obligatorio: false);

                var sucursal = await ctx.Sucursales
                    .Include(s => s.Direccion)
                    .Include(s => s.Horarios)
                    .FirstOrDefaultAsync(s => s.Id == id, ct);

                if (sucursal is null) return false;

                var existeNombre = await ctx.Sucursales
                    .AnyAsync(s => s.Nombre == model.Nombre && s.Id != id, ct);
                if (existeNombre)
                    throw new InvalidOperationException(
                        $"Ya existe otra sucursal con el nombre '{model.Nombre}'.");

                var calle = model.ObtenerCalle();
                var ciudad = model.ObtenerCiudad();

                sucursal.Nombre = model.Nombre;
                sucursal.NombreCorto = model.NombreCorto;
                sucursal.Codigo = model.Codigo;
                sucursal.Email = model.Email;
                sucursal.Cobertura = model.Cobertura;
                sucursal.ResponsableId = model.ResponsableId;
                sucursal.Telefono = telefonoNormalizado;

                if (sucursal.Direccion is null)
                {
                    sucursal.Direccion = new Direccion
                    {
                        Calle = calle,
                        Municipio = ciudad,
                        Estado = model.Estado,
                        CodigoPostal = cpNormalizado
                    };
                }
                else
                {
                    sucursal.Direccion.Calle = calle;
                    sucursal.Direccion.Municipio = ciudad;
                    sucursal.Direccion.Estado = model.Estado;
                    sucursal.Direccion.CodigoPostal = cpNormalizado;
                }

                if (model.Horarios != null)
                {
                    ctx.HorariosSucursal.RemoveRange(sucursal.Horarios);
                    sucursal.Horarios.Clear();
                    foreach (var h in model.Horarios)
                    {
                        sucursal.Horarios.Add(new HorarioSucursal
                        {
                            SucursalId = sucursal.Id,
                            DiaSemana = h.DiaSemana,
                            HoraApertura = h.HoraApertura,
                            HoraCierre = h.HoraCierre,
                            EsDiaDescanso = h.EsDiaDescanso
                        });
                    }
                }

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Sucursal actualizada. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await RollbackSafeAsync(tx);
                throw new RetryableException("Conflicto de serialización al actualizar sucursal.", ex);
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

    public async Task<bool> DeleteSucursalAsync(long id)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database
                .BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var sucursal = await ctx.Sucursales
                    .Include(s => s.Direccion)
                    .FirstOrDefaultAsync(s => s.Id == id, ct);

                if (sucursal is null) return false;

                var tieneEmpleados = await ctx.Empleados
                    .AnyAsync(e => e.SucursalId == id, ct);
                if (tieneEmpleados)
                    throw new InvalidOperationException(
                        "No se puede eliminar la sucursal porque tiene empleados asignados.");

                if (sucursal.Direccion is not null)
                    ctx.Direcciones.Remove(sucursal.Direccion);

                ctx.Sucursales.Remove(sucursal);

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Sucursal eliminada. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await RollbackSafeAsync(tx);
                throw new RetryableException("Conflicto de serialización al eliminar sucursal.", ex);
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