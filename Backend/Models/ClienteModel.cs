namespace Backend.Models;

public record CrearClienteModel(
    string? Nombre,
    string? ApellidoPaterno,
    string? ApellidoMaterno,
    string? Telefono,
    string? Email,
    long? UsuarioId,
    string? Password = null
);

public record ActualizarClienteModel(
    string? Nombre,
    string? ApellidoPaterno,
    string? ApellidoMaterno,
    string? Telefono,
    string? Email,
    string? MotivoEdicion = null
);

public record ClienteResponse(
    long Id,
    long? UsuarioId,
    string? Nombre,
    string? ApellidoPaterno,
    string? ApellidoMaterno,
    string? Telefono,
    string? Email,
    bool Activo,
    string? PasswordGenerada = null,
    string? MotivoEdicion = null
);
