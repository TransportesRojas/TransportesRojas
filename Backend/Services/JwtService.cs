namespace Backend.Services;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.BDFolder;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

public class JwtService(IConfiguration configuration)
{
    public string GenerarTokenEmpleado(
        Usuario usuario,
        Empleado empleado,
        IEnumerable<string> roles,
        IEnumerable<string> permisos,
        string? puesto = null)
    {
        var secretKey = ObtenerClaveSecreta();
        var issuer = configuration["Jwt:Issuer"] ?? "TransportesRojasBackend";
        var audience = configuration["Jwt:Audience"] ?? "TransportesRojasApp";
        var duracionHoras = configuration.GetValue<int>("Jwt:DuracionHoras", 8);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var nombreCompleto = $"{empleado.Nombre} {empleado.ApellidoPaterno} {empleado.ApellidoMaterno}".Trim();
        if (string.IsNullOrWhiteSpace(nombreCompleto))
            nombreCompleto = usuario.Email;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
            new("usuario_id", usuario.Id.ToString()),
            new("empleado_id", empleado.Id.ToString()),
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(ClaimTypes.Name, nombreCompleto),
            new(ClaimTypes.Email, usuario.Email),
            new("nombre", empleado.Nombre),
            new("apellidos", $"{empleado.ApellidoPaterno} {empleado.ApellidoMaterno}".Trim()),
            new("tipo_usuario", TipoUsuario.Empleado.ToString())
        };

        if (empleado.SucursalId.HasValue)
        {
            claims.Add(new Claim("sucursal_id", empleado.SucursalId.Value.ToString()));
            if (!string.IsNullOrWhiteSpace(empleado.Sucursal?.Nombre))
            {
                claims.Add(new Claim("sucursal_nombre", empleado.Sucursal.Nombre));
            }
        }

        if (!string.IsNullOrWhiteSpace(puesto))
        {
            claims.Add(new Claim("puesto", puesto));
        }

        foreach (var rol in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, rol));
            claims.Add(new Claim("rol", rol));
        }

        foreach (var permiso in permisos)
        {
            claims.Add(new Claim("permiso", permiso));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(duracionHoras),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = creds
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public string GenerarTokenCliente(
        Usuario usuario,
        Cliente cliente,
        IEnumerable<string>? roles = null,
        IEnumerable<string>? permisos = null)
    {
        var secretKey = ObtenerClaveSecreta();
        var issuer = configuration["Jwt:Issuer"] ?? "TransportesRojasBackend";
        var audience = configuration["Jwt:Audience"] ?? "TransportesRojasApp";
        var duracionHoras = configuration.GetValue<int>("Jwt:DuracionHoras", 8);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var nombreCompleto = $"{cliente.Nombre} {cliente.ApellidoPaterno} {cliente.ApellidoMaterno}".Trim();
        if (string.IsNullOrWhiteSpace(nombreCompleto))
            nombreCompleto = usuario.Email;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
            new("usuario_id", usuario.Id.ToString()),
            new("cliente_id", cliente.Id.ToString()),
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(ClaimTypes.Name, nombreCompleto),
            new(ClaimTypes.Email, usuario.Email),
            new("tipo_usuario", TipoUsuario.Cliente.ToString())
        };

        if (!string.IsNullOrWhiteSpace(cliente.Nombre))
            claims.Add(new Claim("nombre", cliente.Nombre));

        var apellidos = $"{cliente.ApellidoPaterno} {cliente.ApellidoMaterno}".Trim();
        if (!string.IsNullOrWhiteSpace(apellidos))
            claims.Add(new Claim("apellidos", apellidos));

        if (!string.IsNullOrWhiteSpace(cliente.Telefono))
            claims.Add(new Claim("telefono", cliente.Telefono));

        var listaRoles = roles?.ToList() ?? new List<string>();
        if (listaRoles.Count == 0)
        {
            listaRoles.Add("Cliente");
        }

        foreach (var rol in listaRoles)
        {
            claims.Add(new Claim(ClaimTypes.Role, rol));
            claims.Add(new Claim("rol", rol));
        }

        if (permisos is not null)
        {
            foreach (var permiso in permisos)
            {
                claims.Add(new Claim("permiso", permiso));
            }
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(duracionHoras),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = creds
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public string GenerarTokenActivacion(long usuarioId, string email)
    {
        var secretKey = ObtenerClaveSecreta();
        var issuer = configuration["Jwt:Issuer"] ?? "TransportesRojasBackend";
        var audience = configuration["Jwt:Audience"] ?? "TransportesRojasApp";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuarioId.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("usuario_id", usuarioId.ToString()),
            new(ClaimTypes.Email, email),
            new("proposito", "activacion_cuenta")
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(2),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = creds
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public (bool Valido, long UsuarioId, string Email) ValidarTokenActivacion(string token)
    {
        try
        {
            var secretKey = ObtenerClaveSecreta();
            var issuer = configuration["Jwt:Issuer"] ?? "TransportesRojasBackend";
            var audience = configuration["Jwt:Audience"] ?? "TransportesRojasApp";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));

            var tokenHandler = new JwtSecurityTokenHandler();
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(5)
            };

            var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
            var proposito = principal.FindFirst("proposito")?.Value;
            if (proposito != "activacion_cuenta")
                return (false, 0, string.Empty);

            var usuarioIdStr = principal.FindFirst("usuario_id")?.Value
                ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            var email = principal.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;

            if (long.TryParse(usuarioIdStr, out var usuarioId))
                return (true, usuarioId, email);

            return (false, 0, string.Empty);
        }
        catch
        {
            return (false, 0, string.Empty);
        }
    }

    private string ObtenerClaveSecreta()
    {
        var key = configuration["Jwt:Key"];
        if (!string.IsNullOrWhiteSpace(key))
            return key;

        var envKey = Environment.GetEnvironmentVariable("JWT_KEY")
            ?? Environment.GetEnvironmentVariable("JWT__KEY");

        if (!string.IsNullOrWhiteSpace(envKey))
            return envKey;

        throw new InvalidOperationException(
            "La clave secreta JWT no está configurada. Agrégala en el archivo .env como 'JWT_KEY=...' o en variables de entorno.");
    }
}
