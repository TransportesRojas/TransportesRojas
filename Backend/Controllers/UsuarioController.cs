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
    [Authorize(Roles = "RH, Personal administrativo")]
    public async Task<IActionResult> ObtenerTodos([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        var usuarios = await _usuarioService.GetUsuariosAsync(skip, take);
        return Ok(usuarios);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "RH, Personal administrativo, Chofer")]
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
    [Authorize(Roles = "RH, Personal administrativo")]
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
    [Authorize(Roles = "RH, Personal administrativo, Chofer")]
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
    [Authorize(Roles = "RH, Personal administrativo")]
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
}
