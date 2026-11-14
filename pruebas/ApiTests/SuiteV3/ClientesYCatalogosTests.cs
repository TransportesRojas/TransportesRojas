using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Backend.Models;
using Microsoft.Extensions.DependencyInjection;

namespace ApiTests.SuiteV3;

// Catálogo geográfico INEGI/SEPOMEX y CRUD de clientes
public class ClientesYCatalogosTests : IAsyncLifetime
{
    private readonly ApiSuiteContext _suite = new();

    public Task InitializeAsync() => _suite.InitializeAsync();
    public Task DisposeAsync() => _suite.DisposeAsync();

    [Fact(DisplayName = "CAT_001 - Catálogo Geográfico INEGI/SEPOMEX: 32 estados, municipios por estado, CP local (80000) y CP nacional (01000)")]
    public async Task CAT_001_Inegi32EstadosMunicipiosYSepomexLocalYNacional()
    {
        var (cliente, _) = await _suite.CrearYActivarClienteAsync();
        using var cliHttp = _suite.CreateActor("Cliente", cliente.UsuarioId!.Value, "Cliente", clienteId: cliente.Id);

        var respEstados = await cliHttp.GetAsync("/api/CatalogoGeografico/estados");
        Assert.Equal(HttpStatusCode.OK, respEstados.StatusCode);
        var estados = await respEstados.Content.ReadFromJsonAsync<List<EstadoGeograficoItem>>(SuiteJson.Options);
        Assert.NotNull(estados);
        Assert.Equal(32, estados!.Count);

        var sinaloa = estados.First(e => e.Nombre.Contains("Sinaloa", StringComparison.OrdinalIgnoreCase));

        var respMun = await cliHttp.GetAsync($"/api/CatalogoGeografico/estados/{sinaloa.Id}/municipios");
        Assert.Equal(HttpStatusCode.OK, respMun.StatusCode);
        var municipios = await respMun.Content.ReadFromJsonAsync<List<MunicipioGeograficoItem>>(SuiteJson.Options);
        Assert.NotEmpty(municipios!);
        Assert.Contains(municipios!, m => m.Nombre.Contains("Culiac", StringComparison.OrdinalIgnoreCase));

        var cpLocal = await _suite.ConsultarSepomexAsync(cliHttp, "80000");
        Assert.Equal("80000", cpLocal.CodigoPostal);
        Assert.Contains("Sinaloa", cpLocal.EstadoNombre, StringComparison.OrdinalIgnoreCase);
        Assert.NotEmpty(cpLocal.Colonias);

        var cpNacional = await _suite.ConsultarSepomexAsync(cliHttp, "01000");
        Assert.Equal("01000", cpNacional.CodigoPostal);
        Assert.Contains("Ciudad de México", cpNacional.EstadoNombre, StringComparison.OrdinalIgnoreCase);
        Assert.NotEmpty(cpNacional.Colonias);

        var respSuc = await cliHttp.GetAsync("/api/CatalogoGeografico/sucursales-operativas");
        Assert.Equal(HttpStatusCode.OK, respSuc.StatusCode);
        var sucursales = await respSuc.Content.ReadFromJsonAsync<List<SucursalOperativaItem>>(SuiteJson.Options);
        Assert.NotEmpty(sucursales!);
    }

