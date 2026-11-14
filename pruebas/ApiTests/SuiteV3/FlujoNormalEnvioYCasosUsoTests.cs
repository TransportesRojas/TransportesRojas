using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace ApiTests.SuiteV3;

// Pruebas E2E del ciclo completo de envíos, rutas, fronteras y RBAC
public class FlujoNormalEnvioYCasosUsoTests : IAsyncLifetime
{
    private readonly ApiSuiteContext _suite = new();

    public Task InitializeAsync() => _suite.InitializeAsync();
    public Task DisposeAsync() => _suite.DisposeAsync();

    [Fact(DisplayName = "FLJ_ENV_001 - Flujo normal de envío completo: Alta SEPOMEX -> Recepción -> Planificar Ruta -> Iniciar Recorrido (Chofer + SMS) -> Cambio Trayecto -> Validar Entrega PIN -> Rastreo -> Cierre Odómetro -> Bloqueo Post-Entrega")]
    public async Task FLJ_ENV_001_FlujoNormalEnvioCompleto_DeAltaARastreoYCierreOdometro()
    {
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        var (cliente, _) = await _suite.CrearYActivarClienteAsync();
        var personalSuc = await _suite.CrearEmpleadoConPuestoAsync("Personal de sucursal", sucursalId);
        var adminEmp = await _suite.CrearEmpleadoConPuestoAsync("Administrativo", sucursalId);
        var supervisor = await _suite.CrearEmpleadoConPuestoAsync("Supervisor", sucursalId);
        var jefeFlotilla = await _suite.CrearEmpleadoConPuestoAsync("Jefe de flotilla", sucursalId);
        var chofer = await _suite.CrearEmpleadoConPuestoAsync("Chofer", sucursalId);

        var flotilla = await _suite.CrearFlotillaPruebaAsync(sucursalId, supervisor.Id);
        var unidad = await _suite.CrearUnidadPruebaAsync(flotilla.Id, odometroInicial: 15000m);

        using var devClient = _suite.CreateActor("Jefe");
        var respAsignacionFlt = await devClient.PutAsync(
            $"/api/Flotilla/{flotilla.Id}/asignaciones",
            SuiteJson.AsJsonContent(new AsignarFlotillaModel(
                UnidadesIds: new List<long> { unidad.Id },
                ChoferesIds: new List<long> { chofer.Id })));
        Assert.Equal(HttpStatusCode.OK, respAsignacionFlt.StatusCode);

        using var clienteHttp = _suite.CreateActor(
            roles: "Cliente",
            userId: cliente.UsuarioId!.Value,
            tipoUsuario: "Cliente",
            clienteId: cliente.Id);

        using var sucursalHttp = _suite.CreateActor(
            roles: "Personal de sucursal",
            userId: personalSuc.UsuarioId,
            empleadoId: personalSuc.Id,
            sucursalId: sucursalId);

        using var adminHttp = _suite.CreateActor(
            roles: "Personal administrativo",
            userId: adminEmp.UsuarioId,
            empleadoId: adminEmp.Id,
            sucursalId: sucursalId);

        using var supervisorHttp = _suite.CreateActor(
            roles: "Supervisor",
            userId: supervisor.UsuarioId,
            empleadoId: supervisor.Id,
            sucursalId: sucursalId);

        using var jefeFlotillaHttp = _suite.CreateActor(
            roles: "Jefe de flotilla",
            userId: jefeFlotilla.UsuarioId,
            empleadoId: jefeFlotilla.Id,
            sucursalId: sucursalId);

        using var choferHttp = _suite.CreateActor(
            roles: "Chofer",
            userId: chofer.UsuarioId,
            empleadoId: chofer.Id,
            sucursalId: sucursalId);

        // Registro y consulta del envío
        var creado = await _suite.CrearEnvioSepomexAsync(
            clienteHttp,
            remitenteId: null,
            cpDestino: "80000",
            sucursalRecepcionId: sucursalId,
            requiereRecoleccion: false);

        Assert.StartsWith("TR-", creado.Guia);
        Assert.Null(creado.CodigoSeguridadEntrega);
        Assert.Equal("registrado", creado.Envio.Estado);
        var envioId = creado.Envio.Id;

        var respDetalleCliente = await clienteHttp.GetAsync($"/api/Envio/{envioId}");
        Assert.Equal(HttpStatusCode.OK, respDetalleCliente.StatusCode);
        var detalleIni = await respDetalleCliente.Content.ReadFromJsonAsync<EnvioDetalleResponse>(SuiteJson.Options);
        Assert.NotNull(detalleIni);
        Assert.Equal(creado.Guia, detalleIni!.Guia);
        Assert.Equal("registrado", detalleIni.Estado);
        Assert.Null(detalleIni.CodigoSeguridadCliente);

        // Recepción en sucursal
        var respRecep = await sucursalHttp.PostAsync(
            $"/api/Envio/{envioId}/recepcion",
            SuiteJson.AsJsonContent(new RecepcionSucursalModel(
                PesoVerificadoKg: 4.8m,
                LargoVerificadoCm: 36m,
                AnchoVerificadoCm: 25m,
                AltoVerificadoCm: 20m,
                SucursalId: sucursalId,
                Observaciones: "Paquete verificado en báscula de mostrador QA")));
        var recepBody = await respRecep.Content.ReadAsStringAsync();
        Assert.True(respRecep.StatusCode == HttpStatusCode.OK, $"Recepción falló: {(int)respRecep.StatusCode} {recepBody}");

        var detalleRecep = JsonSerializer.Deserialize<EnvioDetalleResponse>(recepBody, SuiteJson.Options)!;
        Assert.Equal("recibido_sucursal", detalleRecep.Estado);
        Assert.NotNull(detalleRecep.Recepcion);
        Assert.Equal(4.8m, detalleRecep.Recepcion!.PesoVerificadoKg);

        // Planificación y salida de ruta
        var respPlan = await jefeFlotillaHttp.PostAsync(
            "/api/Envio/planificar-ruta",
            SuiteJson.AsJsonContent(new PlanificarRutaConsolidadaModel(
                FlotillaId: flotilla.Id,
                UnidadId: unidad.Id,
                ChoferId: chofer.Id,
                EnviosIdsOrdenados: new List<long> { envioId },
                FechaRuta: DateOnly.FromDateTime(DateTime.UtcNow),
                DistanciaEstimadaKm: 18.4m,
                TiempoEstimadoMin: 35,
                ConsumoCombustibleEstimadoLitros: 2.3m,
                NombreRutaRecomendada: "Corredor Obregón - Zapata",
                Observaciones: "Salida matutina QA")));
        var planBody = await respPlan.Content.ReadAsStringAsync();
        Assert.True(respPlan.StatusCode == HttpStatusCode.OK, $"Planificar ruta falló: {(int)respPlan.StatusCode} {planBody}");

        var planRes = JsonSerializer.Deserialize<RutaPlanificadaResultadoResponse>(planBody, SuiteJson.Options)!;
        _suite.RutaIds.Add(planRes.RutaId);
        Assert.Equal(1, planRes.TotalParadas);
        Assert.Contains(creado.Guia, planRes.GuiasAsignadas);
        Assert.Equal(unidad.Placas, planRes.UnidadPlacas);

        var respActiva = await choferHttp.GetAsync("/api/Ruta/chofer-activa");
        var activaBody = await respActiva.Content.ReadAsStringAsync();
        Assert.True(respActiva.StatusCode == HttpStatusCode.OK, $"chofer-activa falló: {(int)respActiva.StatusCode} {activaBody}");

        var rutaActiva = JsonSerializer.Deserialize<RutaChoferActivaResponse>(activaBody, SuiteJson.Options)!;
        Assert.Equal(planRes.RutaId, rutaActiva.RutaId);
        Assert.Contains(rutaActiva.Paradas, p => p.EnvioId == envioId && p.Guia == creado.Guia);

        var respIniciar = await choferHttp.PostAsync(
            $"/api/Ruta/{planRes.RutaId}/iniciar-recorrido",
            SuiteJson.AsJsonContent(new IniciarRutaEnvioModel(
                KmInicialOdometro: 15000m,
                Observaciones: "Iniciando reparto QA",
                Latitud: 24.8091m,
                Longitud: -107.3940m)));
        var iniciarBody = await respIniciar.Content.ReadAsStringAsync();
        Assert.True(respIniciar.StatusCode == HttpStatusCode.OK, $"iniciar-recorrido falló: {(int)respIniciar.StatusCode} {iniciarBody}");

        var detalleEnRuta = await (await clienteHttp.GetAsync($"/api/Envio/{envioId}"))
            .Content.ReadFromJsonAsync<EnvioDetalleResponse>(SuiteJson.Options);
        Assert.NotNull(detalleEnRuta);
        Assert.Equal("en_ruta", detalleEnRuta!.Estado);

        var sms = await _suite.QueryDbAsync(ctx =>
            ctx.AvisosSms.AsNoTracking().FirstOrDefaultAsync(a => a.EnvioId == envioId));
        Assert.NotNull(sms);
        Assert.False(string.IsNullOrWhiteSpace(sms!.TelefonoDestino));
        var pinMatch = System.Text.RegularExpressions.Regex.Match(sms.Mensaje ?? "", @"\b(\d{6})\b");
        Assert.True(pinMatch.Success, $"AvisoSms no incluyó PIN de 6 dígitos en Mensaje: '{sms.Mensaje}'");
        var pinReal = pinMatch.Groups[1].Value;

        // Desvío en ruta y validación de entrega con PIN
        var respCambio = await choferHttp.PostAsync(
            $"/api/Ruta/{planRes.RutaId}/notificar-cambio",
            SuiteJson.AsJsonContent(new NotificarCambioRutaModel(
                Motivo: "Cierre vial por obra municipal",
                ReferenciaLugar: "Blvd. Pedro Infante y Congreso",
                DescripcionTrayecto: "Desvío por calle lateral 2 cuadras",
                AfectaEntrega: false)));
        var cambioBody = await respCambio.Content.ReadAsStringAsync();
        Assert.True(respCambio.StatusCode == HttpStatusCode.Created, $"notificar-cambio falló: {(int)respCambio.StatusCode} {cambioBody}");
        var cambioItem = JsonSerializer.Deserialize<CambioRutaItemResponse>(cambioBody, SuiteJson.Options)!;
        Assert.StartsWith("CR-", cambioItem.Folio);

        var respHistorialCambios = await jefeFlotillaHttp.GetAsync($"/api/Ruta/{planRes.RutaId}/cambios-trayecto");
        Assert.Equal(HttpStatusCode.OK, respHistorialCambios.StatusCode);
        var cambios = await respHistorialCambios.Content.ReadFromJsonAsync<List<CambioRutaItemResponse>>(SuiteJson.Options);
        Assert.Contains(cambios!, c => c.Folio == cambioItem.Folio);

        var pinIncorrecto = pinReal == "000000" ? "999999" : "000000";
        var respPinMalo = await choferHttp.PostAsync(
            $"/api/Envio/{envioId}/validar-entrega",
            SuiteJson.AsJsonContent(new ValidarEntregaModel(
                EntregaExitosa: true,
                CodigoSeguridad: pinIncorrecto,
                Observaciones: "Intento inválido de prueba")));
        var pinMaloBody = await respPinMalo.Content.ReadAsStringAsync();
        ApiSuiteContext.AssertMensajeErrorAmigable(respPinMalo.StatusCode, pinMaloBody, HttpStatusCode.Conflict, HttpStatusCode.BadRequest);

        var respEntrega = await choferHttp.PostAsync(
            $"/api/Envio/{envioId}/validar-entrega",
            SuiteJson.AsJsonContent(new ValidarEntregaModel(
                EntregaExitosa: true,
                CodigoSeguridad: pinReal,
                Observaciones: "Entregado directamente al destinatario",
                EvidenciaFotoUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
                FirmaUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
                KmFinalOdometro: 15022.5m,
                Latitud: 24.8050m,
                Longitud: -107.3910m)));
        var entregaBody = await respEntrega.Content.ReadAsStringAsync();
        Assert.True(respEntrega.StatusCode == HttpStatusCode.OK, $"validar-entrega falló: {(int)respEntrega.StatusCode} {entregaBody}");

        var detalleEntregado = JsonSerializer.Deserialize<EnvioDetalleResponse>(entregaBody, SuiteJson.Options)!;
        Assert.Equal("entregado", detalleEntregado.Estado);
        Assert.Contains(detalleEntregado.Entregas, e => e.Validado);

        // Rastreo público y cierre del odómetro
        using var anonClient = _suite.CreateAnonClient();
        var respRastreo = await anonClient.GetAsync($"/api/Envio/rastreo/{creado.Guia}");
        var rastreoBody = await respRastreo.Content.ReadAsStringAsync();
        Assert.True(respRastreo.StatusCode == HttpStatusCode.OK, $"rastreo falló: {(int)respRastreo.StatusCode} {rastreoBody}");

        Assert.DoesNotContain(pinReal, rastreoBody);
        Assert.DoesNotContain("6679876543", rastreoBody);

        var rastreo = JsonSerializer.Deserialize<RastreoPublicoResponse>(rastreoBody, SuiteJson.Options)!;
        Assert.Equal("entregado", rastreo.Estado);
        Assert.Contains(rastreo.Eventos, e => e.Estado == "registrado");
        Assert.Contains(rastreo.Eventos, e => e.Estado == "recibido_sucursal");
        Assert.Contains(rastreo.Eventos, e => e.Estado == "asignado_flotilla");
        Assert.Contains(rastreo.Eventos, e => e.Estado == "en_ruta");
        Assert.Contains(rastreo.Eventos, e => e.Estado == "entregado");

        var respCierreDia = await supervisorHttp.PostAsync(
            $"/api/Unidad/{unidad.Id}/cierre-dia",
            SuiteJson.AsJsonContent(new RegistrarOdometroCierreModel(15048.75m, "Cierre vespertino sin novedades")));
        Assert.Equal(HttpStatusCode.OK, respCierreDia.StatusCode);

        var respUnidadDespues = await devClient.GetAsync($"/api/Unidad/{unidad.Id}");
        var unidadDespues = await respUnidadDespues.Content.ReadFromJsonAsync<UnidadResponse>(SuiteJson.Options);
        Assert.Equal(15048.75m, unidadDespues!.KmOdometroActual);

        var respCancelarPost = await adminHttp.PostAsync(
            $"/api/Envio/{envioId}/cancelar",
            SuiteJson.AsJsonContent(new CancelarEnvioModel("Intento inválido post-entrega")));
        var cancelarPostBody = await respCancelarPost.Content.ReadAsStringAsync();
        ApiSuiteContext.AssertMensajeErrorAmigable(respCancelarPost.StatusCode, cancelarPostBody, HttpStatusCode.Conflict);
    }

