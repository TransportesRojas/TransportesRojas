using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Backend.Models;

namespace ApiTests.SuiteV3;

// CRUD de flotillas, unidades, mantenimiento, rutas y cierre de odómetro
public class FlotillasUnidadesMantenimientoRutasTests : IAsyncLifetime
{
    private readonly ApiSuiteContext _suite = new();

    public Task InitializeAsync() => _suite.InitializeAsync();
    public Task DisposeAsync() => _suite.DisposeAsync();

    [Fact(DisplayName = "FLT_001 - Flotillas (CU-17..20, CU-43): CRUD, supervisores operativos, resumen y asignación de unidades/choferes")]
    public async Task FLT_001_FlotillasCrudResumenYAsignaciones()
    {
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        var supervisor = await _suite.CrearEmpleadoConPuestoAsync("Supervisor", sucursalId);
        var chofer = await _suite.CrearEmpleadoConPuestoAsync("Chofer", sucursalId);

        using var jefeHttp = _suite.CreateActor("Jefe de flotilla,Jefe");
        var respSups = await jefeHttp.GetAsync("/api/Flotilla/supervisores-operativos");
        Assert.Equal(HttpStatusCode.OK, respSups.StatusCode);

        var flotilla = await _suite.CrearFlotillaPruebaAsync(sucursalId, supervisor.Id);
        var unidad = await _suite.CrearUnidadPruebaAsync(flotillaId: flotilla.Id, odometroInicial: 5000m);

        // Asignación de unidad y chofer
        var respPutAsig = await jefeHttp.PutAsync($"/api/Flotilla/{flotilla.Id}/asignaciones",
            SuiteJson.AsJsonContent(new AsignarFlotillaModel(new() { unidad.Id }, new() { chofer.Id })));
        Assert.Equal(HttpStatusCode.OK, respPutAsig.StatusCode);

        var respAsig = await jefeHttp.GetAsync($"/api/Flotilla/{flotilla.Id}/asignaciones");
        Assert.Equal(HttpStatusCode.OK, respAsig.StatusCode);
        var asig = await respAsig.Content.ReadFromJsonAsync<FlotillaAsignacionesResponse>(SuiteJson.Options);
        Assert.Contains(unidad.Id, asig!.UnidadesIds);
        Assert.Contains(chofer.Id, asig.ChoferesIds);

        var respRes = await jefeHttp.GetAsync($"/api/Flotilla/{flotilla.Id}/resumen");
        Assert.Equal(HttpStatusCode.OK, respRes.StatusCode);
        var resumen = await respRes.Content.ReadFromJsonAsync<FlotillaResumenResponse>(SuiteJson.Options);
        Assert.Contains(resumen!.Unidades, u => u.Id == unidad.Id);

        var respUpd = await jefeHttp.PutAsync($"/api/Flotilla/{flotilla.Id}",
            SuiteJson.AsJsonContent(new ActualizarFlotillaModel(
                $"{flotilla.Nombre} Editada", flotilla.Codigo, sucursalId, supervisor.Id, true)));
        Assert.Equal(HttpStatusCode.OK, respUpd.StatusCode);
    }

