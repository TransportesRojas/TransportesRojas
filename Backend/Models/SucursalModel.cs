namespace Backend.Models;

public record CrearSucursalModel(
    string Nombre,
    string? Direccion,
    string? Ciudad,
    string? Estado,
    string? CodigoPostal,
    string? Telefono
);

public record ActualizarSucursalModel(
    string Nombre,
    string? Direccion,
    string? Ciudad,
    string? Estado,
    string? CodigoPostal,
    string? Telefono
);

public record SucursalResponse(
    long Id,
    string Nombre,
    string? Direccion,
    string? Ciudad,
    string? Estado,
    string? CodigoPostal,
    string? Telefono
);
