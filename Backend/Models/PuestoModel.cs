namespace Backend.Models;

public record CrearPuestoModel(string Nombre, string? Descripcion);

public record ActualizarPuestoModel(string Nombre, string? Descripcion);

public record PuestoResponse(long Id, string Nombre, string? Descripcion);
