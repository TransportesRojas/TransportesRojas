using Backend.Exceptions;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FlotillaController : ControllerBase
{
    private readonly FlotillaService _flotillaService;

    public FlotillaController(FlotillaService flotillaService)
    {
        _flotillaService = flotillaService;
    }

    [HttpGet]
    [Authorize(Roles = "Supervisor, RH, Jefe de flotilla")]
    public async Task<IActionResult> ObtenerTodos([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        var flotillas = await _flotillaService.GetFlotillasAsync(skip, take);
        return Ok(flotillas);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Supervisor, RH, Jefe de flotilla")]
    public async Task<IActionResult> ObtenerPorId(long id)
    {
        var flotilla = await _flotillaService.GetFlotillaByIdAsync(id);
        if (flotilla is null)
            return NotFound(new { mensaje = $"No se encontró la flotilla con Id {id}" });
        return Ok(flotilla);
    }

    [HttpPost]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> Crear([FromBody] CrearFlotillaModel model)
    {
        try
        {
            var flotilla = await _flotillaService.CreateFlotillaAsync(model);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = flotilla.Id }, flotilla);
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

    [HttpPut("{id}")]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> Actualizar(long id, [FromBody] ActualizarFlotillaModel model)
    {
        try
        {
            var actualizado = await _flotillaService.UpdateFlotillaAsync(id, model);
            if (!actualizado)
                return NotFound(new { mensaje = $"No se encontró la flotilla con Id {id}" });
            
            var flotilla = await _flotillaService.GetFlotillaByIdAsync(id);
            return Ok(flotilla);
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

    [HttpDelete("{id}")]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> Eliminar(long id)
    {
        try
        {
            var eliminado = await _flotillaService.DeleteFlotillaAsync(id);
            if (!eliminado)
                return NotFound(new { mensaje = $"No se encontró la flotilla con Id {id}" });
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