    [Fact(DisplayName = "FLT_002 - Unidades y Cierre Odómetro (CU-48..53, CU-35): Placa duplicada amigable, cierre-dia válido vs frontera < odómetro actual")]
    public async Task FLT_002_UnidadesCrudPlacaDuplicadaYCierreOdometroFronteras()
    {
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        var flotilla = await _suite.CrearFlotillaPruebaAsync(sucursalId);
        var unidad = await _suite.CrearUnidadPruebaAsync(flotilla.Id, odometroInicial: 20000m);

        using var jefeHttp = _suite.CreateActor("Jefe de flotilla,Supervisor");

        var respDup = await jefeHttp.PostAsync("/api/Unidad",
            SuiteJson.AsJsonContent(new CrearUnidadModel(flotilla.Id, unidad.Placas, "Camioneta", "Ford", "Transit", 2024, 1200m, 100m)));
        ApiSuiteContext.AssertMensajeErrorAmigable(respDup.StatusCode, await respDup.Content.ReadAsStringAsync(), HttpStatusCode.Conflict, HttpStatusCode.BadRequest);

        // Cierre de odómetro del día
        var respOdoMenor = await jefeHttp.PostAsync($"/api/Unidad/{unidad.Id}/cierre-dia",
            SuiteJson.AsJsonContent(new RegistrarOdometroCierreModel(19999.99m, "Lectura errónea")));
        ApiSuiteContext.AssertMensajeErrorAmigable(respOdoMenor.StatusCode, await respOdoMenor.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest, HttpStatusCode.Conflict);

        var respOdoOk = await jefeHttp.PostAsync($"/api/Unidad/{unidad.Id}/cierre-dia",
            SuiteJson.AsJsonContent(new RegistrarOdometroCierreModel(20145.50m, "Cierre nocturno OK")));
        Assert.Equal(HttpStatusCode.OK, respOdoOk.StatusCode);

        var unidadAct = await (await jefeHttp.GetAsync($"/api/Unidad/{unidad.Id}")).Content.ReadFromJsonAsync<UnidadResponse>(SuiteJson.Options);
        Assert.Equal(20145.50m, unidadAct!.KmOdometroActual);

        var respDel = await jefeHttp.DeleteAsync($"/api/Unidad/{unidad.Id}");
        Assert.Equal(HttpStatusCode.NoContent, respDel.StatusCode);
    }

    [Fact(DisplayName = "FLT_003 - Tipos de Mantenimiento (CU-62..65): CRUD completo, frontera intervalo <= 0 y RBAC Chofer 403")]
    public async Task FLT_003_TiposMantenimientoCrudFronteraYRbac()
    {
        using var adminHttp = _suite.CreateActor("RH,Jefe");
        using var chfHttp = _suite.CreateActor("Chofer");

        var nombre = $"PreventivoQA_{_suite.RunTag}";
        var payload = new CrearTipoMantenimientoModel(nombre, "Cambio aceite y filtros", 10000, "Camioneta Van");

        var respChf = await chfHttp.PostAsync("/api/TipoMantenimiento", SuiteJson.AsJsonContent(payload));
        Assert.Equal(HttpStatusCode.Forbidden, respChf.StatusCode);

        var respCreate = await adminHttp.PostAsync("/api/TipoMantenimiento", SuiteJson.AsJsonContent(payload));
        var bodyCreate = await respCreate.Content.ReadAsStringAsync();
        Assert.True(respCreate.StatusCode == HttpStatusCode.Created, $"Crear tipo mant falló: {(int)respCreate.StatusCode} {bodyCreate}");
        var tipo = JsonSerializer.Deserialize<TipoMantenimientoResponse>(bodyCreate, SuiteJson.Options)!;
        _suite.TipoMantenimientoIds.Add(tipo.Id);

        var respPut = await adminHttp.PutAsync($"/api/TipoMantenimiento/{tipo.Id}",
            SuiteJson.AsJsonContent(new ActualizarTipoMantenimientoModel($"{nombre}_Ed", "Actualizado", 12000, "Tractocamión")));
        Assert.Equal(HttpStatusCode.NoContent, respPut.StatusCode);

        var respGet = await adminHttp.GetAsync($"/api/TipoMantenimiento/{tipo.Id}");
        var actualizado = await respGet.Content.ReadFromJsonAsync<TipoMantenimientoResponse>(SuiteJson.Options);
        Assert.Equal(12000, actualizado!.KmIntervalo);

        var respDel = await adminHttp.DeleteAsync($"/api/TipoMantenimiento/{tipo.Id}");
        Assert.Equal(HttpStatusCode.NoContent, respDel.StatusCode);
    }

