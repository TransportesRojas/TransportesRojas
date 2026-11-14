#!/usr/bin/env python3
# Importador de catálogos INEGI y SEPOMEX

import argparse
import csv
import os
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from typing import Dict, Iterable, List, Optional

NS_MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def _col_letter_to_index(cell_ref: str) -> int:
    letters = "".join(ch for ch in cell_ref if ch.isalpha())
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch.upper()) - ord("A") + 1)
    return max(idx - 1, 0)


def iter_xlsx_rows(path: str) -> Iterable[List[str]]:
    with zipfile.ZipFile(path, "r") as z:
        shared_strings: List[str] = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall(f"{NS_MAIN}si"):
                shared_strings.append(
                    "".join(t.text or "" for t in si.iter(f"{NS_MAIN}t"))
                )

        sheet_files = sorted(
            n for n in z.namelist() if n.startswith("xl/worksheets/sheet") and n.endswith(".xml")
        )
        for sheet_name in sheet_files:
            sroot = ET.fromstring(z.read(sheet_name))
            for row in sroot.iter(f"{NS_MAIN}row"):
                cells: Dict[int, str] = {}
                max_col = -1
                for c in row:
                    ref = c.attrib.get("r", "")
                    col_idx = _col_letter_to_index(ref) if ref else (max_col + 1)
                    max_col = max(max_col, col_idx)
                    t = c.attrib.get("t")
                    v = c.find(f"{NS_MAIN}v")
                    is_el = c.find(f"{NS_MAIN}is")
                    val = ""
                    if t == "s" and v is not None and v.text is not None:
                        val = shared_strings[int(v.text)]
                    elif is_el is not None:
                        val = "".join(x.text or "" for x in is_el.iter(f"{NS_MAIN}t"))
                    elif v is not None and v.text is not None:
                        val = v.text
                    cells[col_idx] = val.strip()
                if max_col >= 0:
                    row_list = [cells.get(i, "") for i in range(max_col + 1)]
                    if any(row_list):
                        yield row_list


def iter_delimited_rows(path: str) -> Iterable[List[str]]:
    encodings = ["utf-8-sig", "utf-8", "cp1252", "latin-1"]
    chosen_enc = "utf-8"
    for enc in encodings:
        try:
            with open(path, "r", encoding=enc) as f:
                f.read(4096)
            chosen_enc = enc
            break
        except UnicodeDecodeError:
            continue

    with open(path, "r", encoding=chosen_enc, errors="replace", newline="") as f:
        sample = f.read(4096)
        f.seek(0)
        delimiter = "|" if sample.count("|") > sample.count(",") else ","
        reader = csv.reader(f, delimiter=delimiter)
        for row in reader:
            cleaned = [c.strip() for c in row]
            if any(cleaned):
                yield cleaned


def iter_file_rows(path: str) -> Iterable[List[str]]:
    if path.lower().endswith(".xlsx"):
        yield from iter_xlsx_rows(path)
    else:
        yield from iter_delimited_rows(path)


def sql_str(val: Optional[str]) -> str:
    if val is None or val == "":
        return "NULL"
    escaped = val.replace("'", "''")
    return f"'{escaped}'"


def sql_num(val: Optional[str]) -> str:
    if val is None:
        return "NULL"
    cleaned = val.strip()
    if re.match(r"^-?\d+(\.\d+)?$", cleaned):
        return cleaned
    return "NULL"


def sql_int(val: Optional[str]) -> str:
    if val is None:
        return "NULL"
    cleaned = val.strip()
    if re.match(r"^-?\d+$", cleaned):
        return str(int(cleaned))
    return "NULL"


def pad_digits(val: Optional[str], width: int) -> Optional[str]:
    if val is None:
        return None
    cleaned = val.strip()
    if not cleaned or not cleaned.isdigit():
        return None
    return cleaned.zfill(width)


def classify_header(row: List[str]) -> Optional[str]:
    upper = [c.strip().upper() for c in row]
    if "D_CODIGO" in upper and "D_ASENTA" in upper:
        return "CP"
    if "CVE_LOC" in upper and "NOM_LOC" in upper:
        return "LOCALIDAD"
    if "CVE_MUN" in upper and "NOM_MUN" in upper and "CVE_LOC" not in upper:
        return "MUNICIPIO"
    if "CVE_ENT" in upper and "NOM_ENT" in upper and "CVE_MUN" not in upper:
        return "ESTADO"
    return None