    [Fact(DisplayName = "FLJ_ENV_002 - Flujo de recolección a domicilio: recoleccion_programada -> confirmar-recoleccion -> recepcion sucursal")]
    public async Task FLJ_ENV_002_FlujoRecoleccionDomicilioYConfirmacion()
    {
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        var (cliente, _) = await _suite.CrearYActivarClienteAsync();
        var personalSuc = await _suite.CrearEmpleadoConPuestoAsync("Personal de sucursal", sucursalId);

        using var cliHttp = _suite.CreateActor("Cliente", cliente.UsuarioId!.Value, "Cliente", clienteId: cliente.Id);
        using var sucHttp = _suite.CreateActor("Personal de sucursal", personalSuc.UsuarioId, "Empleado", personalSuc.Id, sucursalId: sucursalId);

        var creado = await _suite.CrearEnvioSepomexAsync(cliHttp, null, "80000", sucursalId, requiereRecoleccion: true);
        Assert.Equal("recoleccion_programada", creado.Envio.Estado);

        var respConf = await sucHttp.PostAsync(
            $"/api/Envio/{creado.Envio.Id}/confirmar-recoleccion",
            SuiteJson.AsJsonContent(new ConfirmarRecoleccionModel("Recogido en domicilio sin contratiempos", 24.8m, -107.4m)));
        var bodyConf = await respConf.Content.ReadAsStringAsync();
        Assert.True(respConf.StatusCode == HttpStatusCode.OK, $"confirmar-recoleccion falló: {(int)respConf.StatusCode} {bodyConf}");

        var confDto = JsonSerializer.Deserialize<EnvioDetalleResponse>(bodyConf, SuiteJson.Options)!;
        Assert.Equal("recoleccion_realizada", confDto.Estado);

        var respRec = await sucHttp.PostAsync(
            $"/api/Envio/{creado.Envio.Id}/recepcion",
            SuiteJson.AsJsonContent(new RecepcionSucursalModel(4.5m, 35m, 25m, 20m, sucursalId)));
        Assert.Equal(HttpStatusCode.OK, respRec.StatusCode);
        var recDto = await respRec.Content.ReadFromJsonAsync<EnvioDetalleResponse>(SuiteJson.Options);
        Assert.Equal("recibido_sucursal", recDto!.Estado);
    }

