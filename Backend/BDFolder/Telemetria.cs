namespace Backend.BDFolder;

public class Alerta
{
    public long Id { get; set; }
    public TipoAlerta Tipo { get; set; }
    public long? FlotillaId { get; set; }
    public long? UnidadId { get; set; }
    public long? ChoferId { get; set; }
    public long? EnvioId { get; set; }
    public long? RutaId { get; set; }
    public string? Descripcion { get; set; }
    public decimal? Latitud { get; set; }
    public decimal? Longitud { get; set; }
    public EstadoAlerta Estado { get; set; } = EstadoAlerta.Nueva;
    public long? AtendidaPor { get; set; }
    public DateTimeOffset FechaAlerta { get; set; }
    public DateTimeOffset? FechaAtencion { get; set; }

    public Flotilla? Flotilla { get; set; }
    public Unidad? Unidad { get; set; }
    public Empleado? Chofer { get; set; }
    public Envio? Envio { get; set; }
    public Ruta? Ruta { get; set; }
    public Empleado? AtendidaPorEmpleado { get; set; }
}

public class TelemetriaUnidad
{
    public long Id { get; set; }
    public long UnidadId { get; set; }
    public long? RutaId { get; set; }
    public decimal? Latitud { get; set; }
    public decimal? Longitud { get; set; }
    public DateTimeOffset FechaHora { get; set; }

    public Unidad Unidad { get; set; } = null!;
    public Ruta? Ruta { get; set; }
}

public class Incidencia
{
    public long Id { get; set; }
    public long? EnvioId { get; set; }
    public long? RutaId { get; set; }
    public TipoIncidencia Tipo { get; set; }
    public string Descripcion { get; set; } = null!;
    public string? EvidenciaUrl { get; set; }
    public EstadoIncidencia Estado { get; set; } = EstadoIncidencia.Abierta;
    public DateTimeOffset FechaReporte { get; set; }
    public DateTimeOffset? FechaCierre { get; set; }

    public Envio? Envio { get; set; }
    public Ruta? Ruta { get; set; }
}

public class Reprogramacion
{
    public long Id { get; set; }
    public long EnvioId { get; set; }
    public long? IncidenciaId { get; set; }
    public DateTimeOffset NuevaFechaHora { get; set; }
    public string? Motivo { get; set; }
    public EstadoReprogramacion Estado { get; set; } = EstadoReprogramacion.Programada;
    public DateTimeOffset CreatedAt { get; set; }

    public Envio Envio { get; set; } = null!;
    public Incidencia? Incidencia { get; set; }
}