def build_sql_for_records(
    estados: List[Dict[str, str]],
    municipios: List[Dict[str, str]],
    localidades: List[Dict[str, str]],
    asentamientos: List[Dict[str, str]],
    out_file,
) -> None:
    out_file.write("-- Catálogos INEGI y SEPOMEX\n\n")
    out_file.write("BEGIN;\n\n")

    if estados:
        out_file.write("-- Estados\n")
        for r in estados:
            cve_ent = pad_digits(r.get("CVE_ENT") or r.get("CVEGEO"), 2)
            if not cve_ent:
                continue
            nom_ent = r.get("NOM_ENT", "").strip()
            nom_abr = r.get("NOM_ABR", "").strip() or nom_ent
            out_file.write(
                f"INSERT INTO cat_estado (cvegeo, cve_ent, nombre, abreviatura, activo) "
                f"VALUES ({sql_str(cve_ent)}, {sql_str(cve_ent)}, {sql_str(nom_ent)}, {sql_str(nom_abr)}, TRUE) "
                f"ON CONFLICT (cve_ent) DO UPDATE SET nombre = EXCLUDED.nombre, abreviatura = EXCLUDED.abreviatura, activo = TRUE;\n"
            )
        out_file.write("\n")

    if municipios:
        out_file.write("-- Municipios\n")
        for r in municipios:
            cve_ent = pad_digits(r.get("CVE_ENT"), 2)
            cve_mun = pad_digits(r.get("CVE_MUN"), 3)
            if not cve_ent or not cve_mun:
                continue
            cvegeo = f"{cve_ent}{cve_mun}"
            nom_mun = r.get("NOM_MUN", "").strip()
            cve_cab = pad_digits(r.get("CVE_CAB"), 4) or (r.get("CVE_CAB", "").strip() or None)
            nom_cab = r.get("NOM_CAB", "").strip() or None
            out_file.write(
                f"INSERT INTO cat_municipio (estado_id, cvegeo, cve_ent, cve_mun, nombre, cve_cab, nom_cab, activo) "
                f"SELECT id, {sql_str(cvegeo)}, {sql_str(cve_ent)}, {sql_str(cve_mun)}, {sql_str(nom_mun)}, "
                f"{sql_str(cve_cab)}, {sql_str(nom_cab)}, TRUE FROM cat_estado WHERE cve_ent = {sql_str(cve_ent)} "
                f"ON CONFLICT (cvegeo) DO UPDATE SET nombre = EXCLUDED.nombre, cve_cab = EXCLUDED.cve_cab, nom_cab = EXCLUDED.nom_cab, activo = TRUE;\n"
            )
        out_file.write("\n")

    if localidades:
        out_file.write("-- Localidades\n")
        for r in localidades:
            cve_ent = pad_digits(r.get("CVE_ENT"), 2)
            cve_mun = pad_digits(r.get("CVE_MUN"), 3)
            cve_loc = pad_digits(r.get("CVE_LOC"), 4)
            if not cve_ent or not cve_mun or not cve_loc:
                continue
            cvegeo = f"{cve_ent}{cve_mun}{cve_loc}"
            estatus = r.get("ESTATUS", "").strip() or None
            nom_loc = r.get("NOM_LOC", "").strip()
            ambito = r.get("AMBITO", "").strip().upper()
            ambito_sql = sql_str(ambito) if ambito in ("U", "R") else "NULL"
            lat_dec = sql_num(r.get("LAT_DECIMAL"))
            lon_dec = sql_num(r.get("LON_DECIMAL"))
            altitud = sql_int(r.get("ALTITUD"))
            out_file.write(
                f"INSERT INTO cat_localidad (estado_id, municipio_id, cvegeo, estatus, cve_ent, cve_mun, cve_loc, nombre, ambito, lat_decimal, lon_decimal, altitud, activo) "
                f"SELECT m.estado_id, m.id, {sql_str(cvegeo)}, {sql_str(estatus)}, {sql_str(cve_ent)}, {sql_str(cve_mun)}, {sql_str(cve_loc)}, "
                f"{sql_str(nom_loc)}, {ambito_sql}, {lat_dec}, {lon_dec}, {altitud}, TRUE "
                f"FROM cat_municipio m WHERE m.cve_ent = {sql_str(cve_ent)} AND m.cve_mun = {sql_str(cve_mun)} "
                f"ON CONFLICT (cvegeo) DO UPDATE SET estatus = EXCLUDED.estatus, nombre = EXCLUDED.nombre, ambito = EXCLUDED.ambito, "
                f"lat_decimal = EXCLUDED.lat_decimal, lon_decimal = EXCLUDED.lon_decimal, altitud = EXCLUDED.altitud, activo = TRUE;\n"
            )
        out_file.write("\n")

    if asentamientos:
        out_file.write("-- Asentamientos SEPOMEX\n")
        for r in asentamientos:
            d_codigo = pad_digits(r.get("D_CODIGO"), 5)
            c_estado = pad_digits(r.get("C_ESTADO"), 2)
            c_mnpio = pad_digits(r.get("C_MNPIO"), 3)
            id_asenta = pad_digits(r.get("ID_ASENTA_CPCONS"), 4)
            if not d_codigo or not c_estado or not c_mnpio or not id_asenta:
                continue
            d_asenta = r.get("D_ASENTA", "").strip()
            d_tipo_asenta = r.get("D_TIPO_ASENTA", "").strip() or "Colonia"
            d_ciudad = r.get("D_CIUDAD", "").strip() or None
            d_cp = pad_digits(r.get("D_CP"), 5)
            c_oficina = pad_digits(r.get("C_OFICINA"), 5)
            c_cp = r.get("C_CP", "").strip() or None
            c_tipo_asenta = pad_digits(r.get("C_TIPO_ASENTA"), 2)
            d_zona = r.get("D_ZONA", "").strip() or None
            c_cve_ciudad = pad_digits(r.get("C_CVE_CIUDAD"), 2)
            out_file.write(
                f"INSERT INTO cat_asentamiento (estado_id, municipio_id, d_codigo, d_asenta, d_tipo_asenta, d_ciudad, d_cp, c_estado, c_oficina, c_cp, c_tipo_asenta, c_mnpio, id_asenta_cpcons, d_zona, c_cve_ciudad, activo) "
                f"SELECT m.estado_id, m.id, {sql_str(d_codigo)}, {sql_str(d_asenta)}, {sql_str(d_tipo_asenta)}, {sql_str(d_ciudad)}, "
                f"{sql_str(d_cp)}, {sql_str(c_estado)}, {sql_str(c_oficina)}, {sql_str(c_cp)}, {sql_str(c_tipo_asenta)}, {sql_str(c_mnpio)}, "
                f"{sql_str(id_asenta)}, {sql_str(d_zona)}, {sql_str(c_cve_ciudad)}, TRUE "
                f"FROM cat_municipio m WHERE m.cve_ent = {sql_str(c_estado)} AND m.cve_mun = {sql_str(c_mnpio)} "
                f"ON CONFLICT (c_estado, c_mnpio, id_asenta_cpcons, d_codigo) DO UPDATE SET "
                f"d_asenta = EXCLUDED.d_asenta, d_tipo_asenta = EXCLUDED.d_tipo_asenta, d_ciudad = EXCLUDED.d_ciudad, "
                f"d_cp = EXCLUDED.d_cp, c_oficina = EXCLUDED.c_oficina, c_tipo_asenta = EXCLUDED.c_tipo_asenta, "
                f"d_zona = EXCLUDED.d_zona, c_cve_ciudad = EXCLUDED.c_cve_ciudad, activo = TRUE;\n"
            )
        out_file.write("\n")

    out_file.write("COMMIT;\n")


