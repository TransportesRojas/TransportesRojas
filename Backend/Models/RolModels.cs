namespace Backend.Models;

public record CrearRolModel(
    string Nombre,
    string? Descripcion,
    List<long>? PermisoIds = null
);

public record ActualizarRolModel(
    string Nombre,
    string? Descripcion,
    List<long>? PermisoIds = null
);

public record AsignarPermisosRolModel(
    List<long> PermisoIds
);

public record PermisoResumen(
    long Id,
    string Codigo,
    string Nombre,
    string Modulo
);

public record PermisoRolItem(
    long Id,
    string Codigo,
    string Nombre,
    string Modulo,
    string? Descripcion,
    bool Asignado
);

public record RolResponse(
    long Id,
    string Nombre,
    string? Descripcion,
    List<PermisoResumen>? Permisos = null
);