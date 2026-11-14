using System;
using System.Collections.Generic;
using System.Reflection;
using Backend.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using Xunit;

namespace ApiTests;

public class ErrorSanitizationTests
{
    private static ResultExecutingContext CrearResultExecutingContext(IActionResult result)
    {
        var actionContext = new ActionContext(
            new DefaultHttpContext(),
            new RouteData(),
            new ActionDescriptor());

        return new ResultExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            result,
            controller: new object());
    }

    private static string? ExtraerMensajeDeResult(IActionResult result)
    {
        if (result is not ObjectResult objResult || objResult.Value is null)
            return null;

        if (objResult.Value is string s)
            return s;

        var prop = objResult.Value.GetType().GetProperty("mensaje", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
        return prop?.GetValue(objResult.Value)?.ToString();
    }

    [Theory]
    [InlineData("23505", 409)]
    [InlineData("23503", 409)]
    [InlineData("23502", 400)]
    [InlineData("23514", 400)]
    [InlineData("22001", 400)]
    [InlineData("22P02", 400)]
    [InlineData("53300", 503)]
    [InlineData("08006", 503)]
    public void ResolverErrorHttp_PostgresException_RetornaCodigoYMensajeAmigable(string sqlState, int expectedStatus)
    {
        var pgEx = new PostgresException(
            $"duplicate key value violates unique constraint \"uq_test_{sqlState}\"",
            "ERROR",
            "ERROR",
            sqlState);
        var wrapped = new DbUpdateException("An error occurred while saving the entity changes.", pgEx);

        var (statusCode, mensaje) = PostgresErrorHelper.ResolverErrorHttp(wrapped);

        Assert.Equal(expectedStatus, statusCode);
        Assert.False(string.IsNullOrWhiteSpace(mensaje));
        Assert.False(PostgresErrorHelper.EsTextoTecnico(mensaje));
        Assert.DoesNotContain(sqlState, mensaje, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("uq_test", mensaje, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("entity changes", mensaje, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ResolverErrorHttp_DbUpdateConcurrencyException_Retorna409Amigable()
    {
        var ex = new DbUpdateConcurrencyException("The database operation was expected to affect 1 row(s), but actually affected 0 row(s).");

        var (statusCode, mensaje) = PostgresErrorHelper.ResolverErrorHttp(ex);

        Assert.Equal(409, statusCode);
        Assert.False(PostgresErrorHelper.EsTextoTecnico(mensaje));
        Assert.DoesNotContain("affected 0 row", mensaje, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ResolverErrorHttp_TimeoutYCancelacion_Retornan503Y408Amigables()
    {
        var timeoutEx = new TimeoutException("Npgsql.NpgsqlException: Command execution timed out after 30s");
        var (timeoutStatus, timeoutMensaje) = PostgresErrorHelper.ResolverErrorHttp(timeoutEx);
        Assert.Equal(503, timeoutStatus);
        Assert.False(PostgresErrorHelper.EsTextoTecnico(timeoutMensaje));
        Assert.DoesNotContain("Npgsql", timeoutMensaje, StringComparison.OrdinalIgnoreCase);

        var cancelEx = new OperationCanceledException("The operation was canceled due to timeout.");
        var (cancelStatus, cancelMensaje) = PostgresErrorHelper.ResolverErrorHttp(cancelEx);
        Assert.Equal(408, cancelStatus);
        Assert.False(PostgresErrorHelper.EsTextoTecnico(cancelMensaje));
    }

    [Fact]
    public void ResolverErrorHttp_ExcepcionGenericaConStackTrace_OcultaDetalleTecnico()
    {
        var ex = new InvalidOperationException(
            "SELECT * FROM public.envio WHERE id = 1 failed\n   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable");

        var (statusCode, mensaje) = PostgresErrorHelper.ResolverErrorHttp(ex);

        Assert.Equal(500, statusCode);
        Assert.False(PostgresErrorHelper.EsTextoTecnico(mensaje));
        Assert.DoesNotContain("SELECT", mensaje, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("EntityFrameworkCore", mensaje, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ObtenerMensajeSeguro_FiltraOrigenOTextoTecnicoYConservaNegocioBackend()
    {
        const string fallback = "Ocurrió un error al procesar la solicitud.";

        var exEfCore = new InvalidOperationException("Error interno EF")
        {
            Source = "Microsoft.EntityFrameworkCore"
        };
        Assert.Equal(fallback, PostgresErrorHelper.ObtenerMensajeSeguro(exEfCore, fallback));

        var exTecnicaBackend = new InvalidOperationException(
            "Npgsql.PostgresException (0x80004005): relation \"sucursal\" already exists")
        {
            Source = "Backend"
        };
        Assert.Equal(fallback, PostgresErrorHelper.ObtenerMensajeSeguro(exTecnicaBackend, fallback));

        const string negocio = "El código postal no cuenta con cobertura activa.";
        var exNegocio = new InvalidOperationException(negocio)
        {
            Source = "Backend"
        };
        Assert.Equal(negocio, PostgresErrorHelper.ObtenerMensajeSeguro(exNegocio, fallback));
    }

    [Fact]
    public void SanitizarErroresResultFilter_LimpiaErrorTecnicoEn400Y500()
    {
        var filter = new SanitizarErroresResultFilter(NullLogger<SanitizarErroresResultFilter>.Instance);

        var ctx500 = CrearResultExecutingContext(new ObjectResult(new
        {
            mensaje = "Microsoft.EntityFrameworkCore.DbUpdateException: An error occurred while saving the entity changes. Inner: 23505"
        })
        {
            StatusCode = 500
        });

        filter.OnResultExecuting(ctx500);
        var msg500 = ExtraerMensajeDeResult(ctx500.Result);
        Assert.False(string.IsNullOrWhiteSpace(msg500));
        Assert.False(PostgresErrorHelper.EsTextoTecnico(msg500));
        Assert.DoesNotContain("DbUpdateException", msg500!, StringComparison.OrdinalIgnoreCase);

        var ctx400String = CrearResultExecutingContext(new BadRequestObjectResult(
            "Npgsql.NpgsqlException (0x80004005): Failed to connect to 127.0.0.1:5432"));

        filter.OnResultExecuting(ctx400String);
        var msg400 = ExtraerMensajeDeResult(ctx400String.Result);
        Assert.False(string.IsNullOrWhiteSpace(msg400));
        Assert.False(PostgresErrorHelper.EsTextoTecnico(msg400));
        Assert.DoesNotContain("Npgsql", msg400!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void SanitizarErroresResultFilter_ConservaMensajeAmigableYNoToca200()
    {
        var filter = new SanitizarErroresResultFilter(NullLogger<SanitizarErroresResultFilter>.Instance);

        const string businessMsg = "La guía ingresada ya fue entregada anteriormente.";
        var ctx400 = CrearResultExecutingContext(new BadRequestObjectResult(new { mensaje = businessMsg }));
        filter.OnResultExecuting(ctx400);
        Assert.Equal(businessMsg, ExtraerMensajeDeResult(ctx400.Result));

        const string okPayload = "OK_Npgsql_Simulated_Report_Label";
        var ctx200 = CrearResultExecutingContext(new OkObjectResult(new { mensaje = okPayload }));
        filter.OnResultExecuting(ctx200);
        Assert.Equal(okPayload, ExtraerMensajeDeResult(ctx200.Result));
    }
}
