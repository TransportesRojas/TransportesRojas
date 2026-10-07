namespace Backend.BDFolder;

public class TipoMantenimiento
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Descripcion { get; set; }
    public int KmIntervalo { get; set; }
    public string? AplicaATipoVehiculo { get; set; }
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public class AlertaMantenimiento
{
    public long Id { get; set; }
    public long UnidadId { get; set; }
    public long TipoMantenimientoId { get; set; }
    public decimal KmAlMomento { get; set; }
    public decimal KmUmbral { get; set; }
    public decimal? KmUltimoMantenimiento { get; set; }
    public string? Descripcion { get; set; }
    public EstadoAlertaMant Estado { get; set; } = EstadoAlertaMant.Nueva;
    public long? AtendidaPor { get; set; }
    public DateTimeOffset FechaAlerta { get; set; }
    public DateTimeOffset? FechaAtencion { get; set; }

    public Unidad Unidad { get; set; } = null!;
    public TipoMantenimiento TipoMantenimiento { get; set; } = null!;
    public Empleado? AtendidaPorEmpleado { get; set; }
}

public class Mantenimiento
{
    public long Id { get; set; }
    public long UnidadId { get; set; }
    public long TipoMantenimientoId { get; set; }
    public long? AlertaId { get; set; }
    public DateTimeOffset FechaRealizado { get; set; }
    public decimal KmAlMomento { get; set; }
    public decimal? Costo { get; set; }
    public string? Taller { get; set; }
    public string? Descripcion { get; set; }
    public string? EvidenciaUrl { get; set; }
    public long? RealizadoPor { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Unidad Unidad { get; set; } = null!;
    public TipoMantenimiento TipoMantenimiento { get; set; } = null!;
    public AlertaMantenimiento? Alerta { get; set; }
    public Empleado? RealizadoPorEmpleado { get; set; }
}