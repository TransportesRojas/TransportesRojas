namespace Backend.BDFolder;

public class Devolucion
{
    public long Id { get; set; }
    public long EnvioId { get; set; }
    public string Motivo { get; set; } = null!;
    public OrigenSolicitudDevolucion OrigenSolicitud { get; set; }
    public EstadoDevolucion Estado { get; set; } = EstadoDevolucion.Iniciada;
    public string? EvidenciaUrl { get; set; }
    public long? SucursalDestinoId { get; set; }
    public DateTimeOffset FechaInicio { get; set; }
    public DateTimeOffset? FechaRecepcion { get; set; }
    public DateTimeOffset? FechaCierre { get; set; }
    public bool? AceptadaPorRemitente { get; set; }
    public string? Observaciones { get; set; }

    public Envio Envio { get; set; } = null!;
    public Sucursal? SucursalDestino { get; set; }
}

public class Reclamacion
{
    public long Id { get; set; }
    public long? DevolucionId { get; set; }
    public long? EnvioId { get; set; }
    public string Motivo { get; set; } = null!;
    public EstadoReclamacion Estado { get; set; } = EstadoReclamacion.Abierta;
    public string? EvidenciaUrl { get; set; }
    public DateTimeOffset FechaApertura { get; set; }
    public DateTimeOffset? FechaCierre { get; set; }

    public Devolucion? Devolucion { get; set; }
    public Envio? Envio { get; set; }
}

public class Cancelacion
{
    public long Id { get; set; }
    public long EnvioId { get; set; }
    public string Motivo { get; set; } = null!;
    public ActorTipoCancelacion ActorTipo { get; set; }
    public long? ActorUsuarioId { get; set; }
    public EstadoCancelacion Estado { get; set; } = EstadoCancelacion.Solicitada;
    public DateTimeOffset FechaSolicitud { get; set; }
    public DateTimeOffset? FechaAplicacion { get; set; }

    public Envio Envio { get; set; } = null!;
    public Usuario? ActorUsuario { get; set; }
}