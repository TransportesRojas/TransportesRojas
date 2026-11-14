namespace Backend.Models;

public record ConfirmarRecoleccionModel(
    string? Observaciones = null,
    decimal? Latitud = null,
    decimal? Longitud = null
);

public record RecepcionSucursalModel(
    decimal PesoVerificadoKg,
    decimal LargoVerificadoCm,
    decimal AnchoVerificadoCm,
    decimal AltoVerificadoCm,
    long? SucursalId = null,
    string? EvidenciaFotoUrl = null,
    string? Observaciones = null
);

public record AsignarFlotillaRutaModel(
    long FlotillaId,
    long? UnidadId = null,
    long? ChoferId = null,
    DateOnly? FechaRuta = null,
    decimal? DistanciaEstimadaKm = null,
    int? TiempoEstimadoMin = null,
    string? Observaciones = null,
    int? OrdenEntrega = null
);

public record AsignarEnviosFlotillaModel(
    long FlotillaId,
    List<long> EnvioIds
);

public record AsignarRecursosRutaModel(
    long ChoferId,
    long UnidadId
);

public record RutaChoferActivaResponse(
    long RutaId,
    string Estado,
    DateOnly Fecha,
    DateTimeOffset? HoraInicio,
    string? FlotillaNombre,
    string? UnidadPlacas,
    string? UnidadModelo,
    decimal? KmInicialOdometro,
    List<ParadaChoferItemResponse> Paradas,
    string? NombreRuta = null,
    string? EstadoRuta = null,
    long? UnidadId = null,
    string? UnidadNumeroEconomico = null,
    DateOnly? FechaProgramada = null,
    int TotalEnvios = 0,
    int EnviosEntregados = 0
);

public record ParadaChoferItemResponse(
    long RutaEnvioId,
    long EnvioId,
    string Guia,
    int OrdenEntrega,
    string EstadoRutaEnvio,
    string EstadoEnvio,
    string DestinatarioNombre,
    string DestinatarioTelefono,
    string DireccionDestino,
    string? Contenido,
    decimal PesoKg,
    int IntentoReparto,
    int Orden = 0,
    string? Estado = null,
    string? DestinoDireccion = null,
    string? DestinoCiudad = null,
    string? TipoPaquete = null
);

public record PlanificarRutaConsolidadaModel(
    long? FlotillaId,
    long UnidadId,
    long ChoferId,
    List<long> EnviosIdsOrdenados,
    DateOnly? FechaRuta = null,
    decimal? DistanciaEstimadaKm = null,
    int? TiempoEstimadoMin = null,
    decimal? ConsumoCombustibleEstimadoLitros = null,
    string? NombreRutaRecomendada = null,
    string? Observaciones = null
);

public record RutaPlanificadaResultadoResponse(
    long RutaId,
    long FlotillaId,
    string FlotillaNombre,
    long ChoferId,
    string ChoferNombre,
    long UnidadId,
    string UnidadPlacas,
    DateOnly Fecha,
    decimal? DistanciaEstimadaKm,
    int? TiempoEstimadoMin,
    decimal? ConsumoCombustibleEstimadoLitros,
    int TotalParadas,
    List<string> GuiasAsignadas
);

public record IniciarRutaEnvioModel(
    decimal? KmInicialOdometro = null,
    string? Observaciones = null,
    decimal? Latitud = null,
    decimal? Longitud = null
);

public record ValidarEntregaModel(
    bool EntregaExitosa = true,
    string? CodigoSeguridad = null,
    string? Observaciones = null,
    string? EvidenciaFotoUrl = null,
    string? FirmaUrl = null,
    decimal? KmFinalOdometro = null,
    decimal? Latitud = null,
    decimal? Longitud = null
);

public record ReprogramarEnvioModel(
    DateTimeOffset NuevaFechaHora,
    string TipoIncidencia,
    string Motivo,
    string? EvidenciaUrl = null
);

public record CancelarEnvioModel(
    string Motivo
);

public record RegistrarDevolucionModel(
    string Motivo,
    string OrigenSolicitud = "no_entregable",
    long? SucursalDestinoId = null,
    string? EvidenciaUrl = null,
    string? Observaciones = null
);

public record ConfirmarDevolucionModel(
    bool EntregadoAlRemitente = true,
    bool AceptadaPorRemitente = true,
    string? Observaciones = null
);

public record FlotillaAsignableItem(
    long Id,
    string Nombre,
    string? Codigo,
    long? SucursalId,
    string? SucursalNombre,
    long? SupervisorId = null
);

public record UnidadAsignableItem(
    long Id,
    string Placas,
    string? Marca,
    string? Modelo,
    string? TipoVehiculo,
    decimal CapacidadKg,
    string Estado,
    long? FlotillaId
);

public record ChoferAsignableItem(
    long EmpleadoId,
    string NombreCompleto,
    string? Telefono,
    long? SucursalId,
    long? FlotillaActivaId
);

public record RecursosAsignacionEnvioResponse(
    List<FlotillaAsignableItem> Flotillas,
    List<UnidadAsignableItem> Unidades,
    List<ChoferAsignableItem> Choferes
);

public record NotificarCambioRutaModel(
    string Motivo,
    string? ReferenciaLugar = null,
    string? DescripcionTrayecto = null,
    bool AfectaEntrega = false,
    DateTimeOffset? FechaEvento = null
);

public record CambioRutaItemResponse(
    long Id,
    string Folio,
    long RutaId,
    long ChoferId,
    string ChoferNombre,
    long? UnidadId,
    string? UnidadPlacas,
    string Motivo,
    string? ReferenciaLugar,
    string? DescripcionTrayecto,
    DateTimeOffset FechaEvento,
    bool AfectaEntrega,
    string EstadoAviso,
    DateTimeOffset FechaRegistro
);


