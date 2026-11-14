using Backend.Helpers;
using Backend.Models;
using FluentValidation;

namespace Backend.Validators;

public class DireccionEnvioValidator : AbstractValidator<DireccionEnvioInput>
{
    public DireccionEnvioValidator()
    {
        RuleFor(x => x.Calle)
            .NotEmpty().WithMessage("La calle o vialidad es obligatoria.")
            .MaximumLength(200).WithMessage("La calle no puede exceder 200 caracteres.");

        RuleFor(x => x.NumeroExterior)
            .MaximumLength(30).WithMessage("El número exterior no puede exceder 30 caracteres.")
            .When(x => !string.IsNullOrWhiteSpace(x.NumeroExterior));

        RuleFor(x => x.NumeroInterior)
            .MaximumLength(30).WithMessage("El número interior no puede exceder 30 caracteres.")
            .When(x => !string.IsNullOrWhiteSpace(x.NumeroInterior));

        RuleFor(x => x.EntreCalles)
            .NotEmpty().WithMessage("El campo 'Entre calles' es obligatorio.")
            .MaximumLength(200).WithMessage("El campo 'Entre calles' no puede exceder 200 caracteres.");

        RuleFor(x => x.Referencias)
            .NotEmpty().WithMessage("Las referencias de entrega son obligatorias.")
            .MaximumLength(350).WithMessage("Las referencias no pueden exceder 350 caracteres.");

        RuleFor(x => x.CodigoPostal)
            .Matches(@"^\d{5}$")
            .WithMessage("El código postal debe contener exactamente 5 dígitos numéricos.")
            .When(x => !string.IsNullOrWhiteSpace(x.CodigoPostal));

        RuleFor(x => x)
            .Must(TenerCatalogoORespaldoCompleto)
            .WithMessage("Debes seleccionar una colonia válida o indicar Código Postal (5 dígitos), Colonia, Municipio y Estado.");
    }

    private static bool TenerCatalogoORespaldoCompleto(DireccionEnvioInput dir)
    {
        if (dir.AsentamientoId.HasValue && dir.AsentamientoId.Value > 0)
            return true;

        var cpTrim = (dir.CodigoPostal ?? string.Empty).Trim();
        return cpTrim.Length == 5
               && cpTrim.All(char.IsDigit)
               && !string.IsNullOrWhiteSpace(dir.Colonia)
               && !string.IsNullOrWhiteSpace(dir.Municipio)
               && !string.IsNullOrWhiteSpace(dir.Estado);
    }
}

public class CrearEnvioValidator : AbstractValidator<CrearEnvioModel>
{
    public CrearEnvioValidator()
    {
        RuleFor(x => x.DestinatarioNombre)
            .NotEmpty().WithMessage("El nombre completo del destinatario es obligatorio.")
            .MaximumLength(150).WithMessage("El nombre del destinatario no puede exceder 150 caracteres.");

        RuleFor(x => x.DestinatarioTelefono)
            .NotEmpty().WithMessage("El teléfono del destinatario es obligatorio.")
            .Must(EsTelefonoDiezDigitos).WithMessage("El teléfono del destinatario debe contener exactamente 10 dígitos numéricos.");

        RuleFor(x => x.DestinatarioEmail)
            .EmailAddress().WithMessage("El correo electrónico del destinatario no tiene un formato válido.")
            .MaximumLength(120).WithMessage("El correo del destinatario no puede exceder 120 caracteres.")
            .When(x => !string.IsNullOrWhiteSpace(x.DestinatarioEmail));

        RuleFor(x => x.PesoKg)
            .GreaterThan(0).WithMessage("El peso en kilogramos debe ser mayor a 0.")
            .LessThanOrEqualTo(50_000).WithMessage("El peso excede el límite operativo permitido.");

        RuleFor(x => x.LargoCm)
            .GreaterThan(0).WithMessage("El largo en centímetros debe ser mayor a 0.")
            .LessThanOrEqualTo(2_000).WithMessage("El largo excede el límite operativo permitido.");

        RuleFor(x => x.AnchoCm)
            .GreaterThan(0).WithMessage("El ancho en centímetros debe ser mayor a 0.")
            .LessThanOrEqualTo(2_000).WithMessage("El ancho excede el límite operativo permitido.");

        RuleFor(x => x.AltoCm)
            .GreaterThan(0).WithMessage("El alto en centímetros debe ser mayor a 0.")
            .LessThanOrEqualTo(2_000).WithMessage("El alto excede el límite operativo permitido.");

        RuleFor(x => x.Descripcion)
            .NotEmpty().WithMessage("La descripción del contenido del paquete es obligatoria.")
            .MaximumLength(500).WithMessage("La descripción no puede exceder 500 caracteres.");

        RuleFor(x => x.ValorDeclarado)
            .GreaterThanOrEqualTo(0).WithMessage("El valor declarado no puede ser negativo.")
            .When(x => x.ValorDeclarado.HasValue);

        RuleFor(x => x.DireccionDestino)
            .NotNull().WithMessage("La dirección de destino es obligatoria.")
            .SetValidator(new DireccionEnvioValidator()!);

        RuleFor(x => x.DireccionOrigen)
            .NotNull().WithMessage("Cuando el envío requiere recolección a domicilio, la dirección de origen es obligatoria.")
            .When(x => x.RequiereRecoleccion);

        When(x => x.DireccionOrigen is not null, () =>
        {
            RuleFor(x => x.DireccionOrigen!)
                .SetValidator(new DireccionEnvioValidator());
        });
    }

    private static bool EsTelefonoDiezDigitos(string? telefono)
        => ValidacionEntradaHelper.TryExtraerTelefonoDiezDigitos(telefono, out _);
}

