using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class CatalogosInegiSepomex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "asentamiento_id",
                table: "direccion",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "entre_calles",
                table: "direccion",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<short>(
                name: "estado_id",
                table: "direccion",
                type: "smallint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "localidad",
                table: "direccion",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "localidad_id",
                table: "direccion",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "municipio_id",
                table: "direccion",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "cat_estado",
                columns: table => new
                {
                    id = table.Column<short>(type: "smallint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    cvegeo = table.Column<string>(type: "character(2)", fixedLength: true, maxLength: 2, nullable: false),
                    cve_ent = table.Column<string>(type: "character(2)", fixedLength: true, maxLength: 2, nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    abreviatura = table.Column<string>(type: "text", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cat_estado", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "cat_municipio",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    estado_id = table.Column<short>(type: "smallint", nullable: false),
                    cvegeo = table.Column<string>(type: "character(5)", fixedLength: true, maxLength: 5, nullable: false),
                    cve_ent = table.Column<string>(type: "character(2)", fixedLength: true, maxLength: 2, nullable: false),
                    cve_mun = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    cve_cab = table.Column<string>(type: "character(4)", fixedLength: true, maxLength: 4, nullable: true),
                    nom_cab = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cat_municipio", x => x.id);
                    table.ForeignKey(
                        name: "FK_cat_municipio_cat_estado_estado_id",
                        column: x => x.estado_id,
                        principalTable: "cat_estado",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cat_asentamiento",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    estado_id = table.Column<short>(type: "smallint", nullable: false),
                    municipio_id = table.Column<int>(type: "integer", nullable: false),
                    d_codigo = table.Column<string>(type: "character(5)", fixedLength: true, maxLength: 5, nullable: false),
                    d_asenta = table.Column<string>(type: "text", nullable: false),
                    d_tipo_asenta = table.Column<string>(type: "text", nullable: false),
                    d_ciudad = table.Column<string>(type: "text", nullable: true),
                    d_cp = table.Column<string>(type: "character(5)", fixedLength: true, maxLength: 5, nullable: true),
                    c_estado = table.Column<string>(type: "character(2)", fixedLength: true, maxLength: 2, nullable: false),
                    c_oficina = table.Column<string>(type: "character(5)", fixedLength: true, maxLength: 5, nullable: true),
                    c_cp = table.Column<string>(type: "text", nullable: true),
                    c_tipo_asenta = table.Column<string>(type: "character(2)", fixedLength: true, maxLength: 2, nullable: true),
                    c_mnpio = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    id_asenta_cpcons = table.Column<string>(type: "character(4)", fixedLength: true, maxLength: 4, nullable: false),
                    d_zona = table.Column<string>(type: "text", nullable: true),
                    c_cve_ciudad = table.Column<string>(type: "character(2)", fixedLength: true, maxLength: 2, nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cat_asentamiento", x => x.id);
                    table.ForeignKey(
                        name: "FK_cat_asentamiento_cat_estado_estado_id",
                        column: x => x.estado_id,
                        principalTable: "cat_estado",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cat_asentamiento_cat_municipio_municipio_id",
                        column: x => x.municipio_id,
                        principalTable: "cat_municipio",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cat_localidad",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    estado_id = table.Column<short>(type: "smallint", nullable: false),
                    municipio_id = table.Column<int>(type: "integer", nullable: false),
                    cvegeo = table.Column<string>(type: "character(9)", fixedLength: true, maxLength: 9, nullable: false),
                    estatus = table.Column<string>(type: "text", nullable: true),
                    cve_ent = table.Column<string>(type: "character(2)", fixedLength: true, maxLength: 2, nullable: false),
                    cve_mun = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    cve_loc = table.Column<string>(type: "character(4)", fixedLength: true, maxLength: 4, nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    ambito = table.Column<string>(type: "character(1)", fixedLength: true, maxLength: 1, nullable: true),
                    lat_decimal = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    lon_decimal = table.Column<decimal>(type: "numeric(10,7)", precision: 10, scale: 7, nullable: true),
                    altitud = table.Column<int>(type: "integer", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cat_localidad", x => x.id);
                    table.ForeignKey(
                        name: "FK_cat_localidad_cat_estado_estado_id",
                        column: x => x.estado_id,
                        principalTable: "cat_estado",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cat_localidad_cat_municipio_municipio_id",
                        column: x => x.municipio_id,
                        principalTable: "cat_municipio",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sucursal_cobertura",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    sucursal_id = table.Column<long>(type: "bigint", nullable: false),
                    estado_id = table.Column<short>(type: "smallint", nullable: false),
                    municipio_id = table.Column<int>(type: "integer", nullable: true),
                    codigo_postal = table.Column<string>(type: "character(5)", fixedLength: true, maxLength: 5, nullable: true),
                    aplica_recoleccion = table.Column<bool>(type: "boolean", nullable: false),
                    aplica_entrega = table.Column<bool>(type: "boolean", nullable: false),
                    es_zona_extendida = table.Column<bool>(type: "boolean", nullable: false),
                    dias_estimados = table.Column<short>(type: "smallint", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sucursal_cobertura", x => x.id);
                    table.ForeignKey(
                        name: "FK_sucursal_cobertura_cat_estado_estado_id",
                        column: x => x.estado_id,
                        principalTable: "cat_estado",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_sucursal_cobertura_cat_municipio_municipio_id",
                        column: x => x.municipio_id,
                        principalTable: "cat_municipio",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_sucursal_cobertura_sucursal_sucursal_id",
                        column: x => x.sucursal_id,
                        principalTable: "sucursal",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_direccion_asentamiento",
                table: "direccion",
                column: "asentamiento_id");

            migrationBuilder.CreateIndex(
                name: "idx_direccion_cp",
                table: "direccion",
                column: "codigo_postal");

            migrationBuilder.CreateIndex(
                name: "idx_direccion_estado_mun",
                table: "direccion",
                columns: new[] { "estado_id", "municipio_id" });

            migrationBuilder.CreateIndex(
                name: "idx_direccion_localidad",
                table: "direccion",
                column: "localidad_id");

            migrationBuilder.CreateIndex(
                name: "IX_direccion_municipio_id",
                table: "direccion",
                column: "municipio_id");

            migrationBuilder.CreateIndex(
                name: "idx_cat_asentamiento_cp",
                table: "cat_asentamiento",
                column: "d_codigo");

            migrationBuilder.CreateIndex(
                name: "idx_cat_asentamiento_estado",
                table: "cat_asentamiento",
                column: "estado_id");

            migrationBuilder.CreateIndex(
                name: "idx_cat_asentamiento_municipio",
                table: "cat_asentamiento",
                column: "municipio_id");

            migrationBuilder.CreateIndex(
                name: "idx_cat_asentamiento_nombre",
                table: "cat_asentamiento",
                column: "d_asenta");

            migrationBuilder.CreateIndex(
                name: "IX_cat_asentamiento_c_estado_c_mnpio_id_asenta_cpcons_d_codigo",
                table: "cat_asentamiento",
                columns: new[] { "c_estado", "c_mnpio", "id_asenta_cpcons", "d_codigo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_cat_estado_nombre",
                table: "cat_estado",
                column: "nombre");

            migrationBuilder.CreateIndex(
                name: "IX_cat_estado_cve_ent",
                table: "cat_estado",
                column: "cve_ent",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cat_estado_cvegeo",
                table: "cat_estado",
                column: "cvegeo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_cat_localidad_estado",
                table: "cat_localidad",
                column: "estado_id");

            migrationBuilder.CreateIndex(
                name: "idx_cat_localidad_municipio",
                table: "cat_localidad",
                column: "municipio_id");

            migrationBuilder.CreateIndex(
                name: "idx_cat_localidad_nombre",
                table: "cat_localidad",
                column: "nombre");

            migrationBuilder.CreateIndex(
                name: "IX_cat_localidad_cve_ent_cve_mun_cve_loc",
                table: "cat_localidad",
                columns: new[] { "cve_ent", "cve_mun", "cve_loc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cat_localidad_cvegeo",
                table: "cat_localidad",
                column: "cvegeo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cat_localidad_municipio_id_cve_loc",
                table: "cat_localidad",
                columns: new[] { "municipio_id", "cve_loc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_cat_municipio_estado",
                table: "cat_municipio",
                column: "estado_id");

            migrationBuilder.CreateIndex(
                name: "idx_cat_municipio_nombre",
                table: "cat_municipio",
                column: "nombre");

            migrationBuilder.CreateIndex(
                name: "IX_cat_municipio_cve_ent_cve_mun",
                table: "cat_municipio",
                columns: new[] { "cve_ent", "cve_mun" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cat_municipio_cvegeo",
                table: "cat_municipio",
                column: "cvegeo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cat_municipio_estado_id_cve_mun",
                table: "cat_municipio",
                columns: new[] { "estado_id", "cve_mun" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_suc_cobertura_cp",
                table: "sucursal_cobertura",
                column: "codigo_postal");

            migrationBuilder.CreateIndex(
                name: "idx_suc_cobertura_estado",
                table: "sucursal_cobertura",
                column: "estado_id");

            migrationBuilder.CreateIndex(
                name: "idx_suc_cobertura_municipio",
                table: "sucursal_cobertura",
                column: "municipio_id");

            migrationBuilder.CreateIndex(
                name: "idx_suc_cobertura_sucursal",
                table: "sucursal_cobertura",
                column: "sucursal_id");

            migrationBuilder.CreateIndex(
                name: "IX_sucursal_cobertura_sucursal_id_estado_id_municipio_id_codig~",
                table: "sucursal_cobertura",
                columns: new[] { "sucursal_id", "estado_id", "municipio_id", "codigo_postal" },
                unique: true)
                .Annotation("Npgsql:NullsDistinct", false);

            migrationBuilder.AddForeignKey(
                name: "FK_direccion_cat_asentamiento_asentamiento_id",
                table: "direccion",
                column: "asentamiento_id",
                principalTable: "cat_asentamiento",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_direccion_cat_estado_estado_id",
                table: "direccion",
                column: "estado_id",
                principalTable: "cat_estado",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_direccion_cat_localidad_localidad_id",
                table: "direccion",
                column: "localidad_id",
                principalTable: "cat_localidad",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_direccion_cat_municipio_municipio_id",
                table: "direccion",
                column: "municipio_id",
                principalTable: "cat_municipio",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_direccion_cat_asentamiento_asentamiento_id",
                table: "direccion");

            migrationBuilder.DropForeignKey(
                name: "FK_direccion_cat_estado_estado_id",
                table: "direccion");

            migrationBuilder.DropForeignKey(
                name: "FK_direccion_cat_localidad_localidad_id",
                table: "direccion");

            migrationBuilder.DropForeignKey(
                name: "FK_direccion_cat_municipio_municipio_id",
                table: "direccion");

            migrationBuilder.DropTable(
                name: "cat_asentamiento");

            migrationBuilder.DropTable(
                name: "cat_localidad");

            migrationBuilder.DropTable(
                name: "sucursal_cobertura");

            migrationBuilder.DropTable(
                name: "cat_municipio");

            migrationBuilder.DropTable(
                name: "cat_estado");

            migrationBuilder.DropIndex(
                name: "idx_direccion_asentamiento",
                table: "direccion");

            migrationBuilder.DropIndex(
                name: "idx_direccion_cp",
                table: "direccion");

            migrationBuilder.DropIndex(
                name: "idx_direccion_estado_mun",
                table: "direccion");

            migrationBuilder.DropIndex(
                name: "idx_direccion_localidad",
                table: "direccion");

            migrationBuilder.DropIndex(
                name: "IX_direccion_municipio_id",
                table: "direccion");

            migrationBuilder.DropColumn(
                name: "asentamiento_id",
                table: "direccion");

            migrationBuilder.DropColumn(
                name: "entre_calles",
                table: "direccion");

            migrationBuilder.DropColumn(
                name: "estado_id",
                table: "direccion");

            migrationBuilder.DropColumn(
                name: "localidad",
                table: "direccion");

            migrationBuilder.DropColumn(
                name: "localidad_id",
                table: "direccion");

            migrationBuilder.DropColumn(
                name: "municipio_id",
                table: "direccion");
        }
    }
}

