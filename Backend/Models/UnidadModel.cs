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
    decimal CapacidadKg
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
    bool Activo
);
