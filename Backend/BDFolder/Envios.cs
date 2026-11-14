namespace Backend.BDFolder;

using System.Text.Json;

public class Envio
{
    public long Id { get; set; }
    public string Guia { get; set; } = null!;
    public long RemitenteId { get; set; }
    public long? DestinatarioClienteId { get; set; }
    public string DestinatarioNombre { get; set; } = null!;
    public string DestinatarioTelefono { get; set; } = null!;
    public string? DestinatarioEmail { get; set; }
    public int IntentoReparto { get; set; } = 0;

    public bool RequiereRecoleccion { get; set; }
    public long? SucursalRecepcionId { get; set; }
    public long? SucursalDestinoId { get; set; }
    public long? DireccionDestinoId { get; set; }

    public JsonDocument? DireccionOrigenSnapshot { get; set; }
    public JsonDocument? DireccionDestinoSnapshot { get; set; }

    public decimal PesoKg { get; set; }
    public decimal LargoCm { get; set; }
    public decimal AnchoCm { get; set; }
    public decimal AltoCm { get; set; }
    public string Descripcion { get; set; } = null!;
    public decimal? ValorDeclarado { get; set; }

    public string? CodigoValidacionHash { get; set; }
    public EstadoEnvio Estado { get; set; } = EstadoEnvio.Registrado;

    public long? CreadoPorUsuarioId { get; set; }
    public DateTimeOffset FechaCreacion { get; set; }
    public DateTimeOffset? FechaEntregaEstimada { get; set; }
    public JsonDocument Metadata { get; set; } = JsonDocument.Parse("{}");
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Cliente Remitente { get; set; } = null!;
    public Cliente? DestinatarioCliente { get; set; }
    public Sucursal? SucursalRecepcion { get; set; }
    public Sucursal? SucursalDestino { get; set; }
    public Direccion? DireccionDestino { get; set; }
    public Usuario? CreadoPorUsuario { get; set; }

    public ICollection<EventoEnvio> Eventos { get; set; } = new List<EventoEnvio>();
    public ICollection<RutaEnvio> Rutas { get; set; } = new List<RutaEnvio>();
    public ICollection<Entrega> Entregas { get; set; } = new List<Entrega>();
    public ICollection<AvisoSms> AvisosSms { get; set; } = new List<AvisoSms>();
    public RecepcionPaquete? Recepcion { get; set; }
}

public class AvisoSms
{
    public long Id { get; set; }
    public long EnvioId { get; set; }
    public int IntentoReparto { get; set; }
    public string TelefonoDestino { get; set; } = null!;
    public string Mensaje { get; set; } = null!;
    public EstadoAvisoSms Estado { get; set; } = EstadoAvisoSms.Pendiente;
    public string? IdProveedor { get; set; }
    public int IntentosReintento { get; set; } = 0;
    public DateTimeOffset FechaSolicitud { get; set; }
    public DateTimeOffset? FechaConfirmacion { get; set; }

    public Envio Envio { get; set; } = null!;
}

public class EventoEnvio
{
    public long Id { get; set; }
    public long EnvioId { get; set; }
    public string Estado { get; set; } = null!;
    public string? Descripcion { get; set; }
    public decimal? Latitud { get; set; }
    public decimal? Longitud { get; set; }
    public long? UsuarioId { get; set; }
    public DateTimeOffset FechaEvento { get; set; }

    public Envio Envio { get; set; } = null!;
    public Usuario? Usuario { get; set; }
}

public class RecepcionPaquete
{
    public long Id { get; set; }
    public long EnvioId { get; set; }
    public long RecibidoPor { get; set; }
    public DateTimeOffset FechaRecepcion { get; set; }
    public decimal? PesoVerificadoKg { get; set; }
    public decimal? LargoVerificadoCm { get; set; }
    public decimal? AnchoVerificadoCm { get; set; }
    public decimal? AltoVerificadoCm { get; set; }
    public string? EvidenciaFotoUrl { get; set; }
    public string? Observaciones { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Envio Envio { get; set; } = null!;
    public Empleado RecibidoPorEmpleado { get; set; } = null!;
}