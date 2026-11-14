using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Backend.BDFolder;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ApiTests.SuiteV3;

// Autenticación JWT, cambio de contraseña, activación y roles
public class AuthYSeguridadTests : IAsyncLifetime
{
    private readonly ApiSuiteContext _suite = new();

    public Task InitializeAsync() => _suite.InitializeAsync();
    public Task DisposeAsync() => _suite.DisposeAsync();

    [Fact(DisplayName = "AUTH_001 - Login empleado real, detección de primer acceso, cambio de contraseña inicial y segundo login")]
    public async Task AUTH_001_LoginEmpleadoRealYCambioPasswordInicial()
    {
        const string passInicial = "Pr#Ini2026aB!";
        const string passNueva = "Nu#Eva2026xY!";
        var emp = await _suite.CrearEmpleadoConPuestoAsync("Personal de sucursal", passwordPlano: passInicial);

        using var jwtFactory = new JwtRealWebAppFactory();
        using var client = jwtFactory.CreateClient();

        var respLogin = await client.PostAsync(
            "/api/Autenticacion/login-empleado",
            SuiteJson.AsJsonContent(new LoginEmpleadoModel(emp.Id, passInicial)));
        var loginBody = await respLogin.Content.ReadAsStringAsync();
        Assert.True(respLogin.StatusCode == HttpStatusCode.OK, $"login-empleado falló: {(int)respLogin.StatusCode} {loginBody}");

        var loginDto = JsonSerializer.Deserialize<LoginResponse>(loginBody, SuiteJson.Options)!;
        Assert.False(string.IsNullOrWhiteSpace(loginDto.Token));
        Assert.True(loginDto.RequiereCambioPassword);
        Assert.Equal("Empleado", loginDto.TipoUsuario);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginDto.Token);
        var respSuc = await client.GetAsync("/api/CatalogoGeografico/sucursales-operativas");
        Assert.Equal(HttpStatusCode.OK, respSuc.StatusCode);

        // Cambio de contraseña inicial obligatorio
        var respCambio = await client.PostAsync(
            "/api/Autenticacion/cambiar-password-inicial",
            SuiteJson.AsJsonContent(new CambiarPasswordInicialModel
            {
                PasswordActual = passInicial,
                PasswordNueva = passNueva
            }));
        Assert.Equal(HttpStatusCode.OK, respCambio.StatusCode);

