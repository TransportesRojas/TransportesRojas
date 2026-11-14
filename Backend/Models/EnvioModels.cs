namespace Backend.Models;

public record DireccionEnvioInput(
    long? AsentamientoId,
    long? LocalidadId,
    short? EstadoId,
    int? MunicipioId,
    string? CodigoPostal,
    string? Estado,
    string? Municipio,
    string? Localidad,
    string? Colonia,
    string Calle,
    string? NumeroExterior = null,
    string? NumeroInterior = null,
    string? EntreCalles = null,
    string? Referencias = null,
    decimal? Latitud = null,
    decimal? Longitud = null
);

public record CrearEnvioModel(
    long? RemitenteId,
    long? DestinatarioClienteId,
    string DestinatarioNombre,
    string DestinatarioTelefono,
    string? DestinatarioEmail,
    bool RequiereRecoleccion,
    long? SucursalRecepcionId,
    long? SucursalDestinoId,
    DireccionEnvioInput? DireccionOrigen,
    DateTimeOffset? FechaHoraRecoleccionSolicitada,
    string? ObservacionesRecoleccion,
    DireccionEnvioInput DireccionDestino,
    decimal PesoKg,
    decimal LargoCm,
    decimal AnchoCm,
    decimal AltoCm,
    string Descripcion,
    decimal? ValorDeclarado = null,
    DateTimeOffset? FechaEntregaEstimada = null
);

public record FiltroEnviosQuery(
    int Skip = 0,
    int Take = 100,
    string? Estado = null,
    long? SucursalId = null,
    bool? RequiereRecoleccion = null,
    string? Busqueda = null
);

public record DireccionSnapshotDto(
    string? Calle,
    string? NumeroExterior,
    string? NumeroInterior,
    string? EntreCalles,
    string? Colonia,
    string? Localidad,
    string? Municipio,
    string? Estado,
    string? CodigoPostal,
    string? Pais,
    string? Referencias,
    decimal? Latitud,
    decimal? Longitud,
    long? AsentamientoId,
    long? LocalidadId,
    int? MunicipioId,
    short? EstadoId
);

public record EnvioListadoItem(
    long Id,
    string Guia,
    string Estado,
    long RemitenteId,
    string RemitenteNombre,
    string? RemitenteTelefono,
    string DestinatarioNombre,
    string DestinatarioTelefono,
    string? DestinatarioEmail,
    string? DestinoCiudadResumen,
    string? DestinoCodigoPostal,
    bool RequiereRecoleccion,
    long? SucursalRecepcionId,
    string? SucursalRecepcionNombre,
    long? SucursalDestinoId,
    string? SucursalDestinoNombre,
    decimal PesoKg,
    decimal LargoCm,
    decimal AnchoCm,
    decimal AltoCm,
    string Descripcion,
    decimal? ValorDeclarado,
    int IntentoReparto,
    string? FlotillaAsignadaNombre,
    string? ChoferAsignadoNombre,
    string? UnidadAsignadaPlacas,
    DateTimeOffset FechaCreacion,
    DateTimeOffset? FechaEntregaEstimada,
    long? RutaAsignadaId = null,
    decimal? DestinoLatitud = null,
    decimal? DestinoLongitud = null,
    string? DestinoCalleCompleta = null,
    long? FlotillaAsignadaId = null
);

public record EventoEnvioItem(
    long Id,
    string Estado,
    string? Descripcion,
    decimal? Latitud,
    decimal? Longitud,
    string? RegistradoPorNombre,
    DateTimeOffset FechaEvento
);

public record RecepcionPaqueteDto(
    DateTimeOffset FechaRecepcion,
    string RecibidoPorNombre,
    decimal? PesoVerificadoKg,
    decimal? LargoVerificadoCm,
    decimal? AnchoVerificadoCm,
    decimal? AltoVerificadoCm,
    string? EvidenciaFotoUrl,
    string? Observaciones
);

public record CitaRecoleccionDto(
    long Id,
    string Estado,
    DateTimeOffset FechaHoraSolicitada,
    DateTimeOffset? FechaHoraConfirmada,
    string? Motivo,
    string? Observaciones,
    DireccionSnapshotDto? Direccion
);

public record RutaAsignadaResumenDto(
    long RutaId,
    string EstadoRuta,
    DateOnly Fecha,
    long? FlotillaId,
    string? FlotillaNombre,
    long? ChoferId,
    string? ChoferNombre,
    long? UnidadId,
    string? UnidadPlacas,
    int OrdenEntrega,
    string EstadoRutaEnvio
);

public record EntregaIntentoDto(
    long Id,
    int IntentoReparto,
    string ChoferNombre,
    DateTimeOffset FechaHora,
    bool Validado,
    string Estado,
    string? Observaciones,
    string? EvidenciaFotoUrl,
    string? FirmaUrl
);

public record EnvioDetalleResponse(
    long Id,
    string Guia,
    string Estado,
    long RemitenteId,
    string RemitenteNombre,
    string? RemitenteTelefono,
    string? RemitenteEmail,
    long? DestinatarioClienteId,
    string DestinatarioNombre,
    string DestinatarioTelefono,
    string? DestinatarioEmail,
    bool RequiereRecoleccion,
    long? SucursalRecepcionId,
    string? SucursalRecepcionNombre,
    long? SucursalDestinoId,
    string? SucursalDestinoNombre,
    decimal PesoKg,
    decimal LargoCm,
    decimal AnchoCm,
    decimal AltoCm,
    string Descripcion,
    decimal? ValorDeclarado,
    int IntentoReparto,
    string? FlotillaAsignadaNombre,
    string? ChoferAsignadoNombre,
    string? UnidadAsignadaPlacas,
    DateTimeOffset FechaCreacion,
    DateTimeOffset? FechaEntregaEstimada,
    DireccionSnapshotDto? DireccionOrigen,
    DireccionSnapshotDto? DireccionDestino,
    RecepcionPaqueteDto? Recepcion,
    List<CitaRecoleccionDto> CitasRecoleccion,
    List<RutaAsignadaResumenDto> RutasAsignadas,
    List<EntregaIntentoDto> Entregas,
    List<EventoEnvioItem> Eventos,
    string? CodigoSeguridadCliente = null
);

public record CrearEnvioResponse(
    string Guia,
    string? CodigoSeguridadEntrega,
    EnvioDetalleResponse Envio
);

public record EventoRastreoPublicoItem(
    string Estado,
    string? Descripcion,
    DateTimeOffset FechaEvento
);

public record RastreoPublicoResponse(
    string Guia,
    string Estado,
    bool RequiereRecoleccion,
    string? OrigenResumen,
    string? DestinoResumen,
    string? SucursalRecepcionNombre,
    string? SucursalDestinoNombre,
    decimal PesoKg,
    string DescripcionPaquete,
    int IntentoReparto,
    DateTimeOffset FechaCreacion,
    DateTimeOffset? FechaEntregaEstimada,
    List<EventoRastreoPublicoItem> Eventos
);

