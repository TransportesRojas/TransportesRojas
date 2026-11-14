using System.Security.Claims;
using Backend.Exceptions;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsuarioController : ControllerBase
{
    private readonly UsuarioService _usuarioService;

    public UsuarioController(UsuarioService usuarioService)
    {
        _usuarioService = usuarioService;
    }

    [HttpGet]
    [Authorize(Roles = "RH, Personal administrativo, Jefe")]
    public async Task<IActionResult> ObtenerTodos([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        var usuarios = await _usuarioService.GetUsuariosAsync(skip, take);
        return Ok(usuarios);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "RH, Personal administrativo, Chofer, Jefe")]
    public async Task<IActionResult> ObtenerPorId(long id)
    {
        if (User.IsInRole("Chofer") && !User.IsInRole("RH") && !User.IsInRole("Personal administrativo"))
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                ?? User.FindFirst("usuario_id")?.Value;
            if (currentUserId != id.ToString())
                return Forbid();
        }

        var usuario = await _usuarioService.GetUsuarioByIdAsync(id);
        if (usuario is null)
            return NotFound(new { mensaje = $"No se encontró el usuario con Id {id}" });
        return Ok(usuario);
    }

    [HttpPost]
    [Authorize(Roles = "RH, Personal administrativo, Jefe")]
    public async Task<IActionResult> Crear([FromBody] CrearUsuarioModel model)
    {
        if (User.IsInRole("Personal administrativo") && !User.IsInRole("RH"))
        {
            if (!string.Equals(model.TipoUsuario, "Cliente", StringComparison.OrdinalIgnoreCase))
                return Forbid();
        }

        try
        {
            var usuario = await _usuarioService.CreateUsuarioAsync(model);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = usuario.Id }, usuario);
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("Tipo de usuario inválido"))
                return BadRequest(new { mensaje = ex.Message });
            return Conflict(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new { mensaje = "No se pudo completar la operación tras múltiples intentos." });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "RH, Personal administrativo, Chofer, Jefe")]
    public async Task<IActionResult> Actualizar(long id, [FromBody] ActualizarUsuarioModel model)
    {
        if (User.IsInRole("Chofer") && !User.IsInRole("RH") && !User.IsInRole("Personal administrativo"))
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                                ?? User.FindFirst("usuario_id")?.Value;
            if (currentUserId != id.ToString())
                return Forbid();
        }

        try
        {
            var actualizado = await _usuarioService.UpdateUsuarioAsync(id, model);
            if (!actualizado)
                return NotFound(new { mensaje = $"No se encontró el usuario con Id {id}" });
            
            var usuario = await _usuarioService.GetUsuarioByIdAsync(id);
            return Ok(usuario);
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("Tipo de usuario inválido"))
                return BadRequest(new { mensaje = ex.Message });
            return Conflict(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new { mensaje = "No se pudo completar la operación tras múltiples intentos." });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "RH, Personal administrativo, Jefe")]
    public async Task<IActionResult> Eliminar(long id)
    {
        try
        {
            var eliminado = await _usuarioService.DeleteUsuarioAsync(id);
            if (!eliminado)
                return NotFound(new { mensaje = $"No se encontró el usuario con Id {id}" });
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new { mensaje = "No se pudo completar la operación tras múltiples intentos." });
        }
    }

    [HttpPost("cambiar-password")]
    public async Task<IActionResult> CambiarPassword([FromBody] CambiarPasswordModel model)
    {
        if (model is null || string.IsNullOrWhiteSpace(model.PasswordActual) || string.IsNullOrWhiteSpace(model.PasswordNueva))
            return BadRequest(new { mensaje = "Debe proporcionar la contraseña actual y la nueva contraseña." });

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

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("usuario_id")?.Value;
        if (!long.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { mensaje = "No se pudo identificar la sesión del usuario." });

        try
        {
            var resultado = await _usuarioService.CambiarPasswordAsync(userId, model.PasswordActual, model.PasswordNueva);
            if (!resultado)
                return NotFound(new { mensaje = "No se encontró el usuario." });

            return Ok(new { mensaje = "Contraseña actualizada exitosamente." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new { mensaje = "No se pudo completar la operación tras múltiples intentos." });
        }
    }
}
