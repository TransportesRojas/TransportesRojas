using Backend.BDFolder;
using Microsoft.EntityFrameworkCore;

namespace Backend;

public class TransportesRojasDbContext : DbContext
{
    public TransportesRojasDbContext(DbContextOptions<TransportesRojasDbContext> options)
        : base(options) { }

    public DbSet<CatEstado> CatEstados => Set<CatEstado>();
    public DbSet<CatMunicipio> CatMunicipios => Set<CatMunicipio>();
    public DbSet<CatLocalidad> CatLocalidades => Set<CatLocalidad>();
    public DbSet<CatAsentamiento> CatAsentamientos => Set<CatAsentamiento>();
    public DbSet<Direccion> Direcciones => Set<Direccion>();
    public DbSet<Sucursal> Sucursales => Set<Sucursal>();
    public DbSet<SucursalCobertura> SucursalesCobertura => Set<SucursalCobertura>();
    public DbSet<HorarioSucursal> HorariosSucursal => Set<HorarioSucursal>();
    public DbSet<Rol> Roles => Set<Rol>();
    public DbSet<Puesto> Puestos => Set<Puesto>();
    public DbSet<Permiso> Permisos => Set<Permiso>();
    public DbSet<RolPermiso> RolPermisos => Set<RolPermiso>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<UsuarioRol> UsuarioRoles => Set<UsuarioRol>();
    public DbSet<UsuarioEstadoHistorial> UsuarioEstadosHistorial => Set<UsuarioEstadoHistorial>();
    public DbSet<Empleado> Empleados => Set<Empleado>();
    public DbSet<EmpleadoPuestoHistorial> EmpleadosPuestosHistorial => Set<EmpleadoPuestoHistorial>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<ClienteDireccion> ClientesDirecciones => Set<ClienteDireccion>();
    public DbSet<Flotilla> Flotillas => Set<Flotilla>();
    public DbSet<Unidad> Unidades => Set<Unidad>();
    public DbSet<AsignacionFlotillaChofer> AsignacionesFlotillaChofer => Set<AsignacionFlotillaChofer>();
    public DbSet<TipoMantenimiento> TiposMantenimiento => Set<TipoMantenimiento>();
    public DbSet<AlertaMantenimiento> AlertasMantenimiento => Set<AlertaMantenimiento>();
    public DbSet<Mantenimiento> Mantenimientos => Set<Mantenimiento>();
    public DbSet<Envio> Envios => Set<Envio>();
    public DbSet<EventoEnvio> EventosEnvio => Set<EventoEnvio>();
    public DbSet<RecepcionPaquete> RecepcionesPaquete => Set<RecepcionPaquete>();
    public DbSet<AvisoSms> AvisosSms => Set<AvisoSms>();
    public DbSet<Ruta> Rutas => Set<Ruta>();
    public DbSet<RutaEnvio> RutasEnvios => Set<RutaEnvio>();
    public DbSet<Entrega> Entregas => Set<Entrega>();
    public DbSet<CambioRuta> CambiosRuta => Set<CambioRuta>();
    public DbSet<Devolucion> Devoluciones => Set<Devolucion>();
    public DbSet<Reclamacion> Reclamaciones => Set<Reclamacion>();
    public DbSet<Cancelacion> Cancelaciones => Set<Cancelacion>();
    public DbSet<Alerta> Alertas => Set<Alerta>();
    public DbSet<TelemetriaUnidad> Telemetrias => Set<TelemetriaUnidad>();
    public DbSet<Incidencia> Incidencias => Set<Incidencia>();
    public DbSet<Reprogramacion> Reprogramaciones => Set<Reprogramacion>();
    public DbSet<Evaluacion> Evaluaciones => Set<Evaluacion>();
    public DbSet<Queja> Quejas => Set<Queja>();
    public DbSet<QuejaSeguimiento> QuejasSeguimiento => Set<QuejaSeguimiento>();

