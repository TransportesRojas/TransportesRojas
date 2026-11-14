using Backend.Exceptions;
using Backend.Helpers;
using Backend.Models;
using Backend.Services;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EnvioController : ControllerBase
{
    private readonly EnvioService _envioService;
    private readonly IValidator<CrearEnvioModel> _crearValidator;
    private readonly IValidator<RecepcionSucursalModel> _recepcionValidator;
    private readonly IValidator<AsignarFlotillaRutaModel> _asignarFlotillaValidator;
    private readonly IValidator<IniciarRutaEnvioModel> _iniciarRutaValidator;
    private readonly IValidator<ValidarEntregaModel> _validarEntregaValidator;
    private readonly IValidator<ReprogramarEnvioModel> _reprogramarValidator;
    private readonly IValidator<CancelarEnvioModel> _cancelarValidator;
    private readonly IValidator<RegistrarDevolucionModel> _devolucionValidator;

    public EnvioController(
        EnvioService envioService,
        IValidator<CrearEnvioModel> crearValidator,
        IValidator<RecepcionSucursalModel> recepcionValidator,
        IValidator<AsignarFlotillaRutaModel> asignarFlotillaValidator,
        IValidator<IniciarRutaEnvioModel> iniciarRutaValidator,
        IValidator<ValidarEntregaModel> validarEntregaValidator,
        IValidator<ReprogramarEnvioModel> reprogramarValidator,
        IValidator<CancelarEnvioModel> cancelarValidator,
        IValidator<RegistrarDevolucionModel> devolucionValidator)
    {
        _envioService = envioService;
        _crearValidator = crearValidator;
        _recepcionValidator = recepcionValidator;
        _asignarFlotillaValidator = asignarFlotillaValidator;
        _iniciarRutaValidator = iniciarRutaValidator;
        _validarEntregaValidator = validarEntregaValidator;
        _reprogramarValidator = reprogramarValidator;
        _cancelarValidator = cancelarValidator;
        _devolucionValidator = devolucionValidator;
    }

    // Consultas y rastreo

    [HttpGet]
    public async Task<IActionResult> ObtenerEnvios([FromQuery] FiltroEnviosQuery filtro)
    {
        try
        {
            var contexto = ClaimsUsuarioHelper.Extraer(User);
            var envios = await _envioService.GetEnviosPorContextoAsync(contexto, filtro);
            return Ok(envios);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
    }

    [HttpGet("recursos-asignacion")]
    public async Task<IActionResult> ObtenerRecursosAsignacion()
    {
        try
        {
            var contexto = ClaimsUsuarioHelper.Extraer(User);
            var recursos = await _envioService.ObtenerRecursosAsignacionAsync(contexto);
            return Ok(recursos);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = ex.Message });
        }
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> ObtenerPorId(long id)
    {
        try
        {
            var contexto = ClaimsUsuarioHelper.Extraer(User);
            var detalle = await _envioService.GetEnvioDetallePorContextoAsync(id, contexto);
            if (detalle is null)
                return NotFound(new { mensaje = "No se encontró el envío solicitado." });

            return Ok(detalle);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = ex.Message });
        }
    }

    [HttpGet("rastreo/{guia}")]
    [AllowAnonymous]
    public async Task<IActionResult> RastrearPorGuia(string guia)
    {
        if (string.IsNullOrWhiteSpace(guia))
            return BadRequest(new { mensaje = "Debes indicar un número de guía válido." });

        var rastreo = await _envioService.RastrearPorGuiaAsync(guia);
        if (rastreo is null)
            return NotFound(new { mensaje = $"No se encontró ningún envío con la guía '{guia.Trim().ToUpperInvariant()}'." });

        return Ok(rastreo);
    }

    // Documentación y recepción

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearEnvioModel model)
    {
        var errorValidacion = await ValidarModeloAsync(_crearValidator, model);
        if (errorValidacion is not null)
            return errorValidacion;

        try
        {
            var contexto = ClaimsUsuarioHelper.Extraer(User);
            var resultado = await _envioService.CrearEnvioAsync(model, contexto);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = resultado.Envio.Id }, resultado);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new { mensaje = "No se pudo completar el registro del envío tras múltiples intentos." });
        }
    }

    [HttpPost("{id:long}/confirmar-recoleccion")]
    public async Task<IActionResult> ConfirmarRecoleccion(long id, [FromBody] ConfirmarRecoleccionModel? model)
    {
        var dto = model ?? new ConfirmarRecoleccionModel();
        return await EjecutarOperacionAsync(ctx => _envioService.ConfirmarRecoleccionAsync(id, dto, ctx));
    }

    [HttpPost("{id:long}/recepcion")]
    public async Task<IActionResult> RegistrarRecepcion(long id, [FromBody] RecepcionSucursalModel model)
    {
        var errorValidacion = await ValidarModeloAsync(_recepcionValidator, model);
        if (errorValidacion is not null)
            return errorValidacion;

        return await EjecutarOperacionAsync(ctx => _envioService.RegistrarRecepcionSucursalAsync(id, model, ctx));
    }

    // Flotilla y planificación de rutas

    [HttpPost("{id:long}/asignar-flotilla")]
    public async Task<IActionResult> AsignarFlotilla(long id, [FromBody] AsignarFlotillaRutaModel model)
    {
        var errorValidacion = await ValidarModeloAsync(_asignarFlotillaValidator, model);
        if (errorValidacion is not null)
            return errorValidacion;

        return await EjecutarOperacionAsync(ctx => _envioService.AsignarFlotillaYRutaAsync(id, model, ctx));
    }

    [HttpPost("asignar-envios-flotilla")]
    public async Task<IActionResult> AsignarEnviosFlotilla([FromBody] AsignarEnviosFlotillaModel model)
    {
        if (model is null || model.EnvioIds == null || model.EnvioIds.Count == 0)
            return BadRequest(new { mensaje = "Debes seleccionar al menos un envío para asignar a la flotilla." });

        try
        {
            var contexto = ClaimsUsuarioHelper.Extraer(User);
            var cantidad = await _envioService.AsignarEnviosAFlotillaLoteAsync(model, contexto);
            return Ok(new { mensaje = $"{cantidad} envíos asignados a la flotilla exitosamente.", cantidad });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensaje = ex.Message });
        }
    }

    [HttpPost("planificar-ruta")]
    public async Task<IActionResult> PlanificarRuta([FromBody] PlanificarRutaConsolidadaModel model)
    {
        try
        {
            var contexto = ClaimsUsuarioHelper.Extraer(User);
            var resultado = await _envioService.PlanificarRutaConsolidadaAsync(model, contexto);
            return Ok(resultado);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensaje = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new { mensaje = "No se pudo completar la planificación de ruta tras múltiples intentos." });
        }
    }

    // Reparto, incidencias y cancelaciones

    [HttpPost("{id:long}/iniciar-ruta")]
    public async Task<IActionResult> IniciarRuta(long id, [FromBody] IniciarRutaEnvioModel? model)
    {
        var dto = model ?? new IniciarRutaEnvioModel();
        var errorValidacion = await ValidarModeloAsync(_iniciarRutaValidator, dto);
        if (errorValidacion is not null)
            return errorValidacion;

        return await EjecutarOperacionAsync(ctx => _envioService.IniciarRutaAsync(id, dto, ctx));
    }

    [HttpPost("{id:long}/validar-entrega")]
    public async Task<IActionResult> ValidarEntrega(long id, [FromBody] ValidarEntregaModel model)
    {
        var errorValidacion = await ValidarModeloAsync(_validarEntregaValidator, model);
        if (errorValidacion is not null)
            return errorValidacion;

        return await EjecutarOperacionAsync(ctx => _envioService.ValidarEntregaAsync(id, model, ctx));
    }

    [HttpPost("{id:long}/reprogramar")]
    public async Task<IActionResult> Reprogramar(long id, [FromBody] ReprogramarEnvioModel model)
    {
        var errorValidacion = await ValidarModeloAsync(_reprogramarValidator, model);
        if (errorValidacion is not null)
            return errorValidacion;

        return await EjecutarOperacionAsync(ctx => _envioService.ReprogramarEnvioAsync(id, model, ctx));
    }

    [HttpPost("{id:long}/cancelar")]
    public async Task<IActionResult> Cancelar(long id, [FromBody] CancelarEnvioModel model)
    {
        var errorValidacion = await ValidarModeloAsync(_cancelarValidator, model);
        if (errorValidacion is not null)
            return errorValidacion;

        return await EjecutarOperacionAsync(ctx => _envioService.CancelarEnvioAsync(id, model, ctx));
    }

    [HttpPost("{id:long}/devolucion")]
    public async Task<IActionResult> RegistrarDevolucion(long id, [FromBody] RegistrarDevolucionModel model)
    {
        var errorValidacion = await ValidarModeloAsync(_devolucionValidator, model);
        if (errorValidacion is not null)
            return errorValidacion;

        return await EjecutarOperacionAsync(ctx => _envioService.RegistrarDevolucionAsync(id, model, ctx));
    }

    [HttpPost("{id:long}/devolucion/confirmar")]
    public async Task<IActionResult> ConfirmarDevolucion(long id, [FromBody] ConfirmarDevolucionModel? model)
    {
        var dto = model ?? new ConfirmarDevolucionModel();
        return await EjecutarOperacionAsync(ctx => _envioService.ConfirmarDevolucionAsync(id, dto, ctx));
    }

    // Helpers

    private async Task<IActionResult?> ValidarModeloAsync<T>(IValidator<T> validator, T? model) where T : class
    {
        if (model is null)
            return BadRequest(new { mensaje = "El cuerpo de la solicitud no puede estar vacío." });

        var resultado = await validator.ValidateAsync(model);
        if (!resultado.IsValid)
        {
            return BadRequest(new
            {
                mensaje = "Datos de entrada no válidos.",
                errores = resultado.Errors.Select(e => e.ErrorMessage)
            });
        }

        return null;
    }

    private async Task<IActionResult> EjecutarOperacionAsync(
        Func<ContextoSeguridadUsuario, Task<EnvioDetalleResponse>> accion)
    {
        try
        {
            var contexto = ClaimsUsuarioHelper.Extraer(User);
            var respuesta = await accion(contexto);
            return Ok(respuesta);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensaje = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { mensaje = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { mensaje = ex.Message });
        }
        catch (RetryableException)
        {
            return Conflict(new { mensaje = "No se pudo completar la transición del envío tras múltiples intentos." });
        }
    }
}
