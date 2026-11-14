using Backend.Models;
using FluentValidation;

namespace Backend.Validators;

public class RecepcionSucursalValidator : AbstractValidator<RecepcionSucursalModel>
{
    public RecepcionSucursalValidator()
    {
        RuleFor(x => x.PesoVerificadoKg)
            .GreaterThan(0).WithMessage("El peso verificado en báscula debe ser mayor a 0 kg.")
            .LessThanOrEqualTo(50_000).WithMessage("El peso verificado excede el límite permitido.");

        RuleFor(x => x.LargoVerificadoCm)
            .GreaterThan(0).WithMessage("El largo verificado debe ser mayor a 0 cm.")
            .LessThanOrEqualTo(2_000).WithMessage("El largo verificado excede el límite permitido.");

        RuleFor(x => x.AnchoVerificadoCm)
            .GreaterThan(0).WithMessage("El ancho verificado debe ser mayor a 0 cm.")
            .LessThanOrEqualTo(2_000).WithMessage("El ancho verificado excede el límite permitido.");

        RuleFor(x => x.AltoVerificadoCm)
            .GreaterThan(0).WithMessage("El alto verificado debe ser mayor a 0 cm.")
            .LessThanOrEqualTo(2_000).WithMessage("El alto verificado excede el límite permitido.");

        RuleFor(x => x.Observaciones)
            .MaximumLength(500).WithMessage("Las observaciones no pueden exceder 500 caracteres.")
            .When(x => !string.IsNullOrWhiteSpace(x.Observaciones));
    }
}

public class AsignarFlotillaRutaValidator : AbstractValidator<AsignarFlotillaRutaModel>
{
    public AsignarFlotillaRutaValidator()
    {
        RuleFor(x => x.FlotillaId)
            .GreaterThan(0).WithMessage("Debes seleccionar una flotilla válida.");

        RuleFor(x => x.UnidadId)
            .GreaterThan(0).WithMessage("El identificador de unidad no es válido.")
            .When(x => x.UnidadId.HasValue);

        RuleFor(x => x.ChoferId)
            .GreaterThan(0).WithMessage("El identificador de chofer no es válido.")
            .When(x => x.ChoferId.HasValue);

        RuleFor(x => x.DistanciaEstimadaKm)
            .GreaterThan(0).WithMessage("La distancia estimada debe ser mayor a 0 km.")
            .When(x => x.DistanciaEstimadaKm.HasValue);

        RuleFor(x => x.TiempoEstimadoMin)
            .GreaterThan(0).WithMessage("El tiempo estimado debe ser mayor a 0 minutos.")
            .When(x => x.TiempoEstimadoMin.HasValue);
    }
}

public class IniciarRutaEnvioValidator : AbstractValidator<IniciarRutaEnvioModel>
{
    public IniciarRutaEnvioValidator()
    {
        RuleFor(x => x.KmInicialOdometro)
            .GreaterThanOrEqualTo(0).WithMessage("El kilometraje inicial del odómetro no puede ser negativo.")
            .When(x => x.KmInicialOdometro.HasValue);

        RuleFor(x => x.Observaciones)
            .MaximumLength(400).WithMessage("Las observaciones no pueden exceder 400 caracteres.")
            .When(x => !string.IsNullOrWhiteSpace(x.Observaciones));
    }
}

public class ValidarEntregaValidator : AbstractValidator<ValidarEntregaModel>
{
    public ValidarEntregaValidator()
    {
        When(x => x.EntregaExitosa, () =>
        {
            RuleFor(x => x.CodigoSeguridad)
                .NotEmpty().WithMessage("El código PIN de seguridad de 6 dígitos es obligatorio para confirmar la entrega.")
                .Must(EsPinSeisDigitos).WithMessage("El código PIN de seguridad debe contener exactamente 6 dígitos numéricos.");
        });

        When(x => !x.EntregaExitosa, () =>
        {
            RuleFor(x => x.Observaciones)
                .NotEmpty().WithMessage("Debes especificar el motivo u observación del intento fallido de entrega.")
                .MaximumLength(500).WithMessage("Las observaciones no pueden exceder 500 caracteres.");
        });

        RuleFor(x => x.KmFinalOdometro)
            .GreaterThanOrEqualTo(0).WithMessage("El kilometraje final del odómetro no puede ser negativo.")
            .When(x => x.KmFinalOdometro.HasValue);
    }

