using System;
using System.Text.Json;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "direccion",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    calle = table.Column<string>(type: "text", nullable: true),
                    numero_exterior = table.Column<string>(type: "text", nullable: true),
                    numero_interior = table.Column<string>(type: "text", nullable: true),
                    colonia = table.Column<string>(type: "text", nullable: true),
                    municipio = table.Column<string>(type: "text", nullable: true),
                    estado = table.Column<string>(type: "text", nullable: true),
                    pais = table.Column<string>(type: "text", nullable: false, defaultValue: "México"),
                    codigo_postal = table.Column<string>(type: "text", nullable: true),
                    referencias = table.Column<string>(type: "text", nullable: true),
                    latitud = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    longitud = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    metadata = table.Column<JsonDocument>(type: "jsonb", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_direccion", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "permiso",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    codigo = table.Column<string>(type: "text", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    modulo = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_permiso", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "puesto",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_puesto", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "rol",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rol", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tipo_mantenimiento",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    km_intervalo = table.Column<int>(type: "integer", nullable: false),
                    aplica_a_tipo_vehiculo = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tipo_mantenimiento", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "usuario",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    email = table.Column<string>(type: "text", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    tipo_usuario = table.Column<string>(type: "text", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    ultimo_acceso = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuario", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "sucursal",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    codigo = table.Column<string>(type: "text", nullable: true),
                    direccion_id = table.Column<long>(type: "bigint", nullable: true),
                    telefono = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sucursal", x => x.id);
                    table.ForeignKey(
                        name: "FK_sucursal_direccion_direccion_id",
                        column: x => x.direccion_id,
                        principalTable: "direccion",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "rol_permiso",
                columns: table => new
                {
                    rol_id = table.Column<long>(type: "bigint", nullable: false),
                    permiso_id = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rol_permiso", x => new { x.rol_id, x.permiso_id });
                    table.ForeignKey(
                        name: "FK_rol_permiso_permiso_permiso_id",
                        column: x => x.permiso_id,
                        principalTable: "permiso",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_rol_permiso_rol_rol_id",
                        column: x => x.rol_id,
                        principalTable: "rol",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cliente",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    usuario_id = table.Column<long>(type: "bigint", nullable: true),
                    nombre = table.Column<string>(type: "text", nullable: true),
                    apellido_paterno = table.Column<string>(type: "text", nullable: true),
                    apellido_materno = table.Column<string>(type: "text", nullable: true),
                    telefono = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cliente", x => x.id);
                    table.ForeignKey(
                        name: "FK_cliente_usuario_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuario",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "usuario_rol",
                columns: table => new
                {
                    usuario_id = table.Column<long>(type: "bigint", nullable: false),
                    rol_id = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuario_rol", x => new { x.usuario_id, x.rol_id });
                    table.ForeignKey(
                        name: "FK_usuario_rol_rol_rol_id",
                        column: x => x.rol_id,
                        principalTable: "rol",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_usuario_rol_usuario_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "empleado",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    usuario_id = table.Column<long>(type: "bigint", nullable: false),
                    sucursal_id = table.Column<long>(type: "bigint", nullable: true),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    apellido_paterno = table.Column<string>(type: "text", nullable: false),
                    apellido_materno = table.Column<string>(type: "text", nullable: true),
                    telefono = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "text", nullable: true),
                    fecha_ingreso = table.Column<DateOnly>(type: "date", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_empleado", x => x.id);
                    table.ForeignKey(
                        name: "FK_empleado_sucursal_sucursal_id",
                        column: x => x.sucursal_id,
                        principalTable: "sucursal",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_empleado_usuario_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cliente_direccion",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    cliente_id = table.Column<long>(type: "bigint", nullable: false),
                    direccion_id = table.Column<long>(type: "bigint", nullable: false),
                    tipo = table.Column<string>(type: "text", nullable: false),
                    predeterminada = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cliente_direccion", x => x.id);
                    table.ForeignKey(
                        name: "FK_cliente_direccion_cliente_cliente_id",
                        column: x => x.cliente_id,
                        principalTable: "cliente",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cliente_direccion_direccion_direccion_id",
                        column: x => x.direccion_id,
                        principalTable: "direccion",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "envio",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    guia = table.Column<string>(type: "text", nullable: false),
                    remitente_id = table.Column<long>(type: "bigint", nullable: false),
                    destinatario_cliente_id = table.Column<long>(type: "bigint", nullable: true),
                    destinatario_nombre = table.Column<string>(type: "text", nullable: false),
                    destinatario_telefono = table.Column<string>(type: "text", nullable: false),
                    destinatario_email = table.Column<string>(type: "text", nullable: true),
                    requiere_recoleccion = table.Column<bool>(type: "boolean", nullable: false),
                    sucursal_recepcion_id = table.Column<long>(type: "bigint", nullable: true),
                    sucursal_destino_id = table.Column<long>(type: "bigint", nullable: true),
                    direccion_destino_id = table.Column<long>(type: "bigint", nullable: true),
                    direccion_origen_snapshot = table.Column<JsonDocument>(type: "jsonb", nullable: true),
                    direccion_destino_snapshot = table.Column<JsonDocument>(type: "jsonb", nullable: true),
                    peso_kg = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    largo_cm = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    ancho_cm = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    alto_cm = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    valor_declarado = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    codigo_validacion_hash = table.Column<string>(type: "text", nullable: true),
                    estado = table.Column<string>(type: "text", nullable: false),
                    creado_por_usuario_id = table.Column<long>(type: "bigint", nullable: true),
                    fecha_creacion = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_entrega_estimada = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    metadata = table.Column<JsonDocument>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_envio", x => x.id);
                    table.ForeignKey(
                        name: "FK_envio_cliente_destinatario_cliente_id",
                        column: x => x.destinatario_cliente_id,
                        principalTable: "cliente",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_envio_cliente_remitente_id",
                        column: x => x.remitente_id,
                        principalTable: "cliente",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_envio_direccion_direccion_destino_id",
                        column: x => x.direccion_destino_id,
                        principalTable: "direccion",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_envio_sucursal_sucursal_destino_id",
                        column: x => x.sucursal_destino_id,
                        principalTable: "sucursal",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_envio_sucursal_sucursal_recepcion_id",
                        column: x => x.sucursal_recepcion_id,
                        principalTable: "sucursal",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_envio_usuario_creado_por_usuario_id",
                        column: x => x.creado_por_usuario_id,
                        principalTable: "usuario",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "empleado_puesto_historial",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    empleado_id = table.Column<long>(type: "bigint", nullable: false),
                    puesto_id = table.Column<long>(type: "bigint", nullable: false),
                    fecha_inicio = table.Column<DateOnly>(type: "date", nullable: false),
                    fecha_fin = table.Column<DateOnly>(type: "date", nullable: true),
                    motivo = table.Column<string>(type: "text", nullable: true),
                    registrado_por = table.Column<long>(type: "bigint", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_empleado_puesto_historial", x => x.id);
                    table.ForeignKey(
                        name: "FK_empleado_puesto_historial_empleado_empleado_id",
                        column: x => x.empleado_id,
                        principalTable: "empleado",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_empleado_puesto_historial_puesto_puesto_id",
                        column: x => x.puesto_id,
                        principalTable: "puesto",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "flotilla",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    sucursal_id = table.Column<long>(type: "bigint", nullable: true),
                    supervisor_id = table.Column<long>(type: "bigint", nullable: true),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    codigo = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_flotilla", x => x.id);
                    table.ForeignKey(
                        name: "FK_flotilla_empleado_supervisor_id",
                        column: x => x.supervisor_id,
                        principalTable: "empleado",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_flotilla_sucursal_sucursal_id",
                        column: x => x.sucursal_id,
                        principalTable: "sucursal",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "usuario_estado_historial",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    usuario_id = table.Column<long>(type: "bigint", nullable: false),
                    estado = table.Column<string>(type: "text", nullable: false),
                    motivo = table.Column<string>(type: "text", nullable: true),
                    fecha_inicio = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_fin = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    registrado_por = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuario_estado_historial", x => x.id);
                    table.ForeignKey(
                        name: "FK_usuario_estado_historial_empleado_registrado_por",
                        column: x => x.registrado_por,
                        principalTable: "empleado",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_usuario_estado_historial_usuario_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cancelacion",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    envio_id = table.Column<long>(type: "bigint", nullable: false),
                    motivo = table.Column<string>(type: "text", nullable: false),
                    actor_tipo = table.Column<string>(type: "text", nullable: false),
                    actor_usuario_id = table.Column<long>(type: "bigint", nullable: true),
                    estado = table.Column<string>(type: "text", nullable: false),
                    fecha_solicitud = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_aplicacion = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cancelacion", x => x.id);
                    table.ForeignKey(
                        name: "FK_cancelacion_envio_envio_id",
                        column: x => x.envio_id,
                        principalTable: "envio",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cancelacion_usuario_actor_usuario_id",
                        column: x => x.actor_usuario_id,
                        principalTable: "usuario",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "cita_recoleccion",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    envio_id = table.Column<long>(type: "bigint", nullable: false),
                    direccion_recoleccion_id = table.Column<long>(type: "bigint", nullable: false),
                    fecha_hora_solicitada = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_hora_confirmada = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    estado = table.Column<string>(type: "text", nullable: false),
                    motivo = table.Column<string>(type: "text", nullable: true),
                    observaciones = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cita_recoleccion", x => x.id);
                    table.ForeignKey(
                        name: "FK_cita_recoleccion_direccion_direccion_recoleccion_id",
                        column: x => x.direccion_recoleccion_id,
                        principalTable: "direccion",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cita_recoleccion_envio_envio_id",
                        column: x => x.envio_id,
                        principalTable: "envio",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "devolucion",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    envio_id = table.Column<long>(type: "bigint", nullable: false),
                    motivo = table.Column<string>(type: "text", nullable: false),
                    origen_solicitud = table.Column<string>(type: "text", nullable: false),
                    estado = table.Column<string>(type: "text", nullable: false),
                    evidencia_url = table.Column<string>(type: "text", nullable: true),
                    sucursal_destino_id = table.Column<long>(type: "bigint", nullable: true),
                    fecha_inicio = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_recepcion = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    fecha_cierre = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    aceptada_por_remitente = table.Column<bool>(type: "boolean", nullable: true),
                    observaciones = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_devolucion", x => x.id);
                    table.ForeignKey(
                        name: "FK_devolucion_envio_envio_id",
                        column: x => x.envio_id,
                        principalTable: "envio",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_devolucion_sucursal_sucursal_destino_id",
                        column: x => x.sucursal_destino_id,
                        principalTable: "sucursal",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "evaluacion",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    envio_id = table.Column<long>(type: "bigint", nullable: false),
                    puntuacion = table.Column<int>(type: "integer", nullable: false),
                    comentarios = table.Column<string>(type: "text", nullable: true),
                    fecha_evaluacion = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_evaluacion", x => x.id);
                    table.ForeignKey(
                        name: "FK_evaluacion_envio_envio_id",
                        column: x => x.envio_id,
                        principalTable: "envio",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "evento_envio",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    envio_id = table.Column<long>(type: "bigint", nullable: false),
                    estado = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    latitud = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    longitud = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    usuario_id = table.Column<long>(type: "bigint", nullable: true),
                    fecha_evento = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_evento_envio", x => x.id);
                    table.ForeignKey(
                        name: "FK_evento_envio_envio_envio_id",
                        column: x => x.envio_id,
                        principalTable: "envio",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_evento_envio_usuario_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuario",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "queja",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    folio = table.Column<string>(type: "text", nullable: false),
                    envio_id = table.Column<long>(type: "bigint", nullable: true),
                    motivo = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    estado = table.Column<string>(type: "text", nullable: false),
                    fecha_reporte = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_cierre = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    resolucion = table.Column<string>(type: "text", nullable: true),
                    atendida_por = table.Column<long>(type: "bigint", nullable: true),
                    atendida_por_empleado_id = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_queja", x => x.id);
                    table.ForeignKey(
                        name: "FK_queja_empleado_atendida_por_empleado_id",
                        column: x => x.atendida_por_empleado_id,
                        principalTable: "empleado",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_queja_envio_envio_id",
                        column: x => x.envio_id,
                        principalTable: "envio",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "recepcion_paquete",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    envio_id = table.Column<long>(type: "bigint", nullable: false),
                    recibido_por = table.Column<long>(type: "bigint", nullable: false),
                    fecha_recepcion = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    peso_verificado_kg = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    largo_verificado_cm = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    ancho_verificado_cm = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    alto_verificado_cm = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    evidencia_foto_url = table.Column<string>(type: "text", nullable: true),
                    observaciones = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    recibido_por_empleado_id = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recepcion_paquete", x => x.id);
                    table.ForeignKey(
                        name: "FK_recepcion_paquete_empleado_recibido_por_empleado_id",
                        column: x => x.recibido_por_empleado_id,
                        principalTable: "empleado",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_recepcion_paquete_envio_envio_id",
                        column: x => x.envio_id,
                        principalTable: "envio",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "asignacion_flotilla_chofer",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    flotilla_id = table.Column<long>(type: "bigint", nullable: false),
                    chofer_id = table.Column<long>(type: "bigint", nullable: false),
                    fecha_inicio = table.Column<DateOnly>(type: "date", nullable: false),
                    fecha_fin = table.Column<DateOnly>(type: "date", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asignacion_flotilla_chofer", x => x.id);
                    table.ForeignKey(
                        name: "FK_asignacion_flotilla_chofer_empleado_chofer_id",
                        column: x => x.chofer_id,
                        principalTable: "empleado",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_asignacion_flotilla_chofer_flotilla_flotilla_id",
                        column: x => x.flotilla_id,
                        principalTable: "flotilla",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "unidad",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    flotilla_id = table.Column<long>(type: "bigint", nullable: true),
                    placas = table.Column<string>(type: "text", nullable: false),
                    tipo_vehiculo = table.Column<string>(type: "text", nullable: true),
                    marca = table.Column<string>(type: "text", nullable: true),
                    modelo = table.Column<string>(type: "text", nullable: true),
                    anio = table.Column<int>(type: "integer", nullable: true),
                    capacidad_kg = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    km_odometro_inicial = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    km_odometro_actual = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    estado = table.Column<string>(type: "text", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_unidad", x => x.id);
                    table.ForeignKey(
                        name: "FK_unidad_flotilla_flotilla_id",
                        column: x => x.flotilla_id,
                        principalTable: "flotilla",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "reclamacion",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    devolucion_id = table.Column<long>(type: "bigint", nullable: true),
                    envio_id = table.Column<long>(type: "bigint", nullable: true),
                    motivo = table.Column<string>(type: "text", nullable: false),
                    estado = table.Column<string>(type: "text", nullable: false),
                    evidencia_url = table.Column<string>(type: "text", nullable: true),
                    fecha_apertura = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_cierre = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reclamacion", x => x.id);
                    table.ForeignKey(
                        name: "FK_reclamacion_devolucion_devolucion_id",
                        column: x => x.devolucion_id,
                        principalTable: "devolucion",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_reclamacion_envio_envio_id",
                        column: x => x.envio_id,
                        principalTable: "envio",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "queja_seguimiento",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    queja_id = table.Column<long>(type: "bigint", nullable: false),
                    empleado_id = table.Column<long>(type: "bigint", nullable: false),
                    accion = table.Column<string>(type: "text", nullable: false),
                    estado_anterior = table.Column<string>(type: "text", nullable: true),
                    estado_nuevo = table.Column<string>(type: "text", nullable: true),
                    fecha = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_queja_seguimiento", x => x.id);
                    table.ForeignKey(
                        name: "FK_queja_seguimiento_empleado_empleado_id",
                        column: x => x.empleado_id,
                        principalTable: "empleado",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_queja_seguimiento_queja_queja_id",
                        column: x => x.queja_id,
                        principalTable: "queja",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "alerta_mantenimiento",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    unidad_id = table.Column<long>(type: "bigint", nullable: false),
                    tipo_mantenimiento_id = table.Column<long>(type: "bigint", nullable: false),
                    km_al_momento = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    km_umbral = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    km_ultimo_mantenimiento = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    estado = table.Column<string>(type: "text", nullable: false),
                    atendida_por = table.Column<long>(type: "bigint", nullable: true),
                    fecha_alerta = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_atencion = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    atendida_por_empleado_id = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alerta_mantenimiento", x => x.id);
                    table.ForeignKey(
                        name: "FK_alerta_mantenimiento_empleado_atendida_por_empleado_id",
                        column: x => x.atendida_por_empleado_id,
                        principalTable: "empleado",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_alerta_mantenimiento_tipo_mantenimiento_tipo_mantenimiento_~",
                        column: x => x.tipo_mantenimiento_id,
                        principalTable: "tipo_mantenimiento",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_alerta_mantenimiento_unidad_unidad_id",
                        column: x => x.unidad_id,
                        principalTable: "unidad",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ruta",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    chofer_id = table.Column<long>(type: "bigint", nullable: true),
                    unidad_id = table.Column<long>(type: "bigint", nullable: true),
                    flotilla_id = table.Column<long>(type: "bigint", nullable: true),
                    fecha = table.Column<DateOnly>(type: "date", nullable: false),
                    estado = table.Column<string>(type: "text", nullable: false),
                    origen_sucursal_id = table.Column<long>(type: "bigint", nullable: true),
                    hora_inicio = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    hora_fin = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    km_inicial_odometro = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    km_final_odometro = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    km_recorridos = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true, computedColumnSql: "CASE WHEN km_final_odometro IS NOT NULL AND km_inicial_odometro IS NOT NULL THEN km_final_odometro - km_inicial_odometro ELSE NULL END", stored: true),
                    distancia_estimada_km = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    tiempo_estimado_min = table.Column<int>(type: "integer", nullable: true),
                    created_by = table.Column<long>(type: "bigint", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    creado_por_id = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ruta", x => x.id);
                    table.ForeignKey(
                        name: "FK_ruta_empleado_chofer_id",
                        column: x => x.chofer_id,
                        principalTable: "empleado",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_ruta_empleado_creado_por_id",
                        column: x => x.creado_por_id,
                        principalTable: "empleado",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_ruta_flotilla_flotilla_id",
                        column: x => x.flotilla_id,
                        principalTable: "flotilla",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_ruta_sucursal_origen_sucursal_id",
                        column: x => x.origen_sucursal_id,
                        principalTable: "sucursal",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_ruta_unidad_unidad_id",
                        column: x => x.unidad_id,
                        principalTable: "unidad",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "mantenimiento",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    unidad_id = table.Column<long>(type: "bigint", nullable: false),
                    tipo_mantenimiento_id = table.Column<long>(type: "bigint", nullable: false),
                    alerta_id = table.Column<long>(type: "bigint", nullable: true),
                    fecha_realizado = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    km_al_momento = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    costo = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    taller = table.Column<string>(type: "text", nullable: true),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    evidencia_url = table.Column<string>(type: "text", nullable: true),
                    realizado_por = table.Column<long>(type: "bigint", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    realizado_por_empleado_id = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mantenimiento", x => x.id);
                    table.ForeignKey(
                        name: "FK_mantenimiento_alerta_mantenimiento_alerta_id",
                        column: x => x.alerta_id,
                        principalTable: "alerta_mantenimiento",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_mantenimiento_empleado_realizado_por_empleado_id",
                        column: x => x.realizado_por_empleado_id,
                        principalTable: "empleado",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_mantenimiento_tipo_mantenimiento_tipo_mantenimiento_id",
                        column: x => x.tipo_mantenimiento_id,
                        principalTable: "tipo_mantenimiento",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_mantenimiento_unidad_unidad_id",
                        column: x => x.unidad_id,
                        principalTable: "unidad",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "alerta",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    tipo = table.Column<string>(type: "text", nullable: false),
                    flotilla_id = table.Column<long>(type: "bigint", nullable: true),
                    unidad_id = table.Column<long>(type: "bigint", nullable: true),
                    chofer_id = table.Column<long>(type: "bigint", nullable: true),
                    envio_id = table.Column<long>(type: "bigint", nullable: true),
                    ruta_id = table.Column<long>(type: "bigint", nullable: true),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    latitud = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    longitud = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    estado = table.Column<string>(type: "text", nullable: false),
                    atendida_por = table.Column<long>(type: "bigint", nullable: true),
                    fecha_alerta = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_atencion = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    atendida_por_empleado_id = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alerta", x => x.id);
                    table.ForeignKey(
                        name: "FK_alerta_empleado_atendida_por_empleado_id",
                        column: x => x.atendida_por_empleado_id,
                        principalTable: "empleado",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_alerta_empleado_chofer_id",
                        column: x => x.chofer_id,
                        principalTable: "empleado",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_alerta_envio_envio_id",
                        column: x => x.envio_id,
                        principalTable: "envio",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_alerta_flotilla_flotilla_id",
                        column: x => x.flotilla_id,
                        principalTable: "flotilla",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_alerta_ruta_ruta_id",
                        column: x => x.ruta_id,
                        principalTable: "ruta",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_alerta_unidad_unidad_id",
                        column: x => x.unidad_id,
                        principalTable: "unidad",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "entrega",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    envio_id = table.Column<long>(type: "bigint", nullable: false),
                    chofer_id = table.Column<long>(type: "bigint", nullable: false),
                    ruta_id = table.Column<long>(type: "bigint", nullable: true),
                    fecha_hora = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    codigo_ingresado = table.Column<string>(type: "text", nullable: true),
                    validado = table.Column<bool>(type: "boolean", nullable: false),
                    evidencia_foto_url = table.Column<string>(type: "text", nullable: true),
                    firma_url = table.Column<string>(type: "text", nullable: true),
                    latitud = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    longitud = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    estado = table.Column<string>(type: "text", nullable: false),
                    observaciones = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_entrega", x => x.id);
                    table.ForeignKey(
                        name: "FK_entrega_empleado_chofer_id",
                        column: x => x.chofer_id,
                        principalTable: "empleado",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_entrega_envio_envio_id",
                        column: x => x.envio_id,
                        principalTable: "envio",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_entrega_ruta_ruta_id",
                        column: x => x.ruta_id,
                        principalTable: "ruta",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "incidencia",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    envio_id = table.Column<long>(type: "bigint", nullable: true),
                    ruta_id = table.Column<long>(type: "bigint", nullable: true),
                    tipo = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: false),
                    evidencia_url = table.Column<string>(type: "text", nullable: true),
                    estado = table.Column<string>(type: "text", nullable: false),
                    fecha_reporte = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fecha_cierre = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_incidencia", x => x.id);
                    table.ForeignKey(
                        name: "FK_incidencia_envio_envio_id",
                        column: x => x.envio_id,
                        principalTable: "envio",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_incidencia_ruta_ruta_id",
                        column: x => x.ruta_id,
                        principalTable: "ruta",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "ruta_envio",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    ruta_id = table.Column<long>(type: "bigint", nullable: false),
                    envio_id = table.Column<long>(type: "bigint", nullable: false),
                    orden_entrega = table.Column<int>(type: "integer", nullable: false),
                    estado = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ruta_envio", x => x.id);
                    table.ForeignKey(
                        name: "FK_ruta_envio_envio_envio_id",
                        column: x => x.envio_id,
                        principalTable: "envio",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ruta_envio_ruta_ruta_id",
                        column: x => x.ruta_id,
                        principalTable: "ruta",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "telemetria_unidad",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    unidad_id = table.Column<long>(type: "bigint", nullable: false),
                    ruta_id = table.Column<long>(type: "bigint", nullable: true),
                    latitud = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    longitud = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    fecha_hora = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_telemetria_unidad", x => x.id);
                    table.ForeignKey(
                        name: "FK_telemetria_unidad_ruta_ruta_id",
                        column: x => x.ruta_id,
                        principalTable: "ruta",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_telemetria_unidad_unidad_unidad_id",
                        column: x => x.unidad_id,
                        principalTable: "unidad",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "reprogramacion",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    envio_id = table.Column<long>(type: "bigint", nullable: false),
                    incidencia_id = table.Column<long>(type: "bigint", nullable: true),
                    nueva_fecha_hora = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    motivo = table.Column<string>(type: "text", nullable: true),
                    estado = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reprogramacion", x => x.id);
                    table.ForeignKey(
                        name: "FK_reprogramacion_envio_envio_id",
                        column: x => x.envio_id,
                        principalTable: "envio",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_reprogramacion_incidencia_incidencia_id",
                        column: x => x.incidencia_id,
                        principalTable: "incidencia",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_alerta_atendida_por_empleado_id",
                table: "alerta",
                column: "atendida_por_empleado_id");

            migrationBuilder.CreateIndex(
                name: "IX_alerta_chofer_id",
                table: "alerta",
                column: "chofer_id");

            migrationBuilder.CreateIndex(
                name: "IX_alerta_envio_id",
                table: "alerta",
                column: "envio_id");

            migrationBuilder.CreateIndex(
                name: "IX_alerta_estado",
                table: "alerta",
                column: "estado");

            migrationBuilder.CreateIndex(
                name: "IX_alerta_fecha_alerta",
                table: "alerta",
                column: "fecha_alerta");

            migrationBuilder.CreateIndex(
                name: "IX_alerta_flotilla_id",
                table: "alerta",
                column: "flotilla_id");

            migrationBuilder.CreateIndex(
                name: "IX_alerta_ruta_id",
                table: "alerta",
                column: "ruta_id");

            migrationBuilder.CreateIndex(
                name: "IX_alerta_unidad_id",
                table: "alerta",
                column: "unidad_id");

            migrationBuilder.CreateIndex(
                name: "IX_alerta_mantenimiento_atendida_por_empleado_id",
                table: "alerta_mantenimiento",
                column: "atendida_por_empleado_id");

            migrationBuilder.CreateIndex(
                name: "IX_alerta_mantenimiento_estado",
                table: "alerta_mantenimiento",
                column: "estado");

            migrationBuilder.CreateIndex(
                name: "IX_alerta_mantenimiento_fecha_alerta",
                table: "alerta_mantenimiento",
                column: "fecha_alerta");

            migrationBuilder.CreateIndex(
                name: "IX_alerta_mantenimiento_tipo_mantenimiento_id",
                table: "alerta_mantenimiento",
                column: "tipo_mantenimiento_id");

            migrationBuilder.CreateIndex(
                name: "IX_alerta_mantenimiento_unidad_id",
                table: "alerta_mantenimiento",
                column: "unidad_id");

            migrationBuilder.CreateIndex(
                name: "IX_asignacion_flotilla_chofer_flotilla_id",
                table: "asignacion_flotilla_chofer",
                column: "flotilla_id");

            migrationBuilder.CreateIndex(
                name: "uq_asig_chofer_activa",
                table: "asignacion_flotilla_chofer",
                column: "chofer_id",
                unique: true,
                filter: "activo = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_cancelacion_actor_usuario_id",
                table: "cancelacion",
                column: "actor_usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_cancelacion_envio_id",
                table: "cancelacion",
                column: "envio_id");

            migrationBuilder.CreateIndex(
                name: "IX_cita_recoleccion_direccion_recoleccion_id",
                table: "cita_recoleccion",
                column: "direccion_recoleccion_id");

            migrationBuilder.CreateIndex(
                name: "IX_cita_recoleccion_envio_id",
                table: "cita_recoleccion",
                column: "envio_id");

            migrationBuilder.CreateIndex(
                name: "IX_cita_recoleccion_estado",
                table: "cita_recoleccion",
                column: "estado");

            migrationBuilder.CreateIndex(
                name: "IX_cita_recoleccion_fecha_hora_solicitada",
                table: "cita_recoleccion",
                column: "fecha_hora_solicitada");

            migrationBuilder.CreateIndex(
                name: "IX_cliente_nombre_apellido_paterno",
                table: "cliente",
                columns: new[] { "nombre", "apellido_paterno" });

            migrationBuilder.CreateIndex(
                name: "IX_cliente_usuario_id",
                table: "cliente",
                column: "usuario_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cliente_direccion_cliente_id",
                table: "cliente_direccion",
                column: "cliente_id");

            migrationBuilder.CreateIndex(
                name: "IX_cliente_direccion_direccion_id",
                table: "cliente_direccion",
                column: "direccion_id");

            migrationBuilder.CreateIndex(
                name: "IX_devolucion_envio_id",
                table: "devolucion",
                column: "envio_id");

            migrationBuilder.CreateIndex(
                name: "IX_devolucion_estado",
                table: "devolucion",
                column: "estado");

            migrationBuilder.CreateIndex(
                name: "IX_devolucion_sucursal_destino_id",
                table: "devolucion",
                column: "sucursal_destino_id");

            migrationBuilder.CreateIndex(
                name: "IX_empleado_sucursal_id",
                table: "empleado",
                column: "sucursal_id");

            migrationBuilder.CreateIndex(
                name: "IX_empleado_usuario_id",
                table: "empleado",
                column: "usuario_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_empleado_puesto_historial_empleado_id",
                table: "empleado_puesto_historial",
                column: "empleado_id");

            migrationBuilder.CreateIndex(
                name: "IX_empleado_puesto_historial_puesto_id",
                table: "empleado_puesto_historial",
                column: "puesto_id");

            migrationBuilder.CreateIndex(
                name: "IX_entrega_chofer_id",
                table: "entrega",
                column: "chofer_id");

            migrationBuilder.CreateIndex(
                name: "IX_entrega_envio_id",
                table: "entrega",
                column: "envio_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_entrega_ruta_id",
                table: "entrega",
                column: "ruta_id");

            migrationBuilder.CreateIndex(
                name: "IX_envio_creado_por_usuario_id",
                table: "envio",
                column: "creado_por_usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_envio_destinatario_cliente_id",
                table: "envio",
                column: "destinatario_cliente_id");

            migrationBuilder.CreateIndex(
                name: "IX_envio_direccion_destino_id",
                table: "envio",
                column: "direccion_destino_id");

            migrationBuilder.CreateIndex(
                name: "IX_envio_estado",
                table: "envio",
                column: "estado");

            migrationBuilder.CreateIndex(
                name: "IX_envio_fecha_creacion",
                table: "envio",
                column: "fecha_creacion");

            migrationBuilder.CreateIndex(
                name: "IX_envio_guia",
                table: "envio",
                column: "guia",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_envio_remitente_id",
                table: "envio",
                column: "remitente_id");

            migrationBuilder.CreateIndex(
                name: "IX_envio_requiere_recoleccion",
                table: "envio",
                column: "requiere_recoleccion");

            migrationBuilder.CreateIndex(
                name: "IX_envio_sucursal_destino_id",
                table: "envio",
                column: "sucursal_destino_id");

            migrationBuilder.CreateIndex(
                name: "IX_envio_sucursal_recepcion_id",
                table: "envio",
                column: "sucursal_recepcion_id");

            migrationBuilder.CreateIndex(
                name: "IX_evaluacion_envio_id",
                table: "evaluacion",
                column: "envio_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_evento_envio_envio_id_fecha_evento",
                table: "evento_envio",
                columns: new[] { "envio_id", "fecha_evento" });

            migrationBuilder.CreateIndex(
                name: "IX_evento_envio_usuario_id",
                table: "evento_envio",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_flotilla_codigo",
                table: "flotilla",
                column: "codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_flotilla_sucursal_id",
                table: "flotilla",
                column: "sucursal_id");

            migrationBuilder.CreateIndex(
                name: "IX_flotilla_supervisor_id",
                table: "flotilla",
                column: "supervisor_id");

            migrationBuilder.CreateIndex(
                name: "IX_incidencia_envio_id",
                table: "incidencia",
                column: "envio_id");

            migrationBuilder.CreateIndex(
                name: "IX_incidencia_estado",
                table: "incidencia",
                column: "estado");

            migrationBuilder.CreateIndex(
                name: "IX_incidencia_ruta_id",
                table: "incidencia",
                column: "ruta_id");

            migrationBuilder.CreateIndex(
                name: "IX_mantenimiento_alerta_id",
                table: "mantenimiento",
                column: "alerta_id");

            migrationBuilder.CreateIndex(
                name: "IX_mantenimiento_fecha_realizado",
                table: "mantenimiento",
                column: "fecha_realizado");

            migrationBuilder.CreateIndex(
                name: "IX_mantenimiento_realizado_por_empleado_id",
                table: "mantenimiento",
                column: "realizado_por_empleado_id");

            migrationBuilder.CreateIndex(
                name: "IX_mantenimiento_tipo_mantenimiento_id",
                table: "mantenimiento",
                column: "tipo_mantenimiento_id");

            migrationBuilder.CreateIndex(
                name: "IX_mantenimiento_unidad_id",
                table: "mantenimiento",
                column: "unidad_id");

            migrationBuilder.CreateIndex(
                name: "IX_permiso_codigo",
                table: "permiso",
                column: "codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_permiso_modulo",
                table: "permiso",
                column: "modulo");

            migrationBuilder.CreateIndex(
                name: "IX_puesto_nombre",
                table: "puesto",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_queja_atendida_por_empleado_id",
                table: "queja",
                column: "atendida_por_empleado_id");

            migrationBuilder.CreateIndex(
                name: "IX_queja_envio_id",
                table: "queja",
                column: "envio_id");

            migrationBuilder.CreateIndex(
                name: "IX_queja_estado",
                table: "queja",
                column: "estado");

            migrationBuilder.CreateIndex(
                name: "IX_queja_folio",
                table: "queja",
                column: "folio",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_queja_seguimiento_empleado_id",
                table: "queja_seguimiento",
                column: "empleado_id");

            migrationBuilder.CreateIndex(
                name: "IX_queja_seguimiento_queja_id",
                table: "queja_seguimiento",
                column: "queja_id");

            migrationBuilder.CreateIndex(
                name: "IX_recepcion_paquete_envio_id",
                table: "recepcion_paquete",
                column: "envio_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_recepcion_paquete_recibido_por_empleado_id",
                table: "recepcion_paquete",
                column: "recibido_por_empleado_id");

            migrationBuilder.CreateIndex(
                name: "IX_reclamacion_devolucion_id",
                table: "reclamacion",
                column: "devolucion_id");

            migrationBuilder.CreateIndex(
                name: "IX_reclamacion_envio_id",
                table: "reclamacion",
                column: "envio_id");

            migrationBuilder.CreateIndex(
                name: "IX_reprogramacion_envio_id",
                table: "reprogramacion",
                column: "envio_id");

            migrationBuilder.CreateIndex(
                name: "IX_reprogramacion_incidencia_id",
                table: "reprogramacion",
                column: "incidencia_id");

            migrationBuilder.CreateIndex(
                name: "IX_rol_nombre",
                table: "rol",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rol_permiso_permiso_id",
                table: "rol_permiso",
                column: "permiso_id");

            migrationBuilder.CreateIndex(
                name: "IX_ruta_chofer_id_fecha",
                table: "ruta",
                columns: new[] { "chofer_id", "fecha" });

            migrationBuilder.CreateIndex(
                name: "IX_ruta_creado_por_id",
                table: "ruta",
                column: "creado_por_id");

            migrationBuilder.CreateIndex(
                name: "IX_ruta_estado",
                table: "ruta",
                column: "estado");

            migrationBuilder.CreateIndex(
                name: "IX_ruta_flotilla_id",
                table: "ruta",
                column: "flotilla_id");

            migrationBuilder.CreateIndex(
                name: "IX_ruta_origen_sucursal_id",
                table: "ruta",
                column: "origen_sucursal_id");

            migrationBuilder.CreateIndex(
                name: "IX_ruta_unidad_id_fecha",
                table: "ruta",
                columns: new[] { "unidad_id", "fecha" });

            migrationBuilder.CreateIndex(
                name: "IX_ruta_envio_envio_id",
                table: "ruta_envio",
                column: "envio_id");

            migrationBuilder.CreateIndex(
                name: "IX_ruta_envio_ruta_id_envio_id",
                table: "ruta_envio",
                columns: new[] { "ruta_id", "envio_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sucursal_codigo",
                table: "sucursal",
                column: "codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sucursal_direccion_id",
                table: "sucursal",
                column: "direccion_id");

            migrationBuilder.CreateIndex(
                name: "IX_telemetria_unidad_ruta_id_fecha_hora",
                table: "telemetria_unidad",
                columns: new[] { "ruta_id", "fecha_hora" });

            migrationBuilder.CreateIndex(
                name: "IX_telemetria_unidad_unidad_id_fecha_hora",
                table: "telemetria_unidad",
                columns: new[] { "unidad_id", "fecha_hora" });

            migrationBuilder.CreateIndex(
                name: "IX_tipo_mantenimiento_nombre",
                table: "tipo_mantenimiento",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_unidad_estado",
                table: "unidad",
                column: "estado");

            migrationBuilder.CreateIndex(
                name: "IX_unidad_flotilla_id",
                table: "unidad",
                column: "flotilla_id");

            migrationBuilder.CreateIndex(
                name: "IX_unidad_placas",
                table: "unidad",
                column: "placas",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_usuario_email",
                table: "usuario",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_usuario_estado_historial_registrado_por",
                table: "usuario_estado_historial",
                column: "registrado_por");

            migrationBuilder.CreateIndex(
                name: "IX_usuario_estado_historial_usuario_id",
                table: "usuario_estado_historial",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_usuario_rol_rol_id",
                table: "usuario_rol",
                column: "rol_id");
            
            migrationBuilder.Sql(@"
        CREATE EXTENSION IF NOT EXISTS ""pgcrypto"";

        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    ");

    // Triggers de updated_at
    var tablasConUpdatedAt = new[]
    {
        "direccion","sucursal","usuario","empleado","cliente","flotilla",
        "unidad","tipo_mantenimiento","envio","cita_recoleccion","ruta"
    };

    foreach (var t in tablasConUpdatedAt)
    {
        migrationBuilder.Sql($@"
            CREATE TRIGGER trg_{t}_updated
            BEFORE UPDATE ON {t}
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        ");
    }

    // Trigger de odómetro
    migrationBuilder.Sql(@"
        CREATE OR REPLACE FUNCTION trg_fn_ruta_actualizar_odometro()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.estado = 'finalizada'
               AND NEW.km_final_odometro IS NOT NULL
               AND NEW.unidad_id IS NOT NULL
               AND (OLD.estado <> 'finalizada'
                    OR OLD.km_final_odometro IS DISTINCT FROM NEW.km_final_odometro)
            THEN
                UPDATE unidad
                SET km_odometro_actual = NEW.km_final_odometro
                WHERE id = NEW.unidad_id
                  AND NEW.km_final_odometro > km_odometro_actual;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trg_ruta_actualizar_odometro
        AFTER UPDATE ON ruta
        FOR EACH ROW EXECUTE FUNCTION trg_fn_ruta_actualizar_odometro();
    ");

    // Trigger de alerta de mantenimiento
    migrationBuilder.Sql(@"
        CREATE OR REPLACE FUNCTION trg_fn_generar_alerta_mantenimiento()
        RETURNS TRIGGER AS $$
        DECLARE
            tm RECORD;
            v_km_ultimo_mantenimiento NUMERIC(10,2);
            v_km_base NUMERIC(10,2);
        BEGIN
            IF NEW.km_odometro_actual IS NOT DISTINCT FROM OLD.km_odometro_actual THEN
                RETURN NEW;
            END IF;

            FOR tm IN
                SELECT * FROM tipo_mantenimiento
                WHERE activo = TRUE
                  AND (aplica_a_tipo_vehiculo IS NULL OR aplica_a_tipo_vehiculo = NEW.tipo_vehiculo)
            LOOP
                SELECT MAX(km_al_momento) INTO v_km_ultimo_mantenimiento
                FROM mantenimiento
                WHERE unidad_id = NEW.id AND tipo_mantenimiento_id = tm.id;

                v_km_base := COALESCE(v_km_ultimo_mantenimiento, COALESCE(NEW.km_odometro_inicial, 0));

                IF (NEW.km_odometro_actual - v_km_base) >= tm.km_intervalo THEN
                    IF NOT EXISTS (
                        SELECT 1 FROM alerta_mantenimiento am
                        WHERE am.unidad_id = NEW.id
                          AND am.tipo_mantenimiento_id = tm.id
                          AND am.estado IN ('nueva','vista')
                    ) THEN
                        INSERT INTO alerta_mantenimiento (
                            unidad_id, tipo_mantenimiento_id,
                            km_al_momento, km_umbral, km_ultimo_mantenimiento,
                            descripcion, estado
                        ) VALUES (
                            NEW.id, tm.id,
                            NEW.km_odometro_actual,
                            v_km_base + tm.km_intervalo,
                            v_km_ultimo_mantenimiento,
                            'La unidad requiere ' || tm.nombre
                                || ' (intervalo: ' || tm.km_intervalo || ' km)',
                            'nueva'
                        );
                    END IF;
                END IF;
            END LOOP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trg_unidad_generar_alerta_mantenimiento
        AFTER UPDATE ON unidad
        FOR EACH ROW EXECUTE FUNCTION trg_fn_generar_alerta_mantenimiento();
    ");

    // Vista
    migrationBuilder.Sql(@"
        CREATE OR REPLACE VIEW usuario_permiso_efectivo AS
        SELECT DISTINCT
            ur.usuario_id,
            p.id     AS permiso_id,
            p.codigo AS permiso_codigo,
            p.modulo AS permiso_modulo
        FROM usuario_rol ur
        JOIN rol_permiso rp ON rp.rol_id = ur.rol_id
        JOIN permiso p      ON p.id = rp.permiso_id;
    ");

    // Seed data
    migrationBuilder.Sql(@"
        INSERT INTO rol (nombre, descripcion) VALUES
        ('RH','Recursos Humanos'),
        ('Supervisor','Supervisor de operaciones'),
        ('Jefe de flotilla','Planificación de rutas y monitoreo'),
        ('Chofer','Operador de unidad'),
        ('Personal administrativo','Registro y atención al cliente'),
        ('Personal de sucursal','Recepción de paquetes en sucursal');
    "); 
            
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "alerta");

            migrationBuilder.DropTable(
                name: "asignacion_flotilla_chofer");

            migrationBuilder.DropTable(
                name: "cancelacion");

            migrationBuilder.DropTable(
                name: "cita_recoleccion");

            migrationBuilder.DropTable(
                name: "cliente_direccion");

            migrationBuilder.DropTable(
                name: "empleado_puesto_historial");

            migrationBuilder.DropTable(
                name: "entrega");

            migrationBuilder.DropTable(
                name: "evaluacion");

            migrationBuilder.DropTable(
                name: "evento_envio");

            migrationBuilder.DropTable(
                name: "mantenimiento");

            migrationBuilder.DropTable(
                name: "queja_seguimiento");

            migrationBuilder.DropTable(
                name: "recepcion_paquete");

            migrationBuilder.DropTable(
                name: "reclamacion");

            migrationBuilder.DropTable(
                name: "reprogramacion");

            migrationBuilder.DropTable(
                name: "rol_permiso");

            migrationBuilder.DropTable(
                name: "ruta_envio");

            migrationBuilder.DropTable(
                name: "telemetria_unidad");

            migrationBuilder.DropTable(
                name: "usuario_estado_historial");

            migrationBuilder.DropTable(
                name: "usuario_rol");

            migrationBuilder.DropTable(
                name: "puesto");

            migrationBuilder.DropTable(
                name: "alerta_mantenimiento");

            migrationBuilder.DropTable(
                name: "queja");

            migrationBuilder.DropTable(
                name: "devolucion");

            migrationBuilder.DropTable(
                name: "incidencia");

            migrationBuilder.DropTable(
                name: "permiso");

            migrationBuilder.DropTable(
                name: "rol");

            migrationBuilder.DropTable(
                name: "tipo_mantenimiento");

            migrationBuilder.DropTable(
                name: "envio");

            migrationBuilder.DropTable(
                name: "ruta");

            migrationBuilder.DropTable(
                name: "cliente");

            migrationBuilder.DropTable(
                name: "unidad");

            migrationBuilder.DropTable(
                name: "flotilla");

            migrationBuilder.DropTable(
                name: "empleado");

            migrationBuilder.DropTable(
                name: "sucursal");

            migrationBuilder.DropTable(
                name: "usuario");

            migrationBuilder.DropTable(
                name: "direccion");
        }
    }
}
