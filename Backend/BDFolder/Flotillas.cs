namespace Backend.BDFolder;

public class Flotilla
{
    public long Id { get; set; }
    public long? SucursalId { get; set; }
    public long? SupervisorId { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Codigo { get; set; }
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Sucursal? Sucursal { get; set; }
    public Empleado? Supervisor { get; set; }
    public ICollection<Unidad> Unidades { get; set; } = new List<Unidad>();
}

public class Unidad
{
    public long Id { get; set; }
    public long? FlotillaId { get; set; }
    public string Placas { get; set; } = null!;
    public string? TipoVehiculo { get; set; }
    public string? Marca { get; set; }
    public string? Modelo { get; set; }
    public int? Anio { get; set; }
    public decimal CapacidadKg { get; set; }
    public decimal? KmOdometroInicial { get; set; }
    public decimal KmOdometroActual { get; set; }
    public EstadoUnidad Estado { get; set; } = EstadoUnidad.Disponible;
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Flotilla? Flotilla { get; set; }
    public ICollection<Mantenimiento> Mantenimientos { get; set; } = new List<Mantenimiento>();
    public ICollection<AlertaMantenimiento> AlertasMantenimiento { get; set; } = new List<AlertaMantenimiento>();
}

public class AsignacionFlotillaChofer
{
    public long Id { get; set; }
    public long FlotillaId { get; set; }
    public long ChoferId { get; set; }
    public DateOnly FechaInicio { get; set; }
    public DateOnly? FechaFin { get; set; }
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }

    public Flotilla Flotilla { get; set; } = null!;
    public Empleado Chofer { get; set; } = null!;
}