    // Configuración de entidades e índices

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        foreach (var entityType in b.Model.GetEntityTypes())
        {
            var idProp = entityType.FindProperty("Id");
            if (idProp != null && (idProp.ClrType == typeof(long) || idProp.ClrType == typeof(int) || idProp.ClrType == typeof(short)))
            {
                idProp.SetValueGenerationStrategy(
                    Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityAlwaysColumn);
            }
        }

        b.Entity<CatEstado>(e =>
        {
            e.ToTable("cat_estado");
            e.HasIndex(x => x.Cvegeo).IsUnique();
            e.HasIndex(x => x.CveEnt).IsUnique();
            e.HasIndex(x => x.Nombre).HasDatabaseName("idx_cat_estado_nombre");
            e.Property(x => x.Cvegeo).HasMaxLength(2).IsFixedLength();
            e.Property(x => x.CveEnt).HasMaxLength(2).IsFixedLength();
        });

        b.Entity<CatMunicipio>(e =>
        {
            e.ToTable("cat_municipio");
            e.HasIndex(x => x.Cvegeo).IsUnique();
            e.HasIndex(x => new { x.EstadoId, x.CveMun }).IsUnique();
            e.HasIndex(x => new { x.CveEnt, x.CveMun }).IsUnique();
            e.HasIndex(x => x.EstadoId).HasDatabaseName("idx_cat_municipio_estado");
            e.HasIndex(x => x.Nombre).HasDatabaseName("idx_cat_municipio_nombre");
            e.Property(x => x.Cvegeo).HasMaxLength(5).IsFixedLength();
            e.Property(x => x.CveEnt).HasMaxLength(2).IsFixedLength();
            e.Property(x => x.CveMun).HasMaxLength(3).IsFixedLength();
            e.Property(x => x.CveCab).HasMaxLength(4).IsFixedLength();
            e.HasOne(x => x.Estado)
                .WithMany(est => est.Municipios)
                .HasForeignKey(x => x.EstadoId);
        });

        b.Entity<CatLocalidad>(e =>
        {
            e.ToTable("cat_localidad");
            e.HasIndex(x => x.Cvegeo).IsUnique();
            e.HasIndex(x => new { x.MunicipioId, x.CveLoc }).IsUnique();
            e.HasIndex(x => new { x.CveEnt, x.CveMun, x.CveLoc }).IsUnique();
            e.HasIndex(x => x.MunicipioId).HasDatabaseName("idx_cat_localidad_municipio");
            e.HasIndex(x => x.EstadoId).HasDatabaseName("idx_cat_localidad_estado");
            e.HasIndex(x => x.Nombre).HasDatabaseName("idx_cat_localidad_nombre");
            e.Property(x => x.Cvegeo).HasMaxLength(9).IsFixedLength();
            e.Property(x => x.CveEnt).HasMaxLength(2).IsFixedLength();
            e.Property(x => x.CveMun).HasMaxLength(3).IsFixedLength();
            e.Property(x => x.CveLoc).HasMaxLength(4).IsFixedLength();
            e.Property(x => x.Ambito).HasMaxLength(1).IsFixedLength();
            e.Property(x => x.LatDecimal).HasPrecision(10, 7);
            e.Property(x => x.LonDecimal).HasPrecision(10, 7);
            e.HasOne(x => x.Estado)
                .WithMany(est => est.Localidades)
                .HasForeignKey(x => x.EstadoId);
            e.HasOne(x => x.Municipio)
                .WithMany(mun => mun.Localidades)
                .HasForeignKey(x => x.MunicipioId);
        });

