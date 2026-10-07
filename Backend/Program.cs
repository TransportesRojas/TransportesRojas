using Backend;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
var builder = WebApplication.CreateBuilder(args);


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
builder.Services.AddScoped<Backend.Services.JwtService>();

builder.Services.AddValidatorsFromAssemblyContaining<Program>();


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
});

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("PermitirReact");
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program { }