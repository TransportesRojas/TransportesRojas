using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Backend.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace ApiTests;

// Pruebas de integración del flujo de envíos
public class EnvioTests : IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly Regex RegexGuia = new(@"^TR-\d{8}-[A-Z0-9]{4}$", RegexOptions.Compiled);
    private static readonly Regex RegexPin = new(@"^\d{6}$", RegexOptions.Compiled);

    private const string CpDestinoPrueba = "44100";

    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _anonimo;

    public EnvioTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.AddAuthentication("TestScheme")
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("TestScheme", _ => { });

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

        _anonimo = _factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
    }

    // Helpers

    private HttpClient CrearActor(
        string roles,
        long usuarioId = 2,
        string tipoUsuario = "Empleado",
        long? empleadoId = null,
        long? clienteId = null,
        long? sucursalId = null)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("TestScheme");
        client.DefaultRequestHeaders.Add("X-Test-Role", roles);
        client.DefaultRequestHeaders.Add("X-Test-UserId", usuarioId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-TipoUsuario", tipoUsuario);
        if (empleadoId.HasValue) client.DefaultRequestHeaders.Add("X-Test-EmpleadoId", empleadoId.Value.ToString());
        if (clienteId.HasValue) client.DefaultRequestHeaders.Add("X-Test-ClienteId", clienteId.Value.ToString());
        if (sucursalId.HasValue) client.DefaultRequestHeaders.Add("X-Test-SucursalId", sucursalId.Value.ToString());
        return client;
    }

    private HttpClient CrearActorCliente(ClienteResponse cliente) =>
        CrearActor("Cliente", cliente.UsuarioId ?? 0, "Cliente", clienteId: cliente.Id);

    private async Task<ClienteResponse> CrearClientePruebaAsync(string nombre, string apellido)
    {
        using var admin = CrearActor("Personal administrativo");
        var sufijo = Guid.NewGuid().ToString("N")[..8];
        var resp = await admin.PostAsJsonAsync("/api/Cliente", new
        {
            nombre,
            apellidoPaterno = apellido,
            apellidoMaterno = "prueba",
            telefono = "66" + Random.Shared.NextInt64(10_000_000, 99_999_999),
            email = $"{nombre.ToLowerInvariant()}.{apellido.ToLowerInvariant()}.{sufijo}@clientes-xunit.mx"
        });

        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        var creado = await resp.Content.ReadFromJsonAsync<ClienteResponse>();
        Assert.NotNull(creado);
        return creado!;
    }

    private async Task<long> ObtenerSucursalRecepcionIdAsync()
    {
        using var admin = CrearActor("Jefe");
        var resp = await admin.GetAsync("/api/CatalogoGeografico/sucursales-operativas");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var lista = await resp.Content.ReadFromJsonAsync<List<SucursalOperativaItem>>();
        Assert.NotNull(lista);
        Assert.NotEmpty(lista!);
        return lista![0].Id;
    }

    private async Task<long> ObtenerAsentamientoDestinoIdAsync()
    {
        using var admin = CrearActor("Jefe");
        var resp = await admin.GetAsync($"/api/CatalogoGeografico/cp/{CpDestinoPrueba}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var cp = await resp.Content.ReadFromJsonAsync<ConsultaCodigoPostalResponse>();
        Assert.NotNull(cp);
        Assert.NotEmpty(cp!.Colonias);
        return cp.Colonias[0].Id;
    }

    private async Task<object> ConstruirPayloadAsync(
        long? remitenteId,
        long? sucursalRecepcionId,
        decimal pesoKg = 2.5m,
        string telefonoDestino = "3312345678")
    {
        var asentamientoId = await ObtenerAsentamientoDestinoIdAsync();

        return new
        {
            remitenteId,
            destinatarioNombre = "Mariana Esquivel Ortega",
            destinatarioTelefono = telefonoDestino,
            destinatarioEmail = "mariana.esquivel@correo-xunit.mx",
            requiereRecoleccion = false,
            sucursalRecepcionId,
            direccionDestino = new
            {
                asentamientoId,
                codigoPostal = CpDestinoPrueba,
                calle = "Av. Juárez",
                numeroExterior = "450",
                entreCalles = "Entre Alcalde y Corona",
                referencias = "Frente al parque"
            },
            pesoKg,
            largoCm = 30,
            anchoCm = 20,
            altoCm = 15,
            descripcion = "Documentos corporativos en sobre sellado"
        };
    }

    private async Task<CrearEnvioResponse> CrearEnvioComoAdminAsync(long remitenteId)
    {
        var sucursalId = await ObtenerSucursalRecepcionIdAsync();
        var payload = await ConstruirPayloadAsync(remitenteId, sucursalId);

        using var admin = CrearActor("Personal administrativo");
        var resp = await admin.PostAsJsonAsync("/api/Envio", payload);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);

        var creado = await resp.Content.ReadFromJsonAsync<CrearEnvioResponse>();
        Assert.NotNull(creado);
        return creado!;
    }

    // Seguridad por rol y autenticación

    [Fact]
    public async Task TC_ENV_001_ListarEnvios_SinAutenticacion_Retorna401()
    {
        var response = await _anonimo.GetAsync("/api/Envio");

        Assert.True(
            response.StatusCode == HttpStatusCode.Unauthorized || response.StatusCode == HttpStatusCode.Redirect,
            $"Se esperaba 401/redirect y se obtuvo {(int)response.StatusCode}.");
    }

    [Fact]
    public async Task TC_ENV_002_RH_NoPuedeConsultarNiRegistrarEnvios_Retorna403()
    {
        using var rh = CrearActor("RH");

        var listado = await rh.GetAsync("/api/Envio");
        Assert.Equal(HttpStatusCode.Forbidden, listado.StatusCode);

        var cliente = await CrearClientePruebaAsync("Teresa", "Villalobos");
        var sucursalId = await ObtenerSucursalRecepcionIdAsync();
        var payload = await ConstruirPayloadAsync(cliente.Id, sucursalId);

        var alta = await rh.PostAsJsonAsync("/api/Envio", payload);
        Assert.Equal(HttpStatusCode.Forbidden, alta.StatusCode);
    }

    [Fact]
    public async Task TC_ENV_003_RolesGlobales_PuedenListarEnvios()
    {
        foreach (var rol in new[] { "Jefe", "Personal administrativo" })
        {
            using var actor = CrearActor(rol);
            var resp = await actor.GetAsync("/api/Envio?take=5");
            Assert.True(resp.StatusCode == HttpStatusCode.OK, $"El rol '{rol}' debía listar envíos y obtuvo {(int)resp.StatusCode}.");
        }
    }

    // Alta con catálogo SEPOMEX y validaciones

    [Fact]
    public async Task TC_ENV_004_AltaAdministrativa_ConCpSepomex_GeneraGuiaYPin()
    {
        var cliente = await CrearClientePruebaAsync("Alejandro", "Quintero");

        var creado = await CrearEnvioComoAdminAsync(cliente.Id);

        Assert.Matches(RegexGuia, creado.Guia);
        Assert.Null(creado.CodigoSeguridadEntrega);
        Assert.NotNull(creado.Envio.SucursalDestinoId);
        Assert.Equal(creado.Guia, creado.Envio.Guia);
        Assert.Equal("registrado", creado.Envio.Estado);
        Assert.Equal(cliente.Id, creado.Envio.RemitenteId);

        Assert.NotNull(creado.Envio.DireccionDestino);
        Assert.Equal(CpDestinoPrueba, creado.Envio.DireccionDestino!.CodigoPostal);
        Assert.Contains("GUADALAJARA", creado.Envio.DireccionDestino.Municipio ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("JALISCO", creado.Envio.DireccionDestino.Estado ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.NotNull(creado.Envio.DireccionDestino.AsentamientoId);

        Assert.Contains(creado.Envio.Eventos, e => e.Estado == "registrado");

        using var admin = CrearActor("Personal administrativo");
        var detalleResp = await admin.GetAsync($"/api/Envio/{creado.Envio.Id}");
        Assert.Equal(HttpStatusCode.OK, detalleResp.StatusCode);
        var detalle = await detalleResp.Content.ReadFromJsonAsync<EnvioDetalleResponse>();
        Assert.NotNull(detalle);
        Assert.Null(detalle!.CodigoSeguridadCliente);
    }

    [Fact]
    public async Task TC_ENV_005_Alta_ConDatosInvalidos_Retorna400()
    {
        var cliente = await CrearClientePruebaAsync("Beatriz", "Navarro");
        var sucursalId = await ObtenerSucursalRecepcionIdAsync();
        using var admin = CrearActor("Personal administrativo");

        var pesoCero = await admin.PostAsJsonAsync("/api/Envio", await ConstruirPayloadAsync(cliente.Id, sucursalId, pesoKg: 0m));
        Assert.Equal(HttpStatusCode.BadRequest, pesoCero.StatusCode);

        var telefonoCorto = await admin.PostAsJsonAsync("/api/Envio", await ConstruirPayloadAsync(cliente.Id, sucursalId, telefonoDestino: "331234567"));
        Assert.Equal(HttpStatusCode.BadRequest, telefonoCorto.StatusCode);
    }

    // Portal de clientes

    [Fact]
    public async Task TC_ENV_006_Cliente_SoloVeSusEnvios_YSuPin_OtroClienteRecibe403()
    {
        var clienteA = await CrearClientePruebaAsync("Fernanda", "Ibarra");
        var clienteB = await CrearClientePruebaAsync("Gustavo", "Salcido");

        using var portalA = CrearActorCliente(clienteA);
        using var portalB = CrearActorCliente(clienteB);

        var sucursalId = await ObtenerSucursalRecepcionIdAsync();
        var altaResp = await portalA.PostAsJsonAsync("/api/Envio", await ConstruirPayloadAsync(null, sucursalId));
        Assert.Equal(HttpStatusCode.Created, altaResp.StatusCode);
        var creado = await altaResp.Content.ReadFromJsonAsync<CrearEnvioResponse>();
        Assert.NotNull(creado);
        Assert.Equal(clienteA.Id, creado!.Envio.RemitenteId);

        var listaA = await portalA.GetFromJsonAsync<List<EnvioListadoItem>>("/api/Envio?take=100");
        var listaB = await portalB.GetFromJsonAsync<List<EnvioListadoItem>>("/api/Envio?take=100");
        Assert.Contains(listaA!, e => e.Guia == creado.Guia);
        Assert.DoesNotContain(listaB!, e => e.Guia == creado.Guia);
        Assert.All(listaA!, e => Assert.Equal(clienteA.Id, e.RemitenteId));

        var detalleA = await portalA.GetFromJsonAsync<EnvioDetalleResponse>($"/api/Envio/{creado.Envio.Id}");
        Assert.Equal(creado.CodigoSeguridadEntrega, detalleA!.CodigoSeguridadCliente);

        var detalleB = await portalB.GetAsync($"/api/Envio/{creado.Envio.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, detalleB.StatusCode);

        var cancelB = await portalB.PostAsJsonAsync($"/api/Envio/{creado.Envio.Id}/cancelar", new { motivo = "Intento de cancelación ajena" });
        Assert.Equal(HttpStatusCode.Forbidden, cancelB.StatusCode);
    }

    [Fact]
    public async Task TC_ENV_007_Cliente_PuedeCancelarEnvioRegistrado_UnaSolaVez()
    {
        var cliente = await CrearClientePruebaAsync("Hilda", "Montoya");
        using var portal = CrearActorCliente(cliente);

        var sucursalId = await ObtenerSucursalRecepcionIdAsync();
        var alta = await portal.PostAsJsonAsync("/api/Envio", await ConstruirPayloadAsync(null, sucursalId));
        Assert.Equal(HttpStatusCode.Created, alta.StatusCode);
        var creado = (await alta.Content.ReadFromJsonAsync<CrearEnvioResponse>())!;

        var cancelar = await portal.PostAsJsonAsync($"/api/Envio/{creado.Envio.Id}/cancelar", new { motivo = "Error en el domicilio capturado" });
        Assert.Equal(HttpStatusCode.OK, cancelar.StatusCode);
        var cancelado = await cancelar.Content.ReadFromJsonAsync<EnvioDetalleResponse>();
        Assert.Equal("cancelado", cancelado!.Estado);

        var segunda = await portal.PostAsJsonAsync($"/api/Envio/{creado.Envio.Id}/cancelar", new { motivo = "Segundo intento" });
        Assert.Equal(HttpStatusCode.Conflict, segunda.StatusCode);
    }

    // Rastreo público

    [Fact]
    public async Task TC_ENV_008_RastreoPublico_SinSesion_NoExponeDatosSensibles()
    {
        var cliente = await CrearClientePruebaAsync("Ignacio", "Barraza");
        var creado = await CrearEnvioComoAdminAsync(cliente.Id);

        var resp = await _anonimo.GetAsync($"/api/Envio/rastreo/{creado.Guia.ToLowerInvariant()}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var crudo = await resp.Content.ReadAsStringAsync();
        var rastreo = System.Text.Json.JsonSerializer.Deserialize<RastreoPublicoResponse>(
            crudo, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web));

        Assert.NotNull(rastreo);
        Assert.Equal(creado.Guia, rastreo!.Guia);
        Assert.Equal("registrado", rastreo.Estado);
        Assert.NotEmpty(rastreo.Eventos);

        Assert.DoesNotContain("mariana.esquivel@correo-xunit.mx", crudo);
        Assert.DoesNotContain("3312345678", crudo);
        Assert.DoesNotContain("codigoSeguridad", crudo, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task TC_ENV_009_RastreoPublico_GuiaInexistente_Retorna404()
    {
        var resp = await _anonimo.GetAsync("/api/Envio/rastreo/TR-19990101-ZZZZ");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // Cancelación y reprogramación

    [Fact]
    public async Task TC_ENV_010_Cancelacion_SoloRolesAutorizados()
    {
        var cliente = await CrearClientePruebaAsync("Joaquín", "Cervantes");
        var creado = await CrearEnvioComoAdminAsync(cliente.Id);

        using var rh = CrearActor("RH");
        var rhResp = await rh.PostAsJsonAsync($"/api/Envio/{creado.Envio.Id}/cancelar", new { motivo = "RH no debe poder cancelar" });
        Assert.Equal(HttpStatusCode.Forbidden, rhResp.StatusCode);

        using var admin = CrearActor("Personal administrativo");
        var okResp = await admin.PostAsJsonAsync($"/api/Envio/{creado.Envio.Id}/cancelar", new { motivo = "Solicitud del cliente por teléfono" });
        Assert.Equal(HttpStatusCode.OK, okResp.StatusCode);
        var cancelado = await okResp.Content.ReadFromJsonAsync<EnvioDetalleResponse>();
        Assert.Equal("cancelado", cancelado!.Estado);
    }

    [Fact]
    public async Task TC_ENV_011_Reprogramar_AdministrativoPermitido_RHBloqueado()
    {
        var cliente = await CrearClientePruebaAsync("Karla", "Zepeda");
        var creado = await CrearEnvioComoAdminAsync(cliente.Id);
        var payload = new
        {
            nuevaFechaHora = DateTimeOffset.UtcNow.AddDays(2),
            tipoIncidencia = "otra",
            motivo = "El destinatario solicitó cambiar la fecha de entrega"
        };

        using var rh = CrearActor("RH");
        var rhResp = await rh.PostAsJsonAsync($"/api/Envio/{creado.Envio.Id}/reprogramar", payload);
        Assert.Equal(HttpStatusCode.Forbidden, rhResp.StatusCode);

        using var admin = CrearActor("Personal administrativo");
        var okResp = await admin.PostAsJsonAsync($"/api/Envio/{creado.Envio.Id}/reprogramar", payload);
        Assert.Equal(HttpStatusCode.OK, okResp.StatusCode);
        var reprogramado = await okResp.Content.ReadFromJsonAsync<EnvioDetalleResponse>();
        Assert.Equal("reprogramado", reprogramado!.Estado);
    }

    // Ciclo operativo completo

    [Fact]
    public async Task TC_ENV_012_CicloCompleto_Recepcion_Flotilla_Ruta_EntregaConPin()
    {
        var cliente = await CrearClientePruebaAsync("Lorena", "Acosta");
        var creado = await CrearEnvioComoAdminAsync(cliente.Id);
        var envioId = creado.Envio.Id;

        using var dev = CrearActor("Jefe");
        var recursos = await dev.GetFromJsonAsync<RecursosAsignacionEnvioResponse>("/api/Envio/recursos-asignacion");
        Assert.NotNull(recursos);

        var chofer = recursos!.Choferes.FirstOrDefault(c => c.FlotillaActivaId.HasValue);
        Assert.True(chofer is not null, "Se requiere al menos un chofer con flotilla activa en pos_db para el ciclo completo.");
        var flotillaId = chofer!.FlotillaActivaId!.Value;
        var unidad = recursos.Unidades.FirstOrDefault(u =>
            u.FlotillaId == flotillaId &&
            !u.Estado.Contains("mantenimiento", StringComparison.OrdinalIgnoreCase) &&
            !u.Estado.Contains("fuera", StringComparison.OrdinalIgnoreCase));
        Assert.True(unidad is not null, "Se requiere una unidad disponible en la flotilla del chofer.");

        var empleadoChofer = await dev.GetFromJsonAsync<EmpleadoResponse>($"/api/Empleado/{chofer.EmpleadoId}");
        Assert.NotNull(empleadoChofer);

        var payloadAsignar = new { flotillaId, unidadId = unidad!.Id, choferId = chofer.EmpleadoId };

        using var supervisor = CrearActor("Supervisor");
        using var sucursal = CrearActor("Personal de sucursal");
        using var choferActor = CrearActor("Chofer", empleadoChofer!.UsuarioId, "Empleado", empleadoId: chofer.EmpleadoId);
        using var otroChofer = CrearActor("Chofer", 2, "Empleado", empleadoId: 999_999);

        var asignarAntes = await supervisor.PostAsJsonAsync($"/api/Envio/{envioId}/asignar-flotilla", payloadAsignar);
        Assert.Equal(HttpStatusCode.Conflict, asignarAntes.StatusCode);

        // Recepción en sucursal
        var recepcionPayload = new { pesoVerificadoKg = 2.6, largoVerificadoCm = 30, anchoVerificadoCm = 20, altoVerificadoCm = 15 };
        using var rh = CrearActor("RH");
        var recepcionRh = await rh.PostAsJsonAsync($"/api/Envio/{envioId}/recepcion", recepcionPayload);
        Assert.Equal(HttpStatusCode.Forbidden, recepcionRh.StatusCode);

        var recepcion = await sucursal.PostAsJsonAsync($"/api/Envio/{envioId}/recepcion", recepcionPayload);
        Assert.Equal(HttpStatusCode.OK, recepcion.StatusCode);
        Assert.Equal("recibido_sucursal", (await recepcion.Content.ReadFromJsonAsync<EnvioDetalleResponse>())!.Estado);

        // Asignación a flotilla y verificación de aislamiento
        var asignar = await supervisor.PostAsJsonAsync($"/api/Envio/{envioId}/asignar-flotilla", payloadAsignar);
        Assert.Equal(HttpStatusCode.OK, asignar.StatusCode);
        var asignado = (await asignar.Content.ReadFromJsonAsync<EnvioDetalleResponse>())!;
        Assert.Equal("asignado_flotilla", asignado.Estado);
        Assert.NotEmpty(asignado.RutasAsignadas);

        var listaChofer = await choferActor.GetFromJsonAsync<List<EnvioListadoItem>>("/api/Envio?take=200");
        Assert.Contains(listaChofer!, e => e.Guia == creado.Guia);
        var detalleOtroChofer = await otroChofer.GetAsync($"/api/Envio/{envioId}");
        Assert.Equal(HttpStatusCode.Forbidden, detalleOtroChofer.StatusCode);

        // Inicio de ruta y entrega con PIN
        var iniciarAjeno = await otroChofer.PostAsJsonAsync($"/api/Envio/{envioId}/iniciar-ruta", new { });
        Assert.Equal(HttpStatusCode.Forbidden, iniciarAjeno.StatusCode);

        var iniciar = await choferActor.PostAsJsonAsync($"/api/Envio/{envioId}/iniciar-ruta", new { });
        Assert.Equal(HttpStatusCode.OK, iniciar.StatusCode);
        Assert.Equal("en_ruta", (await iniciar.Content.ReadFromJsonAsync<EnvioDetalleResponse>())!.Estado);

        using var portalCliente = CrearActorCliente(cliente);
        var detalleClienteEnReparto = await portalCliente.GetFromJsonAsync<EnvioDetalleResponse>($"/api/Envio/{envioId}");
        var pinEnReparto = detalleClienteEnReparto!.CodigoSeguridadCliente;
        Assert.NotNull(pinEnReparto);
        Assert.Matches(RegexPin, pinEnReparto!);

        var pinIncorrecto = pinEnReparto == "123456" ? "654321" : "123456";
        var entregaFallida = await choferActor.PostAsJsonAsync($"/api/Envio/{envioId}/validar-entrega",
            new { entregaExitosa = true, codigoSeguridad = pinIncorrecto });
        Assert.Equal(HttpStatusCode.Conflict, entregaFallida.StatusCode);

        var pinFormato = await choferActor.PostAsJsonAsync($"/api/Envio/{envioId}/validar-entrega",
            new { entregaExitosa = true, codigoSeguridad = "12ab" });
        Assert.Equal(HttpStatusCode.BadRequest, pinFormato.StatusCode);

        var entrega = await choferActor.PostAsJsonAsync($"/api/Envio/{envioId}/validar-entrega",
            new { entregaExitosa = true, codigoSeguridad = pinEnReparto, observaciones = "Recibió Mariana Esquivel" });
        Assert.Equal(HttpStatusCode.OK, entrega.StatusCode);
        var entregado = (await entrega.Content.ReadFromJsonAsync<EnvioDetalleResponse>())!;
        Assert.Equal("entregado", entregado.Estado);
        Assert.Contains(entregado.Entregas, e => e.Validado);

        var rastreo = await _anonimo.GetFromJsonAsync<RastreoPublicoResponse>($"/api/Envio/rastreo/{creado.Guia}");
        Assert.Equal("entregado", rastreo!.Estado);
        var estadosTimeline = rastreo.Eventos.Select(e => e.Estado).ToList();
        foreach (var esperado in new[] { "registrado", "recibido_sucursal", "asignado_flotilla", "en_ruta", "entregado" })
        {
            Assert.Contains(esperado, estadosTimeline);
        }

        using var admin = CrearActor("Personal administrativo");
        var cancelarEntregado = await admin.PostAsJsonAsync($"/api/Envio/{envioId}/cancelar", new { motivo = "Intento sobre envío entregado" });
        Assert.Equal(HttpStatusCode.Conflict, cancelarEntregado.StatusCode);
    }
}
