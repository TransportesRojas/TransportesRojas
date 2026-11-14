using System.Data;
using Backend.BDFolder;
using Backend.Exceptions;
using Backend.Helpers;
using Backend.Models;
using Backend.Policies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Polly;

namespace Backend.Services;

public class EmpleadoService
{
    private readonly IDbContextFactory<TransportesRojasDbContext> _factory;
    private readonly ILogger<EmpleadoService> _logger;
    private readonly ResiliencePipeline _pipeline;

    private static readonly Dictionary<string, string> PuestoToRolDefault = new(StringComparer.OrdinalIgnoreCase)
    {
        { "Chofer", "Chofer" },
        { "Supervisor", "Supervisor" },
        { "Jefe de flotilla", "Jefe de flotilla" },
        { "Atención a clientes", "Personal de sucursal" },
        { "Recursos Humanos", "RH" },
        { "Administrativo", "Personal administrativo" },
        { "Personal de sucursal", "Personal de sucursal" },
        { "Gerente General", "Jefe" }
    };

    public EmpleadoService(
        IDbContextFactory<TransportesRojasDbContext> factory,
        ILogger<EmpleadoService> logger)
    {
        _factory = factory;
        _logger = logger;
        _pipeline = PollyPolicies.CrearPipelineSerializacion(logger);
    }

    public async Task<List<EmpleadoResponse>> GetEmpleadosAsync(int skip = 0, int take = 100)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var lista = await ctx.Empleados
            .AsNoTracking()
            .Include(e => e.Sucursal)
            .Include(e => e.Usuario)
                .ThenInclude(u => u.UsuarioRoles)
                    .ThenInclude(ur => ur.Rol)
            .Include(e => e.Usuario)
                .ThenInclude(u => u.Estados)
            .Include(e => e.PuestoHistorial)
                .ThenInclude(ph => ph.Puesto)
            .OrderBy(e => e.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return lista.Select(e =>
        {
            var puestoActivo = e.PuestoHistorial
                .Where(ph => ph.FechaFin == null)
                .OrderByDescending(ph => ph.FechaInicio)
                .FirstOrDefault();

            var roles = e.Usuario?.UsuarioRoles
                .Select(ur => ur.Rol.Nombre)
                .Distinct()
                .ToList() ?? new List<string>();

            var estadoAcceso = "activo";
            if (!e.Activo || (e.Usuario != null && !e.Usuario.Activo))
            {
                var ultimoHist = e.Usuario?.Estados?.OrderByDescending(h => h.FechaInicio).FirstOrDefault();
                estadoAcceso = ultimoHist?.Estado == EstadoUsuarioHist.Suspendido ? "suspendido" : "desactivado";
            }

            var sucursalNombre = e.Sucursal?.NombreCorto ?? e.Sucursal?.Nombre;

            return new EmpleadoResponse(
                e.Id, e.UsuarioId, e.Nombre, e.ApellidoPaterno, e.ApellidoMaterno,
                e.Telefono, e.Email, e.SucursalId, e.FechaIngreso, e.Activo,
                puestoActivo?.PuestoId, puestoActivo?.Puesto?.Nombre, roles, estadoAcceso, sucursalNombre);
        }).ToList();
    }

    public async Task<EmpleadoResponse?> GetEmpleadoByIdAsync(long id)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var e = await ctx.Empleados
            .AsNoTracking()
            .Include(x => x.Sucursal)
            .Include(x => x.Usuario)
                .ThenInclude(u => u.UsuarioRoles)
                    .ThenInclude(ur => ur.Rol)
            .Include(x => x.Usuario)
                .ThenInclude(u => u.Estados)
            .Include(x => x.PuestoHistorial)
                .ThenInclude(ph => ph.Puesto)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (e is null) return null;

        var puestoActivo = e.PuestoHistorial
            .Where(ph => ph.FechaFin == null)
            .OrderByDescending(ph => ph.FechaInicio)
            .FirstOrDefault();

