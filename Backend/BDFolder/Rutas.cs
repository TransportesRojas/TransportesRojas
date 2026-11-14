namespace Backend.BDFolder;

public class Ruta
{
    public long Id { get; set; }
    public long? ChoferId { get; set; }
    public long? UnidadId { get; set; }
    public long? FlotillaId { get; set; }
    public DateOnly Fecha { get; set; }
    public EstadoRuta Estado { get; set; } = EstadoRuta.Planeada;
    public long? OrigenSucursalId { get; set; }
    public DateTimeOffset? HoraInicio { get; set; }
    public DateTimeOffset? HoraFin { get; set; }
    public decimal? KmInicialOdometro { get; set; }
    public decimal? KmFinalOdometro { get; set; }
    public decimal? KmRecorridos { get; private set; }
    public decimal? DistanciaEstimadaKm { get; set; }
    public int? TiempoEstimadoMin { get; set; }
    public long? CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Empleado? Chofer { get; set; }
    public Unidad? Unidad { get; set; }
    public Flotilla? Flotilla { get; set; }
    public Sucursal? OrigenSucursal { get; set; }
    public Empleado? CreadoPor { get; set; }

    public ICollection<RutaEnvio> Envios { get; set; } = new List<RutaEnvio>();
    public ICollection<CambioRuta> CambiosRuta { get; set; } = new List<CambioRuta>();
}

public class RutaEnvio
{
    public long Id { get; set; }
    public long RutaId { get; set; }
    public long EnvioId { get; set; }
    public int OrdenEntrega { get; set; }
    public EstadoRutaEnvio Estado { get; set; } = EstadoRutaEnvio.Pendiente;

    public Ruta Ruta { get; set; } = null!;
    public Envio Envio { get; set; } = null!;
}

public class Entrega
{
    public long Id { get; set; }
    public long EnvioId { get; set; }
    public int IntentoReparto { get; set; }
    public long ChoferId { get; set; }
    public long? RutaId { get; set; }
    public DateTimeOffset FechaHora { get; set; }
    public string? CodigoIngresado { get; set; }
    public bool Validado { get; set; }
    public string? EvidenciaFotoUrl { get; set; }
    public string? FirmaUrl { get; set; }
    public decimal? Latitud { get; set; }
    public decimal? Longitud { get; set; }
    public EstadoEntrega Estado { get; set; }
    public string? Observaciones { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Envio Envio { get; set; } = null!;
    public Empleado Chofer { get; set; } = null!;
    public Ruta? Ruta { get; set; }
}

public class CambioRuta
{
    public long Id { get; set; }
    public string Folio { get; set; } = null!;
    public long RutaId { get; set; }
    public long ChoferId { get; set; }
    public long? UnidadId { get; set; }
    public string Motivo { get; set; } = null!;
    public string? ReferenciaLugar { get; set; }
    public string DescripcionTrayecto { get; set; } = null!;
    public DateTimeOffset FechaEvento { get; set; }
    public bool AfectaEntrega { get; set; } = false;
    public EstadoAvisoCambioRuta EstadoAviso { get; set; } = EstadoAvisoCambioRuta.Pendiente;
    public DateTimeOffset FechaRegistro { get; set; }

    public Ruta Ruta { get; set; } = null!;
    public Empleado Chofer { get; set; } = null!;
    public Unidad? Unidad { get; set; }
}