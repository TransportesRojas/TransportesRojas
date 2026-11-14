namespace Backend.BDFolder;

using System.Text.Json;

public class CatEstado
{
    public short Id { get; set; }
    public string Cvegeo { get; set; } = null!;
    public string CveEnt { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public string Abreviatura { get; set; } = null!;
    public bool Activo { get; set; } = true;

    public ICollection<CatMunicipio> Municipios { get; set; } = new List<CatMunicipio>();
    public ICollection<CatLocalidad> Localidades { get; set; } = new List<CatLocalidad>();
    public ICollection<CatAsentamiento> Asentamientos { get; set; } = new List<CatAsentamiento>();
    public ICollection<Direccion> Direcciones { get; set; } = new List<Direccion>();
    public ICollection<SucursalCobertura> CoberturasSucursal { get; set; } = new List<SucursalCobertura>();
}

public class CatMunicipio
{
    public int Id { get; set; }
    public short EstadoId { get; set; }
    public string Cvegeo { get; set; } = null!;
    public string CveEnt { get; set; } = null!;
    public string CveMun { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public string? CveCab { get; set; }
    public string? NomCab { get; set; }
    public bool Activo { get; set; } = true;

    public CatEstado Estado { get; set; } = null!;
    public ICollection<CatLocalidad> Localidades { get; set; } = new List<CatLocalidad>();
    public ICollection<CatAsentamiento> Asentamientos { get; set; } = new List<CatAsentamiento>();
    public ICollection<Direccion> Direcciones { get; set; } = new List<Direccion>();
    public ICollection<SucursalCobertura> CoberturasSucursal { get; set; } = new List<SucursalCobertura>();
}

public class CatLocalidad
{
    public long Id { get; set; }
    public short EstadoId { get; set; }
    public int MunicipioId { get; set; }
    public string Cvegeo { get; set; } = null!;
    public string? Estatus { get; set; }
    public string CveEnt { get; set; } = null!;
    public string CveMun { get; set; } = null!;
    public string CveLoc { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public string? Ambito { get; set; }
    public decimal? LatDecimal { get; set; }
    public decimal? LonDecimal { get; set; }
    public int? Altitud { get; set; }
    public bool Activo { get; set; } = true;

    public CatEstado Estado { get; set; } = null!;
    public CatMunicipio Municipio { get; set; } = null!;
    public ICollection<Direccion> Direcciones { get; set; } = new List<Direccion>();
}

public class CatAsentamiento
{
    public long Id { get; set; }
    public short EstadoId { get; set; }
    public int MunicipioId { get; set; }
    public string DCodigo { get; set; } = null!;
    public string DAsenta { get; set; } = null!;
    public string DTipoAsenta { get; set; } = null!;
    public string? DCiudad { get; set; }
    public string? DCp { get; set; }
    public string CEstado { get; set; } = null!;
    public string? COficina { get; set; }
    public string? CCp { get; set; }
    public string? CTipoAsenta { get; set; }
    public string CMnpio { get; set; } = null!;
    public string IdAsentaCpcons { get; set; } = null!;
    public string? DZona { get; set; }
    public string? CCveCiudad { get; set; }
    public bool Activo { get; set; } = true;

    public CatEstado Estado { get; set; } = null!;
    public CatMunicipio Municipio { get; set; } = null!;
    public ICollection<Direccion> Direcciones { get; set; } = new List<Direccion>();
}

public class Direccion
{
    public long Id { get; set; }
    public short? EstadoId { get; set; }
    public int? MunicipioId { get; set; }
    public long? LocalidadId { get; set; }
    public long? AsentamientoId { get; set; }
    public string? Calle { get; set; }
    public string? NumeroExterior { get; set; }
    public string? NumeroInterior { get; set; }
    public string? EntreCalles { get; set; }
    public string? Colonia { get; set; }
    public string? Localidad { get; set; }
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

    public CatEstado? CatEstado { get; set; }
    public CatMunicipio? CatMunicipio { get; set; }
    public CatLocalidad? CatLocalidad { get; set; }
    public CatAsentamiento? CatAsentamiento { get; set; }
    public ICollection<Sucursal> Sucursales { get; set; } = new List<Sucursal>();
    public ICollection<ClienteDireccion> ClienteDirecciones { get; set; } = new List<ClienteDireccion>();
}

public class Sucursal
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string? NombreCorto { get; set; }
    public string? Codigo { get; set; }
    public long? DireccionId { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public string? Cobertura { get; set; }
    public long? ResponsableId { get; set; }
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Direccion? Direccion { get; set; }
    public Empleado? Responsable { get; set; }
    public ICollection<Empleado> Empleados { get; set; } = new List<Empleado>();
    public ICollection<Flotilla> Flotillas { get; set; } = new List<Flotilla>();
    public ICollection<HorarioSucursal> Horarios { get; set; } = new List<HorarioSucursal>();
    public ICollection<SucursalCobertura> Coberturas { get; set; } = new List<SucursalCobertura>();
}

public class SucursalCobertura
{
    public long Id { get; set; }
    public long SucursalId { get; set; }
    public short EstadoId { get; set; }
    public int? MunicipioId { get; set; }
    public string? CodigoPostal { get; set; }
    public bool AplicaRecoleccion { get; set; } = true;
    public bool AplicaEntrega { get; set; } = true;
    public bool EsZonaExtendida { get; set; } = false;
    public short DiasEstimados { get; set; } = 1;
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }

    public Sucursal Sucursal { get; set; } = null!;
    public CatEstado Estado { get; set; } = null!;
    public CatMunicipio? Municipio { get; set; }
}

public class HorarioSucursal
{
    public long Id { get; set; }
    public long SucursalId { get; set; }
    public int DiaSemana { get; set; }
    public TimeOnly? HoraApertura { get; set; }
    public TimeOnly? HoraCierre { get; set; }
    public bool EsDiaDescanso { get; set; } = false;
    public DateTimeOffset CreatedAt { get; set; }

    public Sucursal Sucursal { get; set; } = null!;
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
