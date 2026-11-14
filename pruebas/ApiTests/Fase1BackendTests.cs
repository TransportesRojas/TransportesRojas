using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authentication;
using Backend.Models;
using Xunit;

namespace ApiTests;

public class Fase1BackendTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public Fase1BackendTests(WebApplicationFactory<Program> factory)
    {
        var customFactory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.AddAuthentication("TestScheme")
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("TestScheme", options => { });

                services.Configure<AuthenticationOptions>(options =>
                {
                    options.DefaultAuthenticateScheme = "TestScheme";
                    options.DefaultChallengeScheme = "TestScheme";
                    options.DefaultScheme = "TestScheme";
                });
                
                services.AddAuthorization(options =>
                {
                    options.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder("TestScheme")
                        .RequireAuthenticatedUser()
                        .Build();
                });
            });
        });

        _client = customFactory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
        });

        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("TestScheme");
    }

    private async Task<long> ObtenerSucursalExistenteIdAsync()
    {
        var resp = await _client.GetAsync("/api/Sucursal");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        using var doc = System.Text.Json.JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var primera = doc.RootElement.EnumerateArray().FirstOrDefault();
        Assert.Equal(System.Text.Json.JsonValueKind.Object, primera.ValueKind);
        return primera.GetProperty("id").GetInt64();
    }

    [Fact]
    public async Task TC_MAY_001_InsercionTexto_SeNormalizaAMayusculas_ExceptoEmail()
    {
        _client.DefaultRequestHeaders.Remove("X-Test-Role");
        _client.DefaultRequestHeaders.Add("X-Test-Role", "Personal administrativo");

        var sufijo = (DateTime.UtcNow.Ticks % 100000).ToString();
        var emailHumano = $"javier.obregon.{sufijo}@agroindustrias.com";
        var payloadCliente = new
        {
            nombre = "francisco javier",
            apellidoPaterno = "obregon",
            apellidoMaterno = "rios",
            telefono = "6685566778",
            email = emailHumano
        };

        var response = await _client.PostAsJsonAsync("/api/Cliente", payloadCliente);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var creado = await response.Content.ReadFromJsonAsync<ClienteResponse>();
        Assert.NotNull(creado);

        Assert.Equal("FRANCISCO JAVIER", creado.Nombre);
        Assert.Equal("OBREGON", creado.ApellidoPaterno);
        Assert.Equal("RIOS", creado.ApellidoMaterno);
        Assert.Equal(emailHumano, creado.Email);
    }

    [Fact]
    public async Task TC_EMP_PUESTO_001_CrearEmpleado_ConPuesto_AsignaRolesPorDefecto_YAdicionales()
    {
        _client.DefaultRequestHeaders.Remove("X-Test-Role");
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");

        var sufijo = (DateTime.UtcNow.Ticks % 100000).ToString();
        var emailHumano = $"carlos.mendoza.{sufijo}@transportesrojas.com";
        var sucursalId = await ObtenerSucursalExistenteIdAsync();

        var payloadEmpleado = new CrearEmpleadoCompleto(
            Nombre: "Carlos Alberto",
            ApellidoPaterno: "Mendoza",
            ApellidoMaterno: "Vega",
            Telefono: "6671234567",
            Email: emailHumano,
            SucursalId: sucursalId,
            PuestoId: 1,
            RolesAdicionalesIds: new List<long> { 6 }
        );

        var response = await _client.PostAsJsonAsync("/api/Empleado", payloadEmpleado);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var creado = await response.Content.ReadFromJsonAsync<EmpleadoResponse>();
        Assert.NotNull(creado);

        Assert.Equal("CARLOS ALBERTO", creado.Nombre);
        Assert.Equal("MENDOZA", creado.ApellidoPaterno);
        Assert.Equal("VEGA", creado.ApellidoMaterno);

        Assert.Equal(1, creado.PuestoId);
        Assert.Equal("CHOFER", creado.PuestoNombre?.ToUpperInvariant());

        Assert.NotNull(creado.Roles);
        Assert.Contains(creado.Roles, r => r.Equals("Chofer", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(creado.Roles, r => r.Equals("Personal de sucursal", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task TC_EMP_PUESTO_002_CambioDePuesto_RegistraHistorialCerrandoAnterior()
    {
        _client.DefaultRequestHeaders.Remove("X-Test-Role");
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");

        var sufijo = (DateTime.UtcNow.Ticks % 100000).ToString();
        var emailHumano = $"patricia.beltran.{sufijo}@transportesrojas.com";
        var sucursalId = await ObtenerSucursalExistenteIdAsync();

        var nuevo = new CrearEmpleadoCompleto(
            Nombre: "Patricia Elena",
            ApellidoPaterno: "Beltrán",
            ApellidoMaterno: "Castro",
            Telefono: "6679876543",
            Email: emailHumano,
            SucursalId: sucursalId,
            PuestoId: 1
        );

        var respCrear = await _client.PostAsJsonAsync("/api/Empleado", nuevo);
        Assert.Equal(HttpStatusCode.Created, respCrear.StatusCode);
        var emp = await respCrear.Content.ReadFromJsonAsync<EmpleadoResponse>();
        Assert.NotNull(emp);

        var cambioPuesto = new CambiarPuestoModel(
            NuevoPuestoId: 2,
            Motivo: "Promoción a supervisor de operaciones pacífico"
        );

        var respCambio = await _client.PostAsJsonAsync($"/api/Empleado/{emp.Id}/cambiar-puesto", cambioPuesto);
        Assert.Equal(HttpStatusCode.OK, respCambio.StatusCode);

        var respHistorial = await _client.GetAsync($"/api/Empleado/{emp.Id}/puestos-historial");
        Assert.Equal(HttpStatusCode.OK, respHistorial.StatusCode);

        var historial = await respHistorial.Content.ReadFromJsonAsync<List<HistorialPuestoItem>>();
        Assert.NotNull(historial);
        Assert.True(historial.Count >= 2);

        var puestoActivo = historial.FirstOrDefault(h => h.FechaFin == null);
        Assert.NotNull(puestoActivo);
        Assert.Equal(2, puestoActivo.PuestoId);

        var puestoCerrado = historial.FirstOrDefault(h => h.FechaFin != null);
        Assert.NotNull(puestoCerrado);
        Assert.Equal(1, puestoCerrado.PuestoId);
    }

    [Fact]
    public async Task TC_ROL_PERM_001_Rol_AsignarYConsultarPermisos()
    {
        _client.DefaultRequestHeaders.Remove("X-Test-Role");
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");

        var sufijo = (DateTime.UtcNow.Ticks % 10000).ToString();
        var nombreRol = $"Coordinador Logística {sufijo}";

        var nuevoRol = new CrearRolModel(
            Nombre: nombreRol,
            Descripcion: "Supervisión de despachos y asignación de rutas",
            PermisoIds: new List<long> { 1, 2 }
        );

        var respCrear = await _client.PostAsJsonAsync("/api/Rol", nuevoRol);
        Assert.Equal(HttpStatusCode.Created, respCrear.StatusCode);
        var rolCreado = await respCrear.Content.ReadFromJsonAsync<RolResponse>();
        Assert.NotNull(rolCreado);

        var respPermisos = await _client.GetAsync($"/api/Rol/{rolCreado.Id}/permisos");
        Assert.Equal(HttpStatusCode.OK, respPermisos.StatusCode);
        var permisos = await respPermisos.Content.ReadFromJsonAsync<List<PermisoRolItem>>();
        Assert.NotNull(permisos);
        Assert.True(permisos.Count(p => p.Asignado) >= 2);

        var reasignar = new AsignarPermisosRolModel(new List<long> { 1 });
        var respAsignar = await _client.PutAsJsonAsync($"/api/Rol/{rolCreado.Id}/permisos", reasignar);
        Assert.Equal(HttpStatusCode.OK, respAsignar.StatusCode);

        var respPermisosActualizados = await _client.GetAsync($"/api/Rol/{rolCreado.Id}/permisos");
        var permisosActualizados = await respPermisosActualizados.Content.ReadFromJsonAsync<List<PermisoRolItem>>();
        Assert.NotNull(permisosActualizados);
        var asignados = permisosActualizados.Where(p => p.Asignado).ToList();
        Assert.Single(asignados);
        Assert.Equal(1, asignados[0].Id);
    }

    [Fact]
    public async Task TC_FLOT_001_Flotilla_ObtenerResumenUnidadesYMantenimiento()
    {
        _client.DefaultRequestHeaders.Remove("X-Test-Role");
        _client.DefaultRequestHeaders.Add("X-Test-Role", "Supervisor");

        var respLista = await _client.GetAsync("/api/Flotilla");
        Assert.Equal(HttpStatusCode.OK, respLista.StatusCode);
        var lista = await respLista.Content.ReadFromJsonAsync<List<FlotillaResponse>>();

        long flotillaId;
        if (lista == null || lista.Count == 0)
        {
            var sufijo = (DateTime.UtcNow.Ticks % 10000).ToString();
            var nuevaFlotilla = new CrearFlotillaModel(
                Nombre: $"Flotilla Rutas del Pacífico {sufijo}",
                Codigo: $"FLOT-PAC-{sufijo}",
                SucursalId: await ObtenerSucursalExistenteIdAsync(),
                SupervisorId: null
            );

            var respCrear = await _client.PostAsJsonAsync("/api/Flotilla", nuevaFlotilla);
            Assert.Equal(HttpStatusCode.Created, respCrear.StatusCode);
            var creada = await respCrear.Content.ReadFromJsonAsync<FlotillaResponse>();
            Assert.NotNull(creada);
            flotillaId = creada.Id;
        }
        else
        {
            flotillaId = lista[0].Id;
        }

        var respResumen = await _client.GetAsync($"/api/Flotilla/{flotillaId}/resumen");

        Assert.Equal(HttpStatusCode.OK, respResumen.StatusCode);
        var resumen = await respResumen.Content.ReadFromJsonAsync<FlotillaResumenResponse>();
        Assert.NotNull(resumen);
        Assert.Equal(flotillaId, resumen.Id);
        Assert.NotNull(resumen.Unidades);
        Assert.NotNull(resumen.Mantenimientos);
    }

    [Fact]
    public async Task TC_SEG_RUTAS_001_Supervisor_NoPuedePlanificarRutas_JefeFlotillaSi()
    {
        _client.DefaultRequestHeaders.Remove("X-Test-Role");
        _client.DefaultRequestHeaders.Add("X-Test-Role", "Supervisor");

        var payloadPlanificar = new PlanificarRutaConsolidadaModel(
            FlotillaId: 1,
            UnidadId: 1,
            ChoferId: 1,
            EnviosIdsOrdenados: new List<long> { 1 },
            Observaciones: "Intento de ruta por Supervisor"
        );

        var respSupervisor = await _client.PostAsJsonAsync("/api/Envio/planificar-ruta", payloadPlanificar);
        Assert.Equal(HttpStatusCode.Forbidden, respSupervisor.StatusCode);

        var payloadAsignarRecursos = new AsignarRecursosRutaModel(
            ChoferId: 1,
            UnidadId: 1
        );
        var respAsignarSupervisor = await _client.PostAsJsonAsync("/api/Ruta/1/asignar-recursos", payloadAsignarRecursos);
        Assert.Equal(HttpStatusCode.Forbidden, respAsignarSupervisor.StatusCode);

        _client.DefaultRequestHeaders.Remove("X-Test-Role");
        _client.DefaultRequestHeaders.Add("X-Test-Role", "Chofer");
        var respChofer = await _client.PostAsJsonAsync("/api/Envio/planificar-ruta", payloadPlanificar);
        Assert.Equal(HttpStatusCode.Forbidden, respChofer.StatusCode);

        _client.DefaultRequestHeaders.Remove("X-Test-Role");
        _client.DefaultRequestHeaders.Add("X-Test-Role", "Jefe de flotilla");
        var respJefeFlotilla = await _client.PostAsJsonAsync("/api/Envio/planificar-ruta", payloadPlanificar);
        Assert.NotEqual(HttpStatusCode.Forbidden, respJefeFlotilla.StatusCode);
    }

    [Fact]
    public async Task TC_SEG_FLOTILLAS_001_JefeFlotilla_NoPuedeGestionarUnidades_SupervisorSi()
    {
        _client.DefaultRequestHeaders.Remove("X-Test-Role");
        _client.DefaultRequestHeaders.Add("X-Test-Role", "Jefe de flotilla");

        var payloadUnidad = new
        {
            numeroEconomico = "ECO-TEST-999",
            placas = "ABC-99-99",
            marca = "Nissan",
            modelo = "NP300",
            anio = 2024,
            capacidadCargaKg = 1500,
            tipoCombustible = "Gasolina",
            sucursalId = 1
        };

        var respJefe = await _client.PostAsJsonAsync("/api/Unidad", payloadUnidad);
        Assert.Equal(HttpStatusCode.Forbidden, respJefe.StatusCode);

        _client.DefaultRequestHeaders.Remove("X-Test-Role");
        _client.DefaultRequestHeaders.Add("X-Test-Role", "Supervisor");

        var payloadAsignarFlotilla = new AsignarEnviosFlotillaModel(
            FlotillaId: 999999,
            EnvioIds: new List<long> { 1 }
        );

        var respSupervisor = await _client.PostAsJsonAsync("/api/Envio/asignar-envios-flotilla", payloadAsignarFlotilla);
        Assert.NotEqual(HttpStatusCode.Forbidden, respSupervisor.StatusCode);
    }
}