    [Fact(DisplayName = "FLJ_ENV_003 - Flujo de incidencia (no_entregado) y reprogramación con validación de frontera de fecha pasada")]
    public async Task FLJ_ENV_003_FlujoIncidenciaYReprogramacion_ConFronteraFechaPasada()
    {
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        var (cliente, _) = await _suite.CrearYActivarClienteAsync();
        var personalSuc = await _suite.CrearEmpleadoConPuestoAsync("Personal de sucursal", sucursalId);
        var jefeFlt = await _suite.CrearEmpleadoConPuestoAsync("Jefe de flotilla", sucursalId);
        var adminEmp = await _suite.CrearEmpleadoConPuestoAsync("Administrativo", sucursalId);
        var sup = await _suite.CrearEmpleadoConPuestoAsync("Supervisor", sucursalId);
        var chf = await _suite.CrearEmpleadoConPuestoAsync("Chofer", sucursalId);
        var flt = await _suite.CrearFlotillaPruebaAsync(sucursalId, sup.Id);
        var uni = await _suite.CrearUnidadPruebaAsync(flt.Id, 9000m);

        using var devHttp = _suite.CreateActor("Jefe");
        var respPutFlt = await devHttp.PutAsync($"/api/Flotilla/{flt.Id}/asignaciones",
            SuiteJson.AsJsonContent(new AsignarFlotillaModel(new() { uni.Id }, new() { chf.Id })));
        Assert.Equal(HttpStatusCode.OK, respPutFlt.StatusCode);

        using var cliHttp = _suite.CreateActor("Cliente", cliente.UsuarioId!.Value, "Cliente", clienteId: cliente.Id);
        using var sucHttp = _suite.CreateActor("Personal de sucursal", personalSuc.UsuarioId, "Empleado", personalSuc.Id, sucursalId: sucursalId);
        using var jefeFltHttp = _suite.CreateActor("Jefe de flotilla", jefeFlt.UsuarioId, "Empleado", jefeFlt.Id, sucursalId: sucursalId);
        using var adminHttp = _suite.CreateActor("Personal administrativo", adminEmp.UsuarioId, "Empleado", adminEmp.Id, sucursalId: sucursalId);
        using var chfHttp = _suite.CreateActor("Chofer", chf.UsuarioId, "Empleado", chf.Id, sucursalId: sucursalId);

        var creado = await _suite.CrearEnvioSepomexAsync(cliHttp, null, "80000", sucursalId, false);
        var respRec = await sucHttp.PostAsync($"/api/Envio/{creado.Envio.Id}/recepcion",
            SuiteJson.AsJsonContent(new RecepcionSucursalModel(4.5m, 35m, 25m, 20m, sucursalId)));
        Assert.Equal(HttpStatusCode.OK, respRec.StatusCode);

        var respPlan = await jefeFltHttp.PostAsync("/api/Envio/planificar-ruta",
            SuiteJson.AsJsonContent(new PlanificarRutaConsolidadaModel(flt.Id, uni.Id, chf.Id, new() { creado.Envio.Id })));
        var planBody = await respPlan.Content.ReadAsStringAsync();
        Assert.True(respPlan.StatusCode == HttpStatusCode.OK, $"planificar-ruta falló: {(int)respPlan.StatusCode} {planBody}");
        var plan = JsonSerializer.Deserialize<RutaPlanificadaResultadoResponse>(planBody, SuiteJson.Options)!;
        _suite.RutaIds.Add(plan.RutaId);

        var respIni = await chfHttp.PostAsync($"/api/Ruta/{plan.RutaId}/iniciar-recorrido",
            SuiteJson.AsJsonContent(new IniciarRutaEnvioModel(9000m)));
        Assert.Equal(HttpStatusCode.OK, respIni.StatusCode);

        var respFallido = await chfHttp.PostAsync($"/api/Envio/{creado.Envio.Id}/validar-entrega",
            SuiteJson.AsJsonContent(new ValidarEntregaModel(EntregaExitosa: false, Observaciones: "Domicilio cerrado sin nadie")));
        Assert.Equal(HttpStatusCode.OK, respFallido.StatusCode);
        var detNo = await respFallido.Content.ReadFromJsonAsync<EnvioDetalleResponse>(SuiteJson.Options);
        Assert.Equal("no_entregado", detNo!.Estado);

        var respFechaPasada = await adminHttp.PostAsync($"/api/Envio/{creado.Envio.Id}/reprogramar",
            SuiteJson.AsJsonContent(new ReprogramarEnvioModel(DateTimeOffset.UtcNow.AddHours(-2), "cliente_ausente", "Intento fecha pasada")));
        var fechaPasadaBody = await respFechaPasada.Content.ReadAsStringAsync();
        ApiSuiteContext.AssertMensajeErrorAmigable(respFechaPasada.StatusCode, fechaPasadaBody, HttpStatusCode.BadRequest);

        var respReprog = await adminHttp.PostAsync($"/api/Envio/{creado.Envio.Id}/reprogramar",
            SuiteJson.AsJsonContent(new ReprogramarEnvioModel(DateTimeOffset.UtcNow.AddDays(1), "cliente_ausente", "Segunda visita acordada")));
        Assert.Equal(HttpStatusCode.OK, respReprog.StatusCode);
        var detReprog = await respReprog.Content.ReadFromJsonAsync<EnvioDetalleResponse>(SuiteJson.Options);
        Assert.Equal("reprogramado", detReprog!.Estado);
    }

