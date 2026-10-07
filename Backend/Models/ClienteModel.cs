namespace Backend.Models;

public record CrearClienteModel(
    string? Nombre,
    string? ApellidoPaterno,
    string? ApellidoMaterno,
    string? Telefono,
    string? Email,
    long? UsuarioId
);

public record ActualizarClienteModel(
    string? Nombre,
    string? ApellidoPaterno,
    string? ApellidoMaterno,
    string? Telefono,
    string? Email
);

public record ClienteResponse(
    long Id,
    long? UsuarioId,
    string? Nombre,
    string? ApellidoPaterno,
    string? ApellidoMaterno,
    string? Telefono,
    string? Email,
    bool Activo
);