    [Fact(DisplayName = "RUT_001 - Rutas (CU-21..23, CU-26..27): Reasignación de recursos en ruta activa y notificación de desvío con afectación de entrega")]
    public async Task RUT_001_ReasignacionRecursosYCambioTrayectoConAfectacion()
    {
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        var (cliente, _) = await _suite.CrearYActivarClienteAsync();
        var sup = await _suite.CrearEmpleadoConPuestoAsync("Supervisor", sucursalId);
        var personalSuc = await _suite.CrearEmpleadoConPuestoAsync("Personal de sucursal", sucursalId);
        var jefeFlt = await _suite.CrearEmpleadoConPuestoAsync("Jefe de flotilla", sucursalId);
        var chf1 = await _suite.CrearEmpleadoConPuestoAsync("Chofer", sucursalId);
        var chf2 = await _suite.CrearEmpleadoConPuestoAsync("Chofer", sucursalId);
        var flt = await _suite.CrearFlotillaPruebaAsync(sucursalId, sup.Id);
        var uni1 = await _suite.CrearUnidadPruebaAsync(flt.Id, 4000m);
        var uni2 = await _suite.CrearUnidadPruebaAsync(flt.Id, 6000m);

        using var devHttp = _suite.CreateActor("Jefe");
        var respPutFlt = await devHttp.PutAsync($"/api/Flotilla/{flt.Id}/asignaciones",
            SuiteJson.AsJsonContent(new AsignarFlotillaModel(new() { uni1.Id, uni2.Id }, new() { chf1.Id, chf2.Id })));
        Assert.Equal(HttpStatusCode.OK, respPutFlt.StatusCode);

        using var cliHttp = _suite.CreateActor("Cliente", cliente.UsuarioId!.Value, "Cliente", clienteId: cliente.Id);
        using var sucHttp = _suite.CreateActor("Personal de sucursal", personalSuc.UsuarioId, "Empleado", personalSuc.Id, sucursalId: sucursalId);
        using var jefeFltHttp = _suite.CreateActor("Jefe de flotilla", jefeFlt.UsuarioId, "Empleado", jefeFlt.Id, sucursalId: sucursalId);
        using var chf2Http = _suite.CreateActor("Chofer", chf2.UsuarioId, "Empleado", chf2.Id, sucursalId: sucursalId);

        var creado = await _suite.CrearEnvioSepomexAsync(cliHttp, null, "80000", sucursalId, false);
        var respRec = await sucHttp.PostAsync($"/api/Envio/{creado.Envio.Id}/recepcion",
            SuiteJson.AsJsonContent(new RecepcionSucursalModel(4.5m, 35m, 25m, 20m, sucursalId)));
        Assert.Equal(HttpStatusCode.OK, respRec.StatusCode);

        var respPlan = await jefeFltHttp.PostAsync("/api/Envio/planificar-ruta",
            SuiteJson.AsJsonContent(new PlanificarRutaConsolidadaModel(flt.Id, uni1.Id, chf1.Id, new() { creado.Envio.Id })));
        var planBody = await respPlan.Content.ReadAsStringAsync();
        Assert.True(respPlan.StatusCode == HttpStatusCode.OK, $"planificar-ruta falló: {(int)respPlan.StatusCode} {planBody}");
        var plan = JsonSerializer.Deserialize<RutaPlanificadaResultadoResponse>(planBody, SuiteJson.Options)!;
        _suite.RutaIds.Add(plan.RutaId);

        // Reasignación y reporte de desvío
        var respReasig = await jefeFltHttp.PostAsync($"/api/Ruta/{plan.RutaId}/asignar-recursos",
            SuiteJson.AsJsonContent(new AsignarRecursosRutaModel(chf2.Id, uni2.Id)));
        Assert.Equal(HttpStatusCode.OK, respReasig.StatusCode);

        var respAct2 = await chf2Http.GetAsync("/api/Ruta/chofer-activa");
        Assert.Equal(HttpStatusCode.OK, respAct2.StatusCode);
        var act2 = await respAct2.Content.ReadFromJsonAsync<RutaChoferActivaResponse>(SuiteJson.Options);
        Assert.Equal(plan.RutaId, act2!.RutaId);
        Assert.Equal(uni2.Placas, act2.UnidadPlacas);

        var respCambio = await chf2Http.PostAsync($"/api/Ruta/{plan.RutaId}/notificar-cambio",
            SuiteJson.AsJsonContent(new NotificarCambioRutaModel(
                Motivo: "Bloqueo carretero prolongado",
                ReferenciaLugar: "Km 12 Autopista",
                DescripcionTrayecto: "Retorno por libramiento sur (+40 min)",
                AfectaEntrega: true)));
        Assert.Equal(HttpStatusCode.Created, respCambio.StatusCode);
        var cambioDto = await respCambio.Content.ReadFromJsonAsync<CambioRutaItemResponse>(SuiteJson.Options);
        Assert.True(cambioDto!.AfectaEntrega);

        var respBandeja = await jefeFltHttp.GetAsync("/api/Ruta/cambios-trayecto");
        Assert.Equal(HttpStatusCode.OK, respBandeja.StatusCode);
        var listado = await respBandeja.Content.ReadFromJsonAsync<List<CambioRutaItemResponse>>(SuiteJson.Options);
        Assert.Contains(listado!, c => c.Folio == cambioDto.Folio);
    }