    [Fact(DisplayName = "FLJ_ENV_004 - Flujo de devolución y confirmación de entrega al remitente (CU-31 / CU-32)")]
    public async Task FLJ_ENV_004_FlujoDevolucionYConfirmacion()
    {
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        var (cliente, _) = await _suite.CrearYActivarClienteAsync();
        var personalSuc = await _suite.CrearEmpleadoConPuestoAsync("Personal de sucursal", sucursalId);

        using var cliHttp = _suite.CreateActor("Cliente", cliente.UsuarioId!.Value, "Cliente", clienteId: cliente.Id);
        using var sucHttp = _suite.CreateActor("Personal de sucursal", personalSuc.UsuarioId, "Empleado", personalSuc.Id, sucursalId: sucursalId);

        var creado = await _suite.CrearEnvioSepomexAsync(cliHttp, null, "80000", sucursalId, false);
        var respRec = await sucHttp.PostAsync($"/api/Envio/{creado.Envio.Id}/recepcion",
            SuiteJson.AsJsonContent(new RecepcionSucursalModel(4.5m, 35m, 25m, 20m, sucursalId)));
        Assert.Equal(HttpStatusCode.OK, respRec.StatusCode);

        var respDev = await sucHttp.PostAsync($"/api/Envio/{creado.Envio.Id}/devolucion",
            SuiteJson.AsJsonContent(new RegistrarDevolucionModel("Destinatario rechazó paquete", "rechazo_destinatario", sucursalId)));
        var bodyDev = await respDev.Content.ReadAsStringAsync();
        Assert.True(respDev.StatusCode == HttpStatusCode.OK, $"devolucion falló: {(int)respDev.StatusCode} {bodyDev}");
        Assert.Equal("en_devolucion", JsonSerializer.Deserialize<EnvioDetalleResponse>(bodyDev, SuiteJson.Options)!.Estado);

        var respConf = await sucHttp.PostAsync($"/api/Envio/{creado.Envio.Id}/devolucion/confirmar",
            SuiteJson.AsJsonContent(new ConfirmarDevolucionModel(true, true, "Devuelto en mostrador a remitente")));
        Assert.Equal(HttpStatusCode.OK, respConf.StatusCode);
        var confDto = await respConf.Content.ReadFromJsonAsync<EnvioDetalleResponse>(SuiteJson.Options);
        Assert.Equal("devuelto", confDto!.Estado);
    }