    [Fact(DisplayName = "CLI_001 - Clientes (CU-09..12): Alta normalizada, correo duplicado amigable (409), edición con motivo, baja con envío pendiente bloqueada vs libre")]
    public async Task CLI_001_ClientesCrudCorreoDuplicadoYBloqueoBajaConEnvioActivo()
    {
        using var adminHttp = _suite.CreateActor("Personal administrativo,Jefe");
        var email = $"cli.crud.{_suite.RunTag}@prueba.test";

        var respCreate = await adminHttp.PostAsync("/api/Cliente",
            SuiteJson.AsJsonContent(new CrearClienteModel(
                Nombre: "laura elena",
                ApellidoPaterno: "mendoza",
                ApellidoMaterno: "quintero",
                Telefono: "6674445566",
                Email: email,
                UsuarioId: null,
                Password: "Cl#Crud2026aB!")));
        Assert.Equal(HttpStatusCode.Created, respCreate.StatusCode);
        var creado = await respCreate.Content.ReadFromJsonAsync<ClienteResponse>(SuiteJson.Options);
        _suite.ClienteIds.Add(creado!.Id);
        if (creado.UsuarioId.HasValue) _suite.UsuarioIds.Add(creado.UsuarioId.Value);

        Assert.False(creado.Activo);
        Assert.Equal("LAURA ELENA", creado.Nombre);

        var respDup = await adminHttp.PostAsync("/api/Cliente",
            SuiteJson.AsJsonContent(new CrearClienteModel(
                "Otra", "Persona", null, "6679998877", email, null, "Cl#Crud2026aB!")));
        ApiSuiteContext.AssertMensajeErrorAmigable(respDup.StatusCode, await respDup.Content.ReadAsStringAsync(), HttpStatusCode.Conflict);

        var (_, _) = await _suite.CrearYActivarClienteAsync();
        using var scope = _suite.Factory.Services.CreateScope();
        var jwtSvc = scope.ServiceProvider.GetRequiredService<Backend.Services.JwtService>();
        var tokenAct = jwtSvc.GenerarTokenActivacion(creado.UsuarioId!.Value, creado.Email!);
        using var anon = _suite.CreateAnonClient();
        await anon.PostAsync("/api/Autenticacion/activar-cuenta", SuiteJson.AsJsonContent(new ActivarCuentaModel(tokenAct)));

        var respPut = await adminHttp.PutAsync($"/api/Cliente/{creado.Id}",
            SuiteJson.AsJsonContent(new ActualizarClienteModel(
                Nombre: "Laura Elena",
                ApellidoPaterno: "Mendoza",
                ApellidoMaterno: "Quintero",
                Telefono: "6674449900",
                Email: email,
                MotivoEdicion: "Corrección telefónica solicitada por cliente")));
        Assert.Equal(HttpStatusCode.OK, respPut.StatusCode);

        var respGet = await adminHttp.GetAsync($"/api/Cliente/{creado.Id}");
        var cliAct = await respGet.Content.ReadFromJsonAsync<ClienteResponse>(SuiteJson.Options);
        Assert.Equal("CORRECCIÓN TELEFÓNICA SOLICITADA POR CLIENTE", cliAct!.MotivoEdicion);

        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        using var cliHttp = _suite.CreateActor("Cliente", creado.UsuarioId.Value, "Cliente", clienteId: creado.Id);
        var envio = await _suite.CrearEnvioSepomexAsync(cliHttp, null, "80000", sucursalId, false);

        var respDelConEnvio = await adminHttp.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"/api/Cliente/{creado.Id}")
        {
            Content = SuiteJson.AsJsonContent(new DarBajaClienteModel("Solicitud con paquete en curso"))
        });
        ApiSuiteContext.AssertMensajeErrorAmigable(respDelConEnvio.StatusCode, await respDelConEnvio.Content.ReadAsStringAsync(), HttpStatusCode.Conflict, HttpStatusCode.BadRequest);

        // Baja tras cancelar envío activo
        await cliHttp.PostAsync($"/api/Envio/{envio.Envio.Id}/cancelar",
            SuiteJson.AsJsonContent(new CancelarEnvioModel("Cancelación previa a baja de cuenta")));

        var respDelOk = await adminHttp.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"/api/Cliente/{creado.Id}")
        {
            Content = SuiteJson.AsJsonContent(new DarBajaClienteModel("Cierre de cuenta definitivo"))
        });
        Assert.Equal(HttpStatusCode.NoContent, respDelOk.StatusCode);

        var respDespuesBaja = await adminHttp.GetAsync($"/api/Cliente/{creado.Id}");
        var cliBaja = await respDespuesBaja.Content.ReadFromJsonAsync<ClienteResponse>(SuiteJson.Options);
        Assert.False(cliBaja!.Activo);
    }

    [Fact(DisplayName = "CLI_002 - Validación numérica estricta en Backend: teléfonos con letras/longitud inválida y CP no numérico en Cliente, Empleado y Sucursal -> 400 amigable")]
    public async Task CLI_002_ValidacionesNumericasEstrictas_TelefonosYCodigosPostales()
    {
        using var adminHttp = _suite.CreateActor("RH,Personal administrativo,Jefe");
        var sucursalId = await _suite.ObtenerSucursalActivaIdAsync();
        var puestoChoferId = await _suite.ObtenerPuestoIdPorNombreAsync("Chofer");

        foreach (var telInvalido in new[] { "667ABC1234", "12345" })
        {
            var respCli = await adminHttp.PostAsync("/api/Cliente",
                SuiteJson.AsJsonContent(new CrearClienteModel(
                    "Cliente", "NumTest", null, telInvalido,
                    $"cli.num.{_suite.RunTag}.{telInvalido}@prueba.test", null, "Cl#NumTest2026!")));
            ApiSuiteContext.AssertMensajeErrorAmigable(
                respCli.StatusCode, await respCli.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);
        }

        var respEmp = await adminHttp.PostAsync("/api/Empleado",
            SuiteJson.AsJsonContent(new CrearEmpleadoCompleto(
                "Empleado", "TelInvalido", null, "667NO12345",
                $"emp.num.{_suite.RunTag}@transportesrojas.com", sucursalId, PuestoId: puestoChoferId)));
        ApiSuiteContext.AssertMensajeErrorAmigable(
            respEmp.StatusCode, await respEmp.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);

        var respSucTel = await adminHttp.PostAsync("/api/Sucursal",
            SuiteJson.AsJsonContent(new CrearSucursalModel(
                $"SucNum_{_suite.RunTag}", "Av. Reforma 10", "Culiacán", "Sinaloa", "80000", "abc6671234")));
        ApiSuiteContext.AssertMensajeErrorAmigable(
            respSucTel.StatusCode, await respSucTel.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);

        foreach (var cpInvalido in new[] { "80A00", "1234" })
        {
            var respSucCp = await adminHttp.PostAsync("/api/Sucursal",
                SuiteJson.AsJsonContent(new CrearSucursalModel(
                    $"SucCp_{_suite.RunTag}_{cpInvalido}", "Av. Reforma 10", "Culiacán", "Sinaloa", cpInvalido, "6671234567")));
            ApiSuiteContext.AssertMensajeErrorAmigable(
                respSucCp.StatusCode, await respSucCp.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);
        }

        // Rechazo de dígitos en nombres
        foreach (var (nom, pat, mat) in new[]
        {
            ("Ana1", "Pérez", (string?)null),
            ("Ana", "López2", (string?)null),
            ("Ana", "López", "Ruiz3"),
        })
        {
            var respCliNom = await adminHttp.PostAsync("/api/Cliente",
                SuiteJson.AsJsonContent(new CrearClienteModel(
                    nom, pat, mat, "6671234567",
                    $"cli.nom.{_suite.RunTag}.{Guid.NewGuid():N}@prueba.test", null, "Cl#NomTest2026!")));
            ApiSuiteContext.AssertMensajeErrorAmigable(
                respCliNom.StatusCode, await respCliNom.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);
        }

        var (cliValido, _) = await _suite.CrearYActivarClienteAsync();
        var respCliPutNum = await adminHttp.PutAsync($"/api/Cliente/{cliValido.Id}",
            SuiteJson.AsJsonContent(new ActualizarClienteModel(
                Nombre: "Laura2",
                ApellidoPaterno: "Mendoza",
                ApellidoMaterno: "Quintero",
                Telefono: "6671234567",
                Email: cliValido.Email!,
                MotivoEdicion: "Validación de nombre")));
        ApiSuiteContext.AssertMensajeErrorAmigable(
            respCliPutNum.StatusCode, await respCliPutNum.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);

        var respCliPutOk = await adminHttp.PutAsync($"/api/Cliente/{cliValido.Id}",
            SuiteJson.AsJsonContent(new ActualizarClienteModel(
                Nombre: "María José",
                ApellidoPaterno: "Núñez-Díaz",
                ApellidoMaterno: "De la Cruz",
                Telefono: "6671234567",
                Email: cliValido.Email!,
                MotivoEdicion: "Corrección con acentos")));
        Assert.Equal(HttpStatusCode.OK, respCliPutOk.StatusCode);

        foreach (var (nom, pat, mat) in new[]
        {
            ("Luis9", "Gómez", (string?)null),
            ("Luis", "Pérez0", (string?)null),
            ("Luis", "Pérez", "Soto4"),
        })
        {
            var respEmpNom = await adminHttp.PostAsync("/api/Empleado",
                SuiteJson.AsJsonContent(new CrearEmpleadoCompleto(
                    nom, pat, mat, "6675551234",
                    $"emp.nom.{_suite.RunTag}.{Guid.NewGuid():N}@transportesrojas.com", sucursalId, PuestoId: puestoChoferId)));
            ApiSuiteContext.AssertMensajeErrorAmigable(
                respEmpNom.StatusCode, await respEmpNom.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);
        }

        var empValido = await _suite.CrearEmpleadoConPuestoAsync("Chofer", sucursalId);
        var respEmpPutNum = await adminHttp.PutAsync($"/api/Empleado/{empValido.Id}",
            SuiteJson.AsJsonContent(new ActualizarEmpleadoCompleto(
                Nombre: "Carlos8",
                ApellidoPaterno: "Ruiz",
                ApellidoMaterno: null,
                Telefono: "6675551234",
                Email: empValido.Email!,
                SucursalId: sucursalId,
                FechaIngreso: empValido.FechaIngreso)));
        ApiSuiteContext.AssertMensajeErrorAmigable(
            respEmpPutNum.StatusCode, await respEmpPutNum.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);

        var respEmpPutOk = await adminHttp.PutAsync($"/api/Empleado/{empValido.Id}",
            SuiteJson.AsJsonContent(new ActualizarEmpleadoCompleto(
                Nombre: "José Ángel",
                ApellidoPaterno: "Peña-O'Connor",
                ApellidoMaterno: "Vázquez",
                Telefono: "6675551234",
                Email: empValido.Email!,
                SucursalId: sucursalId,
                FechaIngreso: empValido.FechaIngreso)));
        Assert.Equal(HttpStatusCode.OK, respEmpPutOk.StatusCode);
    }
}