    private static bool EsPinSeisDigitos(string? pin)
    {
        if (string.IsNullOrWhiteSpace(pin)) return false;
        var limpio = pin.Trim();
        return limpio.Length == 6 && limpio.All(char.IsDigit);
    }
}

public class ReprogramarEnvioValidator : AbstractValidator<ReprogramarEnvioModel>
{
    private static readonly HashSet<string> TiposPermitidos = new(StringComparer.OrdinalIgnoreCase)
    {
        "vial", "cliente_ausente", "direccion_incorrecta", "paquete_danado", "otra",
        "ClienteAusente", "DireccionIncorrecta", "PaqueteDanado"
    };

    public ReprogramarEnvioValidator()
    {
        RuleFor(x => x.NuevaFechaHora)
            .Must(f => f > DateTimeOffset.UtcNow.AddMinutes(-5))
            .WithMessage("La nueva fecha y hora programada debe ser futura.");

        RuleFor(x => x.TipoIncidencia)
            .NotEmpty().WithMessage("El tipo de incidencia es obligatorio.")
            .Must(t => TiposPermitidos.Contains(t.Trim()))
            .WithMessage("Tipo de incidencia no válido. Valores permitidos: vial, cliente_ausente, direccion_incorrecta, paquete_danado, otra.");

        RuleFor(x => x.Motivo)
            .NotEmpty().WithMessage("El motivo de reprogramación es obligatorio.")
            .MaximumLength(500).WithMessage("El motivo no puede exceder 500 caracteres.");
    }
}

public class CancelarEnvioValidator : AbstractValidator<CancelarEnvioModel>
{
    public CancelarEnvioValidator()
    {
        RuleFor(x => x.Motivo)
            .NotEmpty().WithMessage("Debes especificar el motivo de cancelación del envío.")
            .MaximumLength(500).WithMessage("El motivo de cancelación no puede exceder 500 caracteres.");
    }
}

public class RegistrarDevolucionValidator : AbstractValidator<RegistrarDevolucionModel>
{
    private static readonly HashSet<string> OrigenesPermitidos = new(StringComparer.OrdinalIgnoreCase)
    {
        "rechazo_destinatario", "no_entregable", "solicitud_remitente",
        "RechazoDestinatario", "NoEntregable", "SolicitudRemitente"
    };

    public RegistrarDevolucionValidator()
    {
        RuleFor(x => x.Motivo)
            .NotEmpty().WithMessage("El motivo de devolución es obligatorio.")
            .MaximumLength(500).WithMessage("El motivo de devolución no puede exceder 500 caracteres.");

        RuleFor(x => x.OrigenSolicitud)
            .NotEmpty().WithMessage("El origen de la solicitud de devolución es obligatorio.")
            .Must(o => OrigenesPermitidos.Contains(o.Trim()))
            .WithMessage("Origen de devolución no válido. Valores permitidos: rechazo_destinatario, no_entregable, solicitud_remitente.");
    }
}

public class NotificarCambioRutaValidator : AbstractValidator<NotificarCambioRutaModel>
{
    public NotificarCambioRutaValidator()
    {
        RuleFor(x => x.Motivo)
            .NotEmpty().WithMessage("El motivo del cambio de ruta o desvío es obligatorio.")
            .MaximumLength(250).WithMessage("El motivo no puede exceder 250 caracteres.");

        RuleFor(x => x.ReferenciaLugar)
            .MaximumLength(250).WithMessage("La referencia del lugar no puede exceder 250 caracteres.")
            .When(x => !string.IsNullOrWhiteSpace(x.ReferenciaLugar));

        RuleFor(x => x.DescripcionTrayecto)
            .MaximumLength(500).WithMessage("La descripción del trayecto alternativo no puede exceder 500 caracteres.")
            .When(x => !string.IsNullOrWhiteSpace(x.DescripcionTrayecto));
    }
}