    [Fact(DisplayName = "FLJ_ENV_005 - Cancelación por cliente propio (CU-30), cancelación bajo custodia a en_devolucion e IDOR cliente ajeno 403")]
    public async Task FLJ_ENV_005_CancelacionYProteccionIDORClienteAjeno()
    {
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        var (cliA, _) = await _suite.CrearYActivarClienteAsync();
        var (cliB, _) = await _suite.CrearYActivarClienteAsync();
        var personalSuc = await _suite.CrearEmpleadoConPuestoAsync("Personal de sucursal", sucursalId);
        var adminEmp = await _suite.CrearEmpleadoConPuestoAsync("Administrativo", sucursalId);

        using var cliAHttp = _suite.CreateActor("Cliente", cliA.UsuarioId!.Value, "Cliente", clienteId: cliA.Id);
        using var cliBHttp = _suite.CreateActor("Cliente", cliB.UsuarioId!.Value, "Cliente", clienteId: cliB.Id);
        using var sucHttp = _suite.CreateActor("Personal de sucursal", personalSuc.UsuarioId, "Empleado", personalSuc.Id, sucursalId: sucursalId);
        using var adminHttp = _suite.CreateActor("Personal administrativo", adminEmp.UsuarioId, "Empleado", adminEmp.Id, sucursalId: sucursalId);

        var envioA1 = await _suite.CrearEnvioSepomexAsync(cliAHttp, null, "80000", sucursalId, false);
        var envioA2 = await _suite.CrearEnvioSepomexAsync(cliAHttp, null, "80000", sucursalId, false);

        // Aislamiento entre clientes (IDOR) y cancelación según custodia
        var respIdorGet = await cliBHttp.GetAsync($"/api/Envio/{envioA1.Envio.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, respIdorGet.StatusCode);

        var respIdorCancel = await cliBHttp.PostAsync($"/api/Envio/{envioA1.Envio.Id}/cancelar",
            SuiteJson.AsJsonContent(new CancelarEnvioModel("Intento no autorizado")));
        Assert.Equal(HttpStatusCode.Forbidden, respIdorCancel.StatusCode);

        var respCancelCli = await cliAHttp.PostAsync($"/api/Envio/{envioA1.Envio.Id}/cancelar",
            SuiteJson.AsJsonContent(new CancelarEnvioModel("Error en domicilio capturado")));
        Assert.Equal(HttpStatusCode.OK, respCancelCli.StatusCode);
        var detCancel = await respCancelCli.Content.ReadFromJsonAsync<EnvioDetalleResponse>(SuiteJson.Options);
        Assert.Equal("cancelado", detCancel!.Estado);

        var respRec = await sucHttp.PostAsync($"/api/Envio/{envioA2.Envio.Id}/recepcion",
            SuiteJson.AsJsonContent(new RecepcionSucursalModel(4.5m, 35m, 25m, 20m, sucursalId)));
        Assert.Equal(HttpStatusCode.OK, respRec.StatusCode);

        var respCancelCustodia = await adminHttp.PostAsync($"/api/Envio/{envioA2.Envio.Id}/cancelar",
            SuiteJson.AsJsonContent(new CancelarEnvioModel("Remitente solicitó retiro estando en sucursal")));
        Assert.Equal(HttpStatusCode.OK, respCancelCustodia.StatusCode);
        var detCustodia = await respCancelCustodia.Content.ReadFromJsonAsync<EnvioDetalleResponse>(SuiteJson.Options);
        Assert.Equal("en_devolucion", detCustodia!.Estado);
    }

    [Fact(DisplayName = "FLJ_ENV_006 - RBAC Envío: Rol RH sin permisos operativos debe recibir 403 en GET /api/Envio (verifica contrato documentado)")]
    public async Task FLJ_ENV_006_RolRH_DebeSerRechazadoCon403EnEnvios()
    {
        var rhEmp = await _suite.CrearEmpleadoConPuestoAsync("Recursos Humanos");
        using var rhClient = _suite.CreateActor("RH", rhEmp.UsuarioId, "Empleado", rhEmp.Id, sucursalId: rhEmp.SucursalId);

        var resp = await rhClient.GetAsync("/api/Envio");
        var body = await resp.Content.ReadAsStringAsync();

        Assert.True(resp.StatusCode == HttpStatusCode.Forbidden,
            $"BRECHA RBAC DETECTADA (ClaimsUsuarioHelper.cs:76 incluye 'RH' en Global): esperado 403 Forbidden pero respondió {(int)resp.StatusCode}.");
    }

    [Fact(DisplayName = "FLJ_ENV_007 - Fronteras y escenarios negativos de Envíos y Unidad: peso 0, dimensiones negativas, CP inexistente, rastreo 404, JSON malformado -> errores amigables")]
    public async Task FLJ_ENV_007_FronterasYErroresAmigables_SinDetallesPostgreSql()
    {
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        var (cliente, _) = await _suite.CrearYActivarClienteAsync();
        using var cliHttp = _suite.CreateActor("Cliente", cliente.UsuarioId!.Value, "Cliente", clienteId: cliente.Id);
        using var devHttp = _suite.CreateActor("Jefe");
        using var anonHttp = _suite.CreateAnonClient();

        // Validaciones de fronteras, JSON malformado y catálogos
        var sep = await _suite.ConsultarSepomexAsync(cliHttp, "80000");
        var col = sep.Colonias[0];
        var payloadInvalido = new CrearEnvioModel(
            RemitenteId: cliente.Id,
            DestinatarioClienteId: null,
            DestinatarioNombre: "Destinatario Frontera",
            DestinatarioTelefono: "6671112233",
            DestinatarioEmail: null,
            RequiereRecoleccion: false,
            SucursalRecepcionId: sucursalId,
            SucursalDestinoId: sep.CoberturaSugerida?.SucursalId,
            DireccionOrigen: null,
            FechaHoraRecoleccionSolicitada: null,
            ObservacionesRecoleccion: null,
            DireccionDestino: new DireccionEnvioInput(
                col.Id, sep.LocalidadSugeridaId, sep.EstadoId, sep.MunicipioId,
                sep.CodigoPostal, sep.EstadoNombre, sep.MunicipioNombre, sep.Ciudad, col.Nombre,
                "Calle 1", "100"),
            PesoKg: 0m,
            LargoCm: -5m,
            AnchoCm: 20m,
            AltoCm: 20m,
            Descripcion: "Frontera");

        var respPeso = await devHttp.PostAsync("/api/Envio", SuiteJson.AsJsonContent(payloadInvalido));
        ApiSuiteContext.AssertMensajeErrorAmigable(respPeso.StatusCode, await respPeso.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);

        var respJson = await devHttp.PostAsync("/api/Envio", SuiteJson.AsRawJsonContent("{json-roto"));
        ApiSuiteContext.AssertMensajeErrorAmigable(respJson.StatusCode, await respJson.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);

        var respRastreo404 = await anonHttp.GetAsync("/api/Envio/rastreo/TR-NOEXISTE-999");
        ApiSuiteContext.AssertMensajeErrorAmigable(respRastreo404.StatusCode, await respRastreo404.Content.ReadAsStringAsync(), HttpStatusCode.NotFound);

        var respCp404 = await cliHttp.GetAsync("/api/CatalogoGeografico/cp/99999");
        ApiSuiteContext.AssertMensajeErrorAmigable(respCp404.StatusCode, await respCp404.Content.ReadAsStringAsync(), HttpStatusCode.NotFound);

        var respCp400 = await cliHttp.GetAsync("/api/CatalogoGeografico/cp/abc");
        ApiSuiteContext.AssertMensajeErrorAmigable(respCp400.StatusCode, await respCp400.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);
    }

    private async Task<CrearEnvioModel> ConstruirPayloadEnvioDestinoAsync(
        HttpClient sepomexClient,
        long remitenteId,
        long sucursalId,
        string? numeroExterior = "100",
        string telefonoDest = "6671112233",
        string? codigoPostalOverride = null,
        decimal pesoKg = 4.5m,
        string calle = "Camino Real del Sur")
    {
        var sep = await _suite.ConsultarSepomexAsync(sepomexClient, "80000");
        var col = sep.Colonias[0];
        return new CrearEnvioModel(
            RemitenteId: remitenteId,
            DestinatarioClienteId: null,
            DestinatarioNombre: "Destinatario QA",
            DestinatarioTelefono: telefonoDest,
            DestinatarioEmail: $"dest.{_suite.RunTag}@prueba.test",
            RequiereRecoleccion: false,
            SucursalRecepcionId: sucursalId,
            SucursalDestinoId: sep.CoberturaSugerida?.SucursalId,
            DireccionOrigen: null,
            FechaHoraRecoleccionSolicitada: null,
            ObservacionesRecoleccion: null,
            DireccionDestino: new DireccionEnvioInput(
                col.Id, sep.LocalidadSugeridaId, sep.EstadoId, sep.MunicipioId,
                codigoPostalOverride ?? sep.CodigoPostal, sep.EstadoNombre, sep.MunicipioNombre, sep.Ciudad, col.Nombre,
                calle, numeroExterior, EntreCalles: "Entre Juárez y Rosales", Referencias: "Portón azul"),
            PesoKg: pesoKg,
            LargoCm: 35m,
            AnchoCm: 25m,
            AltoCm: 20m,
            Descripcion: "Paquete prueba QA");
    }

    [Fact(DisplayName = "FLJ_ENV_008 - NumeroExterior opcional (null/vacío) y 'S/N' en POST /api/Envio: crea, normaliza, lista y formatea en rastreo y chofer-activa sin '#' suelto")]
    public async Task FLJ_ENV_008_NumeroExteriorVacioYSinNumero_PermitidoYFormateadoLimpiamente()
    {
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        var (cliente, _) = await _suite.CrearYActivarClienteAsync();
        var sup = await _suite.CrearEmpleadoConPuestoAsync("Supervisor", sucursalId);
        var personalSuc = await _suite.CrearEmpleadoConPuestoAsync("Personal de sucursal", sucursalId);
        var jefeFlt = await _suite.CrearEmpleadoConPuestoAsync("Jefe de flotilla", sucursalId);
        var chofer = await _suite.CrearEmpleadoConPuestoAsync("Chofer", sucursalId);
        var flotilla = await _suite.CrearFlotillaPruebaAsync(sucursalId, sup.Id);
        var unidad = await _suite.CrearUnidadPruebaAsync(flotilla.Id, 1000m);

        using var devHttp = _suite.CreateActor("Jefe");
        await devHttp.PutAsync($"/api/Flotilla/{flotilla.Id}/asignaciones",
            SuiteJson.AsJsonContent(new AsignarFlotillaModel(new() { unidad.Id }, new() { chofer.Id })));

        using var cliHttp = _suite.CreateActor("Cliente", cliente.UsuarioId!.Value, "Cliente", clienteId: cliente.Id);
        using var sucHttp = _suite.CreateActor("Personal de sucursal", personalSuc.UsuarioId, "Empleado", personalSuc.Id, sucursalId: sucursalId);
        using var fltHttp = _suite.CreateActor("Jefe de flotilla", jefeFlt.UsuarioId, "Empleado", jefeFlt.Id, sucursalId: sucursalId);
        using var chfHttp = _suite.CreateActor("Chofer", chofer.UsuarioId, "Empleado", chofer.Id, sucursalId: sucursalId);
        using var anonHttp = _suite.CreateAnonClient();

        // Número exterior vacío o S/N
        var payloadVacio = await ConstruirPayloadEnvioDestinoAsync(cliHttp, cliente.Id, sucursalId, numeroExterior: null, calle: "Brecha al Tamarindo");
        var respVacio = await cliHttp.PostAsync("/api/Envio", SuiteJson.AsJsonContent(payloadVacio));
        var bodyVacio = await respVacio.Content.ReadAsStringAsync();
        Assert.True(respVacio.StatusCode == HttpStatusCode.Created, $"Envío con numeroExterior null falló: {(int)respVacio.StatusCode} {bodyVacio}");
        var creadoVacio = JsonSerializer.Deserialize<CrearEnvioResponse>(bodyVacio, SuiteJson.Options)!;
        _suite.EnvioIds.Add(creadoVacio.Envio.Id);
        Assert.True(string.IsNullOrEmpty(creadoVacio.Envio.DireccionDestino?.NumeroExterior));

        var payloadSN = await ConstruirPayloadEnvioDestinoAsync(cliHttp, cliente.Id, sucursalId, numeroExterior: "s/n", calle: "Calle Ejidal Sur");
        var respSN = await cliHttp.PostAsync("/api/Envio", SuiteJson.AsJsonContent(payloadSN));
        var bodySN = await respSN.Content.ReadAsStringAsync();
        Assert.True(respSN.StatusCode == HttpStatusCode.Created, $"Envío con numeroExterior s/n falló: {(int)respSN.StatusCode} {bodySN}");
        var creadoSN = JsonSerializer.Deserialize<CrearEnvioResponse>(bodySN, SuiteJson.Options)!;
        _suite.EnvioIds.Add(creadoSN.Envio.Id);
        Assert.Equal("S/N", creadoSN.Envio.DireccionDestino?.NumeroExterior);

        var respList = await cliHttp.GetAsync($"/api/Envio?busqueda={creadoSN.Guia}");
        var lista = await respList.Content.ReadFromJsonAsync<List<EnvioListadoItem>>(SuiteJson.Options);
        var itemSN = Assert.Single(lista!, e => e.Id == creadoSN.Envio.Id);
        Assert.DoesNotContain("#S/N", itemSN.DestinoCalleCompleta ?? string.Empty);

        var respRastreo = await anonHttp.GetAsync($"/api/Envio/rastreo/{creadoVacio.Guia}");
        Assert.Equal(HttpStatusCode.OK, respRastreo.StatusCode);

        // Recepción, planificación y verificación en ruta
        Assert.Equal(HttpStatusCode.OK, (await sucHttp.PostAsync($"/api/Envio/{creadoVacio.Envio.Id}/recepcion",
            SuiteJson.AsJsonContent(new RecepcionSucursalModel(3.5m, 30m, 20m, 15m, sucursalId)))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await sucHttp.PostAsync($"/api/Envio/{creadoSN.Envio.Id}/recepcion",
            SuiteJson.AsJsonContent(new RecepcionSucursalModel(3.5m, 30m, 20m, 15m, sucursalId)))).StatusCode);

        var respPlan = await fltHttp.PostAsync("/api/Envio/planificar-ruta",
            SuiteJson.AsJsonContent(new PlanificarRutaConsolidadaModel(flotilla.Id, unidad.Id, chofer.Id, new() { creadoVacio.Envio.Id, creadoSN.Envio.Id })));
        Assert.Equal(HttpStatusCode.OK, respPlan.StatusCode);
        var plan = await respPlan.Content.ReadFromJsonAsync<RutaPlanificadaResultadoResponse>(SuiteJson.Options);
        _suite.RutaIds.Add(plan!.RutaId);

        var act = await (await chfHttp.GetAsync("/api/Ruta/chofer-activa")).Content.ReadFromJsonAsync<RutaChoferActivaResponse>(SuiteJson.Options);
        Assert.NotNull(act);
        var paradaVacia = act!.Paradas.First(p => p.EnvioId == creadoVacio.Envio.Id);
        var paradaSN = act.Paradas.First(p => p.EnvioId == creadoSN.Envio.Id);
        Assert.DoesNotContain("#", paradaVacia.DireccionDestino);
        Assert.Contains(" S/N", paradaSN.DireccionDestino);
        Assert.DoesNotContain("#S/N", paradaSN.DireccionDestino);
    }

    [Fact(DisplayName = "FLJ_ENV_009 - Validación estricta numérica en Envío: teléfono destinatario con letras/corto y CP inválido -> 400 amigable")]
    public async Task FLJ_ENV_009_ValidacionNumericaEstricta_TelefonoDestinoYCodigoPostal()
    {
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        var (cliente, _) = await _suite.CrearYActivarClienteAsync();
        using var cliHttp = _suite.CreateActor("Cliente", cliente.UsuarioId!.Value, "Cliente", clienteId: cliente.Id);

        foreach (var telInvalido in new[] { "667ABC9900", "667123" })
        {
            var payloadBadTel = await ConstruirPayloadEnvioDestinoAsync(cliHttp, cliente.Id, sucursalId, telefonoDest: telInvalido);
            var resp = await cliHttp.PostAsync("/api/Envio", SuiteJson.AsJsonContent(payloadBadTel));
            ApiSuiteContext.AssertMensajeErrorAmigable(resp.StatusCode, await resp.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);
        }

        var payloadBadCp = await ConstruirPayloadEnvioDestinoAsync(cliHttp, cliente.Id, sucursalId, codigoPostalOverride: "80X00");
        var respCp = await cliHttp.PostAsync("/api/Envio", SuiteJson.AsJsonContent(payloadBadCp));
        ApiSuiteContext.AssertMensajeErrorAmigable(respCp.StatusCode, await respCp.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);
    }
}
