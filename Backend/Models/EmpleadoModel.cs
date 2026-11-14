namespace Backend.Models;

public record CrearEmpleadoCompleto(
    string Nombre,
    string ApellidoPaterno,
    string? ApellidoMaterno,
    string? Telefono,
    string? Email,
    long? SucursalId,
    long? RolId = null,
    DateOnly? FechaIngreso = null,
    long? PuestoId = null,
    List<long>? RolesAdicionalesIds = null
);

public record ActualizarEmpleadoCompleto(
    string Nombre,
    string ApellidoPaterno,
    string? ApellidoMaterno,
    string? Telefono,
    string? Email,
    long? SucursalId,
    DateOnly? FechaIngreso,
    long? PuestoId = null,
    List<long>? RolesIds = null
);

public record CambiarPuestoModel(
    long NuevoPuestoId,
    string? Motivo = null
);

public record HistorialPuestoItem(
    long Id,
    long PuestoId,
    string PuestoNombre,
    DateOnly FechaInicio,
    DateOnly? FechaFin,
    string? Motivo
);

public record EmpleadoResponse(
    long Id,
    long UsuarioId,
    string Nombre,
    string ApellidoPaterno,
    string? ApellidoMaterno,
    string? Telefono,
    string? Email,
    long? SucursalId,
    DateOnly? FechaIngreso,
    bool Activo,
    long? PuestoId = null,
    string? PuestoNombre = null,
    List<string>? Roles = null,
    string? EstadoAcceso = null,
    string? SucursalNombre = null
);

public record EstadoAccesoEmpleadoResponse(
    bool Exito,
    string Mensaje,
    bool TieneAsignacionesPendientes,
    string NuevoEstado
);

public record SucursalCargoItem(
    long Id,
    string Nombre,
    string? Alias,
    string? Codigo
);

public record ExpedienteEmpleadoResponse(
    long Id,
    string Clave,
    string Nombre,
    string ApellidoPaterno,
    string? ApellidoMaterno,
    string NombreCompleto,
    string? Email,
    string? Telefono,
    long? SucursalId,
    string? SucursalNombre,
    string? SucursalAlias,
    string? SucursalCodigo,
    string? PuestoActual,
    DateOnly? FechaIngreso,
    string AntiguedadTexto,
    bool Activo,
    DateTimeOffset CreatedAt,
    List<string> Roles,
    List<HistorialPuestoItem> TrayectoriaLaboral,
    List<SucursalCargoItem> SucursalesACargo
);