        b.Entity<CatAsentamiento>(e =>
        {
            e.ToTable("cat_asentamiento");
            e.HasIndex(x => new { x.CEstado, x.CMnpio, x.IdAsentaCpcons, x.DCodigo }).IsUnique();
            e.HasIndex(x => x.DCodigo).HasDatabaseName("idx_cat_asentamiento_cp");
            e.HasIndex(x => x.MunicipioId).HasDatabaseName("idx_cat_asentamiento_municipio");
            e.HasIndex(x => x.EstadoId).HasDatabaseName("idx_cat_asentamiento_estado");
            e.HasIndex(x => x.DAsenta).HasDatabaseName("idx_cat_asentamiento_nombre");
            e.Property(x => x.DCodigo).HasMaxLength(5).IsFixedLength();
            e.Property(x => x.DCp).HasMaxLength(5).IsFixedLength();
            e.Property(x => x.CEstado).HasMaxLength(2).IsFixedLength();
            e.Property(x => x.COficina).HasMaxLength(5).IsFixedLength();
            e.Property(x => x.CTipoAsenta).HasMaxLength(2).IsFixedLength();
            e.Property(x => x.CMnpio).HasMaxLength(3).IsFixedLength();
            e.Property(x => x.IdAsentaCpcons).HasMaxLength(4).IsFixedLength();
            e.Property(x => x.CCveCiudad).HasMaxLength(2).IsFixedLength();
            e.HasOne(x => x.Estado)
                .WithMany(est => est.Asentamientos)
                .HasForeignKey(x => x.EstadoId);
            e.HasOne(x => x.Municipio)
                .WithMany(mun => mun.Asentamientos)
                .HasForeignKey(x => x.MunicipioId);
        });

        b.Entity<Direccion>(e =>
        {
            e.ToTable("direccion");
            e.HasIndex(x => new { x.EstadoId, x.MunicipioId }).HasDatabaseName("idx_direccion_estado_mun");
            e.HasIndex(x => x.LocalidadId).HasDatabaseName("idx_direccion_localidad");
            e.HasIndex(x => x.AsentamientoId).HasDatabaseName("idx_direccion_asentamiento");
            e.HasIndex(x => x.CodigoPostal).HasDatabaseName("idx_direccion_cp");
            e.Property(x => x.Pais).HasDefaultValue("México");
            e.Property(x => x.Metadata).HasColumnType("jsonb");
            e.Property(x => x.Latitud).HasPrecision(10, 7);
            e.Property(x => x.Longitud).HasPrecision(10, 7);
            e.HasOne(x => x.CatEstado)
                .WithMany(est => est.Direcciones)
                .HasForeignKey(x => x.EstadoId);
            e.HasOne(x => x.CatMunicipio)
                .WithMany(mun => mun.Direcciones)
                .HasForeignKey(x => x.MunicipioId);
            e.HasOne(x => x.CatLocalidad)
                .WithMany(loc => loc.Direcciones)
                .HasForeignKey(x => x.LocalidadId);
            e.HasOne(x => x.CatAsentamiento)
                .WithMany(asenta => asenta.Direcciones)
                .HasForeignKey(x => x.AsentamientoId);
        });

        b.Entity<Sucursal>(e =>
        {
            e.ToTable("sucursal");
            e.HasIndex(x => x.Codigo).IsUnique();
            e.HasIndex(x => x.NombreCorto).HasDatabaseName("idx_sucursal_nombre_corto");
            e.HasOne(x => x.Direccion)
                .WithMany(d => d.Sucursales)
                .HasForeignKey(x => x.DireccionId);
            e.HasOne(x => x.Responsable)
                .WithMany(emp => emp.SucursalesACargo)
                .HasForeignKey(x => x.ResponsableId)
                .HasConstraintName("fk_sucursal_responsable");
        });

        b.Entity<SucursalCobertura>(e =>
        {
            e.ToTable("sucursal_cobertura");
            e.Ignore(x => x.AplicaRecoleccion);
            e.HasIndex(x => new { x.SucursalId, x.EstadoId, x.MunicipioId, x.CodigoPostal })
                .IsUnique()
                .AreNullsDistinct(false);
            e.HasIndex(x => x.SucursalId).HasDatabaseName("idx_suc_cobertura_sucursal");
            e.HasIndex(x => x.EstadoId).HasDatabaseName("idx_suc_cobertura_estado");
            e.HasIndex(x => x.MunicipioId).HasDatabaseName("idx_suc_cobertura_municipio");
            e.HasIndex(x => x.CodigoPostal).HasDatabaseName("idx_suc_cobertura_cp");
            e.Property(x => x.CodigoPostal).HasMaxLength(5).IsFixedLength();
            e.HasOne(x => x.Sucursal)
                .WithMany(s => s.Coberturas)
                .HasForeignKey(x => x.SucursalId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Estado)
                .WithMany(est => est.CoberturasSucursal)
                .HasForeignKey(x => x.EstadoId);
            e.HasOne(x => x.Municipio)
                .WithMany(mun => mun.CoberturasSucursal)
                .HasForeignKey(x => x.MunicipioId);
        });

