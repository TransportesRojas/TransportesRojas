using Backend.Exceptions;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmpleadoController : ControllerBase
{
    private readonly EmpleadoService _empleadoService;

    public EmpleadoController(EmpleadoService empleadoService)
    {
        _empleadoService = empleadoService;
    }

    [HttpGet]
    [Authorize(Roles = "RH, Supervisor, Jefe de flotilla")]
    public async Task<IActionResult> ObtenerTodos([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        var empleados = await _empleadoService.GetEmpleadosAsync(skip, take);
        return Ok(empleados);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "RH, Supervisor, Jefe de flotilla")]
    public async Task<IActionResult> ObtenerPorId(long id)
    {
        var empleado = await _empleadoService.GetEmpleadoByIdAsync(id);
        if (empleado is null)
            return NotFound(new { mensaje = $"No se encontró el empleado con Id {id}" });
        return Ok(empleado);
    }

    [HttpPost]
    [Authorize(Roles = "RH")]
    public async Task<IActionResult> Crear([FromBody] CrearEmpleadoCompleto model)
    {
        try
        {
            var empleado = await _empleadoService.CreateEmpleadoAsync(model);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = empleado.Id }, empleado);
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("No se encontró el usuario"))
                return NotFound(new { mensaje = ex.Message });
            return Conflict(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new { mensaje = "No se pudo completar la operación tras múltiples intentos." });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "RH")]
    public async Task<IActionResult> Actualizar(long id, [FromBody] ActualizarEmpleadoCompleto model)
    {
        try
        {
            var actualizado = await _empleadoService.UpdateEmpleadoAsync(id, model);
            if (!actualizado)
                return NotFound(new { mensaje = $"No se encontró el empleado con Id {id}" });
            
            var empleado = await _empleadoService.GetEmpleadoByIdAsync(id);
            return Ok(empleado);
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
    [Authorize(Roles = "RH")]
    public async Task<IActionResult> Eliminar(long id)
    {
        try
        {
            var eliminado = await _empleadoService.DeleteEmpleadoAsync(id);
            if (!eliminado)
                return NotFound(new { mensaje = $"No se encontró el empleado con Id {id}" });
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