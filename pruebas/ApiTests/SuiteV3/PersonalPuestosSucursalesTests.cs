using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Backend.Models;

namespace ApiTests.SuiteV3;

// CRUD de empleados, puestos, sucursales y control jerárquico
public class PersonalPuestosSucursalesTests : IAsyncLifetime
{
    private readonly ApiSuiteContext _suite = new();

    public Task InitializeAsync() => _suite.InitializeAsync();
    public Task DisposeAsync() => _suite.DisposeAsync();

    [Fact(DisplayName = "ORG_001 - Puestos (CU-54..57): CRUD completo, rechazo de duplicado y bloqueo al eliminar puesto con empleado")]
    public async Task ORG_001_PuestosCrudDuplicadoYBloqueoEnUso()
    {
        using var rhHttp = _suite.CreateActor("RH");
        var nombrePuesto = $"PuestoQA_{_suite.RunTag}";

        var respCreate = await rhHttp.PostAsync("/api/Puesto",
            SuiteJson.AsJsonContent(new CrearPuestoModel(nombrePuesto, "Puesto temporal de pruebas")));
        Assert.Equal(HttpStatusCode.Created, respCreate.StatusCode);
        var puesto = await respCreate.Content.ReadFromJsonAsync<PuestoResponse>(SuiteJson.Options);
        _suite.PuestoIds.Add(puesto!.Id);

        var respDup = await rhHttp.PostAsync("/api/Puesto",
            SuiteJson.AsJsonContent(new CrearPuestoModel(nombrePuesto, "Duplicado")));
        ApiSuiteContext.AssertMensajeErrorAmigable(respDup.StatusCode, await respDup.Content.ReadAsStringAsync(), HttpStatusCode.Conflict, HttpStatusCode.BadRequest);

        var nombreActualizado = $"PuestoQA_Edit_{_suite.RunTag}";
        var respPut = await rhHttp.PutAsync($"/api/Puesto/{puesto.Id}",
            SuiteJson.AsJsonContent(new ActualizarPuestoModel(nombreActualizado, "Descripción actualizada")));
        Assert.Equal(HttpStatusCode.NoContent, respPut.StatusCode);

        var choferPuestoId = await _suite.ObtenerPuestoIdPorNombreAsync("Chofer");
        var respDelEnUso = await rhHttp.DeleteAsync($"/api/Puesto/{choferPuestoId}");
        ApiSuiteContext.AssertMensajeErrorAmigable(respDelEnUso.StatusCode, await respDelEnUso.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);

        var respDel = await rhHttp.DeleteAsync($"/api/Puesto/{puesto.Id}");
        Assert.Equal(HttpStatusCode.NoContent, respDel.StatusCode);
        var respGetAfter = await rhHttp.GetAsync($"/api/Puesto/{puesto.Id}");
        Assert.Equal(HttpStatusCode.NotFound, respGetAfter.StatusCode);
    }

    [Fact(DisplayName = "ORG_002 - Sucursales (CU-08, CU-45..47): CRUD completo con horarios, validación RBAC Chofer 403 y 404 amigable")]
    public async Task ORG_002_SucursalesCrudHorariosYRbac()
    {
        using var devHttp = _suite.CreateActor("Jefe");
        using var chfHttp = _suite.CreateActor("Chofer");

        var payload = new CrearSucursalModel(
            Nombre: $"SucursalQA_{_suite.RunTag}",
            Direccion: "Av. Reforma 400",
            Ciudad: "Los Mochis",
            Estado: "Sinaloa",
            CodigoPostal: "81200",
            Telefono: "6681234567",
            NombreCorto: $"SQA-{_suite.RunTag[..4]}",
            Codigo: $"SUC-QA-{_suite.RunTag[..5]}",
            Email: $"suc.{_suite.RunTag}@transportes.test",
            Cobertura: "Zona Norte Sinaloa",
            Horarios: new List<HorarioSucursalItem>
            {
                new(1, new TimeOnly(8, 0), new TimeOnly(18, 0), false),
                new(7, null, null, true)
            });

        var respChfPost = await chfHttp.PostAsync("/api/Sucursal", SuiteJson.AsJsonContent(payload));
        Assert.Equal(HttpStatusCode.Forbidden, respChfPost.StatusCode);

        var respCreate = await devHttp.PostAsync("/api/Sucursal", SuiteJson.AsJsonContent(payload));
        var bodyCreate = await respCreate.Content.ReadAsStringAsync();
        Assert.True(respCreate.StatusCode == HttpStatusCode.Created, $"Crear sucursal falló: {(int)respCreate.StatusCode} {bodyCreate}");
        var suc = JsonSerializer.Deserialize<SucursalResponse>(bodyCreate, SuiteJson.Options)!;
        _suite.SucursalIds.Add(suc.Id);
        Assert.NotNull(suc.Horarios);
        Assert.Equal(2, suc.Horarios!.Count);

        var upd = payload with { Nombre = $"SucursalQA_Upd_{_suite.RunTag}" };
        var respPut = await devHttp.PutAsync($"/api/Sucursal/{suc.Id}", SuiteJson.AsJsonContent(upd));
        Assert.Equal(HttpStatusCode.NoContent, respPut.StatusCode);

        var respGet = await devHttp.GetAsync($"/api/Sucursal/{suc.Id}");
        var sucUpd = await respGet.Content.ReadFromJsonAsync<SucursalResponse>(SuiteJson.Options);
        Assert.Equal($"SUCURSALQA_UPD_{_suite.RunTag}".ToUpperInvariant(), sucUpd!.Nombre);

        var respDel = await devHttp.DeleteAsync($"/api/Sucursal/{suc.Id}");
        Assert.Equal(HttpStatusCode.NoContent, respDel.StatusCode);

        var respNotFound = await devHttp.GetAsync($"/api/Sucursal/{suc.Id}");
        ApiSuiteContext.AssertMensajeErrorAmigable(respNotFound.StatusCode, await respNotFound.Content.ReadAsStringAsync(), HttpStatusCode.NotFound);
    }