        using var anon = jwtFactory.CreateClient();
        var respLogin2 = await anon.PostAsync(
            "/api/Autenticacion/login-empleado",
            SuiteJson.AsJsonContent(new LoginEmpleadoModel(emp.Id, passNueva)));
        Assert.Equal(HttpStatusCode.OK, respLogin2.StatusCode);
        var login2Dto = await respLogin2.Content.ReadFromJsonAsync<LoginResponse>(SuiteJson.Options);
        Assert.False(login2Dto!.RequiereCambioPassword);
    }

    [Theory(DisplayName = "AUTH_002 - Fronteras de política de contraseña al cambiar password inicial")]
    [InlineData("Cort1!aB", "corta < 12 caracteres")]
    [InlineData("AbCDefgh12!x", "mayúsculas consecutivas no permitidas")]
    [InlineData("ABCDEFGH12!A", "sin al menos 2 minúsculas")]
    [InlineData("abCdeFgh!xyz", "sin dígito numérico")]
    [InlineData("abCdeFgh1234", "sin símbolo especial")]
    [InlineData("Pr#Ini2026aB!", "igual a la contraseña actual")]
    public async Task AUTH_002_PoliticaPasswordFronteras_RechazaCon400Amigable(string nuevaInvalida, string _)
    {
        const string passInicial = "Pr#Ini2026aB!";
        var emp = await _suite.CrearEmpleadoConPuestoAsync("Chofer", passwordPlano: passInicial);

        using var jwtFactory = new JwtRealWebAppFactory();
        using var client = jwtFactory.CreateClient();

        var respLogin = await client.PostAsync("/api/Autenticacion/login-empleado",
            SuiteJson.AsJsonContent(new LoginEmpleadoModel(emp.Id, passInicial)));
        var login = await respLogin.Content.ReadFromJsonAsync<LoginResponse>(SuiteJson.Options);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login!.Token);

        var resp = await client.PostAsync("/api/Autenticacion/cambiar-password-inicial",
            SuiteJson.AsJsonContent(new CambiarPasswordInicialModel
            {
                PasswordActual = passInicial,
                PasswordNueva = nuevaInvalida
            }));
        var body = await resp.Content.ReadAsStringAsync();
        ApiSuiteContext.AssertMensajeErrorAmigable(resp.StatusCode, body, HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "AUTH_003 - Login con credenciales inválidas y cliente sin activar retorna 401 amigable")]
    public async Task AUTH_003_LoginInvalidoYClientePendienteActivacion_Retornan401Amigable()
    {
        using var jwtFactory = new JwtRealWebAppFactory();
        using var anon = jwtFactory.CreateClient();

        var respBadEmp = await anon.PostAsync("/api/Autenticacion/login-empleado",
            SuiteJson.AsJsonContent(new LoginEmpleadoModel(99999999, "ClaveInvalida12!")));
        ApiSuiteContext.AssertMensajeErrorAmigable(respBadEmp.StatusCode, await respBadEmp.Content.ReadAsStringAsync(), HttpStatusCode.Unauthorized);

        // Cliente pendiente de activar
        using var devClient = _suite.CreateActor("Jefe");
        var email = $"pendiente.{_suite.RunTag}@prueba.test";
        var pass = "Cl#Pend2026aB!";
        var respCli = await devClient.PostAsync("/api/Cliente",
            SuiteJson.AsJsonContent(new CrearClienteModel("Ana", "Pendiente", null, "6671002000", email, null, pass)));
        Assert.Equal(HttpStatusCode.Created, respCli.StatusCode);
        var cli = await respCli.Content.ReadFromJsonAsync<ClienteResponse>(SuiteJson.Options);
        _suite.ClienteIds.Add(cli!.Id);
        if (cli.UsuarioId.HasValue) _suite.UsuarioIds.Add(cli.UsuarioId.Value);

        var respLoginPend = await anon.PostAsync("/api/Autenticacion/login-cliente",
            SuiteJson.AsJsonContent(new LoginClienteModel(email, pass)));
        var bodyPend = await respLoginPend.Content.ReadAsStringAsync();
        ApiSuiteContext.AssertMensajeErrorAmigable(respLoginPend.StatusCode, bodyPend, HttpStatusCode.Unauthorized);
        Assert.Contains("pendiente de activación", bodyPend, StringComparison.OrdinalIgnoreCase);
    }

    [Fact(DisplayName = "AUTH_004 - Activación de cuenta de cliente: token inválido -> 400, token válido -> 200 idempotente + login cliente")]
    public async Task AUTH_004_ActivacionCuentaCliente_YLoginPosterior()
    {
        using var anon = _suite.CreateAnonClient();
        var respTokenMalo = await anon.PostAsync("/api/Autenticacion/activar-cuenta",
            SuiteJson.AsJsonContent(new ActivarCuentaModel("token-falso-manipulado")));
        ApiSuiteContext.AssertMensajeErrorAmigable(respTokenMalo.StatusCode, await respTokenMalo.Content.ReadAsStringAsync(), HttpStatusCode.BadRequest);

        const string passCli = "Cl#Act2026xY!";
        var (cliente, _) = await _suite.CrearYActivarClienteAsync(passwordExplicit: passCli);

        // Reenvío idempotente de activación
        using var scope = _suite.Factory.Services.CreateScope();
        var jwtSvc = scope.ServiceProvider.GetRequiredService<JwtService>();
        var tokenAct = jwtSvc.GenerarTokenActivacion(cliente.UsuarioId!.Value, cliente.Email!);
        var respSegunda = await anon.PostAsync("/api/Autenticacion/activar-cuenta",
            SuiteJson.AsJsonContent(new ActivarCuentaModel(tokenAct)));
        Assert.Equal(HttpStatusCode.OK, respSegunda.StatusCode);
        var cuerpoSegunda = await respSegunda.Content.ReadAsStringAsync();
        Assert.Contains("yaActiva", cuerpoSegunda, StringComparison.OrdinalIgnoreCase);

        using var jwtFactory = new JwtRealWebAppFactory();
        using var realAnon = jwtFactory.CreateClient();
        var respLogin = await realAnon.PostAsync("/api/Autenticacion/login-cliente",
            SuiteJson.AsJsonContent(new LoginClienteModel(cliente.Email!, passCli)));
        Assert.Equal(HttpStatusCode.OK, respLogin.StatusCode);
        var dto = await respLogin.Content.ReadFromJsonAsync<LoginResponse>(SuiteJson.Options);
        Assert.Equal("Cliente", dto!.TipoUsuario);
        Assert.Equal(cliente.Id, dto.EmpleadoOClienteId);
    }

    [Fact(DisplayName = "AUTH_005 - Revocación de sesión JWT en POST /api/Autenticacion/logout invalida el token de inmediato (RNF-09)")]
    public async Task AUTH_005_Logout_RevocaJwtYBloqueaUsoPosterior()
    {
        const string pass = "Pr#Rev2026aB!";
        var emp = await _suite.CrearEmpleadoConPuestoAsync("Supervisor", passwordPlano: pass);

        using var jwtFactory = new JwtRealWebAppFactory();
        using var client = jwtFactory.CreateClient();

        var respLogin = await client.PostAsync("/api/Autenticacion/login-empleado",
            SuiteJson.AsJsonContent(new LoginEmpleadoModel(emp.Id, pass)));
        Assert.Equal(HttpStatusCode.OK, respLogin.StatusCode);
        var login = await respLogin.Content.ReadFromJsonAsync<LoginResponse>(SuiteJson.Options);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login!.Token);

        var respAntes = await client.GetAsync("/api/CatalogoGeografico/estados");
        Assert.Equal(HttpStatusCode.OK, respAntes.StatusCode);

        var respLogout = await client.PostAsync("/api/Autenticacion/logout", null);
        Assert.Equal(HttpStatusCode.OK, respLogout.StatusCode);

        var respDespues = await client.GetAsync("/api/CatalogoGeografico/estados");
        Assert.Equal(HttpStatusCode.Unauthorized, respDespues.StatusCode);
    }

    [Fact(DisplayName = "AUTH_006 - Roles y Permisos (CU-05..07, CU-58..61): CRUD Rol, asignación permisos y bloqueo a RH")]
    public async Task AUTH_006_RolesYPermisos_CrudYBloqueoRH()
    {
        using var devHttp = _suite.CreateActor("Jefe");
        using var chfHttp = _suite.CreateActor("Chofer");

        var respPerms = await devHttp.GetAsync("/api/Permiso");
        Assert.Equal(HttpStatusCode.OK, respPerms.StatusCode);
        var permisos = await respPerms.Content.ReadFromJsonAsync<List<PermisoResponse>>(SuiteJson.Options);
        Assert.NotNull(permisos);
        Assert.NotEmpty(permisos!);

        var respChfPost = await chfHttp.PostAsync("/api/Rol",
            SuiteJson.AsJsonContent(new CrearRolModel($"RolProhibido_{_suite.RunTag}", "No autorizado")));
        Assert.Equal(HttpStatusCode.Forbidden, respChfPost.StatusCode);

        var permId = permisos[0].Id;
        var respCreate = await devHttp.PostAsync("/api/Rol",
            SuiteJson.AsJsonContent(new CrearRolModel($"RolQA_{_suite.RunTag}", "Rol temporal QA", new() { permId })));
        var createBody = await respCreate.Content.ReadAsStringAsync();
        Assert.True(respCreate.StatusCode == HttpStatusCode.Created, $"Crear rol falló: {(int)respCreate.StatusCode} {createBody}");
        var rol = JsonSerializer.Deserialize<RolResponse>(createBody, SuiteJson.Options)!;
        _suite.RolIds.Add(rol.Id);

        var respRolPerms = await devHttp.GetAsync($"/api/Rol/{rol.Id}/permisos");
        Assert.Equal(HttpStatusCode.OK, respRolPerms.StatusCode);
        var items = await respRolPerms.Content.ReadFromJsonAsync<List<PermisoRolItem>>(SuiteJson.Options);
        Assert.Contains(items!, i => i.Id == permId && i.Asignado);

        var respPutPerms = await devHttp.PutAsync($"/api/Rol/{rol.Id}/permisos",
            SuiteJson.AsJsonContent(new AsignarPermisosRolModel(new List<long>())));
        Assert.Equal(HttpStatusCode.OK, respPutPerms.StatusCode);

        var respPutRol = await devHttp.PutAsync($"/api/Rol/{rol.Id}",
            SuiteJson.AsJsonContent(new ActualizarRolModel($"RolQA_Upd_{_suite.RunTag}", "Editado", new())));
        Assert.Equal(HttpStatusCode.NoContent, respPutRol.StatusCode);

        var respDelRol = await devHttp.DeleteAsync($"/api/Rol/{rol.Id}");
        Assert.Equal(HttpStatusCode.NoContent, respDelRol.StatusCode);
    }
}
