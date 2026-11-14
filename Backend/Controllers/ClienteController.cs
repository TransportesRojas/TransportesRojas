using Backend.Exceptions;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClienteController : ControllerBase
{
    private readonly ClienteService _clienteService;

    public ClienteController(ClienteService clienteService)
    {
        _clienteService = clienteService;
    }

    [HttpGet]
    [Authorize(Roles = "Personal administrativo, Jefe")]
    public async Task<IActionResult> ObtenerTodos([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        var clientes = await _clienteService.GetClientesAsync(skip, take);
        return Ok(clientes);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Personal administrativo, Jefe")]
    public async Task<IActionResult> ObtenerPorId(long id)
    {
        var cliente = await _clienteService.GetClienteByIdAsync(id);
        if (cliente is null)
            return NotFound(new { mensaje = $"No se encontró el cliente con Id {id}" });
        return Ok(cliente);
    }

    [HttpPost]
    [Authorize(Roles = "Personal administrativo, Jefe")]
    public async Task<IActionResult> Crear([FromBody] CrearClienteModel model)
    {
        try
        {
            var cliente = await _clienteService.CreateClienteAsync(model);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = cliente.Id }, cliente);
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
    [Authorize(Roles = "Personal administrativo, Jefe")]
    public async Task<IActionResult> Actualizar(long id, [FromBody] ActualizarClienteModel model)
    {
        try
        {
            var actualizado = await _clienteService.UpdateClienteAsync(id, model);
            if (!actualizado)
                return NotFound(new { mensaje = $"No se encontró el cliente con Id {id}" });
            var cliente = await _clienteService.GetClienteByIdAsync(id);
            return Ok(cliente);
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
    [Authorize(Roles = "Personal administrativo, Jefe")]
    public async Task<IActionResult> Eliminar(long id, [FromQuery] string? motivo = null)
    {
        try
        {
            var eliminado = await _clienteService.DeleteClienteAsync(id, motivo);
            if (!eliminado)
                return NotFound(new { mensaje = $"No se encontró el cliente con Id {id}" });
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
