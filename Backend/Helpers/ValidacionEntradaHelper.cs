using System.Text.RegularExpressions;

namespace Backend.Helpers;

public static partial class ValidacionEntradaHelper
{
    public static string? NormalizarTelefonoDiezDigitos(
        string? telefono,
        bool obligatorio,
        string nombreCampo = "teléfono")
    {
        if (string.IsNullOrWhiteSpace(telefono))
        {
            if (obligatorio)
                throw new ArgumentException($"El {nombreCampo} es obligatorio.");
            return null;
        }

        if (!TryExtraerTelefonoDiezDigitos(telefono, out var digitos))
            throw new ArgumentException($"El {nombreCampo} debe contener exactamente 10 dígitos numéricos (sin letras).");

        return digitos;
    }

    public static bool TryExtraerTelefonoDiezDigitos(string? telefono, out string digitos)
    {
        digitos = string.Empty;
        if (string.IsNullOrWhiteSpace(telefono))
            return false;

        var limpio = telefono.Trim();
        if (limpio.Any(char.IsLetter) || !PatronCaracteresTelefono().IsMatch(limpio))
            return false;

        digitos = PatronNoDigitos().Replace(limpio, string.Empty);
        return digitos.Length == 10;
    }

    public static string? NormalizarCodigoPostal(string? codigoPostal, bool obligatorio)
    {
        if (string.IsNullOrWhiteSpace(codigoPostal))
        {
            if (obligatorio)
                throw new ArgumentException("El código postal es obligatorio.");
            return null;
        }

        var limpio = codigoPostal.Trim();
        if (!PatronSoloCincoDigitos().IsMatch(limpio))
            throw new ArgumentException("El código postal debe contener exactamente 5 dígitos numéricos.");

        return limpio;
    }

    public static string? NormalizarNumeroExterior(string? numeroExterior)
    {
        if (string.IsNullOrWhiteSpace(numeroExterior))
            return null;

        var limpio = numeroExterior.Trim().ToUpperInvariant();
        if (limpio.Length > 30)
            throw new ArgumentException("El número exterior no puede exceder 30 caracteres.");

        return limpio;
    }

    public static string FormatearNumeroExterior(string? numeroExterior)
    {
        if (string.IsNullOrWhiteSpace(numeroExterior))
            return string.Empty;

        var limpio = numeroExterior.Trim();
        if (limpio.Equals("S/N", StringComparison.OrdinalIgnoreCase)
            || limpio.Equals("SN", StringComparison.OrdinalIgnoreCase)
            || limpio.Equals("SIN NUMERO", StringComparison.OrdinalIgnoreCase)
            || limpio.Equals("SIN NÚMERO", StringComparison.OrdinalIgnoreCase))
        {
            return " S/N";
        }

        return $" #{limpio}";
    }

    public static void ValidarAnioUnidad(int? anio)
    {
        if (!anio.HasValue) return;
        var anioMax = DateTime.UtcNow.Year + 2;
        if (anio.Value < 1950 || anio.Value > anioMax)
            throw new ArgumentException($"El año del vehículo debe estar entre 1950 y {anioMax}.");
    }

    public static void ValidarDecimalPositivo(
        decimal valor,
        string nombreCampo,
        decimal maxPermitido = 10_000_000m)
    {
        if (valor <= 0 || valor > maxPermitido)
            throw new ArgumentException($"El campo {nombreCampo} debe ser un número mayor a 0.");
    }

    public static void ValidarDecimalNoNegativo(
        decimal? valor,
        string nombreCampo,
        decimal maxPermitido = 10_000_000m)
    {
        if (!valor.HasValue) return;
        if (valor.Value < 0 || valor.Value > maxPermitido)
            throw new ArgumentException($"El campo {nombreCampo} debe ser un número mayor o igual a 0.");
    }

    public static string ValidarNombrePersonaSinNumeros(
        string? valor,
        bool obligatorio,
        string nombreCampo)
    {
        if (string.IsNullOrWhiteSpace(valor))
        {
            if (obligatorio)
                throw new ArgumentException($"El {nombreCampo} es obligatorio.");
            return string.Empty;
        }

        var limpio = valor.Trim();
        if (limpio.Any(char.IsDigit))
            throw new ArgumentException($"El {nombreCampo} no debe contener números.");

        return limpio;
    }

    public static string? ValidarNombrePersonaOpcionalSinNumeros(
        string? valor,
        string nombreCampo)
    {
        if (string.IsNullOrWhiteSpace(valor))
            return null;

        return ValidarNombrePersonaSinNumeros(valor, obligatorio: false, nombreCampo);
    }

    public static void ValidarEnteroPositivo(
        int? valor,
        string nombreCampo,
        int maxPermitido = 2_000_000)
    {
        if (!valor.HasValue) return;
        if (valor.Value <= 0 || valor.Value > maxPermitido)
            throw new ArgumentException($"El campo {nombreCampo} debe ser un número entero mayor a 0.");
    }

    [GeneratedRegex(@"^[\d\s\-\(\)\+]+$")]
    private static partial Regex PatronCaracteresTelefono();

    [GeneratedRegex(@"\D")]
    private static partial Regex PatronNoDigitos();

    [GeneratedRegex(@"^\d{5}$")]
    private static partial Regex PatronSoloCincoDigitos();
}

