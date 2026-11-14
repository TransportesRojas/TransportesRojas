-- Importación de catálogos INEGI y SEPOMEX

BEGIN;

-- Tablas temporales de carga

-- Estados
CREATE TEMP TABLE stg_inegi_estados (
    cvegeo                       TEXT,
    cve_ent                      TEXT,
    nom_ent                      TEXT,
    nom_abr                      TEXT,
    pob_total                    TEXT,
    pob_masculina                TEXT,
    pob_femenina                 TEXT,
    total_viviendas_habitadas    TEXT
) ON COMMIT DROP;

-- Municipios
CREATE TEMP TABLE stg_inegi_municipios (
    cvegeo                       TEXT,
    cve_ent                      TEXT,
    nom_ent                      TEXT,
    nom_abr                      TEXT,
    cve_mun                      TEXT,
    nom_mun                      TEXT,
    cve_cab                      TEXT,
    nom_cab                      TEXT,
    pob_total                    TEXT,
    pob_masculina                TEXT,
    pob_femenina                 TEXT,
    total_viviendas_habitadas    TEXT
) ON COMMIT DROP;

-- Localidades
CREATE TEMP TABLE stg_inegi_localidades (
    cvegeo                       TEXT,
    estatus                      TEXT,
    cve_ent                      TEXT,
    nom_ent                      TEXT,
    nom_abr                      TEXT,
    cve_mun                      TEXT,
    nom_mun                      TEXT,
    cve_loc                      TEXT,
    nom_loc                      TEXT,
    ambito                       TEXT,
    latitud                      TEXT,
    longitud                     TEXT,
    lat_decimal                  TEXT,
    lon_decimal                  TEXT,
    altitud                      TEXT,
    cve_carta                    TEXT,
    pob_total                    TEXT,
    pob_masculina                TEXT,
    pob_femenina                 TEXT,
    total_viviendas_habitadas    TEXT
) ON COMMIT DROP;

-- Códigos postales SEPOMEX
CREATE TEMP TABLE stg_sepomex_cp (
    d_codigo         TEXT,
    d_asenta         TEXT,
    d_tipo_asenta    TEXT,
    d_mnpio          TEXT,
    d_estado         TEXT,
    d_ciudad         TEXT,
    d_cp             TEXT,
    c_estado         TEXT,
    c_oficina        TEXT,
    c_cp             TEXT,
    c_tipo_asenta    TEXT,
    c_mnpio          TEXT,
    id_asenta_cpcons TEXT,
    d_zona           TEXT,
    c_cve_ciudad     TEXT
) ON COMMIT DROP;

-- Carga de archivos crudos

COPY stg_inegi_estados 
FROM '/tmp/inegi/catun_entidad/AGEEML_202512121056362_utf.csv' 
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

COPY stg_inegi_municipios 
FROM '/tmp/inegi/catun_municipio/AGEEML_20268211656753_utf8.csv' 
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

COPY stg_inegi_localidades 
FROM '/tmp/inegi/may_acento/AGEEML_202610131441225_utf.csv' 
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

COPY stg_sepomex_cp 
FROM '/tmp/inegi/CPdescargatxt/CPdescarga.txt' 
WITH (FORMAT csv, DELIMITER '|', HEADER true, ENCODING 'LATIN1');

-- Inserción en catálogos

-- Estados
INSERT INTO cat_estado (cvegeo, cve_ent, nombre, abreviatura, activo)
SELECT DISTINCT ON (LPAD(TRIM(s.cve_ent), 2, '0'))
    LPAD(TRIM(COALESCE(NULLIF(s.cvegeo, ''), s.cve_ent)), 2, '0') AS cvegeo,
    LPAD(TRIM(s.cve_ent), 2, '0')                                 AS cve_ent,
    TRIM(s.nom_ent)                                               AS nombre,
    TRIM(COALESCE(NULLIF(s.nom_abr, ''), s.nom_ent))              AS abreviatura,
    TRUE                                                          AS activo
FROM stg_inegi_estados s
WHERE s.cve_ent IS NOT NULL
  AND TRIM(s.cve_ent) ~ '^[0-9]+$'
ORDER BY LPAD(TRIM(s.cve_ent), 2, '0')
ON CONFLICT (cve_ent) DO UPDATE
SET nombre      = EXCLUDED.nombre,
    abreviatura = EXCLUDED.abreviatura,
    activo      = TRUE;

