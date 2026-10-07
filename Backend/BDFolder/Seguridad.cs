namespace Backend.BDFolder;

public class Usuario
{
    public long Id { get; set; }
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public TipoUsuario TipoUsuario { get; set; }
    public bool Activo { get; set; } = true;
    public DateTimeOffset? UltimoAcceso { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<UsuarioRol> UsuarioRoles { get; set; } = new List<UsuarioRol>();
    public ICollection<UsuarioEstadoHistorial> Estados { get; set; } = new List<UsuarioEstadoHistorial>();
    public Empleado? Empleado { get; set; }
    public Cliente? Cliente { get; set; }
}

public class UsuarioRol
{
    public long UsuarioId { get; set; }
    public long RolId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public Rol Rol { get; set; } = null!;
}

public class UsuarioEstadoHistorial
{
    public long Id { get; set; }
    public long UsuarioId { get; set; }
    public EstadoUsuarioHist Estado { get; set; }
    public string? Motivo { get; set; }
    public DateTimeOffset FechaInicio { get; set; }
    public DateTimeOffset? FechaFin { get; set; }
    public long? RegistradoPor { get; set; }

    public Usuario Usuario { get; set; } = null!;
    public Empleado? RegistradoPorEmpleado { get; set; }
}