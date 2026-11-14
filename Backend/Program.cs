using Backend;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
var builder = WebApplication.CreateBuilder(args);

// CORS
var origenesPermitidos = (builder.Configuration["AllowedOrigins"]?.Split(',')
    ?? new[]
    {
        "http://localhost:5173",
        "http://localhost:3000",
        "https://transportes-rojas.vercel.app"
    })
    .Select(o => o.Trim().TrimEnd('/'))
    .Where(o => !string.IsNullOrEmpty(o))
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirReact", policy =>
    {
        policy.WithOrigins(origenesPermitidos)
              .AllowAnyHeader()
              .AllowAnyMethod();

    });
});


// Base de datos y servicios
builder.Services.AddDbContext<TransportesRojasDbContext>(options =>
    options.UseNpgsql(builder.Configuration["ConnectionStrings:Postgres"]));

builder.Services.AddDbContextFactory<TransportesRojasDbContext>(options =>
    options.UseNpgsql(builder.Configuration["ConnectionStrings:Postgres"]),
    ServiceLifetime.Scoped);


builder.Services.AddScoped<Backend.Services.RolService>();
builder.Services.AddScoped<Backend.Services.PuestoService>();
builder.Services.AddScoped<Backend.Services.PermisoService>();
builder.Services.AddScoped<Backend.Services.TipoMantenimientoService>();
builder.Services.AddScoped<Backend.Services.SucursalService>();
builder.Services.AddScoped<Backend.Services.ClienteService>();
builder.Services.AddScoped<Backend.Services.EmpleadoService>();
builder.Services.AddScoped<Backend.Services.FlotillaService>();
builder.Services.AddScoped<Backend.Services.UnidadService>();
builder.Services.AddScoped<Backend.Services.UsuarioService>();
builder.Services.AddScoped<Backend.Services.CatalogoGeograficoService>();
builder.Services.AddScoped<Backend.Services.EnvioService>();
builder.Services.AddScoped<Backend.Services.JwtService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<Backend.Services.IEmailService, Backend.Services.SmtpEmailService>();
builder.Services.AddSingleton<Backend.Services.ITokenRevocationService, Backend.Services.TokenRevocationService>();

builder.Services.AddValidatorsFromAssemblyContaining<Program>();


// Autenticación JWT
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "TransportesRojasBackend";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "TransportesRojasApp";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme =
        Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme =
        Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
            System.Text.Encoding.UTF8.GetBytes(jwtKey!)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
    options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
    {
        OnTokenValidated = context =>
        {
            var revocationService = context.HttpContext.RequestServices.GetRequiredService<Backend.Services.ITokenRevocationService>();
            var jti = context.Principal?.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)?.Value;
            if (!string.IsNullOrEmpty(jti) && revocationService.EstaRevocado(jti))
            {
                context.Fail("La sesión ha sido revocada en el servidor.");
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// Controladores y validación
builder.Services.AddControllers(options =>
    {
        options.Filters.Add<Backend.Helpers.SanitizarErroresResultFilter>();
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var mensajes = context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage)
                    ? string.Empty
                    : e.ErrorMessage.Trim())
                .Where(m => !string.IsNullOrWhiteSpace(m)
                            && !Backend.Helpers.PostgresErrorHelper.EsTextoTecnico(m)
                            && !m.Contains("JSON", StringComparison.OrdinalIgnoreCase)
                            && !m.Contains("The input", StringComparison.OrdinalIgnoreCase)
                            && !m.Contains("is required", StringComparison.OrdinalIgnoreCase))
                .Distinct()
                .ToList();

            var mensajePrincipal = mensajes.FirstOrDefault()
                ?? "Verifica los datos ingresados; hay campos con formato incorrecto o incompletos.";

            return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new
            {
                mensaje = mensajePrincipal,
                errores = mensajes
            });
        };
    });
builder.Services.AddOpenApi();

var app = builder.Build();

// Ajustes de esquema y manejo global de errores
await using (var scope = app.Services.CreateAsyncScope())
{
    var ctx = scope.ServiceProvider.GetRequiredService<Backend.TransportesRojasDbContext>();
    try
    {
        await ctx.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE cliente ADD COLUMN IF NOT EXISTS motivo_edicion TEXT;
            DROP TABLE IF EXISTS cita_recoleccion CASCADE;
            ALTER TABLE envio DROP COLUMN IF EXISTS requiere_recoleccion CASCADE;
            ALTER TABLE sucursal_cobertura DROP COLUMN IF EXISTS aplica_recoleccion CASCADE;
        ");
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Aviso al ejecutar migración inicial de recolección/cliente.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.UseCors("PermitirReact");
    errorApp.Run(async context =>
    {
        var exceptionFeature =
            context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        var exception = exceptionFeature?.Error;

        if (exception is not null)
        {
            app.Logger.LogError(
                exception,
                "Error no controlado al procesar {Method} {Path}",
                context.Request.Method,
                context.Request.Path);
        }

        var (statusCode, mensajeAmigable) = exception is not null
            ? Backend.Helpers.PostgresErrorHelper.ResolverErrorHttp(exception)
            : (StatusCodes.Status500InternalServerError,
                Backend.Helpers.PostgresErrorHelper.MensajeGenericoServidor);

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json; charset=utf-8";
        await context.Response.WriteAsJsonAsync(new { mensaje = mensajeAmigable });
    });
});

// Middleware y rutas
app.UseCors("PermitirReact");
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program { }