-- Municipios
INSERT INTO cat_municipio (estado_id, cvegeo, cve_ent, cve_mun, nombre, cve_cab, nom_cab, activo)
SELECT DISTINCT ON (LPAD(TRIM(s.cve_ent), 2, '0'), LPAD(TRIM(s.cve_mun), 3, '0'))
    e.id                                                          AS estado_id,
    LPAD(TRIM(s.cve_ent), 2, '0') || LPAD(TRIM(s.cve_mun), 3, '0') AS cvegeo,
    LPAD(TRIM(s.cve_ent), 2, '0')                                 AS cve_ent,
    LPAD(TRIM(s.cve_mun), 3, '0')                                 AS cve_mun,
    TRIM(s.nom_mun)                                               AS nombre,
    CASE WHEN NULLIF(TRIM(s.cve_cab), '') ~ '^[0-9]+$'
         THEN LPAD(TRIM(s.cve_cab), 4, '0')
         ELSE NULLIF(TRIM(s.cve_cab), '')
    END                                                           AS cve_cab,
    NULLIF(TRIM(s.nom_cab), '')                                   AS nom_cab,
    TRUE                                                          AS activo
FROM stg_inegi_municipios s
JOIN cat_estado e
  ON e.cve_ent = LPAD(TRIM(s.cve_ent), 2, '0')
WHERE s.cve_mun IS NOT NULL
  AND TRIM(s.cve_mun) ~ '^[0-9]+$'
ORDER BY LPAD(TRIM(s.cve_ent), 2, '0'), LPAD(TRIM(s.cve_mun), 3, '0')
ON CONFLICT (cvegeo) DO UPDATE
SET nombre  = EXCLUDED.nombre,
    cve_cab = EXCLUDED.cve_cab,
    nom_cab = EXCLUDED.nom_cab,
    activo  = TRUE;

-- Localidades
INSERT INTO cat_localidad (
    estado_id, municipio_id, cvegeo, estatus, cve_ent, cve_mun, cve_loc,
    nombre, ambito, lat_decimal, lon_decimal, altitud, activo
)
SELECT DISTINCT ON (
    LPAD(TRIM(s.cve_ent), 2, '0'),
    LPAD(TRIM(s.cve_mun), 3, '0'),
    LPAD(TRIM(s.cve_loc), 4, '0')
)
    m.estado_id                                                                                   AS estado_id,
    m.id                                                                                          AS municipio_id,
    LPAD(TRIM(s.cve_ent), 2, '0') || LPAD(TRIM(s.cve_mun), 3, '0') || LPAD(TRIM(s.cve_loc), 4, '0') AS cvegeo,
    NULLIF(TRIM(s.estatus), '')                                                                   AS estatus,
    LPAD(TRIM(s.cve_ent), 2, '0')                                                                 AS cve_ent,
    LPAD(TRIM(s.cve_mun), 3, '0')                                                                 AS cve_mun,
    LPAD(TRIM(s.cve_loc), 4, '0')                                                                 AS cve_loc,
    TRIM(s.nom_loc)                                                                               AS nombre,
    CASE WHEN UPPER(TRIM(s.ambito)) IN ('U', 'R') THEN UPPER(TRIM(s.ambito)) ELSE NULL END        AS ambito,
    CASE WHEN TRIM(s.lat_decimal) ~ '^-?[0-9]+(\.[0-9]+)?$'
         THEN TRIM(s.lat_decimal)::NUMERIC(10,7)
         ELSE NULL
    END                                                                                           AS lat_decimal,
    CASE WHEN TRIM(s.lon_decimal) ~ '^-?[0-9]+(\.[0-9]+)?$'
         THEN TRIM(s.lon_decimal)::NUMERIC(10,7)
         ELSE NULL
    END                                                                                           AS lon_decimal,
    CASE WHEN TRIM(s.altitud) ~ '^-?[0-9]+$'
         THEN TRIM(s.altitud)::INT
         ELSE NULL
    END                                                                                           AS altitud,
    TRUE                                                                                          AS activo
FROM stg_inegi_localidades s
JOIN cat_municipio m
  ON m.cve_ent = LPAD(TRIM(s.cve_ent), 2, '0')
 AND m.cve_mun = LPAD(TRIM(s.cve_mun), 3, '0')
WHERE s.cve_loc IS NOT NULL
  AND TRIM(s.cve_loc) ~ '^[0-9]+$'
ORDER BY
    LPAD(TRIM(s.cve_ent), 2, '0'),
    LPAD(TRIM(s.cve_mun), 3, '0'),
    LPAD(TRIM(s.cve_loc), 4, '0')