    [Fact(DisplayName = "FLT_004 - Fronteras numéricas estrictas en Unidad y TipoMantenimiento (400 amigable) y RBAC 'Jefe de flotilla' en cierre-dia (200 OK)")]
    public async Task FLT_004_FronterasNumericasUnidadTipoMantYCasingJefeDeFlotilla()
    {
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        var flotilla = await _suite.CrearFlotillaPruebaAsync(sucursalId);
        var unidad = await _suite.CrearUnidadPruebaAsync(flotilla.Id, odometroInicial: 10000m);

        using var soloJefeFltHttp = _suite.CreateActor("Jefe de flotilla");
        using var adminHttp = _suite.CreateActor("RH,Jefe,Supervisor");

        // Fronteras de unidad
        var respAnio = await adminHttp.PostAsync("/api/Unidad",
            SuiteJson.AsJsonContent(new CrearUnidadModel(flotilla.Id, $"VQA-{_suite.RunTag}1", "Van", "Ford", "Transit", 1920, 1200m, 100m)));
        ApiSuiteContext.AssertMensajeErrorAmigable(respAnio.StatusCode, await respAnio.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);

        var respCap = await adminHttp.PostAsync("/api/Unidad",
            SuiteJson.AsJsonContent(new CrearUnidadModel(flotilla.Id, $"VQA-{_suite.RunTag}2", "Van", "Ford", "Transit", 2024, 0m, 100m)));
        ApiSuiteContext.AssertMensajeErrorAmigable(respCap.StatusCode, await respCap.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);

        var respOdoIni = await adminHttp.PostAsync("/api/Unidad",
            SuiteJson.AsJsonContent(new CrearUnidadModel(flotilla.Id, $"VQA-{_suite.RunTag}3", "Van", "Ford", "Transit", 2024, 1200m, -1m)));
        ApiSuiteContext.AssertMensajeErrorAmigable(respOdoIni.StatusCode, await respOdoIni.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);

        var respCierreNeg = await soloJefeFltHttp.PostAsync($"/api/Unidad/{unidad.Id}/cierre-dia",
            SuiteJson.AsJsonContent(new RegistrarOdometroCierreModel(-10m, "Negativo")));
        ApiSuiteContext.AssertMensajeErrorAmigable(respCierreNeg.StatusCode, await respCierreNeg.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);

        var respCierreOk = await soloJefeFltHttp.PostAsync($"/api/Unidad/{unidad.Id}/cierre-dia",
            SuiteJson.AsJsonContent(new RegistrarOdometroCierreModel(10025.5m, "Cierre válido Jefe de flotilla")));
        Assert.Equal(HttpStatusCode.OK, respCierreOk.StatusCode);

        foreach (var kmInv in new[] { 0, -500 })
        {
            var respTm = await adminHttp.PostAsync("/api/TipoMantenimiento",
                SuiteJson.AsJsonContent(new CrearTipoMantenimientoModel($"MantInv_{_suite.RunTag}_{kmInv}", "Inválido", kmInv, "Van")));
            ApiSuiteContext.AssertMensajeErrorAmigable(respTm.StatusCode, await respTm.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);
        }
    }

