namespace Backend.Models;

public record EstadoGeograficoItem(
    short Id,
    string CveEnt,
    string Nombre,
    string Abreviatura
);

public record MunicipioGeograficoItem(
    int Id,
    short EstadoId,
    string CveMun,
    string Nombre,
    string? NombreCabecera
);

public record ColoniaSepomexItem(
    long Id,
    string Nombre,
    string TipoAsentamiento,
    string? Zona,
    string? Ciudad
);

public record CoberturaSugeridaResponse(
    long SucursalId,
    string SucursalNombre,
    string? SucursalNombreCorto,
    string? SucursalCodigo,
    bool AplicaRecoleccion,
    bool AplicaEntrega,
    bool EsZonaExtendida,
    short DiasEstimados
);

public record ConsultaCodigoPostalResponse(
    string CodigoPostal,
    short EstadoId,
    string EstadoNombre,
    string EstadoAbreviatura,
    int MunicipioId,
    string MunicipioNombre,
    string? Ciudad,
    long? LocalidadSugeridaId,
    decimal? LatitudSugerida,
    decimal? LongitudSugerida,
    List<ColoniaSepomexItem> Colonias,
    CoberturaSugeridaResponse? CoberturaSugerida
);

public record SucursalOperativaItem(
    long Id,
    string Nombre,
    string? NombreCorto,
    string? Codigo,
    string? Calle,
    string? Municipio,
    string? Estado,
    string? CodigoPostal,
    string? Telefono,
    decimal? Latitud = null,
    decimal? Longitud = null
);

