namespace Backend.BDFolder;

public class Evaluacion
{
    public long Id { get; set; }
    public long EnvioId { get; set; }
    public int Puntuacion { get; set; }
    public string? Comentarios { get; set; }
    public DateTimeOffset FechaEvaluacion { get; set; }

    public Envio Envio { get; set; } = null!;
}

public class Queja
{
    public long Id { get; set; }
    public string Folio { get; set; } = null!;
    public long? EnvioId { get; set; }
    public string Motivo { get; set; } = null!;
    public string? Descripcion { get; set; }
    public EstadoQueja Estado { get; set; } = EstadoQueja.Abierta;
    public DateTimeOffset FechaReporte { get; set; }
    public DateTimeOffset? FechaCierre { get; set; }
    public string? Resolucion { get; set; }
    public long? AtendidaPor { get; set; }

    public Envio? Envio { get; set; }
    public Empleado? AtendidaPorEmpleado { get; set; }
    public ICollection<QuejaSeguimiento> Seguimientos { get; set; } = new List<QuejaSeguimiento>();
}

public class QuejaSeguimiento
{
    public long Id { get; set; }
    public long QuejaId { get; set; }
    public long EmpleadoId { get; set; }
    public string Accion { get; set; } = null!;
    public string? EstadoAnterior { get; set; }
    public string? EstadoNuevo { get; set; }
    public DateTimeOffset Fecha { get; set; }

    public Queja Queja { get; set; } = null!;
    public Empleado Empleado { get; set; } = null!;
}