    [Fact(DisplayName = "RUT_002 - DTO alineado chofer-activa y validación kmInicialOdometro en iniciar-recorrido (< 0 rechazado 400, >= 0 aceptado con estadoRuta='en_curso')")]
    public async Task RUT_002_DtoChoferActivaAlineadoYValidacionOdometroIniciarRecorrido()
    {
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        var (cliente, _) = await _suite.CrearYActivarClienteAsync();
        var sup = await _suite.CrearEmpleadoConPuestoAsync("Supervisor", sucursalId);
        var personalSuc = await _suite.CrearEmpleadoConPuestoAsync("Personal de sucursal", sucursalId);
        var jefeFlt = await _suite.CrearEmpleadoConPuestoAsync("Jefe de flotilla", sucursalId);
        var chf = await _suite.CrearEmpleadoConPuestoAsync("Chofer", sucursalId);
        var flt = await _suite.CrearFlotillaPruebaAsync(sucursalId, sup.Id);
        var uni = await _suite.CrearUnidadPruebaAsync(flt.Id, 2500m);

        using var devHttp = _suite.CreateActor("Jefe");
        Assert.Equal(HttpStatusCode.OK, (await devHttp.PutAsync($"/api/Flotilla/{flt.Id}/asignaciones",
            SuiteJson.AsJsonContent(new AsignarFlotillaModel(new() { uni.Id }, new() { chf.Id })))).StatusCode);

        using var cliHttp = _suite.CreateActor("Cliente", cliente.UsuarioId!.Value, "Cliente", clienteId: cliente.Id);
        using var sucHttp = _suite.CreateActor("Personal de sucursal", personalSuc.UsuarioId, "Empleado", personalSuc.Id, sucursalId: sucursalId);
        using var fltHttp = _suite.CreateActor("Jefe de flotilla", jefeFlt.UsuarioId, "Empleado", jefeFlt.Id, sucursalId: sucursalId);
        using var chfHttp = _suite.CreateActor("Chofer", chf.UsuarioId, "Empleado", chf.Id, sucursalId: sucursalId);

        var creado = await _suite.CrearEnvioSepomexAsync(cliHttp, null, "80000", sucursalId, false);
        Assert.Equal(HttpStatusCode.OK, (await sucHttp.PostAsync($"/api/Envio/{creado.Envio.Id}/recepcion",
            SuiteJson.AsJsonContent(new RecepcionSucursalModel(5m, 30m, 20m, 15m, sucursalId)))).StatusCode);

        var respPlan = await fltHttp.PostAsync("/api/Envio/planificar-ruta",
            SuiteJson.AsJsonContent(new PlanificarRutaConsolidadaModel(flt.Id, uni.Id, chf.Id, new() { creado.Envio.Id })));
        Assert.Equal(HttpStatusCode.OK, respPlan.StatusCode);
        var plan = await respPlan.Content.ReadFromJsonAsync<RutaPlanificadaResultadoResponse>(SuiteJson.Options);
        _suite.RutaIds.Add(plan!.RutaId);

        var act = await (await chfHttp.GetAsync("/api/Ruta/chofer-activa")).Content.ReadFromJsonAsync<RutaChoferActivaResponse>(SuiteJson.Options);
        Assert.NotNull(act);
        Assert.False(string.IsNullOrWhiteSpace(act!.NombreRuta));
        Assert.Equal("planeada", act.EstadoRuta);
        Assert.Equal(uni.Id, act.UnidadId);
        Assert.Equal(1, act.TotalEnvios);
        Assert.Equal(0, act.EnviosEntregados);
        var parada = Assert.Single(act.Paradas);
        Assert.Equal(1, parada.Orden);
        Assert.False(string.IsNullOrWhiteSpace(parada.Estado));
        Assert.False(string.IsNullOrWhiteSpace(parada.DestinoDireccion));
        Assert.False(string.IsNullOrWhiteSpace(parada.DestinoCiudad));
        Assert.Equal("Paquetería", parada.TipoPaquete);

        var respIniNeg = await chfHttp.PostAsync($"/api/Ruta/{plan.RutaId}/iniciar-recorrido",
            SuiteJson.AsJsonContent(new IniciarRutaEnvioModel(KmInicialOdometro: -5m)));
        ApiSuiteContext.AssertMensajeErrorAmigable(respIniNeg.StatusCode, await respIniNeg.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);

        var respIniOk = await chfHttp.PostAsync($"/api/Ruta/{plan.RutaId}/iniciar-recorrido",
            SuiteJson.AsJsonContent(new IniciarRutaEnvioModel(KmInicialOdometro: 2510m, Observaciones: "Inicio verificado")));
        var bodyIniOk = await respIniOk.Content.ReadAsStringAsync();
        Assert.True(respIniOk.StatusCode == HttpStatusCode.OK, $"iniciar-recorrido falló: {(int)respIniOk.StatusCode} {bodyIniOk}");
        using var doc = JsonDocument.Parse(bodyIniOk);
        Assert.Equal("en_curso", doc.RootElement.GetProperty("estadoRuta").GetString());
        Assert.Equal(1, doc.RootElement.GetProperty("totalEnviosEnRuta").GetInt32());
    }
}
