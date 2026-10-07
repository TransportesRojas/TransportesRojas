namespace Backend.BDFolder;

public enum TipoUsuario { Empleado, Cliente, Sistema }

public enum EstadoUsuarioHist { Activo, Suspendido, Inhabilitado, Baja }

public enum EstadoUnidad { Disponible, Asignada, Mantenimiento, FueraServicio }

public enum EstadoAlertaMant { Nueva, Vista, Atendida, Cerrada }

public enum EstadoAlerta { Nueva, Vista, Atendida, Cerrada }

public enum TipoAlerta { DesvioRuta, ParadaNoAutorizada, Incidente, Otra }

public enum TipoClienteDireccion { Origen, Entrega, Otra }

public enum EstadoEnvio
{
    Registrado, RecoleccionProgramada, RecoleccionRealizada,
    RecibidoSucursal, AsignadoFlotilla, EnRuta,
    Entregado, NoEntregado, EnDevolucion, Devuelto,
    Cancelado, Reprogramado
}

public enum EstadoCitaRecoleccion { Solicitada, Confirmada, Reprogramada, Atendida, Cancelada }

public enum EstadoRuta { Planeada, EnCurso, Finalizada, Cancelada }

public enum EstadoRutaEnvio { Pendiente, Entregado, Fallido, Reprogramado }

public enum EstadoEntrega { Exitosa, Fallida }

public enum OrigenSolicitudDevolucion { RechazoDestinatario, NoEntregable, SolicitudRemitente }

public enum EstadoDevolucion
{
    Iniciada, EnTransito, RecibidaSucursal,
    EntregadaRemitente, RechazadaRemitente, Reclamacion
}

public enum EstadoReclamacion { Abierta, EnRevision, Resuelta, Cerrada }

public enum ActorTipoCancelacion { Remitente, Chofer, Destinatario, Sistema }

public enum EstadoCancelacion { Solicitada, Aprobada, Rechazada, Aplicada }

public enum TipoIncidencia { Vial, ClienteAusente, DireccionIncorrecta, PaqueteDanado, Otra }

public enum EstadoIncidencia { Abierta, EnRevision, Resuelta, Cerrada }

public enum EstadoReprogramacion { Programada, Confirmada, Cancelada, Atendida }

public enum EstadoQueja { Abierta, EnAtencion, Resuelta, Cerrada }