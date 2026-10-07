namespace Backend.Models;

public record CrearPermisoModel(string Codigo, string Nombre, string? Descripcion, string Modulo);

public record ActualizarPermisoModel(string Codigo, string Nombre, string? Descripcion, string Modulo);

public record PermisoResponse(long Id, string Codigo, string Nombre, string? Descripcion, string Modulo);
