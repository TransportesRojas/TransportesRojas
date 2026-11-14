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

    // CRUD básico

    [HttpGet]
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> ObtenerTodos([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        var empleados = await _empleadoService.GetEmpleadosAsync(skip, take);
        return Ok(empleados);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> ObtenerPorId(long id)
    {
        var empleado = await _empleadoService.GetEmpleadoByIdAsync(id);
        if (empleado is null)
            return NotFound(new { mensaje = $"No se encontró el empleado con Id {id}" });
        return Ok(empleado);
    }

    [HttpPost]
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> Crear([FromBody] CrearEmpleadoCompleto model)
    {
        if (EsUsuarioSoloRH())
        {
            var rolesSolicitados = new List<long>();
            if (model.RolId.HasValue) rolesSolicitados.Add(model.RolId.Value);
            if (model.RolesAdicionalesIds != null) rolesSolicitados.AddRange(model.RolesAdicionalesIds);

            if (await _empleadoService.EsAsignacionRolPrivilegiadoAsync(model.PuestoId, rolesSolicitados))
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    new { mensaje = "Recursos Humanos no tiene permitido crear cuentas con rol o puesto de Jefe." });
            }
        }

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
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> Actualizar(long id, [FromBody] ActualizarEmpleadoCompleto model)
    {
        if (await EsModificacionJefeBloqueadaParaUsuarioAsync(id))
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = "Recursos Humanos no tiene permitido modificar ni alterar el registro de un empleado con rol o puesto de Jefe." });

        if (EsUsuarioSoloRH() && await _empleadoService.EsAsignacionRolPrivilegiadoAsync(model.PuestoId, model.RolesIds))
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = "Recursos Humanos no tiene permitido asignar roles o puestos de Jefe." });

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
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> Eliminar(long id)
    {
        if (await EsModificacionJefeBloqueadaParaUsuarioAsync(id))
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = "Recursos Humanos no tiene permitido modificar ni alterar el registro de un empleado con rol o puesto de Jefe." });

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

    // Acceso, puestos y expediente

    [HttpPost("{id}/suspender")]
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> SuspenderAcceso(long id, [FromBody] SuspenderEmpleadoModel model)
    {
        if (await EsModificacionJefeBloqueadaParaUsuarioAsync(id))
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = "Recursos Humanos no tiene permitido modificar ni alterar el registro de un empleado con rol o puesto de Jefe." });

        try
        {
            var claimUsuarioId = User.FindFirst("usuario_id")?.Value
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            long.TryParse(claimUsuarioId, out var registradoPorId);

            var resultado = await _empleadoService.SuspenderAccesoEmpleadoAsync(id, model?.Motivo ?? string.Empty, registradoPorId > 0 ? registradoPorId : null);
            return Ok(resultado);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensaje = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new { mensaje = "No se pudo completar la suspensión tras múltiples intentos." });
        }
    }

    [HttpPost("{id}/desactivar")]
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> DesactivarAcceso(long id, [FromBody] DesactivarEmpleadoModel model)
    {
        if (await EsModificacionJefeBloqueadaParaUsuarioAsync(id))
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = "Recursos Humanos no tiene permitido modificar ni alterar el registro de un empleado con rol o puesto de Jefe." });

        try
        {
            var claimUsuarioId = User.FindFirst("usuario_id")?.Value
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            long.TryParse(claimUsuarioId, out var registradoPorId);

            var resultado = await _empleadoService.DesactivarAccesoEmpleadoAsync(id, model?.Motivo ?? string.Empty, registradoPorId > 0 ? registradoPorId : null);
            return Ok(resultado);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensaje = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new { mensaje = "No se pudo completar la desactivación tras múltiples intentos." });
        }
    }

    [HttpPost("{id}/reactivar")]
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> ReactivarAcceso(long id, [FromBody] ReactivarEmpleadoModel model)
    {
        if (await EsModificacionJefeBloqueadaParaUsuarioAsync(id))
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = "Recursos Humanos no tiene permitido modificar ni alterar el registro de un empleado con rol o puesto de Jefe." });

        try
        {
            var claimUsuarioId = User.FindFirst("usuario_id")?.Value
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            long.TryParse(claimUsuarioId, out var registradoPorId);

            var resultado = await _empleadoService.ReactivarAccesoEmpleadoAsync(id, model?.Motivo ?? string.Empty, registradoPorId > 0 ? registradoPorId : null);
            return Ok(resultado);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensaje = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new { mensaje = "No se pudo completar la reactivación tras múltiples intentos." });
        }
    }

    [HttpPost("{id}/cambiar-puesto")]
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> CambiarPuesto(long id, [FromBody] CambiarPuestoModel model)
    {
        if (await EsModificacionJefeBloqueadaParaUsuarioAsync(id))
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = "Recursos Humanos no tiene permitido modificar ni alterar el registro de un empleado con rol o puesto de Jefe." });

        if (EsUsuarioSoloRH() && await _empleadoService.EsAsignacionRolPrivilegiadoAsync(model.NuevoPuestoId, null))
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = "Recursos Humanos no tiene permitido promover o reasignar a un puesto de Jefe." });

        try
        {
            var exito = await _empleadoService.CambiarPuestoAsync(id, model);
            if (!exito)
                return NotFound(new { mensaje = $"No se encontró el empleado con Id {id}" });

            var empleado = await _empleadoService.GetEmpleadoByIdAsync(id);
            return Ok(new { mensaje = "Puesto actualizado exitosamente", empleado });
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

    private bool EsUsuarioSoloRH() =>
        User.IsInRole("RH") && !User.IsInRole("Jefe");

    private async Task<bool> EsModificacionJefeBloqueadaParaUsuarioAsync(long empleadoId)
    {
        if (!EsUsuarioSoloRH()) return false;

        var emp = await _empleadoService.GetEmpleadoByIdAsync(empleadoId);
        if (emp is null) return false;

        bool esJefe = (emp.PuestoNombre != null && emp.PuestoNombre.Contains("Jefe", StringComparison.OrdinalIgnoreCase))
            || (emp.Roles != null && emp.Roles.Any(r => r.Equals("Jefe", StringComparison.OrdinalIgnoreCase)));

        return esJefe;
    }

    [HttpGet("{id}/puestos-historial")]
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> ObtenerHistorialPuestos(long id)
    {
        var historial = await _empleadoService.GetHistorialPuestosAsync(id);
        return Ok(historial);
    }

    [HttpGet("{id}/expediente")]
    [Authorize(Roles = "RH, Jefe")]
    public async Task<IActionResult> ObtenerExpediente(long id)
    {
        var expediente = await _empleadoService.GetExpedienteEmpleadoAsync(id);
        if (expediente is null)
            return NotFound(new { mensaje = $"No se encontró expediente para el empleado con Id {id}" });
        return Ok(expediente);
    }
}