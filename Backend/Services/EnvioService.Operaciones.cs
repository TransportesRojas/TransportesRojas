using System.Data;
using System.Text.Json;
using Backend.BDFolder;
using Backend.Exceptions;
using Backend.Helpers;
using Backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public partial class EnvioService
{
    public async Task<RecursosAsignacionEnvioResponse> ObtenerRecursosAsignacionAsync(
        ContextoSeguridadUsuario contextoRaw)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var contexto = await EnriquecerContextoAsync(ctx, contextoRaw);

        var autorizado =
            contexto.TienePermisoORolRespaldo("envio.asignar_flotilla", "Supervisor", "Jefe") ||
            contexto.TienePermisoORolRespaldo("ruta.planificar", "Jefe de flotilla", "Jefe") ||
            contexto.TienePermisoORolRespaldo("ruta.asignar_recursos", "Jefe de flotilla", "Jefe");

        if (!autorizado)
        {
            throw new UnauthorizedAccessException("No cuentas con permisos para consultar recursos de asignación de rutas y flotillas.");
        }

        IQueryable<Flotilla> flotillasQuery = ctx.Flotillas
            .AsNoTracking()
            .Include(f => f.Sucursal)
            .Where(f => f.Activo);

        if (!contexto.TieneRol("Jefe"))
        {
            var sucId = contexto.SucursalId;
            var empId = contexto.EmpleadoId;

            if (empId.HasValue && contexto.TieneRol("Jefe de flotilla") && !contexto.TieneRol("Supervisor"))
            {
                var tieneFlotillaDirecta = await flotillasQuery.AnyAsync(f => f.SupervisorId == empId.Value);
                if (tieneFlotillaDirecta)
                {
                    flotillasQuery = flotillasQuery.Where(f => f.SupervisorId == empId.Value);
                }
                else if (sucId.HasValue)
                {
                    flotillasQuery = flotillasQuery.Where(f => f.SucursalId == sucId.Value);
                }
            }
            else if (sucId.HasValue || empId.HasValue)
            {
                var tieneLocales = await flotillasQuery.AnyAsync(f =>
                    (sucId.HasValue && f.SucursalId == sucId.Value) ||
                    (empId.HasValue && f.SupervisorId == empId.Value));

                if (tieneLocales)
                {
                    flotillasQuery = flotillasQuery.Where(f =>
                        (sucId.HasValue && f.SucursalId == sucId.Value) ||
                        (empId.HasValue && f.SupervisorId == empId.Value));
                }
            }
        }

        var flotillas = await flotillasQuery
            .OrderBy(f => f.Nombre)
            .Select(f => new FlotillaAsignableItem(
                f.Id,
                f.Nombre,
                f.Codigo,
                f.SucursalId,
                f.Sucursal != null ? (f.Sucursal.NombreCorto ?? f.Sucursal.Nombre) : null,
                f.SupervisorId))
            .ToListAsync();

        var flotillaIds = flotillas.Select(f => f.Id).ToHashSet();

        var unidadesEntidades = await ctx.Unidades
            .AsNoTracking()
            .Where(u =>
                u.Activo &&
                (u.Estado == EstadoUnidad.Disponible || u.Estado == EstadoUnidad.Asignada) &&
                u.FlotillaId != null &&
                flotillaIds.Contains(u.FlotillaId.Value))
            .OrderBy(u => u.Placas)
            .ToListAsync();

        var unidades = unidadesEntidades
            .Select(u => new UnidadAsignableItem(
                u.Id,
                u.Placas,
                u.Marca,
                u.Modelo,
                u.TipoVehiculo,
                u.CapacidadKg,
                ConvertidorASnake.ToSnake(u.Estado),
                u.FlotillaId))
            .ToList();

        var asignacionesChoferActivas = await ctx.AsignacionesFlotillaChofer
            .AsNoTracking()
            .Where(a => a.Activo && flotillaIds.Contains(a.FlotillaId))
            .ToListAsync();

        var mapaFlotillaPorChofer = asignacionesChoferActivas
            .GroupBy(a => a.ChoferId)
            .ToDictionary(g => g.Key, g => (long?)g.First().FlotillaId);

        var choferIdsAsignados = mapaFlotillaPorChofer.Keys.ToHashSet();

        var choferesCandidatos = await ctx.Empleados
            .AsNoTracking()
            .Include(e => e.Usuario)
            .Where(e =>
                e.Activo &&
                e.Usuario.Activo &&
                choferIdsAsignados.Contains(e.Id))
            .OrderBy(e => e.Nombre)
            .ThenBy(e => e.ApellidoPaterno)
            .ToListAsync();

        var choferes = choferesCandidatos
            .Select(c => new ChoferAsignableItem(
                c.Id,
                FormatearNombreCompleto(c.Nombre, c.ApellidoPaterno, c.ApellidoMaterno, c.Email),
                c.Telefono,
                c.SucursalId,
                mapaFlotillaPorChofer.GetValueOrDefault(c.Id)))
            .ToList();

        return new RecursosAsignacionEnvioResponse(flotillas, unidades, choferes);
    }

    // Recepción en sucursal y asignación a flotilla/ruta

    public async Task<EnvioDetalleResponse> ConfirmarRecoleccionAsync(
        long envioId,
        ConfirmarRecoleccionModel model,
        ContextoSeguridadUsuario contextoRaw)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var contexto = await EnriquecerContextoAsync(ctx, contextoRaw, ct);
                var autorizado =
                    contexto.TienePermisoORolRespaldo("envio.recepcion_sucursal", "Personal de sucursal") ||
                    contexto.TienePermisoORolRespaldo("ruta.iniciar_recorrido", "Chofer") ||
                    contexto.TienePermisoORolRespaldo("envio.asignar_flotilla", "Supervisor", "Jefe de flotilla");

                if (!autorizado)
                    throw new UnauthorizedAccessException("Tu rol no cuenta con permisos para confirmar la recolección de paquetes.");

                var envio = await ctx.Envios
                    .FirstOrDefaultAsync(e => e.Id == envioId, ct)
                    ?? throw new KeyNotFoundException($"No se encontró el envío con identificador {envioId}.");

                if (envio.Estado is not (EstadoEnvio.RecoleccionProgramada or EstadoEnvio.Reprogramado))
                {
                    throw new InvalidOperationException(
                        $"No se puede confirmar recolección porque el envío se encuentra en estado '{ConvertidorASnake.ToSnake(envio.Estado)}'.");
                }

                var ahora = DateTimeOffset.UtcNow;

                if (!envio.SucursalRecepcionId.HasValue && contexto.SucursalId.HasValue)
                {
                    envio.SucursalRecepcionId = contexto.SucursalId.Value;
                }

                envio.Estado = EstadoEnvio.RecoleccionRealizada;
                envio.UpdatedAt = ahora;

                var desc = string.IsNullOrWhiteSpace(model.Observaciones)
                    ? "RECOLECCIÓN A DOMICILIO REALIZADA EXITOSAMENTE."
                    : $"RECOLECCIÓN A DOMICILIO REALIZADA: {model.Observaciones.Trim()}";

                ctx.EventosEnvio.Add(new EventoEnvio
                {
                    EnvioId = envio.Id,
                    Estado = "recoleccion_realizada",
                    Descripcion = desc,
                    Latitud = model.Latitud,
                    Longitud = model.Longitud,
                    UsuarioId = contexto.UsuarioId,
                    FechaEvento = ahora
                });

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                var completo = await CargarEnvioCompletoQuery(ctx).FirstAsync(e => e.Id == envioId, ct);
                return MapearDetalleResponse(completo, contexto);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de concurrencia al confirmar recolección.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<EnvioDetalleResponse> RegistrarRecepcionSucursalAsync(
        long envioId,
        RecepcionSucursalModel model,
        ContextoSeguridadUsuario contextoRaw)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var contexto = await EnriquecerContextoAsync(ctx, contextoRaw, ct);
                var autorizado = contexto.TienePermisoORolRespaldo(
                    "envio.recepcion_sucursal",
                    "Personal de sucursal");

                if (!autorizado)
                    throw new UnauthorizedAccessException("Tu rol no cuenta con el permiso 'envio.recepcion_sucursal' para recibir paquetes en mostrador.");

                var empleadoId = await ResolverEmpleadoOperativoRequeridoAsync(ctx, contexto, ct);

                var envio = await ctx.Envios
                    .Include(e => e.Recepcion)
                    .FirstOrDefaultAsync(e => e.Id == envioId, ct)
                    ?? throw new KeyNotFoundException($"No se encontró el envío con identificador {envioId}.");

                if (envio.Estado is not (EstadoEnvio.Registrado or EstadoEnvio.RecoleccionProgramada or EstadoEnvio.RecoleccionRealizada))
                {
                    throw new InvalidOperationException(
                        $"Solo pueden recibirse en sucursal envíos en estado registrado o recolectado (estado actual: '{ConvertidorASnake.ToSnake(envio.Estado)}').");
                }

                Sucursal? sucursalRecepcion = null;
                var sucursalEfectivaId = model.SucursalId ?? contexto.SucursalId ?? envio.SucursalRecepcionId;
                if (sucursalEfectivaId.HasValue && sucursalEfectivaId.Value > 0)
                {
                    sucursalRecepcion = await ctx.Sucursales
                        .FirstOrDefaultAsync(s => s.Id == sucursalEfectivaId.Value && s.Activo, ct);

                    if (sucursalRecepcion is null)
                        throw new InvalidOperationException("La sucursal indicada para recepción no existe o está inactiva.");

                    envio.SucursalRecepcionId = sucursalRecepcion.Id;
                }

                var ahora = DateTimeOffset.UtcNow;
                if (envio.Recepcion is null)
                {
                    ctx.RecepcionesPaquete.Add(new RecepcionPaquete
                    {
                        EnvioId = envio.Id,
                        RecibidoPor = empleadoId,
                        FechaRecepcion = ahora,
                        PesoVerificadoKg = Math.Round(model.PesoVerificadoKg, 2),
                        LargoVerificadoCm = Math.Round(model.LargoVerificadoCm, 2),
                        AnchoVerificadoCm = Math.Round(model.AnchoVerificadoCm, 2),
                        AltoVerificadoCm = Math.Round(model.AltoVerificadoCm, 2),
                        EvidenciaFotoUrl = string.IsNullOrWhiteSpace(model.EvidenciaFotoUrl) ? null : model.EvidenciaFotoUrl.Trim(),
                        Observaciones = string.IsNullOrWhiteSpace(model.Observaciones) ? null : model.Observaciones.Trim(),
                        CreatedAt = ahora
                    });
                }
                else
                {
                    envio.Recepcion.RecibidoPor = empleadoId;
                    envio.Recepcion.FechaRecepcion = ahora;
                    envio.Recepcion.PesoVerificadoKg = Math.Round(model.PesoVerificadoKg, 2);
                    envio.Recepcion.LargoVerificadoCm = Math.Round(model.LargoVerificadoCm, 2);
                    envio.Recepcion.AnchoVerificadoCm = Math.Round(model.AnchoVerificadoCm, 2);
                    envio.Recepcion.AltoVerificadoCm = Math.Round(model.AltoVerificadoCm, 2);
                    envio.Recepcion.EvidenciaFotoUrl = string.IsNullOrWhiteSpace(model.EvidenciaFotoUrl) ? null : model.EvidenciaFotoUrl.Trim();
                    envio.Recepcion.Observaciones = string.IsNullOrWhiteSpace(model.Observaciones) ? null : model.Observaciones.Trim();
                }

                envio.Estado = EstadoEnvio.RecibidoSucursal;
                envio.UpdatedAt = ahora;

                var nombreSuc = sucursalRecepcion != null
                    ? (sucursalRecepcion.NombreCorto ?? sucursalRecepcion.Nombre)
                    : "MOSTRADOR";

                ctx.EventosEnvio.Add(new EventoEnvio
                {
                    EnvioId = envio.Id,
                    Estado = "recibido_sucursal",
                    Descripcion = $"PAQUETE RECIBIDO Y VERIFICADO EN SUCURSAL {nombreSuc} ({Math.Round(model.PesoVerificadoKg, 2)} KG).",
                    UsuarioId = contexto.UsuarioId,
                    FechaEvento = ahora
                });

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                var completo = await CargarEnvioCompletoQuery(ctx).FirstAsync(e => e.Id == envioId, ct);
                return MapearDetalleResponse(completo, contexto);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de concurrencia al registrar recepción en sucursal.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<EnvioDetalleResponse> AsignarFlotillaYRutaAsync(
        long envioId,
        AsignarFlotillaRutaModel model,
        ContextoSeguridadUsuario contextoRaw)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var contexto = await EnriquecerContextoAsync(ctx, contextoRaw, ct);
                var autorizado =
                    contexto.TienePermisoORolRespaldo("envio.asignar_flotilla", "Supervisor") ||
                    contexto.TienePermisoORolRespaldo("ruta.planificar", "Jefe de flotilla") ||
                    contexto.TienePermisoORolRespaldo("ruta.asignar_recursos", "Jefe de flotilla");

                if (!autorizado)
                {
                    throw new UnauthorizedAccessException(
                        "Tu rol no cuenta con permisos ('envio.asignar_flotilla' / 'ruta.planificar') para asignar flotillas o rutas.");
                }

                var envio = await ctx.Envios
                    .Include(e => e.Rutas)
                        .ThenInclude(re => re.Ruta)
                    .FirstOrDefaultAsync(e => e.Id == envioId, ct)
                    ?? throw new KeyNotFoundException($"No se encontró el envío con identificador {envioId}.");

                if (envio.Estado is not (
                    EstadoEnvio.RecibidoSucursal or
                    EstadoEnvio.RecoleccionRealizada or
                    EstadoEnvio.AsignadoFlotilla or
                    EstadoEnvio.Reprogramado or
                    EstadoEnvio.NoEntregado))
                {
                    throw new InvalidOperationException(
                        $"El envío en estado '{ConvertidorASnake.ToSnake(envio.Estado)}' no puede asignarse a una flotilla. Primero debe recibirse en sucursal o recolectarse.");
                }

                var flotilla = await ctx.Flotillas
                    .FirstOrDefaultAsync(f => f.Id == model.FlotillaId && f.Activo, ct)
                    ?? throw new InvalidOperationException("La flotilla seleccionada no existe o se encuentra inactiva.");

                Unidad? unidad = null;
                if (model.UnidadId.HasValue)
                {
                    unidad = await ctx.Unidades
                        .FirstOrDefaultAsync(u => u.Id == model.UnidadId.Value && u.Activo, ct)
                        ?? throw new InvalidOperationException("La unidad vehicular seleccionada no existe o se encuentra inactiva.");

                    if (unidad.Estado is EstadoUnidad.Mantenimiento or EstadoUnidad.FueraServicio)
                        throw new InvalidOperationException($"La unidad '{unidad.Placas}' no está disponible (estado: {ConvertidorASnake.ToSnake(unidad.Estado)}).");
                }

                Empleado? chofer = null;
                long? choferIdEfectivo = model.ChoferId;
                if (choferIdEfectivo.HasValue)
                {
                    chofer = await ctx.Empleados
                        .FirstOrDefaultAsync(c => c.Id == choferIdEfectivo.Value && c.Activo, ct)
                        ?? throw new InvalidOperationException("El chofer seleccionado no existe o se encuentra inactivo.");
                }
                else
                {
                    var choferesFlotilla = await ctx.AsignacionesFlotillaChofer
                        .Include(a => a.Chofer)
                        .Where(a => a.FlotillaId == flotilla.Id && a.Activo && a.Chofer.Activo)
                        .ToListAsync(ct);

                    if (choferesFlotilla.Count == 1)
                    {
                        chofer = choferesFlotilla[0].Chofer;
                        choferIdEfectivo = chofer.Id;
                    }
                }

                var ahora = DateTimeOffset.UtcNow;
                var fechaRuta = model.FechaRuta ?? DateOnly.FromDateTime(ahora.ToOffset(TimeSpan.FromHours(-7)).DateTime);

                var rutaDestino = await ctx.Rutas
                    .Include(r => r.Envios)
                    .FirstOrDefaultAsync(r =>
                        r.Estado == EstadoRuta.Planeada &&
                        r.Fecha == fechaRuta &&
                        r.FlotillaId == flotilla.Id &&
                        r.ChoferId == choferIdEfectivo &&
                        r.UnidadId == model.UnidadId, ct);

                if (rutaDestino is null)
                {
                    rutaDestino = new Ruta
                    {
                        FlotillaId = flotilla.Id,
                        ChoferId = choferIdEfectivo,
                        UnidadId = model.UnidadId,
                        Fecha = fechaRuta,
                        Estado = EstadoRuta.Planeada,
                        OrigenSucursalId = envio.SucursalRecepcionId ?? flotilla.SucursalId ?? contexto.SucursalId,
                        DistanciaEstimadaKm = model.DistanciaEstimadaKm,
                        TiempoEstimadoMin = model.TiempoEstimadoMin,
                        CreatedBy = contexto.EmpleadoId,
                        CreatedAt = ahora,
                        UpdatedAt = ahora
                    };
                    ctx.Rutas.Add(rutaDestino);
                    await ctx.SaveChangesAsync(ct);
                }
                else
                {
                    if (model.DistanciaEstimadaKm.HasValue)
                        rutaDestino.DistanciaEstimadaKm = model.DistanciaEstimadaKm;
                    if (model.TiempoEstimadoMin.HasValue)
                        rutaDestino.TiempoEstimadoMin = model.TiempoEstimadoMin;
                    rutaDestino.UpdatedAt = ahora;
                }

                var pendientesOtrasRutas = envio.Rutas
                    .Where(re => re.RutaId != rutaDestino.Id && re.Estado == EstadoRutaEnvio.Pendiente && re.Ruta.Estado == EstadoRuta.Planeada)
                    .ToList();

                if (pendientesOtrasRutas.Count > 0)
                {
                    ctx.RutasEnvios.RemoveRange(pendientesOtrasRutas);
                }

                var vinculoExistente = await ctx.RutasEnvios
                    .FirstOrDefaultAsync(re => re.RutaId == rutaDestino.Id && re.EnvioId == envio.Id, ct);

                if (vinculoExistente is null)
                {
                    var maxOrden = await ctx.RutasEnvios
                        .Where(re => re.RutaId == rutaDestino.Id)
                        .Select(re => (int?)re.OrdenEntrega)
                        .MaxAsync(ct) ?? 0;

                    var ordenEfectivo = model.OrdenEntrega.HasValue && model.OrdenEntrega.Value > 0
                        ? model.OrdenEntrega.Value
                        : maxOrden + 1;

                    ctx.RutasEnvios.Add(new RutaEnvio
                    {
                        RutaId = rutaDestino.Id,
                        EnvioId = envio.Id,
                        OrdenEntrega = ordenEfectivo,
                        Estado = EstadoRutaEnvio.Pendiente
                    });
                }
                else
                {
                    vinculoExistente.Estado = EstadoRutaEnvio.Pendiente;
                    if (model.OrdenEntrega.HasValue && model.OrdenEntrega.Value > 0)
                    {
                        vinculoExistente.OrdenEntrega = model.OrdenEntrega.Value;
                    }
                }

                if (unidad is not null && unidad.Estado == EstadoUnidad.Disponible)
                {
                    unidad.Estado = EstadoUnidad.Asignada;
                    unidad.UpdatedAt = ahora;
                }

                envio.Metadata = ActualizarMetadataEnvio(envio.Metadata, new Dictionary<string, object?>
                {
                    ["flotillaId"] = flotilla.Id,
                    ["flotillaNombre"] = flotilla.Nombre,
                    ["rutaActivaId"] = rutaDestino.Id
                });
                envio.Estado = EstadoEnvio.AsignadoFlotilla;
                envio.UpdatedAt = ahora;

                var partesDetalle = new List<string> { $"FLOTILLA {flotilla.Nombre}" };
                if (unidad is not null) partesDetalle.Add($"UNIDAD {unidad.Placas}");
                if (chofer is not null)
                    partesDetalle.Add($"CHOFER {FormatearNombreCompleto(chofer.Nombre, chofer.ApellidoPaterno, chofer.ApellidoMaterno)}");

                var desc = $"ENVÍO ASIGNADO A {string.Join(" · ", partesDetalle)}.";
                if (!string.IsNullOrWhiteSpace(model.Observaciones))
                    desc += $" NOTA: {model.Observaciones.Trim()}";

                ctx.EventosEnvio.Add(new EventoEnvio
                {
                    EnvioId = envio.Id,
                    Estado = "asignado_flotilla",
                    Descripcion = desc,
                    UsuarioId = contexto.UsuarioId,
                    FechaEvento = ahora
                });

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                var completo = await CargarEnvioCompletoQuery(ctx).FirstAsync(e => e.Id == envioId, ct);
                return MapearDetalleResponse(completo, contexto);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de concurrencia al asignar flotilla y ruta.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<RutaPlanificadaResultadoResponse> PlanificarRutaConsolidadaAsync(
        PlanificarRutaConsolidadaModel model,
        ContextoSeguridadUsuario contextoRaw)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var contexto = await EnriquecerContextoAsync(ctx, contextoRaw, ct);
                var autorizado =
                    contexto.TienePermisoORolRespaldo("ruta.planificar", "Jefe de flotilla", "Jefe") ||
                    contexto.TienePermisoORolRespaldo("ruta.asignar_recursos", "Jefe de flotilla", "Jefe");

                if (!autorizado)
                {
                    throw new UnauthorizedAccessException(
                        "Tu rol no cuenta con permisos ('ruta.planificar' / 'ruta.asignar_recursos') para planificar rutas de entrega.");
                }

                if (model.EnviosIdsOrdenados is null || model.EnviosIdsOrdenados.Count == 0)
                {
                    throw new InvalidOperationException("Debes seleccionar al menos un envío pendiente para planificar la ruta.");
                }

                var unidad = await ctx.Unidades
                    .FirstOrDefaultAsync(u => u.Id == model.UnidadId && u.Activo, ct)
                    ?? throw new InvalidOperationException("La unidad vehicular seleccionada no existe o se encuentra inactiva.");

                if (unidad.Estado is EstadoUnidad.Mantenimiento or EstadoUnidad.FueraServicio)
                {
                    throw new InvalidOperationException(
                        $"La unidad '{unidad.Placas}' no está disponible (estado: {ConvertidorASnake.ToSnake(unidad.Estado)}).");
                }

                var chofer = await ctx.Empleados
                    .FirstOrDefaultAsync(c => c.Id == model.ChoferId && c.Activo, ct)
                    ?? throw new InvalidOperationException("El chofer seleccionado no existe o se encuentra inactivo.");

                var flotillaIdEfectiva = model.FlotillaId.HasValue && model.FlotillaId.Value > 0
                    ? model.FlotillaId.Value
                    : unidad.FlotillaId;

                if (!flotillaIdEfectiva.HasValue)
                {
                    flotillaIdEfectiva = await ctx.AsignacionesFlotillaChofer
                        .Where(a => a.ChoferId == chofer.Id && a.Activo)
                        .Select(a => (long?)a.FlotillaId)
                        .FirstOrDefaultAsync(ct);
                }

                var flotilla = flotillaIdEfectiva.HasValue
                    ? await ctx.Flotillas.FirstOrDefaultAsync(f => f.Id == flotillaIdEfectiva.Value && f.Activo, ct)
                    : await ctx.Flotillas.Where(f => f.Activo).OrderBy(f => f.Id).FirstOrDefaultAsync(ct);

                if (flotilla is null)
                {
                    throw new InvalidOperationException("No se encontró una flotilla activa asociada a la unidad o chofer.");
                }

                var idsUnicos = model.EnviosIdsOrdenados.Distinct().ToList();
                var envios = await ctx.Envios
                    .Include(e => e.Rutas)
                        .ThenInclude(re => re.Ruta)
                    .Where(e => idsUnicos.Contains(e.Id))
                    .ToListAsync(ct);

                if (envios.Count != idsUnicos.Count)
                {
                    throw new KeyNotFoundException("Uno o más envíos seleccionados no fueron encontrados.");
                }

                var pesoTotalKg = envios.Sum(e => e.PesoKg);
                if (unidad.CapacidadKg > 0 && pesoTotalKg > unidad.CapacidadKg)
                {
                    throw new InvalidOperationException(
                        $"El peso total de los envíos seleccionados ({pesoTotalKg:N2} kg) supera la capacidad máxima de carga de la unidad '{unidad.Placas}' ({unidad.CapacidadKg:N2} kg). Asigne una unidad con mayor capacidad o reduzca los paquetes del lote.");
                }

                var mapaEnvios = envios.ToDictionary(e => e.Id);
                var ahora = DateTimeOffset.UtcNow;
                var fechaRuta = model.FechaRuta ?? DateOnly.FromDateTime(ahora.ToOffset(TimeSpan.FromHours(-7)).DateTime);
                var primerEnvio = mapaEnvios[idsUnicos[0]];

                var rutaDestino = await ctx.Rutas
                    .Include(r => r.Envios)
                    .FirstOrDefaultAsync(r =>
                        r.Estado == EstadoRuta.Planeada &&
                        r.Fecha == fechaRuta &&
                        r.FlotillaId == flotilla.Id &&
                        r.ChoferId == chofer.Id &&
                        r.UnidadId == unidad.Id, ct);

                if (rutaDestino is null)
                {
                    rutaDestino = new Ruta
                    {
                        FlotillaId = flotilla.Id,
                        ChoferId = chofer.Id,
                        UnidadId = unidad.Id,
                        Fecha = fechaRuta,
                        Estado = EstadoRuta.Planeada,
                        OrigenSucursalId = primerEnvio.SucursalRecepcionId ?? flotilla.SucursalId ?? contexto.SucursalId,
                        DistanciaEstimadaKm = model.DistanciaEstimadaKm,
                        TiempoEstimadoMin = model.TiempoEstimadoMin,
                        CreatedBy = contexto.EmpleadoId,
                        CreatedAt = ahora,
                        UpdatedAt = ahora
                    };
                    ctx.Rutas.Add(rutaDestino);
                    await ctx.SaveChangesAsync(ct);
                }
                else
                {
                    if (model.DistanciaEstimadaKm.HasValue)
                        rutaDestino.DistanciaEstimadaKm = model.DistanciaEstimadaKm;
                    if (model.TiempoEstimadoMin.HasValue)
                        rutaDestino.TiempoEstimadoMin = model.TiempoEstimadoMin;
                    rutaDestino.UpdatedAt = ahora;
                }

                if (unidad.Estado == EstadoUnidad.Disponible)
                {
                    unidad.Estado = EstadoUnidad.Asignada;
                    unidad.UpdatedAt = ahora;
                }

                var choferNombre = FormatearNombreCompleto(chofer.Nombre, chofer.ApellidoPaterno, chofer.ApellidoMaterno);
                var guiasAsignadas = new List<string>();

                for (var idx = 0; idx < idsUnicos.Count; idx++)
                {
                    var envio = mapaEnvios[idsUnicos[idx]];
                    var ordenParada = idx + 1;

                    if (envio.Estado is not (
                        EstadoEnvio.RecibidoSucursal or
                        EstadoEnvio.RecoleccionRealizada or
                        EstadoEnvio.AsignadoFlotilla or
                        EstadoEnvio.Reprogramado or
                        EstadoEnvio.NoEntregado))
                    {
                        throw new InvalidOperationException(
                            $"El envío {envio.Guia} en estado '{ConvertidorASnake.ToSnake(envio.Estado)}' no puede incluirse en la ruta.");
                    }

                    var pendientesOtrasRutas = envio.Rutas
                        .Where(re => re.RutaId != rutaDestino.Id && re.Estado == EstadoRutaEnvio.Pendiente && re.Ruta.Estado == EstadoRuta.Planeada)
                        .ToList();

                    if (pendientesOtrasRutas.Count > 0)
                    {
                        ctx.RutasEnvios.RemoveRange(pendientesOtrasRutas);
                    }

                    var vinculo = await ctx.RutasEnvios
                        .FirstOrDefaultAsync(re => re.RutaId == rutaDestino.Id && re.EnvioId == envio.Id, ct);

                    if (vinculo is null)
                    {
                        ctx.RutasEnvios.Add(new RutaEnvio
                        {
                            RutaId = rutaDestino.Id,
                            EnvioId = envio.Id,
                            OrdenEntrega = ordenParada,
                            Estado = EstadoRutaEnvio.Pendiente
                        });
                    }
                    else
                    {
                        vinculo.OrdenEntrega = ordenParada;
                        vinculo.Estado = EstadoRutaEnvio.Pendiente;
                    }

                    envio.Metadata = ActualizarMetadataEnvio(envio.Metadata, new Dictionary<string, object?>
                    {
                        ["flotillaId"] = flotilla.Id,
                        ["flotillaNombre"] = flotilla.Nombre,
                        ["rutaActivaId"] = rutaDestino.Id,
                        ["ordenEntrega"] = ordenParada,
                        ["consumoCombustibleEstimadoLitros"] = model.ConsumoCombustibleEstimadoLitros,
                        ["rutaRecomendada"] = model.NombreRutaRecomendada
                    });
                    envio.Estado = EstadoEnvio.AsignadoFlotilla;
                    envio.UpdatedAt = ahora;

                    var detalleRuta = $"PARADA #{ordenParada} EN RUTA OPTIMIZADA · FLOTILLA {flotilla.Nombre} · UNIDAD {unidad.Placas} · CHOFER {choferNombre}";
                    if (!string.IsNullOrWhiteSpace(model.NombreRutaRecomendada))
                        detalleRuta += $" · VÍA: {model.NombreRutaRecomendada.Trim()}";
                    if (model.DistanciaEstimadaKm.HasValue)
                        detalleRuta += $" · DIST. RUTA: {model.DistanciaEstimadaKm.Value:0.0} KM";
                    if (model.ConsumoCombustibleEstimadoLitros.HasValue)
                        detalleRuta += $" · COMBUSTIBLE EST.: {model.ConsumoCombustibleEstimadoLitros.Value:0.00} L";
                    if (!string.IsNullOrWhiteSpace(model.Observaciones))
                        detalleRuta += $" · NOTA: {model.Observaciones.Trim()}";

                    ctx.EventosEnvio.Add(new EventoEnvio
                    {
                        EnvioId = envio.Id,
                        Estado = "asignado_flotilla",
                        Descripcion = detalleRuta,
                        UsuarioId = contexto.UsuarioId,
                        FechaEvento = ahora
                    });

                    guiasAsignadas.Add(envio.Guia);
                }

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                return new RutaPlanificadaResultadoResponse(
                    rutaDestino.Id,
                    flotilla.Id,
                    flotilla.Nombre,
                    chofer.Id,
                    choferNombre,
                    unidad.Id,
                    unidad.Placas,
                    fechaRuta,
                    rutaDestino.DistanciaEstimadaKm,
                    rutaDestino.TiempoEstimadoMin,
                    model.ConsumoCombustibleEstimadoLitros,
                    guiasAsignadas.Count,
                    guiasAsignadas);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de concurrencia al planificar ruta consolidada.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    // Entregas, reprogramación, cancelación y devoluciones

    public async Task<EnvioDetalleResponse> IniciarRutaAsync(
        long envioId,
        IniciarRutaEnvioModel model,
        ContextoSeguridadUsuario contextoRaw)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var contexto = await EnriquecerContextoAsync(ctx, contextoRaw, ct);
                var autorizado = contexto.TienePermisoORolRespaldo(
                    "ruta.iniciar_recorrido",
                    "Chofer");

                if (!autorizado)
                    throw new UnauthorizedAccessException("Tu rol no cuenta con el permiso 'ruta.iniciar_recorrido' para iniciar el reparto.");

                var envio = await ctx.Envios
                    .Include(e => e.Rutas)
                        .ThenInclude(re => re.Ruta)
                            .ThenInclude(r => r.Unidad)
                    .FirstOrDefaultAsync(e => e.Id == envioId, ct)
                    ?? throw new KeyNotFoundException($"No se encontró el envío con identificador {envioId}.");

                if (envio.Estado is not (EstadoEnvio.AsignadoFlotilla or EstadoEnvio.Reprogramado))
                {
                    throw new InvalidOperationException(
                        $"El envío debe estar asignado a una flotilla para iniciar recorrido (estado actual: '{ConvertidorASnake.ToSnake(envio.Estado)}').");
                }

                var rutaEnvioActiva = envio.Rutas
                    .OrderByDescending(re => re.Id)
                    .FirstOrDefault(re => re.Ruta.Estado is EstadoRuta.Planeada or EstadoRuta.EnCurso)
                    ?? throw new InvalidOperationException("El envío no cuenta con una hoja de ruta activa asignada.");

                var ruta = rutaEnvioActiva.Ruta;

                if (!contexto.EmpleadoId.HasValue)
                    throw new UnauthorizedAccessException("No se identificó tu expediente de chofer.");

                var choferId = contexto.EmpleadoId.Value;
                if (ruta.ChoferId.HasValue && ruta.ChoferId.Value != choferId)
                {
                    throw new UnauthorizedAccessException("Este envío está asignado a otro chofer.");
                }

                if (!ruta.ChoferId.HasValue)
                {
                    var perteneceFlotilla = ruta.FlotillaId.HasValue && await ctx.AsignacionesFlotillaChofer
                        .AnyAsync(a => a.ChoferId == choferId && a.FlotillaId == ruta.FlotillaId.Value && a.Activo, ct);

                    if (!perteneceFlotilla)
                        throw new UnauthorizedAccessException("Este envío no pertenece a tu ruta ni a tu flotilla asignada.");

                    ruta.ChoferId = choferId;
                }

                var ahora = DateTimeOffset.UtcNow;
                ruta.Estado = EstadoRuta.EnCurso;
                ruta.HoraInicio ??= ahora;
                if (model.KmInicialOdometro.HasValue)
                {
                    ruta.KmInicialOdometro = Math.Round(model.KmInicialOdometro.Value, 2);
                }
                else if (!ruta.KmInicialOdometro.HasValue && ruta.Unidad is not null)
                {
                    ruta.KmInicialOdometro = ruta.Unidad.KmOdometroActual;
                }
                ruta.UpdatedAt = ahora;

                rutaEnvioActiva.Estado = EstadoRutaEnvio.Pendiente;
                envio.Estado = EstadoEnvio.EnRuta;
                envio.UpdatedAt = ahora;

                var nuevoPin = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100_000, 1_000_000).ToString("D6");
                envio.CodigoValidacionHash = _passwordHasher.HashPassword(new object(), nuevoPin);

                var maxIntentoSms = await ctx.AvisosSms
                    .Where(a => a.EnvioId == envio.Id)
                    .MaxAsync(a => (int?)a.IntentoReparto, ct) ?? envio.IntentoReparto;
                var intentoAvisoSms = Math.Max(maxIntentoSms + 1, envio.IntentoReparto + 1);

                ctx.AvisosSms.Add(new AvisoSms
                {
                    EnvioId = envio.Id,
                    TelefonoDestino = envio.DestinatarioTelefono,
                    Mensaje = $"Transportes Rojas: Tu paquete {envio.Guia} va en reparto. Proporciona al chofer tu código de entrega: {nuevoPin}",
                    Estado = EstadoAvisoSms.Pendiente,
                    IntentoReparto = intentoAvisoSms,
                    FechaSolicitud = ahora
                });

                envio.Metadata = ActualizarMetadataEnvio(envio.Metadata, new Dictionary<string, object?>
                {
                    ["intentosFallidosPin"] = 0
                });

                var desc = string.IsNullOrWhiteSpace(model.Observaciones)
                    ? "PAQUETE EN RUTA DE REPARTO HACIA EL DOMICILIO DEL DESTINATARIO."
                    : $"PAQUETE EN RUTA DE REPARTO. NOTA: {model.Observaciones.Trim()}";

                ctx.EventosEnvio.Add(new EventoEnvio
                {
                    EnvioId = envio.Id,
                    Estado = "en_ruta",
                    Descripcion = desc,
                    Latitud = model.Latitud,
                    Longitud = model.Longitud,
                    UsuarioId = contexto.UsuarioId,
                    FechaEvento = ahora
                });

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                var completo = await CargarEnvioCompletoQuery(ctx).FirstAsync(e => e.Id == envioId, ct);
                return MapearDetalleResponse(completo, contexto);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de concurrencia al iniciar recorrido de ruta.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<EnvioDetalleResponse> ValidarEntregaAsync(
        long envioId,
        ValidarEntregaModel model,
        ContextoSeguridadUsuario contextoRaw)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var contexto = await EnriquecerContextoAsync(ctx, contextoRaw, ct);
                var autorizado = contexto.TienePermisoORolRespaldo(
                    "envio.validar_entrega",
                    "Chofer");

                if (!autorizado)
                    throw new UnauthorizedAccessException("Tu rol no cuenta con el permiso 'envio.validar_entrega' para registrar entregas.");

                var envio = await ctx.Envios
                    .Include(e => e.Entregas)
                    .Include(e => e.Rutas)
                        .ThenInclude(re => re.Ruta)
                            .ThenInclude(r => r.Envios)
                    .Include(e => e.Rutas)
                        .ThenInclude(re => re.Ruta)
                            .ThenInclude(r => r.Unidad)
                    .FirstOrDefaultAsync(e => e.Id == envioId, ct)
                    ?? throw new KeyNotFoundException($"No se encontró el envío con identificador {envioId}.");

                if (envio.Estado != EstadoEnvio.EnRuta)
                {
                    throw new InvalidOperationException(
                        $"Solo pueden validarse entregas de envíos que se encuentran en ruta (estado actual: '{ConvertidorASnake.ToSnake(envio.Estado)}').");
                }

                var rutaEnvioActiva = envio.Rutas
                    .OrderByDescending(re => re.Id)
                    .FirstOrDefault(re => re.Ruta.Estado is EstadoRuta.EnCurso or EstadoRuta.Planeada);

                var ruta = rutaEnvioActiva?.Ruta;

                if (!contexto.EmpleadoId.HasValue)
                    throw new UnauthorizedAccessException("No se identificó tu expediente de chofer.");

                if (ruta?.ChoferId is not null && ruta.ChoferId.Value != contexto.EmpleadoId.Value)
                    throw new UnauthorizedAccessException("No puedes cerrar la entrega de un envío asignado a otro chofer.");

                var choferIdEfectivo = ruta?.ChoferId ?? await ResolverEmpleadoOperativoRequeridoAsync(ctx, contexto, ct);
                var ahora = DateTimeOffset.UtcNow;

                if (model.EntregaExitosa)
                {
                    if (string.IsNullOrWhiteSpace(envio.CodigoValidacionHash))
                        throw new InvalidOperationException("El envío no posee un hash de validación configurado.");

                    int intentosFallidos = 0;
                    if (envio.Metadata != null && envio.Metadata.RootElement.TryGetProperty("intentosFallidosPin", out var propIntentos))
                    {
                        propIntentos.TryGetInt32(out intentosFallidos);
                    }

                    if (intentosFallidos >= 3)
                    {
                        throw new InvalidOperationException(
                            "Se ha agotado el límite de 3 intentos permitidos para validar este envío. La entrega está bloqueada en este recorrido.");
                    }

                    var pinIngresado = (model.CodigoSeguridad ?? string.Empty).Trim();
                    var verificacion = _passwordHasher.VerifyHashedPassword(
                        new object(),
                        envio.CodigoValidacionHash,
                        pinIngresado);

                    if (verificacion == PasswordVerificationResult.Failed)
                    {
                        int nuevosIntentos = intentosFallidos + 1;
                        envio.Metadata = ActualizarMetadataEnvio(envio.Metadata, new Dictionary<string, object?>
                        {
                            ["intentosFallidosPin"] = nuevosIntentos
                        });
                        await ctx.SaveChangesAsync(ct);
                        await tx.CommitAsync(ct);

                        if (nuevosIntentos >= 3)
                        {
                            throw new InvalidOperationException(
                                "Código PIN de seguridad incorrecto. Has alcanzado el límite máximo de 3 intentos. La entrega ha quedado bloqueada.");
                        }

                        int restantes = 3 - nuevosIntentos;
                        throw new InvalidOperationException(
                            $"Código PIN de seguridad incorrecto. Te quedan {restantes} intento(s) antes del bloqueo definitivo de este recorrido.");
                    }

                    envio.Metadata = ActualizarMetadataEnvio(envio.Metadata, new Dictionary<string, object?>
                    {
                        ["intentosFallidosPin"] = 0
                    });

                    if (ruta is not null &&
                        model.KmFinalOdometro.HasValue &&
                        ruta.KmInicialOdometro.HasValue &&
                        model.KmFinalOdometro.Value < ruta.KmInicialOdometro.Value)
                    {
                        throw new InvalidOperationException(
                            "El kilometraje final del odómetro no puede ser menor al kilometraje inicial registrado en la ruta.");
                    }

                    var maxPrevio = envio.Entregas.Select(x => (int?)x.IntentoReparto).Max() ?? 0;
                    var numeroIntento = Math.Max(envio.IntentoReparto, maxPrevio) + 1;

                    envio.IntentoReparto = numeroIntento;
                    envio.Estado = EstadoEnvio.Entregado;
                    envio.UpdatedAt = ahora;

                    ctx.Entregas.Add(new Entrega
                    {
                        EnvioId = envio.Id,
                        IntentoReparto = numeroIntento,
                        ChoferId = choferIdEfectivo,
                        RutaId = ruta?.Id,
                        FechaHora = ahora,
                        CodigoIngresado = "PIN-VERIFICADO",
                        Validado = true,
                        EvidenciaFotoUrl = string.IsNullOrWhiteSpace(model.EvidenciaFotoUrl) ? null : model.EvidenciaFotoUrl.Trim(),
                        FirmaUrl = string.IsNullOrWhiteSpace(model.FirmaUrl) ? null : model.FirmaUrl.Trim(),
                        Latitud = model.Latitud,
                        Longitud = model.Longitud,
                        Estado = EstadoEntrega.Exitosa,
                        Observaciones = string.IsNullOrWhiteSpace(model.Observaciones) ? null : model.Observaciones.Trim(),
                        CreatedAt = ahora
                    });

                    if (rutaEnvioActiva is not null)
                    {
                        rutaEnvioActiva.Estado = EstadoRutaEnvio.Entregado;
                    }

                    if (ruta is not null && ruta.Envios.All(re => re.Id == rutaEnvioActiva?.Id || re.Estado != EstadoRutaEnvio.Pendiente))
                    {
                        ruta.Estado = EstadoRuta.Finalizada;
                        ruta.HoraFin = ahora;
                        if (model.KmFinalOdometro.HasValue)
                            ruta.KmFinalOdometro = Math.Round(model.KmFinalOdometro.Value, 2);
                        ruta.UpdatedAt = ahora;

                        if (ruta.Unidad is not null && ruta.Unidad.Estado == EstadoUnidad.Asignada)
                        {
                            var tieneOtraRutaActiva = await ctx.Rutas.AnyAsync(r =>
                                r.Id != ruta.Id &&
                                r.UnidadId == ruta.UnidadId &&
                                (r.Estado == EstadoRuta.Planeada || r.Estado == EstadoRuta.EnCurso), ct);

                            if (!tieneOtraRutaActiva)
                            {
                                ruta.Unidad.Estado = EstadoUnidad.Disponible;
                                ruta.Unidad.UpdatedAt = ahora;
                            }
                        }
                    }

                    var descExito = "ENTREGA EXITOSA VALIDADA CON CÓDIGO PIN DE SEGURIDAD DEL DESTINATARIO.";
                    if (!string.IsNullOrWhiteSpace(model.Observaciones))
                        descExito += $" OBSERVACIONES: {model.Observaciones.Trim()}";

                    ctx.EventosEnvio.Add(new EventoEnvio
                    {
                        EnvioId = envio.Id,
                        Estado = "entregado",
                        Descripcion = descExito,
                        Latitud = model.Latitud,
                        Longitud = model.Longitud,
                        UsuarioId = contexto.UsuarioId,
                        FechaEvento = ahora
                    });
                }
                else
                {
                    var maxPrevio = envio.Entregas.Select(x => (int?)x.IntentoReparto).Max() ?? 0;
                    var numeroIntento = Math.Max(envio.IntentoReparto, maxPrevio) + 1;

                    envio.IntentoReparto = numeroIntento;
                    envio.Estado = EstadoEnvio.NoEntregado;
                    envio.UpdatedAt = ahora;

                    ctx.Entregas.Add(new Entrega
                    {
                        EnvioId = envio.Id,
                        IntentoReparto = numeroIntento,
                        ChoferId = choferIdEfectivo,
                        RutaId = ruta?.Id,
                        FechaHora = ahora,
                        CodigoIngresado = null,
                        Validado = false,
                        EvidenciaFotoUrl = string.IsNullOrWhiteSpace(model.EvidenciaFotoUrl) ? null : model.EvidenciaFotoUrl.Trim(),
                        FirmaUrl = null,
                        Latitud = model.Latitud,
                        Longitud = model.Longitud,
                        Estado = EstadoEntrega.Fallida,
                        Observaciones = model.Observaciones?.Trim(),
                        CreatedAt = ahora
                    });

                    if (rutaEnvioActiva is not null)
                    {
                        rutaEnvioActiva.Estado = EstadoRutaEnvio.Fallido;
                    }

                    ctx.EventosEnvio.Add(new EventoEnvio
                    {
                        EnvioId = envio.Id,
                        Estado = "no_entregado",
                        Descripcion = $"INTENTO DE REPARTO #{numeroIntento} NO COMPLETADO: {model.Observaciones?.Trim()}",
                        Latitud = model.Latitud,
                        Longitud = model.Longitud,
                        UsuarioId = contexto.UsuarioId,
                        FechaEvento = ahora
                    });
                }

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                var completo = await CargarEnvioCompletoQuery(ctx).FirstAsync(e => e.Id == envioId, ct);
                return MapearDetalleResponse(completo, contexto);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de concurrencia al validar entrega.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<EnvioDetalleResponse> ReprogramarEnvioAsync(
        long envioId,
        ReprogramarEnvioModel model,
        ContextoSeguridadUsuario contextoRaw)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var contexto = await EnriquecerContextoAsync(ctx, contextoRaw, ct);
                var autorizado = contexto.TienePermisoORolRespaldo(
                    "envio.reprogramar",
                    "Chofer",
                    "Personal administrativo");

                if (!autorizado)
                    throw new UnauthorizedAccessException("Tu rol no cuenta con el permiso 'envio.reprogramar' para reprogramar entregas.");

                var envio = await ctx.Envios
                    .Include(e => e.Rutas)
                        .ThenInclude(re => re.Ruta)
                    .FirstOrDefaultAsync(e => e.Id == envioId, ct)
                    ?? throw new KeyNotFoundException($"No se encontró el envío con identificador {envioId}.");

                if (envio.Estado is EstadoEnvio.Entregado or EstadoEnvio.Cancelado or EstadoEnvio.EnDevolucion or EstadoEnvio.Devuelto)
                {
                    throw new InvalidOperationException(
                        $"No es posible reprogramar un envío en estado '{ConvertidorASnake.ToSnake(envio.Estado)}'.");
                }

                var rutaEnvioActiva = envio.Rutas
                    .OrderByDescending(re => re.Id)
                    .FirstOrDefault(re => re.Ruta.Estado is EstadoRuta.Planeada or EstadoRuta.EnCurso);

                if (contexto.TieneRol("Chofer") && !contexto.TieneRol("Personal administrativo"))
                {
                    if (!contexto.EmpleadoId.HasValue || rutaEnvioActiva?.Ruta.ChoferId != contexto.EmpleadoId.Value)
                        throw new UnauthorizedAccessException("Solo puedes reprogramar envíos asignados a tu ruta activa.");
                }

                var tipoIncidencia = ParseTipoIncidencia(model.TipoIncidencia);
                var ahora = DateTimeOffset.UtcNow;

                var incidencia = new Incidencia
                {
                    EnvioId = envio.Id,
                    RutaId = rutaEnvioActiva?.RutaId,
                    Tipo = tipoIncidencia,
                    Descripcion = model.Motivo.Trim(),
                    EvidenciaUrl = string.IsNullOrWhiteSpace(model.EvidenciaUrl) ? null : model.EvidenciaUrl.Trim(),
                    Estado = EstadoIncidencia.Abierta,
                    FechaReporte = ahora
                };
                ctx.Incidencias.Add(incidencia);
                await ctx.SaveChangesAsync(ct);

                ctx.Reprogramaciones.Add(new Reprogramacion
                {
                    EnvioId = envio.Id,
                    IncidenciaId = incidencia.Id,
                    NuevaFechaHora = model.NuevaFechaHora,
                    Motivo = model.Motivo.Trim(),
                    Estado = EstadoReprogramacion.Programada,
                    CreatedAt = ahora
                });

                if (rutaEnvioActiva is not null && rutaEnvioActiva.Estado is EstadoRutaEnvio.Pendiente or EstadoRutaEnvio.Fallido)
                {
                    rutaEnvioActiva.Estado = EstadoRutaEnvio.Reprogramado;
                }

                envio.FechaEntregaEstimada = model.NuevaFechaHora;
                envio.Estado = EstadoEnvio.Reprogramado;
                envio.UpdatedAt = ahora;

                ctx.EventosEnvio.Add(new EventoEnvio
                {
                    EnvioId = envio.Id,
                    Estado = "reprogramado",
                    Descripcion = $"ENVÍO REPROGRAMADO PARA {model.NuevaFechaHora.ToOffset(TimeSpan.FromHours(-7)):dd/MM/yyyy HH:mm}. MOTIVO ({ConvertidorASnake.ToSnake(tipoIncidencia)}): {model.Motivo.Trim()}",
                    UsuarioId = contexto.UsuarioId,
                    FechaEvento = ahora
                });

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                var completo = await CargarEnvioCompletoQuery(ctx).FirstAsync(e => e.Id == envioId, ct);
                return MapearDetalleResponse(completo, contexto);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de concurrencia al reprogramar envío.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<EnvioDetalleResponse> CancelarEnvioAsync(
        long envioId,
        CancelarEnvioModel model,
        ContextoSeguridadUsuario contextoRaw)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var contexto = await EnriquecerContextoAsync(ctx, contextoRaw, ct);

                var envio = await ctx.Envios
                    .Include(e => e.Rutas)
                        .ThenInclude(re => re.Ruta)
                    .FirstOrDefaultAsync(e => e.Id == envioId, ct)
                    ?? throw new KeyNotFoundException($"No se encontró el envío con identificador {envioId}.");

                ActorTipoCancelacion actorTipo;

                if (contexto.EsCliente)
                {
                    if (!contexto.ClienteId.HasValue || envio.RemitenteId != contexto.ClienteId.Value)
                        throw new UnauthorizedAccessException("Solo el cliente remitente titular puede solicitar la cancelación de su envío.");

                    if (envio.Estado is not (EstadoEnvio.Registrado or EstadoEnvio.RecoleccionProgramada))
                    {
                        throw new InvalidOperationException(
                            "El envío ya fue recolectado o recibido en sucursal; para cancelarlo comunícate con atención administrativa.");
                    }

                    actorTipo = ActorTipoCancelacion.Remitente;
                }
                else
                {
                    var autorizado = contexto.TienePermisoORolRespaldo(
                        "envio.cancelar",
                        "Personal administrativo",
                        "Jefe");

                    if (!autorizado)
                        throw new UnauthorizedAccessException("Tu rol no cuenta con el permiso 'envio.cancelar' para cancelar envíos.");

                    if (envio.Estado is EstadoEnvio.Entregado or EstadoEnvio.Cancelado or EstadoEnvio.EnDevolucion or EstadoEnvio.Devuelto)
                    {
                        throw new InvalidOperationException(
                            $"No es posible cancelar un envío que ya se encuentra en estado '{ConvertidorASnake.ToSnake(envio.Estado)}'.");
                    }

                    actorTipo = contexto.TieneRol("Chofer")
                        ? ActorTipoCancelacion.Chofer
                        : ActorTipoCancelacion.Sistema;
                }

                var ahora = DateTimeOffset.UtcNow;

                ctx.Cancelaciones.Add(new Cancelacion
                {
                    EnvioId = envio.Id,
                    Motivo = model.Motivo.Trim(),
                    ActorTipo = actorTipo,
                    ActorUsuarioId = contexto.UsuarioId,
                    Estado = EstadoCancelacion.Aplicada,
                    FechaSolicitud = ahora,
                    FechaAplicacion = ahora
                });

                bool estaBajoCustodia = envio.Estado is EstadoEnvio.RecibidoSucursal
                    or EstadoEnvio.AsignadoFlotilla
                    or EstadoEnvio.EnRuta
                    or EstadoEnvio.NoEntregado
                    or EstadoEnvio.Reprogramado;

                if (estaBajoCustodia)
                {
                    envio.CodigoValidacionHash = null;
                    envio.Estado = EstadoEnvio.EnDevolucion;
                    envio.UpdatedAt = ahora;

                    var rutaEnvio = envio.Rutas.OrderByDescending(r => r.Id).FirstOrDefault(r => r.Estado == EstadoRutaEnvio.Pendiente);
                    if (rutaEnvio != null)
                    {
                        rutaEnvio.Estado = EstadoRutaEnvio.Fallido;
                    }

                    var sucursalRetorno = envio.SucursalRecepcionId ?? contexto.SucursalId;
                    ctx.Devoluciones.Add(new Devolucion
                    {
                        EnvioId = envio.Id,
                        Motivo = $"Cancelación con paquete bajo custodia ({ConvertidorASnake.ToSnake(actorTipo)}): {model.Motivo.Trim()}",
                        OrigenSolicitud = OrigenSolicitudDevolucion.SolicitudRemitente,
                        Estado = EstadoDevolucion.EnTransito,
                        SucursalDestinoId = sucursalRetorno,
                        FechaInicio = ahora,
                        Observaciones = "Cancelación registrada con paquete bajo custodia. Se transfirió automáticamente a proceso de devolución a sucursal."
                    });

                    ctx.EventosEnvio.Add(new EventoEnvio
                    {
                        EnvioId = envio.Id,
                        Estado = "en_devolucion",
                        Descripcion = $"ENTREGA DETENIDA POR CANCELACIÓN: Paquete bajo custodia transferido a proceso de devolución a sucursal de origen. MOTIVO: {model.Motivo.Trim()}",
                        UsuarioId = contexto.UsuarioId,
                        FechaEvento = ahora
                    });
                }
                else
                {
                    envio.Estado = EstadoEnvio.Cancelado;
                    envio.UpdatedAt = ahora;

                    ctx.EventosEnvio.Add(new EventoEnvio
                    {
                        EnvioId = envio.Id,
                        Estado = "cancelado",
                        Descripcion = $"ENVÍO CANCELADO ({ConvertidorASnake.ToSnake(actorTipo)}). MOTIVO: {model.Motivo.Trim()}",
                        UsuarioId = contexto.UsuarioId,
                        FechaEvento = ahora
                    });
                }

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                var completo = await CargarEnvioCompletoQuery(ctx).FirstAsync(e => e.Id == envioId, ct);
                return MapearDetalleResponse(completo, contexto);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de concurrencia al cancelar el envío.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<EnvioDetalleResponse> RegistrarDevolucionAsync(
        long envioId,
        RegistrarDevolucionModel model,
        ContextoSeguridadUsuario contextoRaw)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var contexto = await EnriquecerContextoAsync(ctx, contextoRaw, ct);
                var autorizado = contexto.TienePermisoORolRespaldo(
                    "envio.devolucion_registrar",
                    "Chofer",
                    "Personal de sucursal");

                if (!autorizado)
                    throw new UnauthorizedAccessException("Tu rol no cuenta con el permiso 'envio.devolucion_registrar' para iniciar devoluciones.");

                var envio = await ctx.Envios
                    .Include(e => e.Rutas)
                        .ThenInclude(re => re.Ruta)
                    .FirstOrDefaultAsync(e => e.Id == envioId, ct)
                    ?? throw new KeyNotFoundException($"No se encontró el envío con identificador {envioId}.");

                if (envio.Estado is not (
                    EstadoEnvio.EnRuta or
                    EstadoEnvio.NoEntregado or
                    EstadoEnvio.Reprogramado or
                    EstadoEnvio.RecibidoSucursal or
                    EstadoEnvio.AsignadoFlotilla))
                {
                    throw new InvalidOperationException(
                        $"No se puede iniciar una devolución cuando el envío está en estado '{ConvertidorASnake.ToSnake(envio.Estado)}'.");
                }

                var origenEnum = ParseOrigenDevolucion(model.OrigenSolicitud);
                var sucursalRetornoId = model.SucursalDestinoId ?? envio.SucursalRecepcionId ?? contexto.SucursalId;

                if (sucursalRetornoId.HasValue && sucursalRetornoId.Value > 0)
                {
                    var sucExiste = await ctx.Sucursales.AnyAsync(s => s.Id == sucursalRetornoId.Value && s.Activo, ct);
                    if (!sucExiste)
                        throw new InvalidOperationException("La sucursal destino de retorno seleccionada no existe o está inactiva.");
                }

                var ahora = DateTimeOffset.UtcNow;

                ctx.Devoluciones.Add(new Devolucion
                {
                    EnvioId = envio.Id,
                    Motivo = model.Motivo.Trim(),
                    OrigenSolicitud = origenEnum,
                    Estado = EstadoDevolucion.EnTransito,
                    EvidenciaUrl = string.IsNullOrWhiteSpace(model.EvidenciaUrl) ? null : model.EvidenciaUrl.Trim(),
                    SucursalDestinoId = sucursalRetornoId,
                    FechaInicio = ahora,
                    Observaciones = string.IsNullOrWhiteSpace(model.Observaciones) ? null : model.Observaciones.Trim()
                });

                var rutaEnvioActiva = envio.Rutas
                    .OrderByDescending(re => re.Id)
                    .FirstOrDefault(re => re.Estado == EstadoRutaEnvio.Pendiente);
                if (rutaEnvioActiva is not null)
                {
                    rutaEnvioActiva.Estado = EstadoRutaEnvio.Fallido;
                }

                envio.Estado = EstadoEnvio.EnDevolucion;
                envio.UpdatedAt = ahora;

                ctx.EventosEnvio.Add(new EventoEnvio
                {
                    EnvioId = envio.Id,
                    Estado = "en_devolucion",
                    Descripcion = $"PROCESO DE DEVOLUCIÓN INICIADO ({ConvertidorASnake.ToSnake(origenEnum)}). MOTIVO: {model.Motivo.Trim()}",
                    UsuarioId = contexto.UsuarioId,
                    FechaEvento = ahora
                });

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                var completo = await CargarEnvioCompletoQuery(ctx).FirstAsync(e => e.Id == envioId, ct);
                return MapearDetalleResponse(completo, contexto);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de concurrencia al iniciar devolución.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<EnvioDetalleResponse> ConfirmarDevolucionAsync(
        long envioId,
        ConfirmarDevolucionModel model,
        ContextoSeguridadUsuario contextoRaw)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var contexto = await EnriquecerContextoAsync(ctx, contextoRaw, ct);
                var autorizado = contexto.TienePermisoORolRespaldo(
                    "envio.devolucion_confirmar",
                    "Personal de sucursal");

                if (!autorizado)
                    throw new UnauthorizedAccessException("Tu rol no cuenta con el permiso 'envio.devolucion_confirmar' para cerrar devoluciones.");

                var envio = await ctx.Envios
                    .FirstOrDefaultAsync(e => e.Id == envioId, ct)
                    ?? throw new KeyNotFoundException($"No se encontró el envío con identificador {envioId}.");

                if (envio.Estado != EstadoEnvio.EnDevolucion)
                {
                    throw new InvalidOperationException(
                        $"Solo puede confirmarse la devolución de un envío que se encuentre 'en_devolucion' (estado actual: '{ConvertidorASnake.ToSnake(envio.Estado)}').");
                }

                var devolucionActiva = await ctx.Devoluciones
                    .OrderByDescending(d => d.FechaInicio)
                    .FirstOrDefaultAsync(d => d.EnvioId == envio.Id, ct);

                var ahora = DateTimeOffset.UtcNow;

                if (devolucionActiva is not null)
                {
                    devolucionActiva.FechaRecepcion ??= ahora;
                    devolucionActiva.AceptadaPorRemitente = model.AceptadaPorRemitente;
                    if (!string.IsNullOrWhiteSpace(model.Observaciones))
                        devolucionActiva.Observaciones = model.Observaciones.Trim();

                    if (model.EntregadoAlRemitente)
                    {
                        devolucionActiva.Estado = model.AceptadaPorRemitente
                            ? EstadoDevolucion.EntregadaRemitente
                            : EstadoDevolucion.RechazadaRemitente;
                        devolucionActiva.FechaCierre = ahora;
                    }
                    else
                    {
                        devolucionActiva.Estado = EstadoDevolucion.RecibidaSucursal;
                    }
                }

                var nuevoEstadoEnvio = model.EntregadoAlRemitente
                    ? EstadoEnvio.Devuelto
                    : EstadoEnvio.EnDevolucion;

                envio.Estado = nuevoEstadoEnvio;
                envio.UpdatedAt = ahora;

                var estadoTexto = ConvertidorASnake.ToSnake(nuevoEstadoEnvio);
                var descripcionEvento = model.EntregadoAlRemitente
                    ? "DEVOLUCIÓN CONCLUIDA: PAQUETE RETORNADO AL REMITENTE."
                    : "PAQUETE EN DEVOLUCIÓN RECIBIDO EN SUCURSAL DE RETORNO.";

                if (!string.IsNullOrWhiteSpace(model.Observaciones))
                    descripcionEvento += $" NOTA: {model.Observaciones.Trim()}";

                ctx.EventosEnvio.Add(new EventoEnvio
                {
                    EnvioId = envio.Id,
                    Estado = estadoTexto,
                    Descripcion = descripcionEvento,
                    UsuarioId = contexto.UsuarioId,
                    FechaEvento = ahora
                });

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                var completo = await CargarEnvioCompletoQuery(ctx).FirstAsync(e => e.Id == envioId, ct);
                return MapearDetalleResponse(completo, contexto);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de concurrencia al confirmar devolución.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    // Helpers de operaciones y lote

    private static async Task<long> ResolverEmpleadoOperativoRequeridoAsync(
        TransportesRojasDbContext ctx,
        ContextoSeguridadUsuario contexto,
        CancellationToken ct)
    {
        if (contexto.EmpleadoId.HasValue)
        {
            var existe = await ctx.Empleados.AnyAsync(e => e.Id == contexto.EmpleadoId.Value && e.Activo, ct);
            if (existe)
                return contexto.EmpleadoId.Value;
        }

        throw new InvalidOperationException("No se encontró un perfil de empleado activo asociado a tu cuenta para registrar esta operación.");
    }

    public async Task<int> AsignarEnviosAFlotillaLoteAsync(
        AsignarEnviosFlotillaModel model,
        ContextoSeguridadUsuario contextoRaw)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var contexto = await EnriquecerContextoAsync(ctx, contextoRaw, ct);
                var autorizado = contexto.TienePermisoORolRespaldo(
                    "envio.asignar_flotilla",
                    "Supervisor",
                    "Jefe");

                if (!autorizado)
                    throw new UnauthorizedAccessException("No cuentas con permiso para asignar envíos a flotilla.");

                var flotilla = await ctx.Flotillas.FirstOrDefaultAsync(f => f.Id == model.FlotillaId && f.Activo, ct)
                    ?? throw new KeyNotFoundException($"No se encontró la flotilla con Id {model.FlotillaId}.");

                var envios = await ctx.Envios
                    .Where(e => model.EnvioIds.Contains(e.Id))
                    .ToListAsync(ct);

                var ahora = DateTimeOffset.UtcNow;
                int modificados = 0;

                foreach (var envio in envios)
                {
                    if (envio.Estado is EstadoEnvio.Entregado or EstadoEnvio.Cancelado or EstadoEnvio.EnDevolucion or EstadoEnvio.Devuelto)
                        continue;

                    envio.Estado = EstadoEnvio.AsignadoFlotilla;
                    envio.UpdatedAt = ahora;
                    envio.Metadata = ActualizarMetadataEnvio(envio.Metadata, new Dictionary<string, object?>
                    {
                        ["flotillaId"] = flotilla.Id,
                        ["flotillaNombre"] = flotilla.Nombre
                    });

                    ctx.EventosEnvio.Add(new EventoEnvio
                    {
                        EnvioId = envio.Id,
                        Estado = "asignado_flotilla",
                        Descripcion = $"ENVÍO ASIGNADO A FLOTILLA '{flotilla.Nombre}' PARA PLANIFICACIÓN DE RUTA.",
                        UsuarioId = contexto.UsuarioId,
                        FechaEvento = ahora
                    });

                    modificados++;
                }

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return modificados;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de concurrencia al asignar envíos a flotilla.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    private static JsonDocument ActualizarMetadataEnvio(JsonDocument? actual, Dictionary<string, object?> nuevosValores)
    {
        var diccionario = new Dictionary<string, object?>();

        if (actual is not null && actual.RootElement.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in actual.RootElement.EnumerateObject())
            {
                diccionario[prop.Name] = prop.Value.ValueKind switch
                {
                    JsonValueKind.String => prop.Value.GetString(),
                    JsonValueKind.Number => prop.Value.TryGetInt64(out var l) ? l : prop.Value.GetDouble(),
                    JsonValueKind.True => true,
                    JsonValueKind.False => false,
                    _ => null
                };
            }
        }

        foreach (var kv in nuevosValores)
        {
            diccionario[kv.Key] = kv.Value;
        }

        return JsonSerializer.SerializeToDocument(diccionario, JsonOpcionesSnapshot);
    }

    private static TipoIncidencia ParseTipoIncidencia(string valor)
    {
        var limpio = valor.Trim();
        if (Enum.TryParse<TipoIncidencia>(limpio, ignoreCase: true, out var parsed))
            return parsed;

        return ConvertidorASnake.FromSnake<TipoIncidencia>(limpio.ToLowerInvariant());
    }

    private static OrigenSolicitudDevolucion ParseOrigenDevolucion(string valor)
    {
        var limpio = valor.Trim();
        if (Enum.TryParse<OrigenSolicitudDevolucion>(limpio, ignoreCase: true, out var parsed))
            return parsed;

        return ConvertidorASnake.FromSnake<OrigenSolicitudDevolucion>(limpio.ToLowerInvariant());
    }
}

