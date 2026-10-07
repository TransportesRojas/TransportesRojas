namespace Backend.BDFolder;

public class Empleado
{
    public long Id { get; set; }
    public long UsuarioId { get; set; }
    public long? SucursalId { get; set; }
    public string Nombre { get; set; } = null!;
    public string ApellidoPaterno { get; set; } = null!;
    public string? ApellidoMaterno { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public DateOnly? FechaIngreso { get; set; }
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Usuario Usuario { get; set; } = null!;
    public Sucursal? Sucursal { get; set; }
    public ICollection<EmpleadoPuestoHistorial> PuestoHistorial { get; set; } = new List<EmpleadoPuestoHistorial>();
}

public class EmpleadoPuestoHistorial
{
    public long Id { get; set; }
    public long EmpleadoId { get; set; }
    public long PuestoId { get; set; }
    public DateOnly FechaInicio { get; set; }
    public DateOnly? FechaFin { get; set; }
    public string? Motivo { get; set; }
    public long? RegistradoPor { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Empleado Empleado { get; set; } = null!;
    public Puesto Puesto { get; set; } = null!;
}

public class Cliente
{
    public long Id { get; set; }
    public long? UsuarioId { get; set; }
    public string? Nombre { get; set; }
    public string? ApellidoPaterno { get; set; }
    public string? ApellidoMaterno { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Usuario? Usuario { get; set; }
    public ICollection<ClienteDireccion> Direcciones { get; set; } = new List<ClienteDireccion>();
}

public class ClienteDireccion
{
    public long Id { get; set; }
    public long ClienteId { get; set; }
    public long DireccionId { get; set; }
    public TipoClienteDireccion Tipo { get; set; }
    public bool Predeterminada { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Cliente Cliente { get; set; } = null!;
    public Direccion Direccion { get; set; } = null!;
}