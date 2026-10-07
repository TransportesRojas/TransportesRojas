namespace Backend.Models;

public record CrearEmpleadoCompleto(
    string Nombre,
    string ApellidoPaterno,
    string? ApellidoMaterno,
    string? Telefono,
    string? Email,
    long? SucursalId,
    long? RolId,
    DateOnly? FechaIngreso
);

public record ActualizarEmpleadoCompleto(
    string Nombre,
    string ApellidoPaterno,
    string? ApellidoMaterno,
    string? Telefono,
    string? Email,
    long? SucursalId,
    DateOnly? FechaIngreso
);

public record EmpleadoResponse(
    long Id,
    long UsuarioId,
    string Nombre,
    string ApellidoPaterno,
    string? ApellidoMaterno,
    string? Telefono,
    string? Email,
    long? SucursalId,
    DateOnly? FechaIngreso,
    bool Activo
);
