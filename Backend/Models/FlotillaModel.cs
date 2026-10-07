namespace Backend.Models;

public record CrearFlotillaModel(string Nombre, string? Codigo, long? SucursalId, long? SupervisorId);

public record ActualizarFlotillaModel(string Nombre, string? Codigo, long? SucursalId, long? SupervisorId);

public record FlotillaResponse(long Id, string Nombre, string? Codigo, long? SucursalId, long? SupervisorId, bool Activo);
