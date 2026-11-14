namespace Backend.Models;

public record CrearFlotillaModel(
    string Nombre,
    string? Codigo,
    long? SucursalId,
    long? SupervisorId
);

public record ActualizarFlotillaModel(
    string Nombre,
    string? Codigo,
    long? SucursalId,
    long? SupervisorId,
    bool? Activo = null
);

public record FlotillaResponse(
    long Id,
    string Nombre,
    string? Codigo,
    long? SucursalId,
    long? SupervisorId,
    bool Activo
);

public record AsignarFlotillaModel(
    List<long>? UnidadesIds,
    List<long>? ChoferesIds
);

public record FlotillaUnidadOpcion(
    long Id,
    string Placas,
    string? TipoVehiculo,
    string? Modelo,
    bool AsignadaAOtraFlotilla,
    string? FlotillaNombre
);

public record FlotillaChoferOpcion(
    long Id,
    string Clave,
    string NombreCompleto,
    bool AsignadoAOtraFlotilla,
    string? FlotillaNombre
);

public record EmpleadoOperativoOpcion(
    long Id,
    string Nombre,
    string ApellidoPaterno,
    string? ApellidoMaterno,
    string? PuestoNombre
);

public record FlotillaAsignacionesResponse(
    List<long> UnidadesIds,
    List<long> ChoferesIds,
    List<FlotillaUnidadOpcion> UnidadesDisponibles,
    List<FlotillaChoferOpcion> ChoferesDisponibles
);

public record FlotillaUnidadItem(
    long Id,
    string Placas,
    string? TipoVehiculo,
    string? Marca,
    string? Modelo,
    int? Anio,
    decimal CapacidadKg,
    decimal KmOdometroActual,
    string Estado,
    bool Activo
);

public record FlotillaMantenimientoItem(
    long Id,
    long UnidadId,
    string Placas,
    string TipoMantenimientoNombre,
    DateTimeOffset FechaRealizado,
    decimal KmAlMomento,
    decimal? Costo,
    string? Taller,
    string? Descripcion
);

public record FlotillaResumenResponse(
    long Id,
    string Nombre,
    string? Codigo,
    long? SucursalId,
    string? SucursalNombre,
    long? SupervisorId,
    string? SupervisorNombre,
    bool Activo,
    List<FlotillaUnidadItem> Unidades,
    List<FlotillaMantenimientoItem> Mantenimientos
);

