using System.Text.RegularExpressions;
using Backend.Models;
using FluentValidation;

namespace Backend.Validators;

public class LoginClienteValidator : AbstractValidator<LoginClienteModel>
{

    private static readonly Regex PatronInyeccion = new(
        @"<[^>]*>|javascript:|--|/\*|\*/|;\s*$|\b(union|select|insert|update|delete|drop|exec|alter|cast|declare)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public LoginClienteValidator()
    {
        RuleFor(x => x.Email)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("El correo electrónico es requerido.")
            .MaximumLength(100).WithMessage("El correo electrónico no puede exceder 100 caracteres.")
            .EmailAddress().WithMessage("El formato del correo electrónico es inválido.")
            .Must(NoContenerCaracteresPeligrosos).WithMessage("El correo contiene caracteres o patrones no permitidos.");

        RuleFor(x => x.Password)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("La contraseña es requerida.")
            .MinimumLength(12).WithMessage("La contraseña debe tener al menos 12 caracteres.")
            .MaximumLength(18).WithMessage("La contraseña no debe superar los 18 caracteres.")
            .Must(pass => !pass.Contains('\0')).WithMessage("La contraseña contiene caracteres no válidos.");
    }

    private static bool NoContenerCaracteresPeligrosos(string valor)
    {
        if (string.IsNullOrWhiteSpace(valor)) return false;
        if (valor.Contains('\0')) return false;
        return !PatronInyeccion.IsMatch(valor);
    }
}

public class LoginEmpleadoValidator : AbstractValidator<LoginEmpleadoModel>
{
    public LoginEmpleadoValidator()
    {
        RuleFor(x => x.EmpleadoId)
            .Cascade(CascadeMode.Stop)
            .GreaterThan(0).WithMessage("El ID de empleado debe ser un número entero mayor a 0.")
            .LessThanOrEqualTo(999_999_999).WithMessage("El ID de empleado excede el límite permitido.");

        RuleFor(x => x.Password)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("La contraseña es requerida.")
            .MinimumLength(12).WithMessage("La contraseña debe tener al menos 12 caracteres.")
            .MaximumLength(18).WithMessage("La contraseña no debe superar los 18 caracteres.")
            .Must(pass => !pass.Contains('\0')).WithMessage("La contraseña contiene caracteres no válidos.");
    }
}
