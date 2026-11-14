namespace Backend.Models;

public record HorarioSucursalItem(
    int DiaSemana,
    TimeOnly? HoraApertura,
    TimeOnly? HoraCierre,
    bool EsDiaDescanso = false
);

public record CrearSucursalModel(
    string Nombre,
    string? Direccion,
    string? Ciudad,
    string? Estado,
    string? CodigoPostal,
    string? Telefono,
    string? Calle = null,
    string? Municipio = null,
    string? NombreCorto = null,
    string? Codigo = null,
    string? Email = null,
    string? Cobertura = null,
    long? ResponsableId = null,
    List<HorarioSucursalItem>? Horarios = null
)
{
    public string? ObtenerCalle() => !string.IsNullOrWhiteSpace(Calle) ? Calle : Direccion;
    public string? ObtenerCiudad() => !string.IsNullOrWhiteSpace(Municipio) ? Municipio : Ciudad;
}

public record ActualizarSucursalModel(
    string Nombre,
    string? Direccion,
    string? Ciudad,
    string? Estado,
    string? CodigoPostal,
    string? Telefono,
    string? Calle = null,
    string? Municipio = null,
    string? NombreCorto = null,
    string? Codigo = null,
    string? Email = null,
    string? Cobertura = null,
    long? ResponsableId = null,
    List<HorarioSucursalItem>? Horarios = null
)
{
    public string? ObtenerCalle() => !string.IsNullOrWhiteSpace(Calle) ? Calle : Direccion;
    public string? ObtenerCiudad() => !string.IsNullOrWhiteSpace(Municipio) ? Municipio : Ciudad;
}

public record SucursalResponse(
    long Id,
    string Nombre,
    string? Direccion,
    string? Ciudad,
    string? Estado,
    string? CodigoPostal,
    string? Telefono,
    string? Calle = null,
    string? Municipio = null,
    string? NombreCorto = null,
    string? Codigo = null,
    string? Email = null,
    string? Cobertura = null,
    long? ResponsableId = null,
    string? ResponsableNombre = null,
    List<HorarioSucursalItem>? Horarios = null
);
