using Backend.Exceptions;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UnidadController : ControllerBase
{
    private readonly UnidadService _unidadService;

    public UnidadController(UnidadService unidadService)
    {
        _unidadService = unidadService;
    }

    [HttpGet]
    [Authorize(Roles = "Supervisor, RH, Jefe de flotilla")]
    public async Task<IActionResult> ObtenerTodos([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        var unidades = await _unidadService.GetUnidadesAsync(skip, take);
        return Ok(unidades);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Supervisor, RH, Jefe de flotilla, Chofer")]
    public async Task<IActionResult> ObtenerPorId(long id)
    {
        var unidad = await _unidadService.GetUnidadByIdAsync(id);
        if (unidad is null)
            return NotFound(new { mensaje = $"No se encontró la unidad con Id {id}" });
        return Ok(unidad);
    }

    [HttpPost]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> Crear([FromBody] CrearUnidadModel model)
    {
        try
        {
            var unidad = await _unidadService.CreateUnidadAsync(model);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = unidad.Id }, unidad);
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
    public async Task<IActionResult> Actualizar(long id, [FromBody] ActualizarUnidadModel model)
    {
        try
        {
            var actualizado = await _unidadService.UpdateUnidadAsync(id, model);
            if (!actualizado)
                return NotFound(new { mensaje = $"No se encontró la unidad con Id {id}" });
            
            var unidad = await _unidadService.GetUnidadByIdAsync(id);
            return Ok(unidad);
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
            var eliminado = await _unidadService.DeleteUnidadAsync(id);
            if (!eliminado)
                return NotFound(new { mensaje = $"No se encontró la unidad con Id {id}" });
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