        b.Entity<HorarioSucursal>(e =>
        {
            e.ToTable("horario_sucursal");
            e.HasIndex(x => x.SucursalId).HasDatabaseName("idx_horario_sucursal");
            e.HasOne(x => x.Sucursal)
                .WithMany(s => s.Horarios)
                .HasForeignKey(x => x.SucursalId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Rol>(e =>
        {
            e.ToTable("rol");
            e.HasIndex(x => x.Nombre).IsUnique();
        });

        b.Entity<Puesto>(e =>
        {
            e.ToTable("puesto");
            e.HasIndex(x => x.Nombre).IsUnique();
        });

        b.Entity<Permiso>(e =>
        {
            e.ToTable("permiso");
            e.HasIndex(x => x.Codigo).IsUnique();
            e.HasIndex(x => x.Modulo);
        });

        b.Entity<RolPermiso>(e =>
        {
            e.ToTable("rol_permiso");
            e.HasKey(x => new { x.RolId, x.PermisoId });
            e.HasIndex(x => x.PermisoId);
            e.HasOne(x => x.Rol)
                .WithMany(r => r.RolPermisos)
                .HasForeignKey(x => x.RolId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Permiso)
                .WithMany(p => p.RolPermisos)
                .HasForeignKey(x => x.PermisoId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Usuario>(e =>
        {
            e.ToTable("usuario");
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.TipoUsuario).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<TipoUsuario>(v));
        });

        b.Entity<UsuarioRol>(e =>
        {
            e.ToTable("usuario_rol");
            e.HasKey(x => new { x.UsuarioId, x.RolId });
            e.HasIndex(x => x.RolId);
            e.HasOne(x => x.Usuario)
                .WithMany(u => u.UsuarioRoles)
                .HasForeignKey(x => x.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Rol)
                .WithMany(r => r.UsuarioRoles)
                .HasForeignKey(x => x.RolId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<UsuarioEstadoHistorial>(e =>
        {
            e.ToTable("usuario_estado_historial");
            e.HasIndex(x => x.UsuarioId);
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoUsuarioHist>(v));
            e.HasOne(x => x.RegistradoPorEmpleado)
                .WithMany()
                .HasForeignKey(x => x.RegistradoPor);
        });

        b.Entity<Empleado>(e =>
        {
            e.ToTable("empleado");
            e.HasIndex(x => x.UsuarioId).IsUnique();
            e.HasIndex(x => x.SucursalId);
        });

        b.Entity<EmpleadoPuestoHistorial>(e =>
        {
            e.ToTable("empleado_puesto_historial");
            e.HasIndex(x => x.EmpleadoId);
            e.HasOne(x => x.PuestoAnterior)
                .WithMany()
                .HasForeignKey(x => x.PuestoAnteriorId);
            e.HasOne(x => x.RegistradoPorEmpleado)
                .WithMany()
                .HasForeignKey(x => x.RegistradoPor);
        });

        b.Entity<Cliente>(e =>
        {
            e.ToTable("cliente");
            e.HasIndex(x => x.UsuarioId).IsUnique();
            e.HasIndex(x => new { x.Nombre, x.ApellidoPaterno });
        });

        b.Entity<ClienteDireccion>(e =>
        {
            e.ToTable("cliente_direccion");
            e.HasIndex(x => x.ClienteId);
            e.Property(x => x.Tipo).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<TipoClienteDireccion>(v));
            e.HasOne(x => x.Cliente)
                .WithMany(c => c.Direcciones)
                .HasForeignKey(x => x.ClienteId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Flotilla>(e =>
        {
            e.ToTable("flotilla");
            e.HasIndex(x => x.Codigo).IsUnique();
            e.HasOne(x => x.Supervisor)
                .WithMany()
                .HasForeignKey(x => x.SupervisorId);
        });

        b.Entity<Unidad>(e =>
        {
            e.ToTable("unidad");
            e.HasIndex(x => x.Placas).IsUnique();
            e.HasIndex(x => x.FlotillaId);
            e.HasIndex(x => x.Estado);
            e.Property(x => x.CapacidadKg).HasPrecision(10, 2);
            e.Property(x => x.KmOdometroInicial).HasPrecision(10, 2);
            e.Property(x => x.KmOdometroActual).HasPrecision(10, 2);
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoUnidad>(v));
        });

        b.Entity<AsignacionFlotillaChofer>(e =>
        {
            e.ToTable("asignacion_flotilla_chofer");
            e.HasIndex(x => x.FlotillaId);
            e.HasIndex(x => x.ChoferId);
            e.HasIndex(x => x.ChoferId).IsUnique()
                .HasFilter("activo = TRUE")
                .HasDatabaseName("uq_asig_chofer_activa");
        });

        b.Entity<TipoMantenimiento>(e =>
        {
            e.ToTable("tipo_mantenimiento");
            e.HasIndex(x => x.Nombre).IsUnique();
        });

        b.Entity<AlertaMantenimiento>(e =>
        {
            e.ToTable("alerta_mantenimiento");
            e.HasIndex(x => x.UnidadId);
            e.HasIndex(x => x.Estado);
            e.HasIndex(x => x.FechaAlerta);
            e.Property(x => x.KmAlMomento).HasPrecision(10, 2);
            e.Property(x => x.KmUmbral).HasPrecision(10, 2);
            e.Property(x => x.KmUltimoMantenimiento).HasPrecision(10, 2);
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoAlertaMant>(v));
            e.HasOne(x => x.AtendidaPorEmpleado)
                .WithMany()
                .HasForeignKey(x => x.AtendidaPor);
        });

        b.Entity<Mantenimiento>(e =>
        {
            e.ToTable("mantenimiento");
            e.HasIndex(x => x.UnidadId);
            e.HasIndex(x => x.TipoMantenimientoId);
            e.HasIndex(x => x.FechaRealizado);
            e.Property(x => x.KmAlMomento).HasPrecision(10, 2);
            e.Property(x => x.Costo).HasPrecision(12, 2);
            e.HasOne(x => x.RealizadoPorEmpleado)
                .WithMany()
                .HasForeignKey(x => x.RealizadoPor);
        });

        b.Entity<Envio>(e =>
        {
            e.ToTable("envio");
            e.HasIndex(x => x.Guia).IsUnique();
            e.HasIndex(x => x.RemitenteId);
            e.HasIndex(x => x.DestinatarioClienteId);
            e.HasIndex(x => x.Estado);
            e.HasIndex(x => x.SucursalRecepcionId);
            e.HasIndex(x => x.SucursalDestinoId);
            e.Ignore(x => x.RequiereRecoleccion);
            e.HasIndex(x => x.FechaCreacion);
            e.HasIndex(x => x.IntentoReparto);
            e.Property(x => x.DireccionOrigenSnapshot).HasColumnType("jsonb");
            e.Property(x => x.DireccionDestinoSnapshot).HasColumnType("jsonb");
            e.Property(x => x.Metadata).HasColumnType("jsonb");
            e.Property(x => x.PesoKg).HasPrecision(10, 2);
            e.Property(x => x.LargoCm).HasPrecision(10, 2);
            e.Property(x => x.AnchoCm).HasPrecision(10, 2);
            e.Property(x => x.AltoCm).HasPrecision(10, 2);
            e.Property(x => x.Descripcion).IsRequired();
            e.Property(x => x.ValorDeclarado).HasPrecision(12, 2);
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoEnvio>(v));
            e.HasOne(x => x.Remitente).WithMany().HasForeignKey(x => x.RemitenteId);
            e.HasOne(x => x.DestinatarioCliente).WithMany().HasForeignKey(x => x.DestinatarioClienteId);
            e.HasOne(x => x.SucursalRecepcion).WithMany().HasForeignKey(x => x.SucursalRecepcionId);
            e.HasOne(x => x.SucursalDestino).WithMany().HasForeignKey(x => x.SucursalDestinoId);
            e.HasOne(x => x.DireccionDestino).WithMany().HasForeignKey(x => x.DireccionDestinoId);
        });

        b.Entity<EventoEnvio>(e =>
        {
            e.ToTable("evento_envio");
            e.HasIndex(x => new { x.EnvioId, x.FechaEvento });
            e.Property(x => x.Latitud).HasPrecision(10, 7);
            e.Property(x => x.Longitud).HasPrecision(10, 7);
            e.HasOne(x => x.Envio)
                .WithMany(env => env.Eventos)
                .HasForeignKey(x => x.EnvioId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<RecepcionPaquete>(e =>
        {
            e.ToTable("recepcion_paquete");
            e.HasIndex(x => x.EnvioId).IsUnique();
            e.Property(x => x.PesoVerificadoKg).HasPrecision(10, 2);
            e.Property(x => x.LargoVerificadoCm).HasPrecision(10, 2);
            e.Property(x => x.AnchoVerificadoCm).HasPrecision(10, 2);
            e.Property(x => x.AltoVerificadoCm).HasPrecision(10, 2);
            e.HasOne(x => x.RecibidoPorEmpleado)
                .WithMany()
                .HasForeignKey(x => x.RecibidoPor);
        });

        b.Entity<AvisoSms>(e =>
        {
            e.ToTable("aviso_sms");
            e.HasIndex(x => new { x.EnvioId, x.IntentoReparto }).IsUnique();
            e.HasIndex(x => x.EnvioId);
            e.HasIndex(x => x.Estado);
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoAvisoSms>(v));
            e.HasOne(x => x.Envio)
                .WithMany(env => env.AvisosSms)
                .HasForeignKey(x => x.EnvioId);
        });

        b.Entity<Ruta>(e =>
        {
            e.ToTable("ruta");
            e.HasIndex(x => new { x.ChoferId, x.Fecha });
            e.HasIndex(x => new { x.UnidadId, x.Fecha });
            e.HasIndex(x => x.Estado);
            e.Property(x => x.KmInicialOdometro).HasPrecision(10, 2);
            e.Property(x => x.KmFinalOdometro).HasPrecision(10, 2);
            e.Property(x => x.KmRecorridos).HasPrecision(10, 2);
            e.Property(x => x.DistanciaEstimadaKm).HasPrecision(10, 2);
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoRuta>(v));
            e.Property(x => x.KmRecorridos)
                .HasComputedColumnSql(
                    "CASE WHEN km_final_odometro IS NOT NULL AND km_inicial_odometro IS NOT NULL " +
                    "THEN km_final_odometro - km_inicial_odometro ELSE NULL END",
                    stored: true);
            e.HasOne(x => x.CreadoPor)
                .WithMany()
                .HasForeignKey(x => x.CreatedBy);
        });

        b.Entity<RutaEnvio>(e =>
        {
            e.ToTable("ruta_envio");
            e.HasIndex(x => new { x.RutaId, x.EnvioId }).IsUnique();
            e.HasIndex(x => x.EnvioId);
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoRutaEnvio>(v));
            e.HasOne(x => x.Ruta)
                .WithMany(r => r.Envios)
                .HasForeignKey(x => x.RutaId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Entrega>(e =>
        {
            e.ToTable("entrega");
            e.HasIndex(x => new { x.EnvioId, x.IntentoReparto }).IsUnique();
            e.HasIndex(x => x.ChoferId);
            e.Property(x => x.Latitud).HasPrecision(10, 7);
            e.Property(x => x.Longitud).HasPrecision(10, 7);
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoEntrega>(v));
            e.HasOne(x => x.Envio)
                .WithMany(env => env.Entregas)
                .HasForeignKey(x => x.EnvioId);
        });

        b.Entity<CambioRuta>(e =>
        {
            e.ToTable("cambio_ruta");
            e.HasIndex(x => x.Folio).IsUnique();
            e.HasIndex(x => x.RutaId);
            e.HasIndex(x => x.ChoferId);
            e.HasIndex(x => x.FechaEvento);
            e.Property(x => x.EstadoAviso).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoAvisoCambioRuta>(v));
            e.HasOne(x => x.Ruta)
                .WithMany(r => r.CambiosRuta)
                .HasForeignKey(x => x.RutaId);
            e.HasOne(x => x.Chofer)
                .WithMany()
                .HasForeignKey(x => x.ChoferId);
            e.HasOne(x => x.Unidad)
                .WithMany()
                .HasForeignKey(x => x.UnidadId);
        });

        b.Entity<Devolucion>(e =>
        {
            e.ToTable("devolucion");
            e.HasIndex(x => x.EnvioId);
            e.HasIndex(x => x.Estado);
            e.Property(x => x.OrigenSolicitud).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<OrigenSolicitudDevolucion>(v));
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoDevolucion>(v));
        });

        b.Entity<Reclamacion>(e =>
        {
            e.ToTable("reclamacion");
            e.HasIndex(x => x.EnvioId);
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoReclamacion>(v));
        });

        b.Entity<Cancelacion>(e =>
        {
            e.ToTable("cancelacion");
            e.HasIndex(x => x.EnvioId);
            e.Property(x => x.ActorTipo).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<ActorTipoCancelacion>(v));
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoCancelacion>(v));
        });

        b.Entity<Alerta>(e =>
        {
            e.ToTable("alerta");
            e.HasIndex(x => x.Estado);
            e.HasIndex(x => x.FlotillaId);
            e.HasIndex(x => x.FechaAlerta);
            e.Property(x => x.Latitud).HasPrecision(10, 7);
            e.Property(x => x.Longitud).HasPrecision(10, 7);
            e.Property(x => x.Tipo).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<TipoAlerta>(v));
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoAlerta>(v));
            e.HasOne(x => x.AtendidaPorEmpleado)
                .WithMany()
                .HasForeignKey(x => x.AtendidaPor);
        });

        b.Entity<TelemetriaUnidad>(e =>
        {
            e.ToTable("telemetria_unidad");
            e.HasIndex(x => new { x.UnidadId, x.FechaHora });
            e.HasIndex(x => new { x.RutaId, x.FechaHora });
            e.Property(x => x.Latitud).HasPrecision(10, 7);
            e.Property(x => x.Longitud).HasPrecision(10, 7);
        });

        b.Entity<Incidencia>(e =>
        {
            e.ToTable("incidencia");
            e.HasIndex(x => x.EnvioId);
            e.HasIndex(x => x.Estado);
            e.Property(x => x.Tipo).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<TipoIncidencia>(v));
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoIncidencia>(v));
        });

        b.Entity<Reprogramacion>(e =>
        {
            e.ToTable("reprogramacion");
            e.HasIndex(x => x.EnvioId);
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoReprogramacion>(v));
        });

        b.Entity<Evaluacion>(e =>
        {
            e.ToTable("evaluacion");
            e.HasIndex(x => x.EnvioId).IsUnique();
        });

        b.Entity<Queja>(e =>
        {
            e.ToTable("queja");
            e.HasIndex(x => x.Folio).IsUnique();
            e.HasIndex(x => x.EnvioId);
            e.HasIndex(x => x.Estado);
            e.Property(x => x.Estado).HasConversion(
                v => ConvertidorASnake.ToSnake(v),
                v => ConvertidorASnake.FromSnake<EstadoQueja>(v));
            e.HasOne(x => x.AtendidaPorEmpleado)
                .WithMany()
                .HasForeignKey(x => x.AtendidaPor);
        });

        b.Entity<QuejaSeguimiento>(e =>
        {
            e.ToTable("queja_seguimiento");
            e.HasIndex(x => x.QuejaId);
            e.HasOne(x => x.Queja)
                .WithMany(q => q.Seguimientos)
                .HasForeignKey(x => x.QuejaId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<UsuarioPermisoEfectivo>(e =>
        {
            e.HasNoKey();
            e.ToView("usuario_permiso_efectivo");
            e.Property(x => x.UsuarioId).HasColumnName("usuario_id");
            e.Property(x => x.PermisoId).HasColumnName("permiso_id");
            e.Property(x => x.PermisoCodigo).HasColumnName("permiso_codigo");
            e.Property(x => x.PermisoModulo).HasColumnName("permiso_modulo");
        });

        foreach (var entity in b.Model.GetEntityTypes())
        {
            foreach (var prop in entity.GetProperties())
            {
                if (prop.GetColumnName() == prop.Name)
                    prop.SetColumnName(ToSnakeCase(prop.Name));
            }
        }
    }

    private static string ToSnakeCase(string name)
    {
        var sb = new System.Text.StringBuilder();
        for (int i = 0; i < name.Length; i++)
        {
            var c = name[i];
            if (char.IsUpper(c) && i > 0) sb.Append('_');
            sb.Append(char.ToLowerInvariant(c));
        }
        return sb.ToString();
    }

    // Timestamps y normalización al guardar

    private void UpdateTimestamps()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                var createdAtProp = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "CreatedAt");
                if (createdAtProp != null && (createdAtProp.CurrentValue == null || Equals(createdAtProp.CurrentValue, default(DateTimeOffset))))
                {
                    createdAtProp.CurrentValue = now;
                }

                var updatedAtProp = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "UpdatedAt");
                if (updatedAtProp != null && (updatedAtProp.CurrentValue == null || Equals(updatedAtProp.CurrentValue, default(DateTimeOffset))))
                {
                    updatedAtProp.CurrentValue = now;
                }
            }
            else if (entry.State == EntityState.Modified)
            {
                var updatedAtProp = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "UpdatedAt");
                if (updatedAtProp != null)
                {
                    updatedAtProp.CurrentValue = now;
                }

                var createdAtProp = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "CreatedAt");
                if (createdAtProp != null)
                {
                    createdAtProp.IsModified = false;
                }
            }
        }
    }

    private void NormalizarMayusculas()
    {
        var propiedadesExcluidas = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Email", "DestinatarioEmail", "PasswordHash", "CodigoValidacionHash",
            "Salt", "Token", "TipoUsuario", "Estado", "EstadoAnterior", "EstadoNuevo",
            "Metadata", "EvidenciaUrl", "EvidenciaFotoUrl", "FirmaUrl",
            "IdProveedor", "Mensaje"
        };

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State != EntityState.Added && entry.State != EntityState.Modified)
                continue;

            if (entry.Entity is Rol || entry.Entity is Permiso ||
                entry.Entity is CatEstado || entry.Entity is CatMunicipio ||
                entry.Entity is CatLocalidad || entry.Entity is CatAsentamiento)
                continue;

            foreach (var prop in entry.Properties)
            {
                if (prop.Metadata.ClrType == typeof(string) && prop.CurrentValue is string val && !string.IsNullOrWhiteSpace(val))
                {
                    if (propiedadesExcluidas.Contains(prop.Metadata.Name) &&
                        !(entry.Entity is Direccion && prop.Metadata.Name == "Estado"))
                        continue;

                    prop.CurrentValue = val.Trim().ToUpperInvariant();
                }
            }
        }
    }

    public override int SaveChanges() => SaveChanges(true);

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        NormalizarMayusculas();
        UpdateTimestamps();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default) => SaveChangesAsync(true, ct);

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken ct = default)
    {
        NormalizarMayusculas();
        UpdateTimestamps();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, ct);
    }
}

public class UsuarioPermisoEfectivo
{
    public long UsuarioId { get; set; }
    public long PermisoId { get; set; }
    public string PermisoCodigo { get; set; } = null!;
    public string PermisoModulo { get; set; } = null!;
}