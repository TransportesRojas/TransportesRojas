namespace Backend.Models;

public record CrearTipoMantenimientoModel(string Nombre, string? Descripcion, int KmIntervalo, string? AplicaATipoVehiculo);

public record ActualizarTipoMantenimientoModel(string Nombre, string? Descripcion, int KmIntervalo, string? AplicaATipoVehiculo);

public record TipoMantenimientoResponse(long Id, string Nombre, string? Descripcion, int KmIntervalo, string? AplicaATipoVehiculo, bool Activo);
