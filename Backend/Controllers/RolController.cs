using Backend.Exceptions;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "RH, Jefe")]
public class RolController : ControllerBase
{
    private readonly RolService _rolService;

    public RolController(RolService rolService)
    {
        _rolService = rolService;
    }

    [HttpGet]
    public async Task<IActionResult> ObtenerTodos([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        var roles = await _rolService.GetRolesAsync(skip, take);
        return Ok(roles);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> ObtenerPorId(long id)
    {
        var rol = await _rolService.GetRolByIdAsync(id);
        if (rol is null)
            return NotFound(new { mensaje = $"No se encontró el rol con Id {id}." });
        return Ok(rol);
    }

    [HttpGet("{id}/permisos")]
    public async Task<IActionResult> ObtenerPermisos(long id)
    {
        var rol = await _rolService.GetRolByIdAsync(id);
        if (rol is null)
            return NotFound(new { mensaje = $"No se encontró el rol con Id {id}." });

        var permisos = await _rolService.GetPermisosConEstadoParaRolAsync(id);
        return Ok(permisos);
    }

    [HttpPut("{id}/permisos")]
    public async Task<IActionResult> AsignarPermisos(long id, [FromBody] AsignarPermisosRolModel model)
    {
        if (await EsModificacionBloqueadaParaUsuarioAsync(id))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = "Recursos Humanos no tiene permitido modificar permisos ni datos de los roles RH ni Jefe." });
        }

        try
        {
            var actualizado = await _rolService.AsignarPermisosAsync(id, model.PermisoIds);
            if (!actualizado)
                return NotFound(new { mensaje = $"No se encontró el rol con Id {id}." });

            var permisosActuales = await _rolService.GetPermisosPorRolAsync(id);
            return Ok(new { mensaje = "Permisos asignados con éxito", permisos = permisosActuales });
        }
        catch (RetryableException)
        {
            return Conflict(new
            {
                mensaje = "No se pudo completar la operación tras múltiples intentos debido a conflictos de concurrencia."
            });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearRolModel model)
    {
        try
        {
            var rol = await _rolService.CreateRolAsync(model);
            return CreatedAtAction(
                nameof(ObtenerPorId),
                new { id = rol.Id },
                rol);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new
            {
                mensaje = "No se pudo completar la operación tras múltiples intentos debido a conflictos de concurrencia."
            });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Actualizar(long id, [FromBody] ActualizarRolModel model)
    {
        if (await EsModificacionBloqueadaParaUsuarioAsync(id))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = "Recursos Humanos no tiene permitido modificar permisos ni datos de los roles RH ni Jefe." });
        }

        try
        {
            var actualizado = await _rolService.UpdateRolAsync(id, model);
            if (!actualizado)
                return NotFound(new { mensaje = $"No se encontró el rol con Id {id}." });
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new
            {
                mensaje = "No se pudo completar la operación tras múltiples intentos debido a conflictos de concurrencia."
            });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Eliminar(long id)
    {
        if (await EsModificacionBloqueadaParaUsuarioAsync(id))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = "Recursos Humanos no tiene permitido modificar permisos ni datos de los roles RH ni Jefe." });
        }

        try
        {
            var eliminado = await _rolService.DeleteRolAsync(id);
            if (!eliminado)
                return NotFound(new { mensaje = $"No se encontró el rol con Id {id}." });
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new
            {
                mensaje = "No se pudo completar la operación tras múltiples intentos debido a conflictos de concurrencia."
            });
        }
    }

    private async Task<bool> EsModificacionBloqueadaParaUsuarioAsync(long rolId)
    {
        var esSoloRH = User.IsInRole("RH") && !User.IsInRole("Jefe");
        if (!esSoloRH) return false;

        var rol = await _rolService.GetRolByIdAsync(rolId);
        if (rol is null) return false;

        var nombre = rol.Nombre?.Trim() ?? string.Empty;
        return string.Equals(nombre, "RH", StringComparison.OrdinalIgnoreCase)
            || string.Equals(nombre, "Jefe", StringComparison.OrdinalIgnoreCase);
    }
}