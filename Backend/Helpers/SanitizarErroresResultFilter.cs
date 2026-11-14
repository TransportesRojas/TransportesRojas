using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Backend.Helpers;

public sealed class SanitizarErroresResultFilter(ILogger<SanitizarErroresResultFilter> logger)
    : IAlwaysRunResultFilter
{
    public void OnResultExecuting(ResultExecutingContext context)
    {
        if (context.Result is not ObjectResult objectResult)
            return;

        var statusCode = objectResult.StatusCode ?? StatusCodes.Status200OK;
        if (statusCode < 400 || objectResult.Value is null)
            return;

        if (objectResult.Value is string rawText)
        {
            if (PostgresErrorHelper.EsTextoTecnico(rawText))
            {
                logger.LogWarning("Mensaje técnico bloqueado en respuesta HTTP {Status}: {Texto}", statusCode, rawText);
                objectResult.Value = new
                {
                    mensaje = statusCode >= 500
                        ? PostgresErrorHelper.MensajeGenericoServidor
                        : "No se pudo completar la operación. Verifica los datos e intenta nuevamente."
                };
            }
            return;
        }

        var valueType = objectResult.Value.GetType();
        var propMensaje = valueType.GetProperty("mensaje") ?? valueType.GetProperty("Mensaje");
        if (propMensaje?.GetValue(objectResult.Value) is string mensaje
            && PostgresErrorHelper.EsTextoTecnico(mensaje))
        {
            logger.LogWarning("Detalle técnico bloqueado en respuesta HTTP {Status}: {Texto}", statusCode, mensaje);
            objectResult.Value = new
            {
                mensaje = statusCode >= 500
                    ? PostgresErrorHelper.MensajeGenericoServidor
                    : "No se pudo completar la operación por un problema con los datos enviados. Verifica tu información e intenta nuevamente."
            };
        }
    }

    public void OnResultExecuted(ResultExecutedContext context)
    {
    }
}