        var roles = e.Usuario?.UsuarioRoles
            .Select(ur => ur.Rol.Nombre)
            .Distinct()
            .ToList() ?? new List<string>();

        var estadoAcceso = "activo";
        if (!e.Activo || (e.Usuario != null && !e.Usuario.Activo))
        {
            var ultimoHist = e.Usuario?.Estados?.OrderByDescending(h => h.FechaInicio).FirstOrDefault();
            estadoAcceso = ultimoHist?.Estado == EstadoUsuarioHist.Suspendido ? "suspendido" : "desactivado";
        }

        var sucursalNombre = e.Sucursal?.NombreCorto ?? e.Sucursal?.Nombre;

        return new EmpleadoResponse(
            e.Id, e.UsuarioId, e.Nombre, e.ApellidoPaterno, e.ApellidoMaterno,
            e.Telefono, e.Email, e.SucursalId, e.FechaIngreso, e.Activo,
            puestoActivo?.PuestoId, puestoActivo?.Puesto?.Nombre, roles, estadoAcceso, sucursalNombre);
    }

    public async Task<List<HistorialPuestoItem>> GetHistorialPuestosAsync(long empleadoId)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        return await ctx.EmpleadosPuestosHistorial
            .AsNoTracking()
            .Where(h => h.EmpleadoId == empleadoId)
            .Include(h => h.Puesto)
            .OrderByDescending(h => h.FechaInicio)
            .Select(h => new HistorialPuestoItem(
                h.Id,
                h.PuestoId,
                h.Puesto.Nombre,
                h.FechaInicio,
                h.FechaFin,
                h.Motivo
            ))
            .ToListAsync();
    }

    public async Task<EmpleadoResponse> CreateEmpleadoAsync(CrearEmpleadoCompleto model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var telefonoNormalizado = ValidacionEntradaHelper.NormalizarTelefonoDiezDigitos(model.Telefono, obligatorio: false);
                var nombreLimpio = ValidacionEntradaHelper.ValidarNombrePersonaSinNumeros(model.Nombre, obligatorio: true, "nombre");
                var apPaternoLimpio = ValidacionEntradaHelper.ValidarNombrePersonaSinNumeros(model.ApellidoPaterno, obligatorio: true, "apellido paterno");
                var apMaternoLimpio = ValidacionEntradaHelper.ValidarNombrePersonaOpcionalSinNumeros(model.ApellidoMaterno, "apellido materno");

                if (!model.SucursalId.HasValue || model.SucursalId.Value <= 0)
                    throw new InvalidOperationException("La sucursal de adscripción es obligatoria para registrar un empleado.");

                var existeEmail = await ctx.Usuarios.AnyAsync(u => u.Email == model.Email, ct);
                if (existeEmail)
                    throw new InvalidOperationException($"Ya existe un usuario con el email '{model.Email}'");

                Puesto? puestoSeleccionado = null;
                if (model.PuestoId.HasValue)
                {
                    puestoSeleccionado = await ctx.Puestos.FindAsync(new object[] { model.PuestoId.Value }, ct);
                    if (puestoSeleccionado == null)
                        throw new InvalidOperationException($"No se encontró el puesto con Id {model.PuestoId.Value}");
                }

                string nombrePart = (model.Nombre ?? "XX").PadRight(2, 'X').Substring(0, 2);
                string apellidoPart = (model.ApellidoPaterno ?? "XX").PadRight(2, 'X').Substring(0, 2);
                string letras = $"{char.ToUpper(nombrePart[0])}{char.ToLower(nombrePart[1])}{char.ToLower(apellidoPart[0])}{char.ToUpper(apellidoPart[1])}";
                string telefonoPart = string.IsNullOrWhiteSpace(telefonoNormalizado)
                    ? "0000000"
                    : telefonoNormalizado;
                string passwordGenerada = $"{letras}{telefonoPart}!";

                _logger.LogInformation("================================================");
                _logger.LogInformation($"CONTRASEÑA GENERADA PARA EMPLEADO: {passwordGenerada}");
                _logger.LogInformation("================================================");

                var passwordHasher = new Microsoft.AspNetCore.Identity.PasswordHasher<object>();
                var nuevoUsuario = new Usuario
                {
                    Email = model.Email ?? throw new InvalidOperationException("El correo electrónico es obligatorio."),
                    PasswordHash = passwordHasher.HashPassword(new { }, passwordGenerada),
                    TipoUsuario = Backend.BDFolder.TipoUsuario.Empleado,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                ctx.Usuarios.Add(nuevoUsuario);
                await ctx.SaveChangesAsync(ct);

                var rolesIdsAAsignar = new HashSet<long>();

                if (puestoSeleccionado != null && PuestoToRolDefault.TryGetValue(puestoSeleccionado.Nombre, out var rolDefaultNombre))
                {
                    var rolDefault = await ctx.Roles.FirstOrDefaultAsync(r => r.Nombre == rolDefaultNombre, ct);
                    if (rolDefault != null)
                    {
                        rolesIdsAAsignar.Add(rolDefault.Id);
                    }
                }

                if (model.RolId.HasValue)
                {
                    rolesIdsAAsignar.Add(model.RolId.Value);
                }

                if (model.RolesAdicionalesIds != null)
                {
                    foreach (var rid in model.RolesAdicionalesIds)
                    {
                        rolesIdsAAsignar.Add(rid);
                    }
                }

                foreach (var rolId in rolesIdsAAsignar)
                {
                    ctx.UsuarioRoles.Add(new UsuarioRol
                    {
                        UsuarioId = nuevoUsuario.Id,
                        RolId = rolId
                    });
                }
                if (rolesIdsAAsignar.Count > 0)
                {
                    await ctx.SaveChangesAsync(ct);
                }

                var nuevoEmpleado = new Empleado
                {
                    UsuarioId = nuevoUsuario.Id,
                    Nombre = nombreLimpio,
                    ApellidoPaterno = apPaternoLimpio,
                    ApellidoMaterno = apMaternoLimpio,
                    Telefono = telefonoNormalizado,
                    Email = model.Email,
                    SucursalId = model.SucursalId,
                    FechaIngreso = model.FechaIngreso,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                ctx.Empleados.Add(nuevoEmpleado);
                await ctx.SaveChangesAsync(ct);

                if (model.PuestoId.HasValue)
                {
                    var puestoHistorial = new EmpleadoPuestoHistorial
                    {
                        EmpleadoId = nuevoEmpleado.Id,
                        PuestoId = model.PuestoId.Value,
                        FechaInicio = model.FechaIngreso ?? DateOnly.FromDateTime(DateTime.UtcNow),
                        FechaFin = null,
                        Motivo = "Ingreso inicial de empleado",
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    ctx.EmpleadosPuestosHistorial.Add(puestoHistorial);
                    await ctx.SaveChangesAsync(ct);
                }

                await tx.CommitAsync(ct);

                _logger.LogInformation("Empleado creado con éxito. Id={Id}, Puesto={Puesto}", nuevoEmpleado.Id, puestoSeleccionado?.Nombre);

                var rolesNombres = await ctx.UsuarioRoles
                    .Where(ur => ur.UsuarioId == nuevoUsuario.Id)
                    .Select(ur => ur.Rol.Nombre)
                    .ToListAsync();

                string? sucursalNombre = null;
                if (nuevoEmpleado.SucursalId.HasValue)
                {
                    var suc = await ctx.Sucursales.FindAsync(new object[] { nuevoEmpleado.SucursalId.Value }, ct);
                    sucursalNombre = suc?.NombreCorto ?? suc?.Nombre;
                }

                return new EmpleadoResponse(
                    nuevoEmpleado.Id, nuevoEmpleado.UsuarioId, nuevoEmpleado.Nombre,
                    nuevoEmpleado.ApellidoPaterno, nuevoEmpleado.ApellidoMaterno,
                    nuevoEmpleado.Telefono, nuevoEmpleado.Email, nuevoEmpleado.SucursalId,
                    nuevoEmpleado.FechaIngreso, nuevoEmpleado.Activo,
                    puestoSeleccionado?.Id, puestoSeleccionado?.Nombre, rolesNombres, "activo", sucursalNombre);
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al crear empleado.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> UpdateEmpleadoAsync(long id, ActualizarEmpleadoCompleto model)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var telefonoNormalizado = ValidacionEntradaHelper.NormalizarTelefonoDiezDigitos(model.Telefono, obligatorio: false);
                var nombreLimpio = ValidacionEntradaHelper.ValidarNombrePersonaSinNumeros(model.Nombre, obligatorio: true, "nombre");
                var apPaternoLimpio = ValidacionEntradaHelper.ValidarNombrePersonaSinNumeros(model.ApellidoPaterno, obligatorio: true, "apellido paterno");
                var apMaternoLimpio = ValidacionEntradaHelper.ValidarNombrePersonaOpcionalSinNumeros(model.ApellidoMaterno, "apellido materno");

                var empleado = await ctx.Empleados
                    .Include(e => e.Usuario)
                    .FirstOrDefaultAsync(e => e.Id == id, ct);

                if (empleado is null) return false;

                empleado.Nombre = nombreLimpio;
                empleado.ApellidoPaterno = apPaternoLimpio;
                empleado.ApellidoMaterno = apMaternoLimpio;
                empleado.Telefono = telefonoNormalizado;
                empleado.Email = model.Email;
                empleado.SucursalId = model.SucursalId;
                empleado.FechaIngreso = model.FechaIngreso;

                if (model.RolesIds != null && empleado.Usuario != null)
                {
                    var rolesActuales = await ctx.UsuarioRoles.Where(ur => ur.UsuarioId == empleado.UsuarioId).ToListAsync(ct);
                    ctx.UsuarioRoles.RemoveRange(rolesActuales);

                    foreach (var rid in model.RolesIds.Distinct())
                    {
                        ctx.UsuarioRoles.Add(new UsuarioRol
                        {
                            UsuarioId = empleado.UsuarioId,
                            RolId = rid
                        });
                    }
                }

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Empleado actualizado. Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al actualizar empleado.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> CambiarPuestoAsync(long empleadoId, CambiarPuestoModel model, long? registradoPorId = null)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var empleado = await ctx.Empleados.FindAsync(new object[] { empleadoId }, ct);
                if (empleado is null) return false;

                var nuevoPuesto = await ctx.Puestos.FindAsync(new object[] { model.NuevoPuestoId }, ct);
                if (nuevoPuesto is null)
                    throw new InvalidOperationException($"El puesto con Id {model.NuevoPuestoId} no existe.");

                var hoy = DateOnly.FromDateTime(DateTime.UtcNow);

                var puestoActual = await ctx.EmpleadosPuestosHistorial
                    .Where(h => h.EmpleadoId == empleadoId && h.FechaFin == null)
                    .OrderByDescending(h => h.FechaInicio)
                    .FirstOrDefaultAsync(ct);

                if (puestoActual != null && puestoActual.PuestoId == model.NuevoPuestoId)
                    throw new InvalidOperationException("El empleado ya tiene asignado este puesto como activo.");

                if (puestoActual != null)
                {
                    puestoActual.FechaFin = hoy;
                }

                var nuevoHistorial = new EmpleadoPuestoHistorial
                {
                    EmpleadoId = empleadoId,
                    PuestoId = model.NuevoPuestoId,
                    PuestoAnteriorId = puestoActual?.PuestoId,
                    FechaInicio = hoy,
                    FechaFin = null,
                    Motivo = model.Motivo ?? "Promoción o reasignación de puesto",
                    RegistradoPor = registradoPorId,
                    CreatedAt = DateTimeOffset.UtcNow
                };

                ctx.EmpleadosPuestosHistorial.Add(nuevoHistorial);
                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Cambio de puesto aplicado para empleado {EmpleadoId} a puesto {PuestoId}", empleadoId, model.NuevoPuestoId);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al cambiar de puesto.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<bool> DeleteEmpleadoAsync(long id)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var empleado = await ctx.Empleados.FindAsync(new object[] { id }, ct);
                if (empleado is null) return false;

                empleado.Activo = false;
                
                var usuario = await ctx.Usuarios.FindAsync(new object[] { empleado.UsuarioId }, ct);
                if (usuario != null)
                    usuario.Activo = false;

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Empleado desactivado (baja lógica). Id={Id}", id);
                return true;
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al eliminar empleado.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    // Control de acceso y estado de cuenta

    public async Task<EstadoAccesoEmpleadoResponse> SuspenderAccesoEmpleadoAsync(long id, string motivo, long? registradoPorId)
    {
        if (string.IsNullOrWhiteSpace(motivo))
            throw new InvalidOperationException("Debe indicar el motivo de la suspensión.");

        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var empleado = await ctx.Empleados
                    .Include(e => e.Usuario)
                    .FirstOrDefaultAsync(e => e.Id == id, ct);

                if (empleado is null)
                    throw new KeyNotFoundException($"No se encontró el empleado con Id {id}.");

                if (!empleado.Activo || (empleado.Usuario != null && !empleado.Usuario.Activo))
                    throw new InvalidOperationException("El empleado no tiene un acceso activo que pueda suspenderse.");

                var tieneRutasPendientes = await ctx.Rutas.AnyAsync(r =>
                    r.ChoferId == id && (r.Estado == EstadoRuta.Planeada || r.Estado == EstadoRuta.EnCurso), ct);

                var ahora = DateTimeOffset.UtcNow;
                empleado.Activo = false;
                if (empleado.Usuario != null)
                {
                    empleado.Usuario.Activo = false;
                    empleado.Usuario.UpdatedAt = ahora;
                }

                ctx.UsuarioEstadosHistorial.Add(new UsuarioEstadoHistorial
                {
                    UsuarioId = empleado.UsuarioId,
                    Estado = EstadoUsuarioHist.Suspendido,
                    Motivo = motivo.Trim(),
                    FechaInicio = ahora,
                    RegistradoPor = registradoPorId
                });

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Acceso de empleado {Id} suspendido temporalmente. Motivo: {Motivo}", id, motivo);

                var advertenciaMsg = tieneRutasPendientes
                    ? "El acceso fue suspendido. Advertencia: El empleado cuenta con rutas asignadas pendientes o en curso que requieren reasignación por parte del supervisor."
                    : "El acceso del empleado ha sido suspendido temporalmente.";

                return new EstadoAccesoEmpleadoResponse(true, advertenciaMsg, tieneRutasPendientes, "suspendido");
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al suspender acceso de empleado.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<EstadoAccesoEmpleadoResponse> DesactivarAccesoEmpleadoAsync(long id, string motivo, long? registradoPorId)
    {
        if (string.IsNullOrWhiteSpace(motivo))
            throw new InvalidOperationException("Debe indicar el motivo de la baja definitiva.");

        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var empleado = await ctx.Empleados
                    .Include(e => e.Usuario)
                        .ThenInclude(u => u.Estados)
                    .FirstOrDefaultAsync(e => e.Id == id, ct);

                if (empleado is null)
                    throw new KeyNotFoundException($"No se encontró el empleado con Id {id}.");

                var ultimoHist = empleado.Usuario?.Estados?.OrderByDescending(h => h.FechaInicio).FirstOrDefault();
                if (ultimoHist?.Estado == EstadoUsuarioHist.Baja)
                    throw new InvalidOperationException("El acceso ya se encuentra desactivado.");

                var tieneRutasPendientes = await ctx.Rutas.AnyAsync(r =>
                    r.ChoferId == id && (r.Estado == EstadoRuta.Planeada || r.Estado == EstadoRuta.EnCurso), ct);

                var ahora = DateTimeOffset.UtcNow;
                empleado.Activo = false;
                if (empleado.Usuario != null)
                {
                    empleado.Usuario.Activo = false;
                    empleado.Usuario.UpdatedAt = ahora;
                }

                ctx.UsuarioEstadosHistorial.Add(new UsuarioEstadoHistorial
                {
                    UsuarioId = empleado.UsuarioId,
                    Estado = EstadoUsuarioHist.Baja,
                    Motivo = motivo.Trim(),
                    FechaInicio = ahora,
                    RegistradoPor = registradoPorId
                });

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Acceso de empleado {Id} desactivado definitivamente. Motivo: {Motivo}", id, motivo);

                var advertenciaMsg = tieneRutasPendientes
                    ? "El acceso fue desactivado de forma definitiva. Advertencia: Existen rutas asignadas pendientes o en curso que deben ser reasignadas."
                    : "El acceso del empleado ha sido desactivado de forma definitiva.";

                return new EstadoAccesoEmpleadoResponse(true, advertenciaMsg, tieneRutasPendientes, "desactivado");
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al desactivar acceso de empleado.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    public async Task<EstadoAccesoEmpleadoResponse> ReactivarAccesoEmpleadoAsync(long id, string motivo, long? registradoPorId)
    {
        if (string.IsNullOrWhiteSpace(motivo))
            throw new InvalidOperationException("Debe indicar el motivo de la reactivación.");

        return await _pipeline.ExecuteAsync(async ct =>
        {
            await using var ctx = await _factory.CreateDbContextAsync(ct);
            await using var tx = await ctx.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            try
            {
                var empleado = await ctx.Empleados
                    .Include(e => e.Usuario)
                        .ThenInclude(u => u.Estados)
                    .FirstOrDefaultAsync(e => e.Id == id, ct);

                if (empleado is null)
                    throw new KeyNotFoundException($"No se encontró el empleado con Id {id}.");

                var ahora = DateTimeOffset.UtcNow;
                var ultimoHist = empleado.Usuario?.Estados?.OrderByDescending(h => h.FechaInicio).FirstOrDefault();
                if (ultimoHist != null)
                {
                    ultimoHist.FechaFin = ahora;
                }

                empleado.Activo = true;
                if (empleado.Usuario != null)
                {
                    empleado.Usuario.Activo = true;
                    empleado.Usuario.UpdatedAt = ahora;
                }

                ctx.UsuarioEstadosHistorial.Add(new UsuarioEstadoHistorial
                {
                    UsuarioId = empleado.UsuarioId,
                    Estado = EstadoUsuarioHist.Activo,
                    Motivo = motivo.Trim(),
                    FechaInicio = ahora,
                    RegistradoPor = registradoPorId
                });

                await ctx.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                _logger.LogInformation("Acceso de empleado {Id} reactivado exitosamente.", id);
                return new EstadoAccesoEmpleadoResponse(true, "El acceso del empleado ha sido reactivado correctamente.", false, "activo");
            }
            catch (Exception ex) when (PostgresErrorHelper.IsSerializationFailure(ex))
            {
                await tx.RollbackAsync(ct);
                throw new RetryableException("Conflicto de serialización al reactivar acceso de empleado.", ex);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }, CancellationToken.None);
    }

    // Expediente y validación de roles

    public async Task<ExpedienteEmpleadoResponse?> GetExpedienteEmpleadoAsync(long id)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var empleado = await ctx.Empleados
            .AsNoTracking()
            .Include(e => e.Sucursal)
            .Include(e => e.SucursalesACargo)
            .Include(e => e.Usuario)
                .ThenInclude(u => u.UsuarioRoles)
                    .ThenInclude(ur => ur.Rol)
            .Include(e => e.PuestoHistorial)
                .ThenInclude(ph => ph.Puesto)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (empleado == null) return null;

        var puestoActivo = empleado.PuestoHistorial
            .Where(ph => ph.FechaFin == null)
            .OrderByDescending(ph => ph.FechaInicio)
            .Select(ph => ph.Puesto.Nombre)
            .FirstOrDefault();

        var roles = empleado.Usuario?.UsuarioRoles
            .Select(ur => ur.Rol.Nombre)
            .Distinct()
            .ToList() ?? new List<string>();

        var trayectoria = empleado.PuestoHistorial
            .OrderByDescending(ph => ph.FechaInicio)
            .Select(ph => new HistorialPuestoItem(
                ph.Id,
                ph.PuestoId,
                ph.Puesto.Nombre,
                ph.FechaInicio,
                ph.FechaFin,
                ph.Motivo
            ))
            .ToList();

        var sucursalesCargo = empleado.SucursalesACargo
            .Select(s => new SucursalCargoItem(s.Id, s.Nombre, s.NombreCorto, s.Codigo))
            .ToList();

        var partesNombre = new[] { empleado.Nombre, empleado.ApellidoPaterno, empleado.ApellidoMaterno }
            .Where(s => !string.IsNullOrWhiteSpace(s));
        var nombreCompleto = string.Join(" ", partesNombre);

        var antiguedadTexto = "Reciente ingreso";
        if (empleado.FechaIngreso.HasValue)
        {
            var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
            var meses = ((hoy.Year - empleado.FechaIngreso.Value.Year) * 12) + (hoy.Month - empleado.FechaIngreso.Value.Month);
            if (meses < 0) meses = 0;
            var anos = meses / 12;
            var remMeses = meses % 12;
            if (anos > 0 && remMeses > 0)
                antiguedadTexto = $"{anos} año{(anos > 1 ? "s" : "")} y {remMeses} mes{(remMeses > 1 ? "es" : "")}";
            else if (anos > 0)
                antiguedadTexto = $"{anos} año{(anos > 1 ? "s" : "")}";
            else if (meses > 0)
                antiguedadTexto = $"{meses} mes{(meses > 1 ? "es" : "")}";
            else
                antiguedadTexto = "Menos de 1 mes";
        }

        return new ExpedienteEmpleadoResponse(
            empleado.Id,
            $"TR-{empleado.Id.ToString().PadLeft(3, '0')}",
            empleado.Nombre,
            empleado.ApellidoPaterno,
            empleado.ApellidoMaterno,
            nombreCompleto,
            empleado.Email ?? empleado.Usuario?.Email,
            empleado.Telefono,
            empleado.SucursalId,
            empleado.Sucursal?.Nombre,
            empleado.Sucursal?.NombreCorto,
            empleado.Sucursal?.Codigo,
            puestoActivo ?? "Sin puesto asignado",
            empleado.FechaIngreso,
            antiguedadTexto,
            empleado.Activo,
            empleado.CreatedAt,
            roles,
            trayectoria,
            sucursalesCargo
        );
    }

    public async Task<bool> EsAsignacionRolPrivilegiadoAsync(long? puestoId, IEnumerable<long>? rolesIds)
    {
        await using var ctx = await _factory.CreateDbContextAsync();

        var idsRoles = (rolesIds ?? Array.Empty<long>()).Distinct().ToList();
        if (idsRoles.Count > 0)
        {
            var nombresRoles = await ctx.Roles
                .AsNoTracking()
                .Where(r => idsRoles.Contains(r.Id))
                .Select(r => r.Nombre)
                .ToListAsync();

            if (nombresRoles.Any(n => n.Equals("Jefe", StringComparison.OrdinalIgnoreCase)))
            {
                return true;
            }
        }

        if (puestoId.HasValue)
        {
            var puesto = await ctx.Puestos
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == puestoId.Value);

            if (puesto is not null)
            {
                if (PuestoToRolDefault.TryGetValue(puesto.Nombre.Trim(), out var rolDefault)
                    && rolDefault.Equals("Jefe", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                if (puesto.Nombre.Contains("Jefe", StringComparison.OrdinalIgnoreCase)
                    || puesto.Nombre.Contains("Gerente General", StringComparison.OrdinalIgnoreCase)
                    || puesto.Nombre.Contains("Director", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
        }

        return false;
    }
}

