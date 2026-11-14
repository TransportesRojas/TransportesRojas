using System.Data.Common;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Backend.Helpers;

public static class PostgresErrorHelper
{
    private const string SerializationFailureSqlState = "40001";

    public const string MensajeGenericoServidor =
        "Ocurrió un problema inesperado al procesar tu solicitud. Por favor, intenta nuevamente.";

    public const string MensajeBaseDatosNoDisponible =
        "El servicio no está disponible temporalmente. Por favor, intenta nuevamente en unos momentos.";

    private static readonly string[] PatronesTecnicos =
    [
        "postgres",
        "npgsql",
        "sqlstate",
        "dbupdate",
        "entityframework",
        "dbcontext",
        "system.",
        "microsoft.",
        "sequence contains",
        "nullable object must have a value",
        "a second operation was started",
        "transient failure",
        "connection string",
        "tcp provider",
        "socket",
        "timeout",
        "select \"",
        "insert into",
        "update \"",
        "delete from",
        "violates foreign key",
        "violates unique constraint",
        "duplicate key",
        "relation \"",
        "column \"",
        "constraint \"",
        "syntax error at",
        "value too long for type",
        "an exception has been raised",
        "an error occurred while saving the entity changes",
        "stack trace"
    ];

    public static bool IsSerializationFailure(Exception ex)
    {
        var pgEx = FindPostgresException(ex);
        return pgEx is not null && pgEx.SqlState == SerializationFailureSqlState;
    }

    public static PostgresException? FindPostgresException(Exception? ex)
    {
        var current = ex;
        while (current is not null)
        {
            if (current is PostgresException pgEx)
            {
                return pgEx;
            }

            if (current is AggregateException agg)
            {
                foreach (var inner in agg.InnerExceptions)
                {
                    var found = FindPostgresException(inner);
                    if (found is not null)
                        return found;
                }
            }

            current = current.InnerException;
        }

        return null;
    }

    public static (int StatusCode, string Mensaje) ResolverErrorHttp(Exception ex)
    {
        var pgEx = FindPostgresException(ex);
        if (pgEx is not null)
        {
            return MapearPostgresSqlState(pgEx.SqlState);
        }

        if (ContieneExcepcion<DbUpdateConcurrencyException>(ex))
        {
            return (StatusCodes.Status409Conflict,
                "El registro fue modificado por otro usuario al mismo tiempo. Recarga la información e intenta nuevamente.");
        }

        if (ContieneExcepcion<DbUpdateException>(ex))
        {
            return (StatusCodes.Status409Conflict,
                "No se pudieron guardar los cambios porque existen datos duplicados o relacionados con otro registro.");
        }

        if (ContieneExcepcion<NpgsqlException>(ex)
            || ContieneExcepcion<DbException>(ex)
            || ContieneExcepcion<TimeoutException>(ex))
        {
            return (StatusCodes.Status503ServiceUnavailable, MensajeBaseDatosNoDisponible);
        }

        if (ContieneExcepcion<JsonException>(ex))
        {
            return (StatusCodes.Status400BadRequest,
                "El formato de los datos enviados no es válido. Verifica la información e intenta nuevamente.");
        }

        if (ContieneExcepcion<OperationCanceledException>(ex))
        {
            return (StatusCodes.Status408RequestTimeout,
                "La solicitud tardó demasiado en responder. Por favor, intenta nuevamente.");
        }

        if (ex is ArgumentException)
        {
            return (StatusCodes.Status400BadRequest,
                ObtenerMensajeSeguro(ex, "Verifica los datos ingresados; hay campos con formato incorrecto."));
        }

        return (StatusCodes.Status500InternalServerError, MensajeGenericoServidor);
    }

    public static string ObtenerMensajeSeguro(Exception ex, string respaldo = MensajeGenericoServidor)
    {
        var pgEx = FindPostgresException(ex);
        if (pgEx is not null)
        {
            return MapearPostgresSqlState(pgEx.SqlState).Mensaje;
        }

        if (ex is DbUpdateException || ex is NpgsqlException || ex is DbException)
        {
            return ResolverErrorHttp(ex).Mensaje;
        }

        var msg = ex.Message?.Trim();
        if (string.IsNullOrWhiteSpace(msg))
            return respaldo;

        var origen = ex.Source;
        if (!string.IsNullOrWhiteSpace(origen)
            && !origen.StartsWith("Backend", StringComparison.OrdinalIgnoreCase))
        {
            return respaldo;
        }

        if (EsTextoTecnico(msg))
            return respaldo;

        return msg.Length > 240 ? respaldo : msg;
    }

    public static bool EsTextoTecnico(string? texto)
    {
        if (string.IsNullOrWhiteSpace(texto))
            return false;

        var lower = texto.ToLowerInvariant();
        foreach (var patron in PatronesTecnicos)
        {
            if (lower.Contains(patron, StringComparison.Ordinal))
                return true;
        }

        return texto.Contains('\n') && texto.Length > 180;
    }

    private static (int StatusCode, string Mensaje) MapearPostgresSqlState(string? sqlState) =>
        sqlState switch
        {
            "23505" => (StatusCodes.Status409Conflict,
                "Ya existe un registro con esos datos únicos. Verifica la información e intenta de nuevo."),
            "23503" => (StatusCodes.Status409Conflict,
                "No se puede completar la operación porque el registro está relacionado con otros datos activos o la referencia seleccionada no existe."),
            "23502" => (StatusCodes.Status400BadRequest,
                "Faltan datos obligatorios para completar el registro. Verifica los campos requeridos."),
            "23514" => (StatusCodes.Status400BadRequest,
                "Uno o más valores ingresados no cumplen con las reglas permitidas."),
            "22001" => (StatusCodes.Status400BadRequest,
                "Uno de los textos ingresados supera la longitud máxima permitida."),
            "22P02" or "22003" => (StatusCodes.Status400BadRequest,
                "Uno de los valores numéricos o formatos enviados no es válido."),
            "40001" or "40P01" => (StatusCodes.Status409Conflict,
                "El sistema recibió varias solicitudes simultáneas. Por favor, intenta de nuevo en unos segundos."),
            "53300" or "53400" or "57P01" or "57P02" or "57P03" or "57014"
                or "08000" or "08001" or "08003" or "08004" or "08006" => (
                StatusCodes.Status503ServiceUnavailable,
                MensajeBaseDatosNoDisponible),
            _ when sqlState is not null && (sqlState.StartsWith("08", StringComparison.Ordinal)
                                            || sqlState.StartsWith("53", StringComparison.Ordinal)
                                            || sqlState.StartsWith("57", StringComparison.Ordinal)) => (
                StatusCodes.Status503ServiceUnavailable,
                MensajeBaseDatosNoDisponible),
            _ => (StatusCodes.Status500InternalServerError, MensajeGenericoServidor)
        };

    private static bool ContieneExcepcion<T>(Exception? ex) where T : Exception
    {
        var current = ex;
        while (current is not null)
        {
            if (current is T)
                return true;

            if (current is AggregateException agg)
            {
                foreach (var inner in agg.InnerExceptions)
                {
                    if (ContieneExcepcion<T>(inner))
                        return true;
                }
            }

            current = current.InnerException;
        }

        return false;
    }
}