def parse_file_into_lists(
    path: str,
    estados: List[Dict[str, str]],
    municipios: List[Dict[str, str]],
    localidades: List[Dict[str, str]],
    asentamientos: List[Dict[str, str]],
) -> None:
    current_type: Optional[str] = None
    current_headers: List[str] = []

    for row in iter_file_rows(path):
        detected = classify_header(row)
        if detected:
            current_type = detected
            current_headers = [c.strip().upper() for c in row]
            continue

        if not current_type or not current_headers:
            continue

        record = {
            current_headers[i]: (row[i].strip() if i < len(row) else "")
            for i in range(len(current_headers))
        }

        if current_type == "ESTADO" and pad_digits(record.get("CVE_ENT"), 2):
            estados.append(record)
        elif current_type == "MUNICIPIO" and pad_digits(record.get("CVE_MUN"), 3):
            municipios.append(record)
        elif current_type == "LOCALIDAD" and pad_digits(record.get("CVE_LOC"), 4):
            localidades.append(record)
        elif current_type == "CP" and pad_digits(record.get("D_CODIGO"), 5):
            asentamientos.append(record)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Genera el script SQL de importación para catálogos INEGI y SEPOMEX."
    )
    parser.add_argument("--estados", help="Ruta al archivo de Estados INEGI (.xlsx/.csv/.txt)")
    parser.add_argument("--municipios", help="Ruta al archivo de Municipios INEGI (.xlsx/.csv/.txt)")
    parser.add_argument("--localidades", help="Ruta al archivo de Localidades INEGI (.xlsx/.csv/.txt)")
    parser.add_argument("--cp", help="Ruta al archivo de Códigos Postales SEPOMEX (.xlsx/.csv/.txt)")
    parser.add_argument(
        "--auto-xlsx",
        help="Ruta a un archivo .xlsx que contenga uno o varios bloques de catálogos (ej. encabezados.xlsx)",
    )
    parser.add_argument(
        "--salida",
        default="datos_catalogos_importados.sql",
        help="Archivo .sql de salida (por defecto: datos_catalogos_importados.sql)",
    )

    args = parser.parse_args()

    estados: List[Dict[str, str]] = []
    municipios: List[Dict[str, str]] = []
    localidades: List[Dict[str, str]] = []
    asentamientos: List[Dict[str, str]] = []

    paths = [p for p in [args.auto_xlsx, args.estados, args.municipios, args.localidades, args.cp] if p]
    if not paths:
        parser.print_help()
        sys.exit(1)

    for p in paths:
        if not os.path.exists(p):
            print(f"Error: No se encontró el archivo '{p}'", file=sys.stderr)
            sys.exit(1)
        parse_file_into_lists(p, estados, municipios, localidades, asentamientos)

    with open(args.salida, "w", encoding="utf-8") as out_f:
        build_sql_for_records(estados, municipios, localidades, asentamientos, out_f)

    print(
        f"Archivo '{args.salida}' generado correctamente:\n"
        f"  - Estados:       {len(estados)}\n"
        f"  - Municipios:    {len(municipios)}\n"
        f"  - Localidades:   {len(localidades)}\n"
        f"  - Asentamientos: {len(asentamientos)}"
    )


if __name__ == "__main__":
    main()