ON CONFLICT (cvegeo) DO UPDATE
SET estatus     = EXCLUDED.estatus,
    nombre      = EXCLUDED.nombre,
    ambito      = EXCLUDED.ambito,
    lat_decimal = EXCLUDED.lat_decimal,
    lon_decimal = EXCLUDED.lon_decimal,
    altitud     = EXCLUDED.altitud,
    activo      = TRUE;

-- Códigos postales y colonias SEPOMEX
INSERT INTO cat_asentamiento (
    estado_id, municipio_id, d_codigo, d_asenta, d_tipo_asenta, d_ciudad,
    d_cp, c_estado, c_oficina, c_cp, c_tipo_asenta, c_mnpio,
    id_asenta_cpcons, d_zona, c_cve_ciudad, activo
)
SELECT DISTINCT ON (
    LPAD(TRIM(s.c_estado), 2, '0'),
    LPAD(TRIM(s.c_mnpio), 3, '0'),
    LPAD(TRIM(s.id_asenta_cpcons), 4, '0'),
    LPAD(TRIM(s.d_codigo), 5, '0')
)
    m.estado_id                                                   AS estado_id,
    m.id                                                          AS municipio_id,
    LPAD(TRIM(s.d_codigo), 5, '0')                                AS d_codigo,
    TRIM(s.d_asenta)                                              AS d_asenta,
    TRIM(COALESCE(NULLIF(s.d_tipo_asenta, ''), 'Colonia'))        AS d_tipo_asenta,
    NULLIF(TRIM(s.d_ciudad), '')                                  AS d_ciudad,
    CASE WHEN NULLIF(TRIM(s.d_cp), '') IS NOT NULL
         THEN LPAD(TRIM(s.d_cp), 5, '0')
         ELSE NULL
    END                                                           AS d_cp,
    LPAD(TRIM(s.c_estado), 2, '0')                                AS c_estado,
    CASE WHEN NULLIF(TRIM(s.c_oficina), '') IS NOT NULL
         THEN LPAD(TRIM(s.c_oficina), 5, '0')
         ELSE NULL
    END                                                           AS c_oficina,
    NULLIF(TRIM(s.c_cp), '')                                      AS c_cp,
    CASE WHEN NULLIF(TRIM(s.c_tipo_asenta), '') IS NOT NULL
         THEN LPAD(TRIM(s.c_tipo_asenta), 2, '0')
         ELSE NULL
    END                                                           AS c_tipo_asenta,
    LPAD(TRIM(s.c_mnpio), 3, '0')                                 AS c_mnpio,
    LPAD(TRIM(s.id_asenta_cpcons), 4, '0')                        AS id_asenta_cpcons,
    NULLIF(TRIM(s.d_zona), '')                                    AS d_zona,
    CASE WHEN NULLIF(TRIM(s.c_cve_ciudad), '') IS NOT NULL
         THEN LPAD(TRIM(s.c_cve_ciudad), 2, '0')
         ELSE NULL
    END                                                           AS c_cve_ciudad,
    TRUE                                                          AS activo
FROM stg_sepomex_cp s
JOIN cat_municipio m
  ON m.cve_ent = LPAD(TRIM(s.c_estado), 2, '0')
 AND m.cve_mun = LPAD(TRIM(s.c_mnpio), 3, '0')
WHERE s.d_codigo IS NOT NULL
  AND TRIM(s.d_codigo) ~ '^[0-9]+$'
  AND s.c_estado IS NOT NULL
  AND s.c_mnpio IS NOT NULL
  AND s.id_asenta_cpcons IS NOT NULL
ORDER BY
    LPAD(TRIM(s.c_estado), 2, '0'),
    LPAD(TRIM(s.c_mnpio), 3, '0'),
    LPAD(TRIM(s.id_asenta_cpcons), 4, '0'),
    LPAD(TRIM(s.d_codigo), 5, '0')
ON CONFLICT (c_estado, c_mnpio, id_asenta_cpcons, d_codigo) DO UPDATE
SET d_asenta      = EXCLUDED.d_asenta,
    d_tipo_asenta = EXCLUDED.d_tipo_asenta,
    d_ciudad      = EXCLUDED.d_ciudad,
    d_cp          = EXCLUDED.d_cp,
    c_oficina     = EXCLUDED.c_oficina,
    c_tipo_asenta = EXCLUDED.c_tipo_asenta,
    d_zona        = EXCLUDED.d_zona,
    c_cve_ciudad  = EXCLUDED.c_cve_ciudad,
    activo        = TRUE;

COMMIT;

