namespace Backend.Models;

public record CrearUnidadModel(
    long? FlotillaId,
    string Placas,
    string? TipoVehiculo,
    string? Marca,
    string? Modelo,
    int? Anio,
    decimal CapacidadKg,
    decimal? KmOdometroInicial
);

public record ActualizarUnidadModel(
    long? FlotillaId,
    string Placas,
    string? TipoVehiculo,
    string? Marca,
    string? Modelo,
    int? Anio,
    decimal CapacidadKg,
    decimal? KmOdometroActual = null,
    string? Estado = null,
    bool? Activo = null
);

public record RegistrarOdometroCierreModel(
    decimal KmOdometroFinal,
    string? Observaciones = null
);

public record UnidadResponse(
    long Id,
    long? FlotillaId,
    string Placas,
    string? TipoVehiculo,
    string? Marca,
    string? Modelo,
    int? Anio,
    decimal CapacidadKg,
    decimal? KmOdometroInicial,
    decimal KmOdometroActual,
    string Estado,
    bool Activo,
    string? FlotillaNombre = null
);
