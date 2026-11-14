namespace Backend.Models;

using System.Text.Json.Serialization;
using Backend.BDFolder;

public record CrearUsuarioModel(string Email, string Password, string TipoUsuario);

public record ActualizarUsuarioModel(string Email, string TipoUsuario);

public record CambiarPasswordModel(string PasswordActual, string PasswordNueva);

public class CambiarPasswordInicialModel
{
    public string PasswordActual { get; set; } = string.Empty;
    public string PasswordNueva { get; set; } = string.Empty;

    [JsonPropertyName("nuevaPassword")]
    public string? NuevaPassword
    {
        get => PasswordNueva;
        set
        {
            if (!string.IsNullOrWhiteSpace(value))
                PasswordNueva = value;
        }
    }
}

public record SuspenderEmpleadoModel(string Motivo);

public record DesactivarEmpleadoModel(string Motivo);

public record ReactivarEmpleadoModel(string Motivo);

public record DarBajaClienteModel(string Motivo);

public record ActivarCuentaModel(string Token);

public record UsuarioResponse(long Id, string Email, string TipoUsuario, bool Activo, DateTimeOffset? UltimoAcceso);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public record LoginClienteModel(string Email, string Password);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public record LoginEmpleadoModel(long EmpleadoId, string Password);

public record LoginResponse(
    long UsuarioId,
    string Email,
    string TipoUsuario,
    string NombreCompleto,
    long? EmpleadoOClienteId,
    string? Token = null,
    List<string>? Roles = null,
    List<string>? Permisos = null,
    string? Puesto = null,
    string? Sucursal = null,
    bool RequiereCambioPassword = false,
    long? SucursalId = null
);
