using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Backend;
using Backend.BDFolder;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ApiTests.SuiteV3;

public sealed class SuiteWebAppFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureTestServices(services =>
        {
            services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = "TestScheme";
                    options.DefaultChallengeScheme = "TestScheme";
                    options.DefaultScheme = "TestScheme";
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("TestScheme", _ => { });
        });
    }
}

public sealed class JwtRealWebAppFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
    }
}

public static class SuiteJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public static StringContent AsJsonContent(object payload) =>
        new(JsonSerializer.Serialize(payload, Options), Encoding.UTF8, "application/json");

    public static StringContent AsRawJsonContent(string rawJson) =>
        new(rawJson, Encoding.UTF8, "application/json");
}

public sealed class ApiSuiteContext : IAsyncLifetime
{
    public SuiteWebAppFactory Factory { get; } = new();
    public string RunTag { get; } = $"X3_{Guid.NewGuid():N}"[..10];

    public List<long> EnvioIds { get; } = new();
    public List<long> RutaIds { get; } = new();
    public List<long> DireccionIds { get; } = new();
    public List<long> ClienteIds { get; } = new();
    public List<long> EmpleadoIds { get; } = new();
    public List<long> UsuarioIds { get; } = new();
    public List<long> UnidadIds { get; } = new();
    public List<long> FlotillaIds { get; } = new();
    public List<long> TipoMantenimientoIds { get; } = new();
    public List<long> SucursalIds { get; } = new();
    public List<long> PuestoIds { get; } = new();
    public List<long> RolIds { get; } = new();
    public List<long> PermisoIds { get; } = new();

    public Task InitializeAsync() => Task.CompletedTask;

    public async Task DisposeAsync()
    {
        try
        {
            await CleanupAsync();
        }
        finally
        {
            Factory.Dispose();
        }
    }

    public HttpClient CreateAnonClient() => Factory.CreateClient();

    public HttpClient CreateActor(
        string roles,
        long userId = 1,
        string? tipoUsuario = "Empleado",
        long? empleadoId = null,
        long? clienteId = null,
        long? sucursalId = null,
        string? permisos = null)
    {
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestScheme", "xunit-v3");
        client.DefaultRequestHeaders.Add("X-Test-Role", roles);
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        if (!string.IsNullOrWhiteSpace(tipoUsuario))
            client.DefaultRequestHeaders.Add("X-Test-TipoUsuario", tipoUsuario);
        if (empleadoId.HasValue)
            client.DefaultRequestHeaders.Add("X-Test-EmpleadoId", empleadoId.Value.ToString());
        if (clienteId.HasValue)
            client.DefaultRequestHeaders.Add("X-Test-ClienteId", clienteId.Value.ToString());
        if (sucursalId.HasValue)
            client.DefaultRequestHeaders.Add("X-Test-SucursalId", sucursalId.Value.ToString());
        if (!string.IsNullOrWhiteSpace(permisos))
            client.DefaultRequestHeaders.Add("X-Test-Permisos", permisos);

        return client;
    }

    public async Task<T> QueryDbAsync<T>(Func<TransportesRojasDbContext, Task<T>> query)
    {
        using var scope = Factory.Services.CreateScope();
        var factory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<TransportesRojasDbContext>>();
        await using var ctx = await factory.CreateDbContextAsync();
        return await query(ctx);
    }

    public async Task ExecuteDbAsync(Func<TransportesRojasDbContext, Task> action)
    {
        using var scope = Factory.Services.CreateScope();
        var factory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<TransportesRojasDbContext>>();
        await using var ctx = await factory.CreateDbContextAsync();
        await action(ctx);
    }

    public async Task<long> ObtenerPuestoIdPorNombreAsync(string nombre)
    {
        var puesto = await QueryDbAsync(ctx =>
            ctx.Puestos.AsNoTracking().FirstOrDefaultAsync(p => p.Nombre.ToLower() == nombre.ToLower()));

        if (puesto is null)
            throw new InvalidOperationException($"Puesto semilla no encontrado: {nombre}");

        return puesto.Id;
    }

    public async Task<long> ObtenerRolIdPorNombreAsync(string nombre)
    {
        var rol = await QueryDbAsync(ctx =>
            ctx.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Nombre.ToLower() == nombre.ToLower()));

        if (rol is null)
            throw new InvalidOperationException($"Rol semilla no encontrado: {nombre}");

