using System.Data;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Backend.BDFolder;
using Backend.Exceptions;
using Backend.Helpers;
using Backend.Models;
using Backend.Policies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Polly;

namespace Backend.Services;

public partial class EnvioService
{
    private static readonly char[] AlfabetoGuia = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ".ToCharArray();
    private static readonly JsonSerializerOptions JsonOpcionesSnapshot = new(JsonSerializerDefaults.Web);
    private static readonly Regex RegexPinFinal = new(@"(\d{6})\s*$", RegexOptions.Compiled);

    private readonly IDbContextFactory<TransportesRojasDbContext> _factory;
    private readonly ILogger<EnvioService> _logger;
    private readonly ResiliencePipeline _pipeline;
    private readonly PasswordHasher<object> _passwordHasher = new();

    public EnvioService(
        IDbContextFactory<TransportesRojasDbContext> factory,
        ILogger<EnvioService> logger)
    {
        _factory = factory;
        _logger = logger;
        _pipeline = PollyPolicies.CrearPipelineSerializacion(logger);
    }

    // Consultas y registro de envíos

    public async Task<List<EnvioListadoItem>> GetEnviosPorContextoAsync(
        ContextoSeguridadUsuario contextoRaw,
        FiltroEnviosQuery filtro)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var contexto = await EnriquecerContextoAsync(ctx, contextoRaw);
        var alcance = contexto.DeterminarAlcanceEnvios();

        if (alcance == AlcanceVistaEnvios.Ninguno)
        {
            throw new UnauthorizedAccessException("No cuentas con permisos para consultar el módulo de envíos.");
        }

        var skip = Math.Max(0, filtro.Skip);
        var take = Math.Clamp(filtro.Take <= 0 ? 100 : filtro.Take, 1, 500);

        IQueryable<Envio> query = ctx.Envios
            .AsNoTracking()
            .Include(e => e.Remitente)
            .Include(e => e.SucursalRecepcion)
            .Include(e => e.SucursalDestino)
            .Include(e => e.DireccionDestino)
            .Include(e => e.Rutas)
                .ThenInclude(re => re.Ruta)
                    .ThenInclude(r => r.Flotilla)
            .Include(e => e.Rutas)
                .ThenInclude(re => re.Ruta)
                    .ThenInclude(r => r.Chofer)
            .Include(e => e.Rutas)
                .ThenInclude(re => re.Ruta)
                    .ThenInclude(r => r.Unidad);

        query = await AplicarFiltroAlcanceAsync(ctx, query, contexto, alcance, filtro.Busqueda);

        if (!string.IsNullOrWhiteSpace(filtro.Estado))
        {
            if (TryParseEstadoEnvio(filtro.Estado, out var estadoEnum))
            {
                query = query.Where(e => e.Estado == estadoEnum);
            }
            else
            {
                throw new ArgumentException($"El estado de envío '{filtro.Estado}' no es válido.");
            }
        }

        if (filtro.SucursalId.HasValue && filtro.SucursalId.Value > 0)
        {
            var sucId = filtro.SucursalId.Value;
            query = query.Where(e => e.SucursalRecepcionId == sucId || e.SucursalDestinoId == sucId);
        }

        if (filtro.RequiereRecoleccion.HasValue)
        {
            var reqRec = filtro.RequiereRecoleccion.Value;
            query = query.Where(e => e.RequiereRecoleccion == reqRec);
        }

        if (!string.IsNullOrWhiteSpace(filtro.Busqueda))
        {
            var termino = filtro.Busqueda.Trim().ToUpperInvariant();
            query = query.Where(e =>
                e.Guia.ToUpper().Contains(termino) ||
                e.DestinatarioNombre.ToUpper().Contains(termino) ||
                e.DestinatarioTelefono.Contains(termino) ||
                (e.Remitente.Nombre != null && e.Remitente.Nombre.ToUpper().Contains(termino)) ||
                (e.Remitente.ApellidoPaterno != null && e.Remitente.ApellidoPaterno.ToUpper().Contains(termino)) ||
                (e.DireccionDestino != null && e.DireccionDestino.Municipio != null && e.DireccionDestino.Municipio.ToUpper().Contains(termino)) ||
                (e.DireccionDestino != null && e.DireccionDestino.Estado != null && e.DireccionDestino.Estado.ToUpper().Contains(termino)) ||
                (e.DireccionDestino != null && e.DireccionDestino.CodigoPostal != null && e.DireccionDestino.CodigoPostal.Contains(termino)));
        }

        var entidades = await query
            .OrderByDescending(e => e.FechaCreacion)
            .ThenByDescending(e => e.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return entidades.Select(MapearListadoItem).ToList();
    }

    public async Task<EnvioDetalleResponse?> GetEnvioDetallePorContextoAsync(
        long envioId,
        ContextoSeguridadUsuario contextoRaw)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var contexto = await EnriquecerContextoAsync(ctx, contextoRaw);
        var alcance = contexto.DeterminarAlcanceEnvios();

        if (alcance == AlcanceVistaEnvios.Ninguno)
        {
            throw new UnauthorizedAccessException("No cuentas con permisos para consultar envíos.");
        }

        var envio = await CargarEnvioCompletoQuery(ctx)
            .FirstOrDefaultAsync(e => e.Id == envioId);

        if (envio is null)
            return null;

        var tieneAcceso = await ValidarAccesoAEnvioIndividualAsync(ctx, envio, contexto, alcance);
        if (!tieneAcceso)
        {
            throw new UnauthorizedAccessException("No tienes autorización para consultar este envío.");
        }

