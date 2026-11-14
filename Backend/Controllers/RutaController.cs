using Backend.BDFolder;
using Backend.Helpers;
using Backend.Models;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RutaController : ControllerBase
{
    private readonly IDbContextFactory<TransportesRojasDbContext> _factory;
    private readonly IValidator<NotificarCambioRutaModel> _cambioValidator;
    private readonly ILogger<RutaController> _logger;

    public RutaController(
        IDbContextFactory<TransportesRojasDbContext> factory,
        IValidator<NotificarCambioRutaModel> cambioValidator,
        ILogger<RutaController> logger)
    {
        _factory = factory;
        _cambioValidator = cambioValidator;
        _logger = logger;
    }

    // Cambios de trayecto

    [HttpPost("{id:long}/notificar-cambio")]
    [Authorize(Roles = "Chofer")]
    public async Task<IActionResult> NotificarCambioTrayecto(long id, [FromBody] NotificarCambioRutaModel model, CancellationToken ct)
    {
        var validation = await _cambioValidator.ValidateAsync(model, ct);
        if (!validation.IsValid)
        {
            return BadRequest(new { errores = validation.Errors.Select(e => e.ErrorMessage).ToList() });
        }

        var contexto = ClaimsUsuarioHelper.Extraer(User);
        await using var ctx = await _factory.CreateDbContextAsync(ct);

        var ruta = await ctx.Rutas
            .Include(r => r.Chofer)
            .Include(r => r.Unidad)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (ruta is null)
        {
            return NotFound(new { mensaje = $"No se encontró la ruta operativa con Id {id}." });
        }

        if (!contexto.EmpleadoId.HasValue || !ruta.ChoferId.HasValue || ruta.ChoferId.Value != contexto.EmpleadoId.Value)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = "Solo el chofer asignado a esta ruta puede notificar cambios de trayecto." });
        }

        long choferIdEfectivo = ruta.ChoferId ?? (contexto.EmpleadoId ?? 0);
        if (choferIdEfectivo <= 0)
        {
            return BadRequest(new { mensaje = "La ruta no cuenta con un chofer registrado para asociar el reporte de cambio de trayecto." });
        }

        var ahora = DateTimeOffset.UtcNow;
        var anioActual = ahora.Year;

        var totalCambiosAnio = await ctx.CambiosRuta.CountAsync(c => c.FechaRegistro.Year == anioActual, ct);
        var nuevoConsecutivo = totalCambiosAnio + 1;
        var folio = $"CR-{anioActual}-{nuevoConsecutivo:D4}";

        var nuevoCambio = new CambioRuta
        {
            Folio = folio,
            RutaId = ruta.Id,
            ChoferId = choferIdEfectivo,
            UnidadId = ruta.UnidadId,
            Motivo = model.Motivo.Trim(),
            ReferenciaLugar = model.ReferenciaLugar?.Trim(),
            DescripcionTrayecto = model.DescripcionTrayecto?.Trim() ?? string.Empty,
            FechaEvento = model.FechaEvento ?? ahora,
            AfectaEntrega = model.AfectaEntrega,
            EstadoAviso = EstadoAvisoCambioRuta.Enviado,
            FechaRegistro = ahora
        };

        ctx.CambiosRuta.Add(nuevoCambio);
        await ctx.SaveChangesAsync(ct);

        string choferNombre = ruta.Chofer != null 
            ? $"{ruta.Chofer.Nombre} {ruta.Chofer.ApellidoPaterno}".Trim()
            : $"Chofer #{choferIdEfectivo}";

        var response = new CambioRutaItemResponse(
            nuevoCambio.Id,
            nuevoCambio.Folio,
            nuevoCambio.RutaId,
            nuevoCambio.ChoferId,
            choferNombre,
            nuevoCambio.UnidadId,
            ruta.Unidad?.Placas,
            nuevoCambio.Motivo,
            nuevoCambio.ReferenciaLugar,
            nuevoCambio.DescripcionTrayecto,
            nuevoCambio.FechaEvento,
            nuevoCambio.AfectaEntrega,
            nuevoCambio.EstadoAviso.ToString().ToLowerInvariant(),
            nuevoCambio.FechaRegistro
        );

        _logger.LogInformation("Reporte de cambio de ruta registrado con éxito. Folio: {Folio}, Ruta: {RutaId}", folio, ruta.Id);
        return CreatedAtAction(nameof(ObtenerCambiosTrayectoPorRuta), new { id = ruta.Id }, response);
    }

    [HttpGet("cambios-trayecto")]
    [Authorize(Roles = "Jefe de flotilla, Jefe")]
    public async Task<IActionResult> ObtenerHistorialCambiosTrayecto(
        [FromQuery] long? rutaId = null,
        [FromQuery] long? choferId = null,
        [FromQuery] DateTimeOffset? fechaDesde = null,
        [FromQuery] DateTimeOffset? fechaHasta = null,
        CancellationToken ct = default)
    {
        var contextoRaw = ClaimsUsuarioHelper.Extraer(User);
        await using var ctx = await _factory.CreateDbContextAsync(ct);
        var contexto = await ClaimsUsuarioHelper.EnriquecerContextoAsync(ctx, contextoRaw, ct);

        var query = ctx.CambiosRuta
            .AsNoTracking()
            .Include(c => c.Chofer)
            .Include(c => c.Unidad)
            .Include(c => c.Ruta)
                .ThenInclude(r => r!.Flotilla)
            .AsQueryable();

        if (contexto.TieneRol("Chofer") && !contexto.TieneRol("Jefe de flotilla", "Supervisor", "Jefe"))
        {
            if (contexto.EmpleadoId.HasValue)
            {
                query = query.Where(c => c.ChoferId == contexto.EmpleadoId.Value);
            }
        }
        else if (!contexto.TieneRol("Jefe", "RH") && contexto.SucursalId.HasValue)
        {
            var sucId = contexto.SucursalId.Value;
            query = query.Where(c =>
                (c.Chofer != null && c.Chofer.SucursalId == sucId) ||
                (c.Ruta != null && c.Ruta.Flotilla != null && c.Ruta.Flotilla.SucursalId == sucId));
        }

        if (rutaId.HasValue && rutaId.Value > 0)
        {
            query = query.Where(c => c.RutaId == rutaId.Value);
        }

        if (choferId.HasValue && choferId.Value > 0)
        {
            query = query.Where(c => c.ChoferId == choferId.Value);
        }

        if (fechaDesde.HasValue)
        {
            query = query.Where(c => c.FechaRegistro >= fechaDesde.Value);
        }

        if (fechaHasta.HasValue)
        {
            query = query.Where(c => c.FechaRegistro <= fechaHasta.Value);
        }

        var lista = await query
            .OrderByDescending(c => c.FechaRegistro)
            .Take(200)
            .Select(c => new CambioRutaItemResponse(
                c.Id,
                c.Folio,
                c.RutaId,
                c.ChoferId,
                c.Chofer != null ? $"{c.Chofer.Nombre} {c.Chofer.ApellidoPaterno}".Trim() : $"Chofer #{c.ChoferId}",
                c.UnidadId,
                c.Unidad != null ? c.Unidad.Placas : null,
                c.Motivo,
                c.ReferenciaLugar,
                c.DescripcionTrayecto,
                c.FechaEvento,
                c.AfectaEntrega,
                c.EstadoAviso.ToString().ToLowerInvariant(),
                c.FechaRegistro
            ))
            .ToListAsync(ct);

        return Ok(lista);
    }

    [HttpGet("{id:long}/cambios-trayecto")]
    [Authorize(Roles = "Jefe de flotilla, Jefe")]
    public async Task<IActionResult> ObtenerCambiosTrayectoPorRuta(long id, CancellationToken ct)
    {
        return await ObtenerHistorialCambiosTrayecto(rutaId: id, ct: ct);
    }

    // Operación de rutas

    [HttpGet("chofer-activa")]
    [Authorize(Roles = "Chofer")]
    public async Task<IActionResult> ObtenerRutaActivaChofer(CancellationToken ct)
    {
        var contexto = ClaimsUsuarioHelper.Extraer(User);
        if (!contexto.EmpleadoId.HasValue)
            return BadRequest(new { mensaje = "No se identificó el registro de chofer para este usuario." });

        await using var ctx = await _factory.CreateDbContextAsync(ct);

        long choferId = contexto.EmpleadoId.Value;

        var ruta = await ctx.Rutas
            .AsNoTracking()
            .Include(r => r.Flotilla)
            .Include(r => r.Unidad)
            .Include(r => r.Envios)
                .ThenInclude(re => re.Envio)
                    .ThenInclude(e => e.DireccionDestino)
            .Where(r => r.ChoferId == choferId)
            .Where(r => r.Estado == EstadoRuta.EnCurso || r.Estado == EstadoRuta.Planeada)
            .OrderByDescending(r => r.Estado == EstadoRuta.EnCurso)
            .ThenByDescending(r => r.Fecha)
            .FirstOrDefaultAsync(ct);

        if (ruta is null)
            return Ok(null);

        var paradas = ruta.Envios
            .OrderBy(re => re.OrdenEntrega)
            .Select(re =>
            {
                var dir = re.Envio.DireccionDestino;
                var dirTexto = dir != null
                    ? $"{dir.Calle}{ValidacionEntradaHelper.FormatearNumeroExterior(dir.NumeroExterior)}, Col. {dir.Colonia}, {dir.Municipio}, {dir.Estado}"
                    : "Dirección registrada en guía";
                var estadoEnvioSnake = ConvertidorASnake.ToSnake(re.Envio.Estado);
                var ciudadResumen = dir != null
                    ? string.Join(", ", new[] { dir.Municipio, dir.Estado }.Where(s => !string.IsNullOrWhiteSpace(s)))
                    : string.Empty;

                return new ParadaChoferItemResponse(
                    re.Id,
                    re.EnvioId,
                    re.Envio.Guia,
                    re.OrdenEntrega,
                    ConvertidorASnake.ToSnake(re.Estado),
                    estadoEnvioSnake,
                    re.Envio.DestinatarioNombre,
                    re.Envio.DestinatarioTelefono,
                    dirTexto,
                    re.Envio.Descripcion,
                    re.Envio.PesoKg,
                    re.Envio.IntentoReparto,
                    Orden: re.OrdenEntrega,
                    Estado: estadoEnvioSnake,
                    DestinoDireccion: dirTexto,
                    DestinoCiudad: ciudadResumen,
                    TipoPaquete: re.Envio.PesoKg > 30 ? "Carga pesada" : "Paquetería"
                );
            })
            .ToList();

        var estadoRutaSnake = ConvertidorASnake.ToSnake(ruta.Estado);
        var respuesta = new RutaChoferActivaResponse(
            ruta.Id,
            estadoRutaSnake,
            ruta.Fecha,
            ruta.HoraInicio,
            ruta.Flotilla?.Nombre,
            ruta.Unidad?.Placas,
            ruta.Unidad?.Modelo,
            ruta.KmInicialOdometro,
            paradas,
            NombreRuta: $"Ruta #{ruta.Id}" + (ruta.Flotilla != null ? $" - {ruta.Flotilla.Nombre}" : string.Empty),
            EstadoRuta: estadoRutaSnake,
            UnidadId: ruta.UnidadId,
            UnidadNumeroEconomico: ruta.Unidad != null ? $"Unidad #{ruta.Unidad.Id}" : null,
            FechaProgramada: ruta.Fecha,
            TotalEnvios: paradas.Count,
            EnviosEntregados: paradas.Count(p => p.EstadoEnvio == "entregado")
        );

        return Ok(respuesta);
    }

    [HttpPost("{id:long}/iniciar-recorrido")]
    [Authorize(Roles = "Chofer")]
    public async Task<IActionResult> IniciarRecorridoRuta(long id, [FromBody] IniciarRutaEnvioModel? model, CancellationToken ct)
    {
        ValidacionEntradaHelper.ValidarDecimalNoNegativo(model?.KmInicialOdometro, "kilometraje inicial de odómetro");
        var contexto = ClaimsUsuarioHelper.Extraer(User);
        await using var ctx = await _factory.CreateDbContextAsync(ct);

        var ruta = await ctx.Rutas
            .Include(r => r.Unidad)
            .Include(r => r.Envios)
                .ThenInclude(re => re.Envio)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (ruta is null)
            return NotFound(new { mensaje = $"No se encontró la ruta con Id {id}." });

        if (!contexto.EmpleadoId.HasValue || ruta.ChoferId != contexto.EmpleadoId.Value)
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = "Solo el chofer asignado puede iniciar esta ruta." });

        if (ruta.Estado == EstadoRuta.EnCurso)
            return BadRequest(new { mensaje = "La ruta ya se encuentra en curso." });

        if (ruta.Estado == EstadoRuta.Finalizada || ruta.Estado == EstadoRuta.Cancelada)
            return BadRequest(new { mensaje = $"No es posible iniciar una ruta en estado '{ConvertidorASnake.ToSnake(ruta.Estado)}'." });

        var ahora = DateTimeOffset.UtcNow;
        ruta.Estado = EstadoRuta.EnCurso;
        ruta.HoraInicio ??= ahora;
        if (model?.KmInicialOdometro is decimal kmInicial)
        {
            ruta.KmInicialOdometro = Math.Round(kmInicial, 2);
        }
        else if (!ruta.KmInicialOdometro.HasValue && ruta.Unidad is not null)
        {
            ruta.KmInicialOdometro = ruta.Unidad.KmOdometroActual;
        }
        ruta.UpdatedAt = ahora;

        var hasher = new Microsoft.AspNetCore.Identity.PasswordHasher<object>();

        foreach (var rutaEnvio in ruta.Envios)
        {
            rutaEnvio.Estado = EstadoRutaEnvio.Pendiente;
            var envio = rutaEnvio.Envio;

            if (envio.Estado is not (EstadoEnvio.Entregado or EstadoEnvio.Cancelado or EstadoEnvio.Devuelto))
            {
                envio.Estado = EstadoEnvio.EnRuta;
                envio.UpdatedAt = ahora;

                var pinGenerado = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
                envio.CodigoValidacionHash = hasher.HashPassword(new object(), pinGenerado);

                var maxIntentoSms = await ctx.AvisosSms
                    .Where(a => a.EnvioId == envio.Id)
                    .MaxAsync(a => (int?)a.IntentoReparto, ct) ?? envio.IntentoReparto;
                var intentoAvisoSms = Math.Max(maxIntentoSms + 1, envio.IntentoReparto + 1);

                ctx.AvisosSms.Add(new AvisoSms
                {
                    EnvioId = envio.Id,
                    TelefonoDestino = envio.DestinatarioTelefono,
                    Mensaje = $"Transportes Rojas: Tu paquete {envio.Guia} va en reparto. Tu código de entrega: {pinGenerado}",
                    Estado = EstadoAvisoSms.Pendiente,
                    IntentoReparto = intentoAvisoSms,
                    FechaSolicitud = ahora
                });

                ctx.EventosEnvio.Add(new EventoEnvio
                {
                    EnvioId = envio.Id,
                    Estado = "en_ruta",
                    Descripcion = "RUTA INICIADA POR EL CHOFER: Paquete en reparto hacia el domicilio del destinatario.",
                    UsuarioId = contexto.UsuarioId,
                    FechaEvento = ahora
                });
            }
        }

        await ctx.SaveChangesAsync(ct);
        return Ok(new
        {
            mensaje = "Recorrido de la ruta iniciado exitosamente. Envíos puestos en reparto.",
            rutaId = ruta.Id,
            estadoRuta = ConvertidorASnake.ToSnake(ruta.Estado),
            totalEnviosEnRuta = ruta.Envios.Count
        });
    }

    [HttpPost("{id:long}/asignar-recursos")]
    [Authorize(Roles = "Jefe de flotilla, Jefe")]
    public async Task<IActionResult> AsignarRecursosRuta(long id, [FromBody] AsignarRecursosRutaModel model, CancellationToken ct)
    {
        await using var ctx = await _factory.CreateDbContextAsync(ct);

        var ruta = await ctx.Rutas.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (ruta is null)
            return NotFound(new { mensaje = $"No se encontró la ruta con Id {id}." });

        if (ruta.Estado != EstadoRuta.Planeada)
            return BadRequest(new { mensaje = "Solo pueden asignarse o modificarse recursos en rutas que no han iniciado ('planeada')." });

        var chofer = await ctx.Empleados.FirstOrDefaultAsync(e => e.Id == model.ChoferId && e.Activo, ct);
        if (chofer is null)
            return BadRequest(new { mensaje = "El chofer seleccionado no existe o no se encuentra activo." });

        var unidad = await ctx.Unidades.FirstOrDefaultAsync(u => u.Id == model.UnidadId && u.Activo, ct);
        if (unidad is null)
            return BadRequest(new { mensaje = "La unidad seleccionada no existe o no se encuentra activa." });

        ruta.ChoferId = chofer.Id;
        ruta.UnidadId = unidad.Id;
        ruta.UpdatedAt = DateTimeOffset.UtcNow;

        await ctx.SaveChangesAsync(ct);
        return Ok(new { mensaje = "Recursos asignados a la ruta exitosamente.", rutaId = ruta.Id, choferId = chofer.Id, unidadId = unidad.Id });
    }
}
