using Backend.Exceptions;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TipoMantenimientoController : ControllerBase
{
    private readonly TipoMantenimientoService _tipoService;

    public TipoMantenimientoController(TipoMantenimientoService tipoService)
    {
        _tipoService = tipoService;
    }

    [HttpGet]
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> ObtenerTodos([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        var tipos = await _tipoService.GetTiposAsync(skip, take);
        return Ok(tipos);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> ObtenerPorId(long id)
    {
        var tipo = await _tipoService.GetTipoByIdAsync(id);
        if (tipo is null)
            return NotFound(new { mensaje = $"No se encontró el tipo de mantenimiento con Id {id}." });
        return Ok(tipo);
    }

    [HttpPost]
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> Crear([FromBody] CrearTipoMantenimientoModel model)
    {
        try
        {
            var tipo = await _tipoService.CreateTipoAsync(model);
            return CreatedAtAction(
                nameof(ObtenerPorId),
                new { id = tipo.Id },
                tipo);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new
            {
                mensaje = "No se pudo completar la operación tras múltiples intentos " +
                          "debido a conflictos de concurrencia. Intente nuevamente."
            });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> Actualizar(long id, [FromBody] ActualizarTipoMantenimientoModel model)
    {
        try
        {
            var actualizado = await _tipoService.UpdateTipoAsync(id, model);
            if (!actualizado)
                return NotFound(new { mensaje = $"No se encontró el tipo de mantenimiento con Id {id}." });
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
                mensaje = "No se pudo completar la operación tras múltiples intentos " +
                          "debido a conflictos de concurrencia. Intente nuevamente."
            });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> Eliminar(long id)
    {
        try
        {
            var eliminado = await _tipoService.DeleteTipoAsync(id);
            if (!eliminado)
                return NotFound(new { mensaje = $"No se encontró el tipo de mantenimiento con Id {id}." });
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
                mensaje = "No se pudo completar la operación tras múltiples intentos " +
                          "debido a conflictos de concurrencia. Intente nuevamente."
            });
        }
    }
}