        return rol.Id;
    }

    public async Task<long> ObtenerSucursalActivaIdAsync()
    {
        var sucursal = await QueryDbAsync(ctx =>
            ctx.Sucursales.AsNoTracking().Where(s => s.Activo).OrderBy(s => s.Id).FirstOrDefaultAsync());

        if (sucursal is null)
            throw new InvalidOperationException("No existe ninguna sucursal activa en pos_db.");

        return sucursal.Id;
    }

    public async Task<(ClienteResponse Cliente, string PasswordEfectiva)> CrearYActivarClienteAsync(
        string? email = null,
        string? passwordExplicit = null)
    {
        using var admin = CreateActor("Jefe");
        var unique = Guid.NewGuid().ToString("N")[..8];
        var uniqueAlpha = GenerarSufijoAlfabetico(unique);
        var correo = email ?? $"cli.{RunTag}.{unique}@prueba.test";

        var crearPayload = new CrearClienteModel(
            Nombre: $"Cliente{uniqueAlpha}",
            ApellidoPaterno: "Rojas",
            ApellidoMaterno: "Prueba",
            Telefono: "6671234567",
            Email: correo,
            UsuarioId: null,
            Password: passwordExplicit
        );

        var respCreate = await admin.PostAsync("/api/Cliente", SuiteJson.AsJsonContent(crearPayload));
        var createBody = await respCreate.Content.ReadAsStringAsync();
        Assert.True(respCreate.StatusCode == HttpStatusCode.Created,
            $"No se pudo crear cliente de prueba: {(int)respCreate.StatusCode} {createBody}");

        var creado = JsonSerializer.Deserialize<ClienteResponse>(createBody, SuiteJson.Options)!;
        ClienteIds.Add(creado.Id);
        if (creado.UsuarioId.HasValue) UsuarioIds.Add(creado.UsuarioId.Value);

        using var scope = Factory.Services.CreateScope();
        var jwtService = scope.ServiceProvider.GetRequiredService<JwtService>();
        var tokenActivacion = jwtService.GenerarTokenActivacion(creado.UsuarioId!.Value, creado.Email!);

        using var anon = CreateAnonClient();
        var respAct = await anon.PostAsync("/api/Autenticacion/activar-cuenta",
            SuiteJson.AsJsonContent(new ActivarCuentaModel(tokenActivacion)));
        var actBody = await respAct.Content.ReadAsStringAsync();
        Assert.True(respAct.StatusCode == HttpStatusCode.OK,
            $"No se pudo activar el cliente: {(int)respAct.StatusCode} {actBody}");

        var respGet = await admin.GetAsync($"/api/Cliente/{creado.Id}");
        Assert.Equal(HttpStatusCode.OK, respGet.StatusCode);
        var activado = await respGet.Content.ReadFromJsonAsync<ClienteResponse>(SuiteJson.Options);
        Assert.NotNull(activado);
        Assert.True(activado!.Activo);

        var pass = !string.IsNullOrWhiteSpace(passwordExplicit)
            ? passwordExplicit
            : (creado.PasswordGenerada ?? "Cl#Prueb42026!");

        return (activado, pass);
    }

    public async Task<EmpleadoResponse> CrearEmpleadoConPuestoAsync(
        string puestoNombre,
        long? sucursalId = null,
        string? email = null,
        string? passwordPlano = null)
    {
        using var dev = CreateActor("Jefe");
        var unique = Guid.NewGuid().ToString("N")[..8];
        var uniqueAlpha = GenerarSufijoAlfabetico(unique);
        var puestoId = await ObtenerPuestoIdPorNombreAsync(puestoNombre);
        var sucId = sucursalId ?? await ObtenerSucursalActivaIdAsync();

        var model = new CrearEmpleadoCompleto(
            Nombre: $"Emp{uniqueAlpha}",
            ApellidoPaterno: "Prueba",
            ApellidoMaterno: "Qa",
            Telefono: "6675551234",
            Email: email ?? $"emp.{RunTag}.{unique}@transportes.test",
            SucursalId: sucId,
            RolId: null,
            FechaIngreso: DateOnly.FromDateTime(DateTime.UtcNow),
            PuestoId: puestoId);

        var resp = await dev.PostAsync("/api/Empleado", SuiteJson.AsJsonContent(model));
        var body = await resp.Content.ReadAsStringAsync();
        Assert.True(resp.StatusCode == HttpStatusCode.Created,
            $"Fallo al crear empleado {puestoNombre}: {(int)resp.StatusCode} {body}");

        var emp = JsonSerializer.Deserialize<EmpleadoResponse>(body, SuiteJson.Options)!;
        EmpleadoIds.Add(emp.Id);
        UsuarioIds.Add(emp.UsuarioId);

        if (!string.IsNullOrWhiteSpace(passwordPlano))
        {
            await ExecuteDbAsync(async ctx =>
            {
                var usr = await ctx.Usuarios.FirstAsync(u => u.Id == emp.UsuarioId);
                var hasher = new PasswordHasher<object>();
                usr.PasswordHash = hasher.HashPassword(new { }, passwordPlano);
                await ctx.SaveChangesAsync();
            });
        }

        return emp;
    }

    public async Task<FlotillaResponse> CrearFlotillaPruebaAsync(long sucursalId, long? supervisorId = null)
    {
        using var dev = CreateActor("Jefe");
        var unique = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        var payload = new CrearFlotillaModel(
            Nombre: $"Flotilla QA {RunTag} {unique}",
            Codigo: $"FLT-{RunTag}-{unique}",
            SucursalId: sucursalId,
            SupervisorId: supervisorId);

        var resp = await dev.PostAsync("/api/Flotilla", SuiteJson.AsJsonContent(payload));
        var body = await resp.Content.ReadAsStringAsync();
        Assert.True(resp.StatusCode == HttpStatusCode.Created,
            $"Fallo al crear flotilla: {(int)resp.StatusCode} {body}");

        var flt = JsonSerializer.Deserialize<FlotillaResponse>(body, SuiteJson.Options)!;
        FlotillaIds.Add(flt.Id);
        return flt;
    }

    public async Task<UnidadResponse> CrearUnidadPruebaAsync(long flotillaId, decimal odometroInicial = 12500m)
    {
        using var dev = CreateActor("Jefe");
        var unique = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        var payload = new CrearUnidadModel(
            FlotillaId: flotillaId,
            Placas: $"QA{unique}",
            TipoVehiculo: "Camioneta Van",
            Marca: "Nissan",
            Modelo: "Urvan NV350",
            Anio: 2024,
            CapacidadKg: 1500m,
            KmOdometroInicial: odometroInicial);

        var resp = await dev.PostAsync("/api/Unidad", SuiteJson.AsJsonContent(payload));
        var body = await resp.Content.ReadAsStringAsync();
        Assert.True(resp.StatusCode == HttpStatusCode.Created,
            $"Fallo al crear unidad: {(int)resp.StatusCode} {body}");

        var uni = JsonSerializer.Deserialize<UnidadResponse>(body, SuiteJson.Options)!;
        UnidadIds.Add(uni.Id);
        return uni;
    }

    public async Task<ConsultaCodigoPostalResponse> ConsultarSepomexAsync(HttpClient client, string cp = "80000")
    {
        var resp = await client.GetAsync($"/api/CatalogoGeografico/cp/{cp}");
        var body = await resp.Content.ReadAsStringAsync();
        Assert.True(resp.StatusCode == HttpStatusCode.OK,
            $"SEPOMEX CP {cp} falló: {(int)resp.StatusCode} {body}");

        var res = JsonSerializer.Deserialize<ConsultaCodigoPostalResponse>(body, SuiteJson.Options)!;
        Assert.NotEmpty(res.Colonias);
        return res;
    }

    public async Task<CrearEnvioResponse> CrearEnvioSepomexAsync(
        HttpClient client,
        long? remitenteId,
        string cpDestino = "80000",
        long? sucursalRecepcionId = null,
        bool requiereRecoleccion = false)
    {
        var sepomexDestino = await ConsultarSepomexAsync(client, cpDestino);
        var colonia = sepomexDestino.Colonias[0];

        DireccionEnvioInput? dirOrigen = null;
        if (requiereRecoleccion)
        {
            var sepOrigen = await ConsultarSepomexAsync(client, "80000");
            var colOri = sepOrigen.Colonias[0];
            dirOrigen = new DireccionEnvioInput(
                AsentamientoId: colOri.Id,
                LocalidadId: sepOrigen.LocalidadSugeridaId,
                EstadoId: sepOrigen.EstadoId,
                MunicipioId: sepOrigen.MunicipioId,
                CodigoPostal: sepOrigen.CodigoPostal,
                Estado: sepOrigen.EstadoNombre,
                Municipio: sepOrigen.MunicipioNombre,
                Localidad: sepOrigen.Ciudad ?? sepOrigen.MunicipioNombre,
                Colonia: colOri.Nombre,
                Calle: "Av. Álvaro Obregón",
                NumeroExterior: "1025",
                EntreCalles: "Entre Juárez y Rosales",
                Referencias: "Portón gris bodega 2");
        }

        var payload = new CrearEnvioModel(
            RemitenteId: remitenteId,
            DestinatarioClienteId: null,
            DestinatarioNombre: "Destinatario QA",
            DestinatarioTelefono: "6679876543",
            DestinatarioEmail: $"dest.{RunTag}@prueba.test",
            RequiereRecoleccion: requiereRecoleccion,
            SucursalRecepcionId: requiereRecoleccion ? null : (sucursalRecepcionId ?? await ObtenerSucursalActivaIdAsync()),
            SucursalDestinoId: sepomexDestino.CoberturaSugerida?.SucursalId,
            DireccionOrigen: dirOrigen,
            FechaHoraRecoleccionSolicitada: requiereRecoleccion ? DateTimeOffset.UtcNow.AddDays(1) : null,
            ObservacionesRecoleccion: requiereRecoleccion ? "Portón gris" : null,
            DireccionDestino: new DireccionEnvioInput(
                AsentamientoId: colonia.Id,
                LocalidadId: sepomexDestino.LocalidadSugeridaId,
                EstadoId: sepomexDestino.EstadoId,
                MunicipioId: sepomexDestino.MunicipioId,
                CodigoPostal: sepomexDestino.CodigoPostal,
                Estado: sepomexDestino.EstadoNombre,
                Municipio: sepomexDestino.MunicipioNombre,
                Localidad: sepomexDestino.Ciudad ?? sepomexDestino.MunicipioNombre,
                Colonia: colonia.Nombre,
                Calle: "Blvd. Emiliano Zapata",
                NumeroExterior: "450",
                EntreCalles: "Entre Victoria y Bravo",
                Referencias: "Local azul",
                Latitud: sepomexDestino.LatitudSugerida,
                Longitud: sepomexDestino.LongitudSugerida),
            PesoKg: 4.5m,
            LargoCm: 35m,
            AnchoCm: 25m,
            AltoCm: 20m,
            Descripcion: "Equipo electrónico calibrado",
            ValorDeclarado: 2500m);

        var resp = await client.PostAsync("/api/Envio", SuiteJson.AsJsonContent(payload));
        var body = await resp.Content.ReadAsStringAsync();
        Assert.True(resp.StatusCode == HttpStatusCode.Created,
            $"No se pudo crear envío con CP {cpDestino}: {(int)resp.StatusCode} {body}");

        var created = JsonSerializer.Deserialize<CrearEnvioResponse>(body, SuiteJson.Options)!;
        EnvioIds.Add(created.Envio.Id);
        return created;
    }

    public static void AssertMensajeErrorAmigable(
        HttpStatusCode actualStatus,
        string rawBody,
        params HttpStatusCode[] expectedStatuses)
    {
        if (expectedStatuses.Length > 0)
        {
            Assert.Contains(actualStatus, expectedStatuses);
        }

        Assert.False(string.IsNullOrWhiteSpace(rawBody), "El cuerpo del error no debe estar vacío.");
        Assert.DoesNotContain("<!DOCTYPE", rawBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<html", rawBody, StringComparison.OrdinalIgnoreCase);

        using var doc = JsonDocument.Parse(rawBody);
        var root = doc.RootElement;
        string? msg = null;
        if (root.TryGetProperty("mensaje", out var m)) msg = m.GetString();
        else if (root.TryGetProperty("error", out var e)) msg = e.GetString();
        else if (root.TryGetProperty("title", out var t)) msg = t.GetString();

        Assert.False(string.IsNullOrWhiteSpace(msg), $"Se esperaba mensaje amigable en JSON: {rawBody}");
        Assert.True(msg!.Length <= 240, $"Mensaje de error demasiado extenso ({msg.Length} chars): {msg}");

        string[] jergaProhibida =
        {
            "Npgsql", "PostgresException", "SqlState", "23505", "23503", "42P01", "22P02",
            "Microsoft.EntityFrameworkCore", "DbUpdateException", "at Backend.",
            "SELECT ", "INSERT ", "UPDATE ", "DELETE FROM", "System.InvalidOperationException"
        };

        foreach (var jerga in jergaProhibida)
        {
            Assert.DoesNotContain(jerga, rawBody, StringComparison.OrdinalIgnoreCase);
        }
    }

    public async Task CleanupAsync()
    {
        await ExecuteDbAsync(async ctx =>
        {

        if (EnvioIds.Count > 0)
        {
            var eIds = EnvioIds.Distinct().ToList();
            var dirIds = await ctx.Envios
                .Where(e => eIds.Contains(e.Id) && e.DireccionDestinoId != null)
                .Select(e => e.DireccionDestinoId!.Value)
                .ToListAsync();
            DireccionIds.AddRange(dirIds);

            var rIdsFromEnvios = await ctx.RutasEnvios
                .Where(re => eIds.Contains(re.EnvioId))
                .Select(re => re.RutaId)
                .ToListAsync();
            RutaIds.AddRange(rIdsFromEnvios);

            await ctx.AvisosSms.Where(x => eIds.Contains(x.EnvioId)).ExecuteDeleteAsync();
            await ctx.EventosEnvio.Where(x => eIds.Contains(x.EnvioId)).ExecuteDeleteAsync();
            await ctx.RecepcionesPaquete.Where(x => eIds.Contains(x.EnvioId)).ExecuteDeleteAsync();
            await ctx.Entregas.Where(x => eIds.Contains(x.EnvioId)).ExecuteDeleteAsync();
            await ctx.RutasEnvios.Where(x => eIds.Contains(x.EnvioId)).ExecuteDeleteAsync();
            await ctx.Devoluciones.Where(x => eIds.Contains(x.EnvioId)).ExecuteDeleteAsync();
            await ctx.Cancelaciones.Where(x => eIds.Contains(x.EnvioId)).ExecuteDeleteAsync();
            await ctx.Reprogramaciones.Where(x => eIds.Contains(x.EnvioId)).ExecuteDeleteAsync();
            await ctx.Incidencias.Where(x => x.EnvioId != null && eIds.Contains(x.EnvioId.Value)).ExecuteDeleteAsync();
            await ctx.Alertas.Where(x => x.EnvioId != null && eIds.Contains(x.EnvioId.Value)).ExecuteDeleteAsync();
            await ctx.Reclamaciones.Where(x => x.EnvioId != null && eIds.Contains(x.EnvioId.Value)).ExecuteDeleteAsync();
            await ctx.Evaluaciones.Where(x => eIds.Contains(x.EnvioId)).ExecuteDeleteAsync();
            await ctx.Envios.Where(x => eIds.Contains(x.Id)).ExecuteDeleteAsync();
        }

        if (RutaIds.Count > 0)
        {
            var rIds = RutaIds.Distinct().ToList();
            await ctx.CambiosRuta.Where(x => rIds.Contains(x.RutaId)).ExecuteDeleteAsync();
            await ctx.RutasEnvios.Where(x => rIds.Contains(x.RutaId)).ExecuteDeleteAsync();
            await ctx.Entregas.Where(x => x.RutaId != null && rIds.Contains(x.RutaId.Value)).ExecuteDeleteAsync();
            await ctx.Rutas.Where(x => rIds.Contains(x.Id)).ExecuteDeleteAsync();
        }

        if (UnidadIds.Count > 0)
        {
            var uIds = UnidadIds.Distinct().ToList();
            await ctx.Mantenimientos.Where(x => uIds.Contains(x.UnidadId)).ExecuteDeleteAsync();
            await ctx.AlertasMantenimiento.Where(x => uIds.Contains(x.UnidadId)).ExecuteDeleteAsync();
            await ctx.Telemetrias.Where(x => uIds.Contains(x.UnidadId)).ExecuteDeleteAsync();
            await ctx.Unidades.Where(x => uIds.Contains(x.Id)).ExecuteDeleteAsync();
        }

        if (SucursalIds.Count > 0)
        {
            var sIds = SucursalIds.Distinct().ToList();
            await ctx.Sucursales.Where(s => sIds.Contains(s.Id))
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.ResponsableId, (long?)null));
        }

        if (FlotillaIds.Count > 0)
        {
            var fIds = FlotillaIds.Distinct().ToList();
            await ctx.AsignacionesFlotillaChofer.Where(x => fIds.Contains(x.FlotillaId)).ExecuteDeleteAsync();
            await ctx.Unidades.Where(x => x.FlotillaId != null && fIds.Contains(x.FlotillaId.Value))
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.FlotillaId, (long?)null));
            await ctx.Flotillas.Where(x => fIds.Contains(x.Id)).ExecuteDeleteAsync();
        }

        if (EmpleadoIds.Count > 0)
        {
            var empIds = EmpleadoIds.Distinct().ToList();
            await ctx.Sucursales.Where(s => s.ResponsableId != null && empIds.Contains(s.ResponsableId.Value))
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.ResponsableId, (long?)null));
            await ctx.Flotillas.Where(f => f.SupervisorId != null && empIds.Contains(f.SupervisorId.Value))
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.SupervisorId, (long?)null));
            await ctx.AsignacionesFlotillaChofer.Where(x => empIds.Contains(x.ChoferId)).ExecuteDeleteAsync();
            await ctx.EmpleadosPuestosHistorial.Where(x => empIds.Contains(x.EmpleadoId)).ExecuteDeleteAsync();
            await ctx.Empleados.Where(x => empIds.Contains(x.Id)).ExecuteDeleteAsync();
        }

        if (ClienteIds.Count > 0)
        {
            var cIds = ClienteIds.Distinct().ToList();
            await ctx.ClientesDirecciones.Where(x => cIds.Contains(x.ClienteId)).ExecuteDeleteAsync();
            await ctx.Clientes.Where(x => cIds.Contains(x.Id)).ExecuteDeleteAsync();
        }

        if (UsuarioIds.Count > 0)
        {
            var usrIds = UsuarioIds.Distinct().ToList();
            await ctx.UsuarioEstadosHistorial.Where(x => usrIds.Contains(x.UsuarioId)).ExecuteDeleteAsync();
            await ctx.UsuarioRoles.Where(x => usrIds.Contains(x.UsuarioId)).ExecuteDeleteAsync();
            await ctx.Usuarios.Where(x => usrIds.Contains(x.Id)).ExecuteDeleteAsync();
        }

        if (SucursalIds.Count > 0)
        {
            var sIds = SucursalIds.Distinct().ToList();
            var sucDirIds = await ctx.Sucursales
                .Where(s => sIds.Contains(s.Id) && s.DireccionId != null)
                .Select(s => s.DireccionId!.Value)
                .ToListAsync();
            DireccionIds.AddRange(sucDirIds);
            await ctx.HorariosSucursal.Where(x => sIds.Contains(x.SucursalId)).ExecuteDeleteAsync();
            await ctx.Sucursales.Where(x => sIds.Contains(x.Id)).ExecuteDeleteAsync();
        }

        if (DireccionIds.Count > 0)
        {
            var dIds = DireccionIds.Distinct().ToList();
            await ctx.Direcciones.Where(x => dIds.Contains(x.Id)).ExecuteDeleteAsync();
        }

        if (PuestoIds.Count > 0)
        {
            var pIds = PuestoIds.Distinct().ToList();
            await ctx.Puestos.Where(x => pIds.Contains(x.Id)).ExecuteDeleteAsync();
        }

        if (RolIds.Count > 0)
        {
            var rIds = RolIds.Distinct().ToList();
            await ctx.RolPermisos.Where(x => rIds.Contains(x.RolId)).ExecuteDeleteAsync();
            await ctx.Roles.Where(x => rIds.Contains(x.Id)).ExecuteDeleteAsync();
        }

        if (PermisoIds.Count > 0)
        {
            var perIds = PermisoIds.Distinct().ToList();
            await ctx.RolPermisos.Where(x => perIds.Contains(x.PermisoId)).ExecuteDeleteAsync();
            await ctx.Permisos.Where(x => perIds.Contains(x.Id)).ExecuteDeleteAsync();
        }

        if (TipoMantenimientoIds.Count > 0)
        {
            var tmIds = TipoMantenimientoIds.Distinct().ToList();
            await ctx.TiposMantenimiento.Where(x => tmIds.Contains(x.Id)).ExecuteDeleteAsync();
        }
        });
    }

    private static string GenerarSufijoAlfabetico(string hex)
        => new(hex.Select(c => c is >= '0' and <= '9' ? (char)('g' + (c - '0')) : c).ToArray());
}
