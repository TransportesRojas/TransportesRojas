using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Backend.BDFolder;
using Backend.Models;
using Backend.Services;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AutenticacionController(
    TransportesRojasDbContext contexto,
    IValidator<LoginClienteModel> validadorCliente,
    IValidator<LoginEmpleadoModel> validadorEmpleado,
    JwtService jwtService) : ControllerBase
{
    private readonly PasswordHasher<object> _passwordHasher = new();

    // Inicio de sesión

    [HttpPost("login-cliente")]
    public async Task<IActionResult> LoginCliente([FromBody] LoginClienteModel model)
    {
        if (model is null)
            return BadRequest(new { mensaje = "El cuerpo de la solicitud no puede estar vacío." });

        var validacion = await validadorCliente.ValidateAsync(model);
        if (!validacion.IsValid)
        {
            return BadRequest(new
            {
                mensaje = "Datos de entrada no válidos",
                errores = validacion.Errors.Select(e => e.ErrorMessage)
            });
        }

        var usuario = await contexto.Usuarios
            .Include(u => u.Cliente)
            .Include(u => u.UsuarioRoles)
                .ThenInclude(ur => ur.Rol)
                    .ThenInclude(r => r.RolPermisos)
                        .ThenInclude(rp => rp.Permiso)
            .FirstOrDefaultAsync(u => u.Email == model.Email);

        if (usuario is null)
            return Unauthorized(new { mensaje = "Usuario o contraseña incorrectos" });

        if (usuario.TipoUsuario != TipoUsuario.Cliente || usuario.Cliente is null)
            return Unauthorized(new { mensaje = "Usuario o contraseña incorrectos" });

        if (!usuario.Activo || !usuario.Cliente.Activo)
            return Unauthorized(new { mensaje = "Tu cuenta se encuentra pendiente de activación. Por favor revisa tu correo electrónico para activarla." });

        var resultado = _passwordHasher.VerifyHashedPassword(new { }, usuario.PasswordHash, model.Password);
        if (resultado == PasswordVerificationResult.Failed)
            return Unauthorized(new { mensaje = "Usuario o contraseña incorrectos" });

        bool requiereCambio = usuario.UltimoAcceso == null;
        if (!requiereCambio)
        {
            usuario.UltimoAcceso = DateTimeOffset.UtcNow;
            await contexto.SaveChangesAsync();
        }

        var nombreCompleto = $"{usuario.Cliente.Nombre} {usuario.Cliente.ApellidoPaterno} {usuario.Cliente.ApellidoMaterno}".Trim();
        if (string.IsNullOrWhiteSpace(nombreCompleto))
            nombreCompleto = usuario.Email;

        var roles = usuario.UsuarioRoles
            .Select(ur => ur.Rol.Nombre)
            .Distinct()
            .ToList();

        if (roles.Count == 0)
        {
            roles.Add("Cliente");
        }

        var permisos = usuario.UsuarioRoles
            .SelectMany(ur => ur.Rol.RolPermisos)
            .Select(rp => rp.Permiso.Codigo)
            .Distinct()
            .ToList();

        var token = jwtService.GenerarTokenCliente(
            usuario,
            usuario.Cliente,
            roles,
            permisos
        );

        return Ok(new LoginResponse(
            usuario.Id,
            usuario.Email,
            usuario.TipoUsuario.ToString(),
            nombreCompleto,
            usuario.Cliente.Id,
            token,
            roles,
            permisos,
            null,
            null,
            requiereCambio
        ));
    }

    [HttpPost("login-empleado")]
    public async Task<IActionResult> LoginEmpleado([FromBody] LoginEmpleadoModel model)
    {
        if (model is null)
            return BadRequest(new { mensaje = "El cuerpo de la solicitud no puede estar vacío." });

        var validacion = await validadorEmpleado.ValidateAsync(model);
        if (!validacion.IsValid)
        {
            return BadRequest(new
            {
                mensaje = "Datos de entrada no válidos",
                errores = validacion.Errors.Select(e => e.ErrorMessage)
            });
        }

        var empleado = await contexto.Empleados
            .Include(e => e.Usuario)
                .ThenInclude(u => u.UsuarioRoles)
                    .ThenInclude(ur => ur.Rol)
                        .ThenInclude(r => r.RolPermisos)
                            .ThenInclude(rp => rp.Permiso)
            .Include(e => e.Sucursal)
            .Include(e => e.PuestoHistorial)
                .ThenInclude(ph => ph.Puesto)
            .FirstOrDefaultAsync(e => e.Id == model.EmpleadoId);

        if (empleado is null || empleado.Usuario is null)
            return Unauthorized(new { mensaje = "Credenciales incorrectas" });

        if (!empleado.Activo || !empleado.Usuario.Activo)
            return Unauthorized(new { mensaje = "El acceso de esta cuenta está restringido o suspendido." });

        var resultado = _passwordHasher.VerifyHashedPassword(new { }, empleado.Usuario.PasswordHash, model.Password);
        if (resultado == PasswordVerificationResult.Failed)
            return Unauthorized(new { mensaje = "Credenciales incorrectas" });

        bool requiereCambio = empleado.Usuario.UltimoAcceso == null;
        if (!requiereCambio)
        {
            empleado.Usuario.UltimoAcceso = DateTimeOffset.UtcNow;
            await contexto.SaveChangesAsync();
        }

        var nombreCompleto = $"{empleado.Nombre} {empleado.ApellidoPaterno} {empleado.ApellidoMaterno}".Trim();
        if (string.IsNullOrWhiteSpace(nombreCompleto))
            nombreCompleto = empleado.Usuario.Email;

        var roles = empleado.Usuario.UsuarioRoles
            .Select(ur => ur.Rol.Nombre)
            .Distinct()
            .ToList();

        var permisos = empleado.Usuario.UsuarioRoles
            .SelectMany(ur => ur.Rol.RolPermisos)
            .Select(rp => rp.Permiso.Codigo)
            .Distinct()
            .ToList();

        var puestoActual = empleado.PuestoHistorial
            .Where(ph => ph.FechaFin == null)
            .OrderByDescending(ph => ph.FechaInicio)
            .Select(ph => ph.Puesto.Nombre)
            .FirstOrDefault();

        var token = jwtService.GenerarTokenEmpleado(
            empleado.Usuario,
            empleado,
            roles,
            permisos,
            puestoActual
        );

        return Ok(new LoginResponse(
            empleado.Usuario.Id,
            empleado.Usuario.Email,
            empleado.Usuario.TipoUsuario.ToString(),
            nombreCompleto,
            empleado.Id,
            token,
            roles,
            permisos,
            puestoActual,
            empleado.Sucursal?.Nombre,
            requiereCambio,
            empleado.SucursalId
        ));
    }

    // Contraseña, cierre de sesión y activación

    [HttpPost("cambiar-password-inicial")]
    [Authorize]
    public async Task<IActionResult> CambiarPasswordInicial([FromBody] CambiarPasswordInicialModel model)
    {
        if (model is null)
            return BadRequest(new { mensaje = "El cuerpo de la solicitud no puede estar vacío." });

        var claimUsuarioId = User.FindFirst("usuario_id")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!long.TryParse(claimUsuarioId, out var usuarioId))
            return Unauthorized(new { mensaje = "Usuario no identificado en la sesión." });

        var usuario = await contexto.Usuarios.FindAsync(usuarioId);
        if (usuario is null)
            return NotFound(new { mensaje = "Usuario no encontrado." });

        var verificacion = _passwordHasher.VerifyHashedPassword(new { }, usuario.PasswordHash, model.PasswordActual);
        if (verificacion == PasswordVerificationResult.Failed)
            return BadRequest(new { mensaje = "La contraseña actual es incorrecta." });

        if (string.IsNullOrWhiteSpace(model.PasswordNueva) || model.PasswordNueva.Length < 12)
            return BadRequest(new { mensaje = "La nueva contraseña debe tener al menos 12 caracteres." });

        var mayusculas = model.PasswordNueva.Count(char.IsUpper);
        if (mayusculas < 2)
            return BadRequest(new { mensaje = "La nueva contraseña debe contener al menos 2 letras mayúsculas." });

        if (System.Text.RegularExpressions.Regex.IsMatch(model.PasswordNueva, @"[A-Z]{2}"))
            return BadRequest(new { mensaje = "Las letras mayúsculas no deben ser consecutivas (deben estar separadas)." });

        var minusculas = model.PasswordNueva.Count(char.IsLower);
        if (minusculas < 2)
            return BadRequest(new { mensaje = "La nueva contraseña debe contener al menos 2 letras minúsculas." });

        if (!model.PasswordNueva.Any(char.IsDigit))
            return BadRequest(new { mensaje = "La nueva contraseña debe contener al menos un número." });

        if (!System.Text.RegularExpressions.Regex.IsMatch(model.PasswordNueva, @"[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?~`]"))
            return BadRequest(new { mensaje = "La nueva contraseña debe contener al menos un carácter especial o símbolo (!, @, #, $, etc.)." });

        if (model.PasswordNueva == model.PasswordActual)
            return BadRequest(new { mensaje = "La nueva contraseña no puede ser idéntica a la anterior." });

        usuario.PasswordHash = _passwordHasher.HashPassword(new { }, model.PasswordNueva);
        usuario.UltimoAcceso = DateTimeOffset.UtcNow;
        usuario.UpdatedAt = DateTimeOffset.UtcNow;

        await contexto.SaveChangesAsync();
        return Ok(new { mensaje = "Contraseña actualizada exitosamente." });
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout([FromServices] ITokenRevocationService revocationService)
    {
        var jti = User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        if (!string.IsNullOrEmpty(jti))
        {
            revocationService.RevocarToken(jti, DateTimeOffset.UtcNow.AddHours(8));
        }
        return Ok(new { mensaje = "Sesión finalizada exitosamente en el servidor." });
    }

    [HttpPost("activar-cuenta")]
    public async Task<IActionResult> ActivarCuenta(
        [FromBody] ActivarCuentaModel model,
        [FromServices] TransportesRojasDbContext contexto,
        [FromServices] JwtService jwtService)
    {
        if (model is null || string.IsNullOrWhiteSpace(model.Token))
            return BadRequest(new { mensaje = "El token de activación es requerido." });

        var (valido, usuarioId, email) = jwtService.ValidarTokenActivacion(model.Token);
        if (!valido || usuarioId <= 0)
        {
            return BadRequest(new { mensaje = "El enlace de activación no es válido o ha expirado (vigencia de 48 horas)." });
        }

        var usuario = await contexto.Usuarios
            .Include(u => u.Cliente)
            .FirstOrDefaultAsync(u => u.Id == usuarioId);

        if (usuario is null)
            return NotFound(new { mensaje = "No se encontró el usuario asociado a este enlace de activación." });

        if (usuario.Activo && (usuario.Cliente == null || usuario.Cliente.Activo))
        {
            return Ok(new { mensaje = "Tu cuenta ya se encuentra activa. Puedes iniciar sesión.", yaActiva = true, exito = true });
        }

        usuario.Activo = true;
        usuario.UpdatedAt = DateTimeOffset.UtcNow;
        if (usuario.Cliente != null)
        {
            usuario.Cliente.Activo = true;
            usuario.Cliente.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await contexto.SaveChangesAsync();

        return Ok(new { mensaje = "¡Tu cuenta ha sido activada exitosamente! Ya puedes iniciar sesión.", exito = true });
    }
}
