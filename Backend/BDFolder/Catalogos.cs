namespace Backend.BDFolder;

using System.Text.Json;

public class Direccion
{
    public long Id { get; set; }
    public string? Calle { get; set; }
    public string? NumeroExterior { get; set; }
    public string? NumeroInterior { get; set; }
    public string? Colonia { get; set; }
    public string? Municipio { get; set; }
    public string? Estado { get; set; }
    public string Pais { get; set; } = "México";
    public string? CodigoPostal { get; set; }
    public string? Referencias { get; set; }
    public decimal? Latitud { get; set; }
    public decimal? Longitud { get; set; }
    public JsonDocument Metadata { get; set; } = JsonDocument.Parse("{}");
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<Sucursal> Sucursales { get; set; } = new List<Sucursal>();
    public ICollection<ClienteDireccion> ClienteDirecciones { get; set; } = new List<ClienteDireccion>();
}

public class Sucursal
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Codigo { get; set; }
    public long? DireccionId { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Direccion? Direccion { get; set; }
    public ICollection<Empleado> Empleados { get; set; } = new List<Empleado>();
    public ICollection<Flotilla> Flotillas { get; set; } = new List<Flotilla>();
}

public class Rol
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Descripcion { get; set; }

    public ICollection<RolPermiso> RolPermisos { get; set; } = new List<RolPermiso>();
    public ICollection<UsuarioRol> UsuarioRoles { get; set; } = new List<UsuarioRol>();
}

public class Puesto
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Descripcion { get; set; }
}

public class Permiso
{
    public long Id { get; set; }
    public string Codigo { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public string? Descripcion { get; set; }
    public string Modulo { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<RolPermiso> RolPermisos { get; set; } = new List<RolPermiso>();
}

public class RolPermiso
{
    public long RolId { get; set; }
    public long PermisoId { get; set; }
    public Rol Rol { get; set; } = null!;
    public Permiso Permiso { get; set; } = null!;
}