    [Fact(DisplayName = "ORG_003 - Empleados (CU-01..04, CU-44): Alta con puesto dinámico, edición, cambio de puesto con cierre de historial, expediente, suspender/desactivar/reactivar")]
    public async Task ORG_003_EmpleadoCicloDeVidaCompletoYHistorialPuestos()
    {
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        using var rhHttp = _suite.CreateActor("RH");

        var choferPuestoId = await _suite.ObtenerPuestoIdPorNombreAsync("Chofer");
        var supervisorPuestoId = await _suite.ObtenerPuestoIdPorNombreAsync("Supervisor");
        var email = $"emp.ciclo.{_suite.RunTag}@transportes.test";

        var respCreate = await rhHttp.PostAsync("/api/Empleado",
            SuiteJson.AsJsonContent(new CrearEmpleadoCompleto(
                Nombre: "Mario",
                ApellidoPaterno: "Cárdenas",
                ApellidoMaterno: "Vega",
                Telefono: "6673334455",
                Email: email,
                SucursalId: sucursalId,
                RolId: null,
                FechaIngreso: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)),
                PuestoId: choferPuestoId)));
        var createBody = await respCreate.Content.ReadAsStringAsync();
        Assert.True(respCreate.StatusCode == HttpStatusCode.Created, $"Crear empleado falló: {(int)respCreate.StatusCode} {createBody}");

        var emp = JsonSerializer.Deserialize<EmpleadoResponse>(createBody, SuiteJson.Options)!;
        _suite.EmpleadoIds.Add(emp.Id);
        _suite.UsuarioIds.Add(emp.UsuarioId);

        Assert.Equal("Chofer", emp.PuestoNombre);
        Assert.Contains("Chofer", emp.Roles ?? new List<string>());
        Assert.Equal("activo", emp.EstadoAcceso);

        // Cambio de puesto
        var respCambiarPuesto = await rhHttp.PostAsync($"/api/Empleado/{emp.Id}/cambiar-puesto",
            SuiteJson.AsJsonContent(new CambiarPuestoModel(supervisorPuestoId, "Promoción operativa QA")));
        Assert.Equal(HttpStatusCode.OK, respCambiarPuesto.StatusCode);

        var respHist = await rhHttp.GetAsync($"/api/Empleado/{emp.Id}/puestos-historial");
        Assert.Equal(HttpStatusCode.OK, respHist.StatusCode);
        var historial = await respHist.Content.ReadFromJsonAsync<List<HistorialPuestoItem>>(SuiteJson.Options);
        Assert.NotNull(historial);
        Assert.Equal(2, historial!.Count);
        Assert.Single(historial, h => h.PuestoId == choferPuestoId && h.FechaFin != null);
        Assert.Single(historial, h => h.PuestoId == supervisorPuestoId && h.FechaFin == null);

        var respExp = await rhHttp.GetAsync($"/api/Empleado/{emp.Id}/expediente");
        Assert.Equal(HttpStatusCode.OK, respExp.StatusCode);
        var exp = await respExp.Content.ReadFromJsonAsync<ExpedienteEmpleadoResponse>(SuiteJson.Options);
        Assert.Equal("Supervisor", exp!.PuestoActual);
        Assert.False(string.IsNullOrWhiteSpace(exp.Clave));
        Assert.Equal(2, exp.TrayectoriaLaboral.Count);

        // Suspender, desactivar y reactivar
        var respSusp = await rhHttp.PostAsync($"/api/Empleado/{emp.Id}/suspender",
            SuiteJson.AsJsonContent(new SuspenderEmpleadoModel("Incapacidad temporal QA")));
        Assert.Equal(HttpStatusCode.OK, respSusp.StatusCode);
        var suspRes = await respSusp.Content.ReadFromJsonAsync<EstadoAccesoEmpleadoResponse>(SuiteJson.Options);
        Assert.Equal("suspendido", suspRes!.NuevoEstado);

        var respDesac = await rhHttp.PostAsync($"/api/Empleado/{emp.Id}/desactivar",
            SuiteJson.AsJsonContent(new DesactivarEmpleadoModel("Baja temporal QA")));
        Assert.Equal(HttpStatusCode.OK, respDesac.StatusCode);
        var desacRes = await respDesac.Content.ReadFromJsonAsync<EstadoAccesoEmpleadoResponse>(SuiteJson.Options);
        Assert.Equal("desactivado", desacRes!.NuevoEstado);

        var respReact = await rhHttp.PostAsync($"/api/Empleado/{emp.Id}/reactivar",
            SuiteJson.AsJsonContent(new ReactivarEmpleadoModel("Reincorporación QA")));
        Assert.Equal(HttpStatusCode.OK, respReact.StatusCode);
        var reactRes = await respReact.Content.ReadFromJsonAsync<EstadoAccesoEmpleadoResponse>(SuiteJson.Options);
        Assert.Equal("activo", reactRes!.NuevoEstado);
    }

    [Fact(DisplayName = "ORG_004 - Protección jerárquica: RH recibe 403 al intentar editar, cambiar puesto o suspender a un Jefe existente")]
    public async Task ORG_004_RH_BloqueadoAlModificarPuestoOAccesoDeJefe()
    {
        var jefeEmp = await _suite.CrearEmpleadoConPuestoAsync("Gerente General");
        var choferPuestoId = await _suite.ObtenerPuestoIdPorNombreAsync("Chofer");

        using var rhHttp = _suite.CreateActor("RH");

        // Bloqueo jerárquico de RH sobre Jefe
        var respUpdJefe = await rhHttp.PutAsync($"/api/Empleado/{jefeEmp.Id}",
            SuiteJson.AsJsonContent(new ActualizarEmpleadoCompleto(
                "Intento", "Alterar", null, "6670002222", $"jefe.upd.{_suite.RunTag}@t.test",
                jefeEmp.SucursalId, DateOnly.FromDateTime(DateTime.UtcNow))));
        Assert.Equal(HttpStatusCode.Forbidden, respUpdJefe.StatusCode);

        var respCambiar = await rhHttp.PostAsync($"/api/Empleado/{jefeEmp.Id}/cambiar-puesto",
            SuiteJson.AsJsonContent(new CambiarPuestoModel(choferPuestoId, "Intento no autorizado")));
        Assert.Equal(HttpStatusCode.Forbidden, respCambiar.StatusCode);

        var respSusp = await rhHttp.PostAsync($"/api/Empleado/{jefeEmp.Id}/suspender",
            SuiteJson.AsJsonContent(new SuspenderEmpleadoModel("Intento no autorizado")));
        Assert.Equal(HttpStatusCode.Forbidden, respSusp.StatusCode);
    }

    [Fact(DisplayName = "ORG_004B - Brecha jerárquica en alta: RH debería recibir 403 al crear empleado con puesto Gerente General (rol Jefe)")]
    public async Task ORG_004B_RH_DebeSerBloqueadoAlCrearEmpleadoConPuestoJefe()
    {
        var gerentePuestoId = await _suite.ObtenerPuestoIdPorNombreAsync("Gerente General");
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        using var rhHttp = _suite.CreateActor("RH");

        var respCrearJefe = await rhHttp.PostAsync("/api/Empleado",
            SuiteJson.AsJsonContent(new CrearEmpleadoCompleto(
                "No", "Autorizado", null, "6670001111", $"noauth.{_suite.RunTag}@t.test",
                sucursalId, null, DateOnly.FromDateTime(DateTime.UtcNow), gerentePuestoId)));

        if (respCrearJefe.IsSuccessStatusCode)
        {
            var body = await respCrearJefe.Content.ReadAsStringAsync();
            var creado = System.Text.Json.JsonSerializer.Deserialize<EmpleadoResponse>(body, SuiteJson.Options);
            if (creado is not null)
            {
                _suite.EmpleadoIds.Add(creado.Id);
                if (creado.UsuarioId > 0) _suite.UsuarioIds.Add(creado.UsuarioId);
            }
        }

        Assert.True(respCrearJefe.StatusCode == HttpStatusCode.Forbidden,
            $"BRECHA DE PRIVILEGIOS (EmpleadosController.Crear): RH pudo crear empleado 'Gerente General' con rol Jefe -> {(int)respCrearJefe.StatusCode} {respCrearJefe.StatusCode}.");
    }
}