        return MapearDetalleResponse(envio, contexto);
    }

    public async Task<CrearEnvioResponse> CrearEnvioAsync(
        CrearEnvioModel model,
        ContextoSeguridadUsuario contextoRaw)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);

            ContextoSeguridadUsuario contexto;
            string guia;
            long nuevoEnvioId;

            await using (var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct))
            {
                try
                {
                    contexto = await EnriquecerContextoAsync(ctx, contextoRaw, ct);

                long remitenteIdEfectivo;
                if (contexto.EsCliente)
                {
                    if (!contexto.ClienteId.HasValue)
                        throw new UnauthorizedAccessException("No se encontró el perfil de cliente asociado a tu sesión.");

                    remitenteIdEfectivo = contexto.ClienteId.Value;
                }
                else
                {
                    var puedeRegistrar = contexto.TienePermisoORolRespaldo(
                        "envio.registrar",
                        "Personal administrativo",
                        "Jefe");

                    if (!puedeRegistrar)
                    {
                        throw new UnauthorizedAccessException("Tu rol no cuenta con el permiso 'envio.registrar' para documentar nuevos envíos.");
                    }

                    if (!model.RemitenteId.HasValue || model.RemitenteId.Value <= 0)
                    {
                        throw new InvalidOperationException("Debes seleccionar un cliente remitente válido.");
                    }

                    remitenteIdEfectivo = model.RemitenteId.Value;
                }

                var remitente = await ctx.Clientes
                    .Include(c => c.Direcciones)
                        .ThenInclude(cd => cd.Direccion)
                    .FirstOrDefaultAsync(c => c.Id == remitenteIdEfectivo && c.Activo, ct);

                if (remitente is null)
                    throw new InvalidOperationException("El cliente remitente indicado no existe o se encuentra inactivo.");

                if (model.DestinatarioClienteId.HasValue && model.DestinatarioClienteId.Value > 0)
                {
                    var existeDestCliente = await ctx.Clientes
                        .AnyAsync(c => c.Id == model.DestinatarioClienteId.Value && c.Activo, ct);
                    if (!existeDestCliente)
                        throw new InvalidOperationException("El cliente destinatario vinculado no existe o está inactivo.");
                }

                Sucursal? sucursalRecepcion = null;
                var sucursalRecepcionIdSolicitada = model.SucursalRecepcionId;
                if (!sucursalRecepcionIdSolicitada.HasValue && !model.RequiereRecoleccion && contexto.EsEmpleado && contexto.SucursalId.HasValue)
                {
                    sucursalRecepcionIdSolicitada = contexto.SucursalId.Value;
                }

                if (sucursalRecepcionIdSolicitada.HasValue && sucursalRecepcionIdSolicitada.Value > 0)
                {
                    sucursalRecepcion = await ctx.Sucursales
                        .Include(s => s.Direccion)
                        .FirstOrDefaultAsync(s => s.Id == sucursalRecepcionIdSolicitada.Value && s.Activo, ct);

                    if (sucursalRecepcion is null)
                        throw new InvalidOperationException("La sucursal de recepción seleccionada no existe o no está activa.");
                }

                var (direccionDestinoEntidad, snapshotDestino) = await ConstruirDireccionYSnapshotAsync(ctx, model.DireccionDestino, ct);
                ctx.Direcciones.Add(direccionDestinoEntidad);

                var sugerenciaDestino = await ResolverSucursalCoberturaInternaAsync(
                    ctx,
                    snapshotDestino.EstadoId,
                    snapshotDestino.MunicipioId,
                    snapshotDestino.CodigoPostal,
                    snapshotDestino.Estado,
                    snapshotDestino.Municipio,
                    snapshotDestino.Latitud,
                    snapshotDestino.Longitud,
                    ct);

                Sucursal? sucursalDestino = sugerenciaDestino.Sucursal;
                short diasEstimados = sugerenciaDestino.DiasEstimados;

                Direccion? direccionRecoleccionEntidad = null;
                DireccionSnapshotDto? snapshotOrigen = null;

                if (model.DireccionOrigen is not null)
                {
                    var (dirOrigen, snapOrig) = await ConstruirDireccionYSnapshotAsync(ctx, model.DireccionOrigen, ct);
                    snapshotOrigen = snapOrig;
                    if (model.RequiereRecoleccion)
                    {
                        direccionRecoleccionEntidad = dirOrigen;
                        ctx.Direcciones.Add(direccionRecoleccionEntidad);
                    }
                }
                else if (sucursalRecepcion?.Direccion is not null)
                {
                    snapshotOrigen = MapearDireccionASnapshot(sucursalRecepcion.Direccion);
                }
                else
                {
                    var dirClientePredet = remitente.Direcciones
                        .OrderByDescending(cd => cd.Predeterminada)
                        .Select(cd => cd.Direccion)
                        .FirstOrDefault(d => d.Activo);

                    if (dirClientePredet is not null)
                    {
                        snapshotOrigen = MapearDireccionASnapshot(dirClientePredet);
                    }
                }

                await ctx.SaveChangesAsync(ct);

                var ahora = DateTimeOffset.UtcNow;
                guia = await GenerarGuiaUnicaAsync(ctx, ahora, ct);
                var telefonoLimpio = new string(model.DestinatarioTelefono.Where(char.IsDigit).ToArray());

                var estadoInicial = model.RequiereRecoleccion
                    ? EstadoEnvio.RecoleccionProgramada
                    : EstadoEnvio.Registrado;

                var diasEntregaTotal = diasEstimados + (model.RequiereRecoleccion ? 1 : 0);
                var fechaEntregaEstimada = model.FechaEntregaEstimada ?? ahora.AddDays(diasEntregaTotal);

                var nuevoEnvio = new Envio
                {
                    Guia = guia,
                    RemitenteId = remitente.Id,
                    DestinatarioClienteId = model.DestinatarioClienteId is > 0 ? model.DestinatarioClienteId : null,
                    DestinatarioNombre = model.DestinatarioNombre.Trim(),
                    DestinatarioTelefono = telefonoLimpio,
                    DestinatarioEmail = string.IsNullOrWhiteSpace(model.DestinatarioEmail)
                        ? null
                        : model.DestinatarioEmail.Trim().ToLowerInvariant(),
                    IntentoReparto = 0,
                    RequiereRecoleccion = model.RequiereRecoleccion,
                    SucursalRecepcionId = sucursalRecepcion?.Id,
                    SucursalDestinoId = sucursalDestino?.Id,
                    DireccionDestinoId = direccionDestinoEntidad.Id,
                    DireccionOrigenSnapshot = snapshotOrigen is not null
                        ? JsonSerializer.SerializeToDocument(snapshotOrigen, JsonOpcionesSnapshot)
                        : null,
                    DireccionDestinoSnapshot = JsonSerializer.SerializeToDocument(snapshotDestino, JsonOpcionesSnapshot),
                    PesoKg = Math.Round(model.PesoKg, 2),
                    LargoCm = Math.Round(model.LargoCm, 2),
                    AnchoCm = Math.Round(model.AnchoCm, 2),
                    AltoCm = Math.Round(model.AltoCm, 2),
                    Descripcion = model.Descripcion.Trim(),
                    ValorDeclarado = model.ValorDeclarado.HasValue ? Math.Round(model.ValorDeclarado.Value, 2) : null,
                    CodigoValidacionHash = null,
                    Estado = estadoInicial,
                    CreadoPorUsuarioId = contexto.UsuarioId,
                    FechaCreacion = ahora,
                    FechaEntregaEstimada = fechaEntregaEstimada,
                    Metadata = JsonSerializer.SerializeToDocument(new
                    {
                        canalRegistro = contexto.EsCliente ? "portal_cliente" : "ventanilla_admin"
                    }, JsonOpcionesSnapshot),
                    CreatedAt = ahora,
                    UpdatedAt = ahora
                };

                ctx.Envios.Add(nuevoEnvio);
                await ctx.SaveChangesAsync(ct);

                var descripcionEventoInicial = sucursalRecepcion is not null
                    ? $"ENVÍO DOCUMENTADO PARA RECEPCIÓN EN SUCURSAL {sucursalRecepcion.NombreCorto ?? sucursalRecepcion.Nombre}."
                    : "ENVÍO DOCUMENTADO EN PLATAFORMA.";

                var eventoInicial = new EventoEnvio
                {
                    EnvioId = nuevoEnvio.Id,
                    Estado = ConvertidorASnake.ToSnake(estadoInicial),
                    Descripcion = descripcionEventoInicial.Trim(),
                    Latitud = snapshotOrigen?.Latitud ?? snapshotDestino.Latitud,
                    Longitud = snapshotOrigen?.Longitud ?? snapshotDestino.Longitud,
                    UsuarioId = contexto.UsuarioId,
                    FechaEvento = ahora
                };
                ctx.EventosEnvio.Add(eventoInicial);

                    await ctx.SaveChangesAsync(ct);
                    await tx.CommitAsync(ct);

                    nuevoEnvioId = nuevoEnvio.Id;

                    _logger.LogInformation(
                        "Envío creado exitosamente. Id={EnvioId}, Guia={Guia}, Estado={Estado}, RemitenteId={RemitenteId}",
                        nuevoEnvio.Id, guia, estadoInicial, remitente.Id);
                }
                catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
                {
                    await RollbackSafeAsync(tx, ct);
                    throw new RetryableException("Conflicto de concurrencia al generar el envío.", ex);
                }
                catch
                {
                    await RollbackSafeAsync(tx, ct);
                    throw;
                }
            }

            var envioCompleto = await CargarEnvioCompletoQuery(ctx)
                .FirstAsync(e => e.Id == nuevoEnvioId, ct);

            var detalle = MapearDetalleResponse(envioCompleto, contexto);
            return new CrearEnvioResponse(guia, null, detalle);
        }, CancellationToken.None);
    }

    // Rastreo público y control de alcance

    public async Task<RastreoPublicoResponse?> RastrearPorGuiaAsync(string guiaRaw)
    {
        if (string.IsNullOrWhiteSpace(guiaRaw))
            return null;

        var guiaNormalizada = guiaRaw.Trim().ToUpperInvariant();

        await using var ctx = await _factory.CreateDbContextAsync();
        var envio = await ctx.Envios
            .AsNoTracking()
            .Include(e => e.SucursalRecepcion)
            .Include(e => e.SucursalDestino)
            .Include(e => e.DireccionDestino)
            .Include(e => e.Eventos)
            .FirstOrDefaultAsync(e => e.Guia == guiaNormalizada);

        if (envio is null)
            return null;

        var snapOrigen = ExtraerSnapshotDireccion(envio.DireccionOrigenSnapshot);
        var snapDestino = ExtraerSnapshotDireccion(envio.DireccionDestinoSnapshot)
                          ?? (envio.DireccionDestino != null ? MapearDireccionASnapshot(envio.DireccionDestino) : null);

        var origenResumen = FormatearUbicacionPublica(snapOrigen)
                            ?? (envio.SucursalRecepcion != null
                                ? (envio.SucursalRecepcion.NombreCorto ?? envio.SucursalRecepcion.Nombre)
                                : null);

        var destinoResumen = FormatearUbicacionPublica(snapDestino)
                             ?? (envio.SucursalDestino != null
                                 ? (envio.SucursalDestino.NombreCorto ?? envio.SucursalDestino.Nombre)
                                 : null);

        var eventos = envio.Eventos
            .OrderByDescending(ev => ev.FechaEvento)
            .ThenByDescending(ev => ev.Id)
            .Select(ev => new EventoRastreoPublicoItem(
                ev.Estado,
                ev.Descripcion,
                ev.FechaEvento))
            .ToList();

        return new RastreoPublicoResponse(
            envio.Guia,
            ConvertidorASnake.ToSnake(envio.Estado),
            envio.RequiereRecoleccion,
            origenResumen,
            destinoResumen,
            envio.SucursalRecepcion != null ? (envio.SucursalRecepcion.NombreCorto ?? envio.SucursalRecepcion.Nombre) : null,
            envio.SucursalDestino != null ? (envio.SucursalDestino.NombreCorto ?? envio.SucursalDestino.Nombre) : null,
            envio.PesoKg,
            envio.Descripcion,
            envio.IntentoReparto,
            envio.FechaCreacion,
            envio.FechaEntregaEstimada,
            eventos);
    }

    internal static IQueryable<Envio> CargarEnvioCompletoQuery(TransportesRojasDbContext ctx)
    {
        return ctx.Envios
            .AsNoTracking()
            .AsSplitQuery()
            .Include(e => e.Remitente)
            .Include(e => e.SucursalRecepcion)
            .Include(e => e.SucursalDestino)
            .Include(e => e.DireccionDestino)
            .Include(e => e.Recepcion)
                .ThenInclude(r => r!.RecibidoPorEmpleado)
            .Include(e => e.Rutas)
                .ThenInclude(re => re.Ruta)
                    .ThenInclude(r => r.Flotilla)
            .Include(e => e.Rutas)
                .ThenInclude(re => re.Ruta)
                    .ThenInclude(r => r.Chofer)
            .Include(e => e.Rutas)
                .ThenInclude(re => re.Ruta)
                    .ThenInclude(r => r.Unidad)
            .Include(e => e.Entregas)
                .ThenInclude(ent => ent.Chofer)
            .Include(e => e.AvisosSms)
            .Include(e => e.Eventos)
                .ThenInclude(ev => ev.Usuario)
                    .ThenInclude(u => u!.Empleado)
            .Include(e => e.Eventos)
                .ThenInclude(ev => ev.Usuario)
                    .ThenInclude(u => u!.Cliente);
    }

    internal static async Task<ContextoSeguridadUsuario> EnriquecerContextoAsync(
        TransportesRojasDbContext ctx,
        ContextoSeguridadUsuario baseCtx,
        CancellationToken ct = default)
    {
        var empleadoId = baseCtx.EmpleadoId;
        var clienteId = baseCtx.ClienteId;
        var sucursalId = baseCtx.SucursalId;
        var tipoUsuario = baseCtx.TipoUsuario;

        if (baseCtx.UsuarioId.HasValue)
        {
            if (baseCtx.EsCliente && !clienteId.HasValue)
            {
                var cli = await ctx.Clientes
                    .AsNoTracking()
                    .Where(c => c.UsuarioId == baseCtx.UsuarioId.Value && c.Activo)
                    .Select(c => new { c.Id })
                    .FirstOrDefaultAsync(ct);

                if (cli is not null)
                    clienteId = cli.Id;
            }
            else if (baseCtx.EsEmpleado && (!empleadoId.HasValue || !sucursalId.HasValue))
            {
                var emp = await ctx.Empleados
                    .AsNoTracking()
                    .Where(e => e.UsuarioId == baseCtx.UsuarioId.Value && e.Activo)
                    .Select(e => new { e.Id, e.SucursalId })
                    .FirstOrDefaultAsync(ct);

                if (emp is not null)
                {
                    empleadoId ??= emp.Id;
                    sucursalId ??= emp.SucursalId;
                }
            }
        }

        return new ContextoSeguridadUsuario
        {
            UsuarioId = baseCtx.UsuarioId,
            EmpleadoId = empleadoId,
            ClienteId = clienteId,
            SucursalId = sucursalId,
            Email = baseCtx.Email,
            TipoUsuario = tipoUsuario,
            Roles = baseCtx.Roles,
            Permisos = baseCtx.Permisos
        };
    }

    private static async Task<IQueryable<Envio>> AplicarFiltroAlcanceAsync(
        TransportesRojasDbContext ctx,
        IQueryable<Envio> query,
        ContextoSeguridadUsuario contexto,
        AlcanceVistaEnvios alcance,
        string? busquedaRaw)
    {
        switch (alcance)
        {
            case AlcanceVistaEnvios.Global:
                return query;

            case AlcanceVistaEnvios.ClientePropio:
            {
                if (!contexto.ClienteId.HasValue)
                    return query.Where(_ => false);

                var cid = contexto.ClienteId.Value;
                return query.Where(e => e.RemitenteId == cid || e.DestinatarioClienteId == cid);
            }

            case AlcanceVistaEnvios.OperadorRuta:
            {
                if (!contexto.EmpleadoId.HasValue)
                    return query.Where(_ => false);

                var choferId = contexto.EmpleadoId.Value;
                var flotillasActivasIds = await ctx.AsignacionesFlotillaChofer
                    .AsNoTracking()
                    .Where(a => a.ChoferId == choferId && a.Activo)
                    .Select(a => a.FlotillaId)
                    .ToListAsync();

                return query.Where(e =>
                    e.Rutas.Any(re =>
                        re.Ruta.ChoferId == choferId ||
                        (re.Ruta.ChoferId == null &&
                         re.Ruta.FlotillaId != null &&
                         flotillasActivasIds.Contains(re.Ruta.FlotillaId.Value))));
            }

            case AlcanceVistaEnvios.Sucursal:
            {
                var guiaExacta = !string.IsNullOrWhiteSpace(busquedaRaw) &&
                                 busquedaRaw.Trim().StartsWith("TR-", StringComparison.OrdinalIgnoreCase)
                    ? busquedaRaw.Trim().ToUpperInvariant()
                    : null;

                var sucursalesAlcance = new HashSet<long>();
                if (contexto.SucursalId.HasValue)
                    sucursalesAlcance.Add(contexto.SucursalId.Value);

                var flotillasIds = new HashSet<long>();
                if (contexto.EmpleadoId.HasValue)
                {
                    var empId = contexto.EmpleadoId.Value;
                    var sucursalesResponsable = await ctx.Sucursales
                        .AsNoTracking()
                        .Where(s => s.Activo && s.ResponsableId == empId)
                        .Select(s => s.Id)
                        .ToListAsync();

                    foreach (var sid in sucursalesResponsable)
                        sucursalesAlcance.Add(sid);

                    var flotillasSupervisadas = await ctx.Flotillas
                        .AsNoTracking()
                        .Where(f => f.Activo && (f.SupervisorId == empId || (contexto.SucursalId.HasValue && f.SucursalId == contexto.SucursalId.Value)))
                        .Select(f => new { f.Id, f.SucursalId })
                        .ToListAsync();

                    foreach (var f in flotillasSupervisadas)
                    {
                        flotillasIds.Add(f.Id);
                        if (f.SucursalId.HasValue)
                            sucursalesAlcance.Add(f.SucursalId.Value);
                    }
                }

                if (sucursalesAlcance.Count == 0 && flotillasIds.Count == 0)
                {
                    if (contexto.TieneRol("Supervisor", "Jefe de flotilla"))
                        return query;

                    return guiaExacta is not null
                        ? query.Where(e => e.Guia == guiaExacta)
                        : query.Where(_ => false);
                }

                var listaSucursales = sucursalesAlcance.ToList();
                var listaFlotillas = flotillasIds.ToList();

                return query.Where(e =>
                    (e.SucursalRecepcionId != null && listaSucursales.Contains(e.SucursalRecepcionId.Value)) ||
                    (e.SucursalDestinoId != null && listaSucursales.Contains(e.SucursalDestinoId.Value)) ||
                    e.Rutas.Any(re => re.Ruta.FlotillaId != null && listaFlotillas.Contains(re.Ruta.FlotillaId.Value)) ||
                    (guiaExacta != null && e.Guia == guiaExacta));
            }

            default:
                return query.Where(_ => false);
        }
    }

    internal static async Task<bool> ValidarAccesoAEnvioIndividualAsync(
        TransportesRojasDbContext ctx,
        Envio envio,
        ContextoSeguridadUsuario contexto,
        AlcanceVistaEnvios alcance)
    {
        switch (alcance)
        {
            case AlcanceVistaEnvios.Global:
                return true;

            case AlcanceVistaEnvios.ClientePropio:
                return contexto.ClienteId.HasValue &&
                       (envio.RemitenteId == contexto.ClienteId.Value ||
                        envio.DestinatarioClienteId == contexto.ClienteId.Value);

            case AlcanceVistaEnvios.OperadorRuta:
            {
                if (!contexto.EmpleadoId.HasValue)
                    return false;

                var choferId = contexto.EmpleadoId.Value;
                if (envio.Rutas.Any(re => re.Ruta.ChoferId == choferId))
                    return true;

                var flotillasActivas = await ctx.AsignacionesFlotillaChofer
                    .AsNoTracking()
                    .Where(a => a.ChoferId == choferId && a.Activo)
                    .Select(a => a.FlotillaId)
                    .ToListAsync();

                return envio.Rutas.Any(re =>
                    re.Ruta.ChoferId == null &&
                    re.Ruta.FlotillaId.HasValue &&
                    flotillasActivas.Contains(re.Ruta.FlotillaId.Value));
            }

            case AlcanceVistaEnvios.Sucursal:
            {
                if (!contexto.SucursalId.HasValue && contexto.TieneRol("Supervisor", "Jefe de flotilla"))
                    return true;

                if (contexto.SucursalId.HasValue &&
                    (envio.SucursalRecepcionId == contexto.SucursalId.Value ||
                     envio.SucursalDestinoId == contexto.SucursalId.Value))
                {
                    return true;
                }

                if (contexto.EmpleadoId.HasValue)
                {
                    var empId = contexto.EmpleadoId.Value;
                    var esSupervisorDeFlotilla = envio.Rutas.Any(re => re.Ruta.Flotilla?.SupervisorId == empId);
                    if (esSupervisorDeFlotilla)
                        return true;
                }

                if (contexto.TienePermisoORolRespaldo("envio.recepcion_sucursal", "Personal de sucursal"))
                    return true;

                return false;
            }

            default:
                return false;
        }
    }

    // Construcción y cobertura de direcciones

    private static async Task<(Direccion Entidad, DireccionSnapshotDto Snapshot)> ConstruirDireccionYSnapshotAsync(
        TransportesRojasDbContext ctx,
        DireccionEnvioInput input,
        CancellationToken ct)
    {
        short? estadoId = input.EstadoId;
        int? municipioId = input.MunicipioId;
        long? localidadId = input.LocalidadId;
        long? asentamientoId = input.AsentamientoId is > 0 ? input.AsentamientoId : null;

        string? colonia = string.IsNullOrWhiteSpace(input.Colonia) ? null : input.Colonia.Trim().ToUpperInvariant();
        string? localidad = string.IsNullOrWhiteSpace(input.Localidad) ? null : input.Localidad.Trim().ToUpperInvariant();
        string? municipio = string.IsNullOrWhiteSpace(input.Municipio) ? null : input.Municipio.Trim().ToUpperInvariant();
        string? estado = string.IsNullOrWhiteSpace(input.Estado) ? null : input.Estado.Trim().ToUpperInvariant();
        string? cp = string.IsNullOrWhiteSpace(input.CodigoPostal)
            ? null
            : new string(input.CodigoPostal.Where(char.IsDigit).ToArray()).PadLeft(5, '0');

        decimal? latitud = input.Latitud;
        decimal? longitud = input.Longitud;

        if (asentamientoId.HasValue)
        {
            var asenta = await ctx.CatAsentamientos
                .AsNoTracking()
                .Include(a => a.Estado)
                .Include(a => a.Municipio)
                .FirstOrDefaultAsync(a => a.Id == asentamientoId.Value && a.Activo, ct);

            if (asenta is null)
                throw new InvalidOperationException("La colonia seleccionada no existe o está inactiva.");

            estadoId = asenta.EstadoId;
            municipioId = asenta.MunicipioId;
            cp = asenta.DCodigo;
            colonia = asenta.DAsenta.ToUpperInvariant();
            municipio = asenta.Municipio.Nombre.ToUpperInvariant();
            estado = asenta.Estado.Nombre.ToUpperInvariant();
            localidad = (asenta.DCiudad ?? asenta.Municipio.NomCab ?? asenta.Municipio.Nombre).ToUpperInvariant();
        }
        else if (!string.IsNullOrWhiteSpace(cp) && cp.Length == 5 && (!estadoId.HasValue || !municipioId.HasValue))
        {
            var asentaPorCp = await ctx.CatAsentamientos
                .AsNoTracking()
                .Include(a => a.Estado)
                .Include(a => a.Municipio)
                .FirstOrDefaultAsync(a => a.Activo && a.DCodigo == cp, ct);

            if (asentaPorCp is not null)
            {
                estadoId ??= asentaPorCp.EstadoId;
                municipioId ??= asentaPorCp.MunicipioId;
                estado ??= asentaPorCp.Estado.Nombre.ToUpperInvariant();
                municipio ??= asentaPorCp.Municipio.Nombre.ToUpperInvariant();
                localidad ??= (asentaPorCp.DCiudad ?? asentaPorCp.Municipio.NomCab ?? asentaPorCp.Municipio.Nombre).ToUpperInvariant();
            }
        }

        if (municipioId.HasValue && (!localidadId.HasValue || !latitud.HasValue || !longitud.HasValue))
        {
            var locCabecera = await ctx.CatLocalidades
                .AsNoTracking()
                .Where(l => l.Activo && l.MunicipioId == municipioId.Value && l.LatDecimal != null && l.LonDecimal != null)
                .OrderBy(l => l.CveLoc == "0001" ? 0 : 1)
                .ThenBy(l => l.CveLoc)
                .Select(l => new { l.Id, l.LatDecimal, l.LonDecimal })
                .FirstOrDefaultAsync(ct);

            if (locCabecera is not null)
            {
                localidadId ??= locCabecera.Id;
                latitud ??= locCabecera.LatDecimal;
                longitud ??= locCabecera.LonDecimal;
            }
        }

        var calleUpper = input.Calle.Trim().ToUpperInvariant();
        var numExtUpper = ValidacionEntradaHelper.NormalizarNumeroExterior(input.NumeroExterior);
        var numIntUpper = string.IsNullOrWhiteSpace(input.NumeroInterior) ? null : input.NumeroInterior.Trim().ToUpperInvariant();
        var entreCallesUpper = string.IsNullOrWhiteSpace(input.EntreCalles) ? null : input.EntreCalles.Trim().ToUpperInvariant();
        var referenciasUpper = string.IsNullOrWhiteSpace(input.Referencias) ? null : input.Referencias.Trim().ToUpperInvariant();

        var entidad = new Direccion
        {
            EstadoId = estadoId,
            MunicipioId = municipioId,
            LocalidadId = localidadId,
            AsentamientoId = asentamientoId,
            Calle = calleUpper,
            NumeroExterior = numExtUpper,
            NumeroInterior = numIntUpper,
            EntreCalles = entreCallesUpper,
            Colonia = asentamientoId.HasValue ? null : colonia,
            Localidad = asentamientoId.HasValue ? null : localidad,
            Municipio = asentamientoId.HasValue ? null : municipio,
            Estado = asentamientoId.HasValue ? null : estado,
            Pais = "MÉXICO",
            CodigoPostal = asentamientoId.HasValue ? null : cp,
            Referencias = referenciasUpper,
            Latitud = latitud,
            Longitud = longitud,
            Activo = true
        };

        var snapshot = new DireccionSnapshotDto(
            calleUpper,
            numExtUpper,
            numIntUpper,
            entreCallesUpper,
            colonia,
            localidad,
            municipio,
            estado,
            cp,
            "MÉXICO",
            referenciasUpper,
            latitud,
            longitud,
            asentamientoId,
            localidadId,
            municipioId,
            estadoId);

        return (entidad, snapshot);
    }

    private static async Task<(Sucursal? Sucursal, short DiasEstimados)> ResolverSucursalCoberturaInternaAsync(
        TransportesRojasDbContext ctx,
        short? estadoId,
        int? municipioId,
        string? cp,
        string? estadoNombre,
        string? municipioNombre,
        decimal? latitudDestino,
        decimal? longitudDestino,
        CancellationToken ct)
    {
        var sucursalesActivas = await ctx.Sucursales
            .Include(s => s.Direccion)
            .Where(s => s.Activo)
            .ToListAsync(ct);

        if (sucursalesActivas.Count == 0)
            return (null, 3);

        decimal? latDest = latitudDestino;
        decimal? lonDest = longitudDestino;

        if ((!latDest.HasValue || !lonDest.HasValue) && municipioId.HasValue)
        {
            var locDest = await ctx.CatLocalidades
                .AsNoTracking()
                .Where(l => l.Activo && l.MunicipioId == municipioId.Value && l.LatDecimal != null && l.LonDecimal != null)
                .OrderBy(l => l.CveLoc == "0001" ? 0 : 1)
                .ThenBy(l => l.CveLoc)
                .Select(l => new { l.LatDecimal, l.LonDecimal })
                .FirstOrDefaultAsync(ct);

            if (locDest is not null)
            {
                latDest = locDest.LatDecimal;
                lonDest = locDest.LonDecimal;
            }
        }

        if ((!latDest.HasValue || !lonDest.HasValue) && estadoId.HasValue)
        {
            var locEstado = await ctx.CatLocalidades
                .AsNoTracking()
                .Where(l => l.Activo && l.EstadoId == estadoId.Value && l.LatDecimal != null && l.LonDecimal != null)
                .OrderBy(l => l.CveLoc == "0001" ? 0 : 1)
                .Select(l => new { l.LatDecimal, l.LonDecimal })
                .FirstOrDefaultAsync(ct);

            if (locEstado is not null)
            {
                latDest = locEstado.LatDecimal;
                lonDest = locEstado.LonDecimal;
            }
        }

        if (latDest.HasValue && lonDest.HasValue)
        {
            var municipiosSucursalesSinCoords = sucursalesActivas
                .Where(s => s.Direccion is { Latitud: null, MunicipioId: not null } || s.Direccion is { Longitud: null, MunicipioId: not null })
                .Select(s => s.Direccion!.MunicipioId!.Value)
                .Distinct()
                .ToList();

            var coordsPorMunicipio = new Dictionary<int, (decimal Lat, decimal Lon)>();
            if (municipiosSucursalesSinCoords.Count > 0)
            {
                var locsSucursales = await ctx.CatLocalidades
                    .AsNoTracking()
                    .Where(l => l.Activo &&
                                municipiosSucursalesSinCoords.Contains(l.MunicipioId) &&
                                l.LatDecimal != null &&
                                l.LonDecimal != null)
                    .OrderBy(l => l.CveLoc == "0001" ? 0 : 1)
                    .Select(l => new { l.MunicipioId, Lat = l.LatDecimal!.Value, Lon = l.LonDecimal!.Value })
                    .ToListAsync(ct);

                foreach (var loc in locsSucursales)
                {
                    coordsPorMunicipio.TryAdd(loc.MunicipioId, (loc.Lat, loc.Lon));
                }
            }

            Sucursal? sucursalMasCercana = null;
            double menorDistanciaKm = double.MaxValue;

            foreach (var suc in sucursalesActivas)
            {
                decimal? latSuc = suc.Direccion?.Latitud;
                decimal? lonSuc = suc.Direccion?.Longitud;

                if ((!latSuc.HasValue || !lonSuc.HasValue) &&
                    suc.Direccion?.MunicipioId is int munSucId &&
                    coordsPorMunicipio.TryGetValue(munSucId, out var coordMun))
                {
                    latSuc = coordMun.Lat;
                    lonSuc = coordMun.Lon;
                }

                if (latSuc.HasValue && lonSuc.HasValue)
                {
                    var distKm = CalcularDistanciaHaversineKm(
                        (double)latDest.Value,
                        (double)lonDest.Value,
                        (double)latSuc.Value,
                        (double)lonSuc.Value);

                    if (distKm < menorDistanciaKm)
                    {
                        menorDistanciaKm = distKm;
                        sucursalMasCercana = suc;
                    }
                }
            }

            if (sucursalMasCercana is not null)
            {
                short diasPorDistancia = menorDistanciaKm <= 80 ? (short)1 : menorDistanciaKm <= 350 ? (short)2 : (short)3;
                return (sucursalMasCercana, diasPorDistancia);
            }
        }

        if (estadoId.HasValue)
        {
            var coberturas = await ctx.SucursalesCobertura
                .Include(sc => sc.Sucursal)
                .Where(sc =>
                    sc.Activo &&
                    sc.Sucursal.Activo &&
                    sc.EstadoId == estadoId.Value &&
                    (sc.MunicipioId == null || sc.MunicipioId == municipioId) &&
                    (sc.CodigoPostal == null || sc.CodigoPostal == cp))
                .ToListAsync(ct);

            var mejor = coberturas
                .OrderByDescending(sc => sc.CodigoPostal != null ? 3 : sc.MunicipioId != null ? 2 : 1)
                .ThenBy(sc => sc.DiasEstimados)
                .FirstOrDefault();

            if (mejor is not null)
                return (mejor.Sucursal, mejor.DiasEstimados);
        }

        var sucLocal = sucursalesActivas
            .OrderByDescending(s =>
                s.Direccion != null &&
                ((municipioId.HasValue && s.Direccion.MunicipioId == municipioId.Value) ||
                 (!string.IsNullOrWhiteSpace(municipioNombre) &&
                  string.Equals(s.Direccion.Municipio, municipioNombre, StringComparison.OrdinalIgnoreCase)))
                    ? 2
                    : s.Direccion != null &&
                      ((estadoId.HasValue && s.Direccion.EstadoId == estadoId.Value) ||
                       (!string.IsNullOrWhiteSpace(estadoNombre) &&
                        string.Equals(s.Direccion.Estado, estadoNombre, StringComparison.OrdinalIgnoreCase)))
                        ? 1
                        : 0)
            .FirstOrDefault();

        return (sucLocal ?? sucursalesActivas[0], (short)3);
    }

    private static double CalcularDistanciaHaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double radioTierraKm = 6371.0;
        var dLat = GradosARadianes(lat2 - lat1);
        var dLon = GradosARadianes(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(GradosARadianes(lat1)) * Math.Cos(GradosARadianes(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return radioTierraKm * c;
    }

    private static double GradosARadianes(double grados) => grados * (Math.PI / 180.0);

    private static async Task<string> GenerarGuiaUnicaAsync(
        TransportesRojasDbContext ctx,
        DateTimeOffset fechaUtc,
        CancellationToken ct)
    {
        var fechaLocal = fechaUtc.ToOffset(TimeSpan.FromHours(-7)).ToString("yyyyMMdd");

        for (var intento = 0; intento < 25; intento++)
        {
            var sufijo = new char[4];
            for (var i = 0; i < sufijo.Length; i++)
            {
                sufijo[i] = AlfabetoGuia[RandomNumberGenerator.GetInt32(AlfabetoGuia.Length)];
            }

            var candidata = $"TR-{fechaLocal}-{new string(sufijo)}";
            var existe = await ctx.Envios.AnyAsync(e => e.Guia == candidata, ct);
            if (!existe)
                return candidata;
        }

        throw new InvalidOperationException("No fue posible generar un folio de guía único. Intenta nuevamente.");
    }

    internal static EnvioListadoItem MapearListadoItem(Envio e)
    {
        var snapDestino = ExtraerSnapshotDireccion(e.DireccionDestinoSnapshot)
                          ?? (e.DireccionDestino != null ? MapearDireccionASnapshot(e.DireccionDestino) : null);

        var ciudadResumen = FormatearUbicacionPublica(snapDestino);
        var rutaActiva = e.Rutas
            .OrderByDescending(re => re.Id)
            .Select(re => re.Ruta)
            .FirstOrDefault(r => r.Estado != EstadoRuta.Cancelada);

        var flotillaNombre = rutaActiva?.Flotilla?.Nombre ?? ExtraerStringMetadata(e.Metadata, "flotillaNombre");
        var flotillaId = rutaActiva?.FlotillaId ?? ExtraerLongMetadata(e.Metadata, "flotillaId");
        var choferNombre = rutaActiva?.Chofer != null
            ? FormatearNombreCompleto(rutaActiva.Chofer.Nombre, rutaActiva.Chofer.ApellidoPaterno, rutaActiva.Chofer.ApellidoMaterno)
            : null;
        var unidadPlacas = rutaActiva?.Unidad?.Placas;

        var partesCalle = new List<string>();
        if (!string.IsNullOrWhiteSpace(snapDestino?.Calle))
        {
            var calleYNum = snapDestino.Calle.Trim()
                + ValidacionEntradaHelper.FormatearNumeroExterior(snapDestino.NumeroExterior);
            partesCalle.Add(calleYNum);
        }
        if (!string.IsNullOrWhiteSpace(snapDestino?.Colonia))
            partesCalle.Add($"Col. {snapDestino.Colonia.Trim()}");
        if (!string.IsNullOrWhiteSpace(snapDestino?.CodigoPostal))
            partesCalle.Add($"C.P. {snapDestino.CodigoPostal.Trim()}");

        var destinoCalleCompleta = partesCalle.Count > 0 ? string.Join(", ", partesCalle) : ciudadResumen;

        return new EnvioListadoItem(
            e.Id,
            e.Guia,
            ConvertidorASnake.ToSnake(e.Estado),
            e.RemitenteId,
            FormatearNombreCompleto(e.Remitente.Nombre, e.Remitente.ApellidoPaterno, e.Remitente.ApellidoMaterno, e.Remitente.Email),
            e.Remitente.Telefono,
            e.DestinatarioNombre,
            e.DestinatarioTelefono,
            e.DestinatarioEmail,
            ciudadResumen,
            snapDestino?.CodigoPostal,
            e.RequiereRecoleccion,
            e.SucursalRecepcionId,
            e.SucursalRecepcion != null ? (e.SucursalRecepcion.NombreCorto ?? e.SucursalRecepcion.Nombre) : null,
            e.SucursalDestinoId,
            e.SucursalDestino != null ? (e.SucursalDestino.NombreCorto ?? e.SucursalDestino.Nombre) : null,
            e.PesoKg,
            e.LargoCm,
            e.AnchoCm,
            e.AltoCm,
            e.Descripcion,
            e.ValorDeclarado,
            e.IntentoReparto,
            flotillaNombre,
            choferNombre,
            unidadPlacas,
            e.FechaCreacion,
            e.FechaEntregaEstimada,
            rutaActiva?.Id,
            snapDestino?.Latitud,
            snapDestino?.Longitud,
            destinoCalleCompleta,
            flotillaId);
    }

    internal static EnvioDetalleResponse MapearDetalleResponse(Envio e, ContextoSeguridadUsuario contexto)
    {
        var resumen = MapearListadoItem(e);
        var snapOrigen = ExtraerSnapshotDireccion(e.DireccionOrigenSnapshot);
        var snapDestino = ExtraerSnapshotDireccion(e.DireccionDestinoSnapshot)
                          ?? (e.DireccionDestino != null ? MapearDireccionASnapshot(e.DireccionDestino) : null);

        RecepcionPaqueteDto? recepcionDto = null;
        if (e.Recepcion is not null)
        {
            var nombreRecibio = e.Recepcion.RecibidoPorEmpleado != null
                ? FormatearNombreCompleto(
                    e.Recepcion.RecibidoPorEmpleado.Nombre,
                    e.Recepcion.RecibidoPorEmpleado.ApellidoPaterno,
                    e.Recepcion.RecibidoPorEmpleado.ApellidoMaterno)
                : "PERSONAL DE SUCURSAL";

            recepcionDto = new RecepcionPaqueteDto(
                e.Recepcion.FechaRecepcion,
                nombreRecibio,
                e.Recepcion.PesoVerificadoKg,
                e.Recepcion.LargoVerificadoCm,
                e.Recepcion.AnchoVerificadoCm,
                e.Recepcion.AltoVerificadoCm,
                e.Recepcion.EvidenciaFotoUrl,
                e.Recepcion.Observaciones);
        }

        var citasDto = new List<CitaRecoleccionDto>();

        var rutasDto = e.Rutas
            .OrderByDescending(re => re.Id)
            .Select(re => new RutaAsignadaResumenDto(
                re.RutaId,
                ConvertidorASnake.ToSnake(re.Ruta.Estado),
                re.Ruta.Fecha,
                re.Ruta.FlotillaId,
                re.Ruta.Flotilla?.Nombre,
                re.Ruta.ChoferId,
                re.Ruta.Chofer != null
                    ? FormatearNombreCompleto(re.Ruta.Chofer.Nombre, re.Ruta.Chofer.ApellidoPaterno, re.Ruta.Chofer.ApellidoMaterno)
                    : null,
                re.Ruta.UnidadId,
                re.Ruta.Unidad?.Placas,
                re.OrdenEntrega,
                ConvertidorASnake.ToSnake(re.Estado)))
            .ToList();

        var entregasDto = e.Entregas
            .OrderByDescending(ent => ent.FechaHora)
            .Select(ent => new EntregaIntentoDto(
                ent.Id,
                ent.IntentoReparto,
                ent.Chofer != null
                    ? FormatearNombreCompleto(ent.Chofer.Nombre, ent.Chofer.ApellidoPaterno, ent.Chofer.ApellidoMaterno)
                    : "CHOFER",
                ent.FechaHora,
                ent.Validado,
                ConvertidorASnake.ToSnake(ent.Estado),
                ent.Observaciones,
                ent.EvidenciaFotoUrl,
                ent.FirmaUrl))
            .ToList();

        var eventosDto = e.Eventos
            .OrderByDescending(ev => ev.FechaEvento)
            .ThenByDescending(ev => ev.Id)
            .Select(ev => new EventoEnvioItem(
                ev.Id,
                ev.Estado,
                ev.Descripcion,
                ev.Latitud,
                ev.Longitud,
                ResolverNombreActorUsuario(ev.Usuario),
                ev.FechaEvento))
            .ToList();

        string? pinCliente = null;
        if (contexto.EsCliente &&
            contexto.ClienteId.HasValue &&
            (e.RemitenteId == contexto.ClienteId.Value || e.DestinatarioClienteId == contexto.ClienteId.Value))
        {
            var smsReciente = e.AvisosSms
                .OrderByDescending(a => a.IntentoReparto)
                .ThenByDescending(a => a.Id)
                .FirstOrDefault();

            if (smsReciente is not null)
            {
                var match = RegexPinFinal.Match(smsReciente.Mensaje);
                if (match.Success)
                    pinCliente = match.Groups[1].Value;
            }
        }

        return new EnvioDetalleResponse(
            resumen.Id,
            resumen.Guia,
            resumen.Estado,
            resumen.RemitenteId,
            resumen.RemitenteNombre,
            resumen.RemitenteTelefono,
            e.Remitente.Email,
            e.DestinatarioClienteId,
            resumen.DestinatarioNombre,
            resumen.DestinatarioTelefono,
            resumen.DestinatarioEmail,
            resumen.RequiereRecoleccion,
            resumen.SucursalRecepcionId,
            resumen.SucursalRecepcionNombre,
            resumen.SucursalDestinoId,
            resumen.SucursalDestinoNombre,
            resumen.PesoKg,
            resumen.LargoCm,
            resumen.AnchoCm,
            resumen.AltoCm,
            resumen.Descripcion,
            resumen.ValorDeclarado,
            resumen.IntentoReparto,
            resumen.FlotillaAsignadaNombre,
            resumen.ChoferAsignadoNombre,
            resumen.UnidadAsignadaPlacas,
            resumen.FechaCreacion,
            resumen.FechaEntregaEstimada,
            snapOrigen,
            snapDestino,
            recepcionDto,
            citasDto,
            rutasDto,
            entregasDto,
            eventosDto,
            pinCliente);
    }

    // Lectura de metadata, snapshots y mapeo

    private static DireccionSnapshotDto? ExtraerSnapshotDireccion(JsonDocument? doc)
    {
        if (doc is null) return null;
        try
        {
            var rawText = doc.RootElement.GetRawText();
            if (string.IsNullOrWhiteSpace(rawText) || rawText == "{}")
                return null;
            return JsonSerializer.Deserialize<DireccionSnapshotDto>(rawText, JsonOpcionesSnapshot);
        }
        catch
        {
            return null;
        }
    }

    private static string? ExtraerStringMetadata(JsonDocument? doc, string propiedad)
    {
        if (doc is null) return null;
        try
        {
            if (doc.RootElement.ValueKind == JsonValueKind.Object &&
                doc.RootElement.TryGetProperty(propiedad, out var elem) &&
                elem.ValueKind == JsonValueKind.String)
            {
                return elem.GetString();
            }
        }
        catch
        {
        }
        return null;
    }

    private static long? ExtraerLongMetadata(JsonDocument? doc, string propiedad)
    {
        if (doc is null) return null;
        try
        {
            if (doc.RootElement.ValueKind == JsonValueKind.Object &&
                doc.RootElement.TryGetProperty(propiedad, out var elem))
            {
                if (elem.TryGetInt64(out var val)) return val;
                if (elem.ValueKind == JsonValueKind.String && long.TryParse(elem.GetString(), out var valStr)) return valStr;
            }
        }
        catch
        {
        }
        return null;
    }

    private static DireccionSnapshotDto MapearDireccionASnapshot(Direccion d)
    {
        return new DireccionSnapshotDto(
            d.Calle,
            d.NumeroExterior,
            d.NumeroInterior,
            d.EntreCalles,
            d.Colonia,
            d.Localidad,
            d.Municipio,
            d.Estado,
            d.CodigoPostal,
            d.Pais,
            d.Referencias,
            d.Latitud,
            d.Longitud,
            d.AsentamientoId,
            d.LocalidadId,
            d.MunicipioId,
            d.EstadoId);
    }

    private static string? FormatearUbicacionPublica(DireccionSnapshotDto? snap)
    {
        if (snap is null) return null;
        var partes = new[] { snap.Municipio, snap.Estado }
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToArray();

        return partes.Length > 0 ? string.Join(", ", partes) : snap.Colonia;
    }

    private static string FormatearNombreCompleto(
        string? nombre,
        string? apPaterno,
        string? apMaterno,
        string? respaldo = null)
    {
        var unido = string.Join(" ", new[] { nombre, apPaterno, apMaterno }
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s!.Trim()));

        return !string.IsNullOrWhiteSpace(unido) ? unido : (respaldo ?? "SIN NOMBRE");
    }

    private static string? ResolverNombreActorUsuario(Usuario? usuario)
    {
        if (usuario is null) return "SISTEMA";
        if (usuario.Empleado is not null)
        {
            return FormatearNombreCompleto(
                usuario.Empleado.Nombre,
                usuario.Empleado.ApellidoPaterno,
                usuario.Empleado.ApellidoMaterno,
                usuario.Email);
        }

        if (usuario.Cliente is not null)
        {
            return FormatearNombreCompleto(
                usuario.Cliente.Nombre,
                usuario.Cliente.ApellidoPaterno,
                usuario.Cliente.ApellidoMaterno,
                usuario.Email);
        }

        return usuario.Email;
    }

    internal static bool TryParseEstadoEnvio(string valorRaw, out EstadoEnvio resultado)
    {
        resultado = default;
        if (string.IsNullOrWhiteSpace(valorRaw))
            return false;

        var limpio = valorRaw.Trim();
        if (Enum.TryParse(limpio, ignoreCase: true, out resultado))
            return true;

        try
        {
            resultado = ConvertidorASnake.FromSnake<EstadoEnvio>(limpio.ToLowerInvariant());
            return true;
        }
        catch
        {
            return false;
        }
    }

    private async Task RollbackSafeAsync(
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction tx,
        CancellationToken ct = default)
    {
        try
        {
            await tx.RollbackAsync(ct);
        }
        catch (Exception rollbackEx)
        {
            _logger.LogWarning(rollbackEx, "Error durante rollback (puede ser esperado si la transacción ya finalizó).");
        }
    }
}

