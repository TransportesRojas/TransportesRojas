import { useState, useEffect, useCallback } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import "../estilos/cruds.css";
import { fetchApi } from "../../../services/api";
import {
  type Unidad,
  type FormData,
  type SortDir,
  type SortCol,
  type Filters,
  FORM_VACIO,
  FILTERS_VACIO,
  OPCIONES_PAGINA,
  ESTADOS,
} from "./types";
import { UnidadModalForm } from "./UnidadModalForm";
import { UnidadModalDelete } from "./UnidadModalDelete";
import {
  TablaGenerica,
  type ColumnDef,
  type FilterDef,
  type ActionDef,
} from "../../../components/TablaGenerica";

function exportarExcel(datos: Unidad[]) {
  const cols = [
    "ID",
    "Flotilla ID",
    "Placas",
    "Tipo",
    "Marca",
    "Modelo",
    "Año",
    "Capacidad (kg)",
    "KM Inicial",
    "KM Actual",
    "Estado",
    "Activo",
  ];
  const rows = datos.map((u) => [
    u.id,
    u.flotillaId,
    u.placas,
    u.tipoVehiculo,
    u.marca,
    u.modelo,
    u.anio,
    u.capacidadKg ?? "",
    u.kmOdometroInicial ?? "",
    u.kmOdometroActual ?? "",
    u.estado,
    u.activo ? "Si" : "No",
  ]);
  const csv = [cols, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "unidades.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CrudUnidades() {
  const [items, setItems] = useState<Unidad[]>([]);
  const [, setLoading] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/Unidad");
      setItems(data);
    } catch (error) {
      console.error("Error", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Filters>(FILTERS_VACIO);
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Unidad | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState<Unidad | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const filtered = items.filter((u) => {
    if (filters.activo === "si" && !u.activo) return false;
    if (filters.activo === "no" && u.activo) return false;
    if (filters.estado && u.estado !== filters.estado) return false;
    const m = (v: string | number | boolean | null, f: string) =>
      !f ||
      String(v ?? "")
        .toLowerCase()
        .includes(f.toLowerCase());
    return [
      "id",
      "flotillaId",
      "placas",
      "tipoVehiculo",
      "marca",
      "modelo",
      "anio",
      "capacidadKg",
      "kmOdometroInicial",
      "kmOdometroActual",
    ].every((col) => m(u[col as keyof Unidad], filters[col as keyof Filters]));
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    const av = a[sortCol],
      bv = b[sortCol];
    if (av == null) return 1;
    if (bv == null) return -1;
    return (sortDir === "asc" ? 1 : -1) * (av < bv ? -1 : av > bv ? 1 : 0);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice(page * pageSize, page * pageSize + pageSize);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalAbierto(false);
        setConfirmando(null);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const onFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
      setPage(0);
    },
    [],
  );

  const handleSort = useCallback(
    (col: string) => {
      const c = col as keyof Unidad;
      setSortDir((prev) =>
        sortCol === c ? (prev === "asc" ? "desc" : "asc") : "asc",
      );
      setSortCol(c);
      setPage(0);
    },
    [sortCol],
  );

  const abrirAgregar = useCallback(() => {
    setEditando(null);
    setForm(FORM_VACIO);
    setModalAbierto(true);
  }, []);

  const abrirEditar = useCallback((u: Unidad) => {
    setEditando(u);
    setForm({
      flotillaId: u.flotillaId,
      placas: u.placas,
      tipoVehiculo: u.tipoVehiculo,
      marca: u.marca,
      modelo: u.modelo,
      anio: u.anio,
      capacidadKg: u.capacidadKg,
      kmOdometroInicial: u.kmOdometroInicial,
      kmOdometroActual: u.kmOdometroActual,
      estado: u.estado,
      activo: u.activo,
    });
    setModalAbierto(true);
  }, []);

  const guardar = useCallback(async () => {
    setGuardando(true);
    try {
      if (editando) {
        const actualizado = await fetchApi(`/Unidad/${editando.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
        setItems((prev) => prev.map((u) => (u.id === editando.id ? actualizado : u)));
      } else {
        const nuevo = await fetchApi('/Unidad', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        setItems((prev) => [...prev, nuevo]);
      }
      setModalAbierto(false);
    } catch (error) {
      console.error("Error al guardar", error);
    } finally {
      setGuardando(false);
    }
  }, [editando, form]);

  const abrirConfirmar = useCallback((u: Unidad) => {
    setConfirmInput("");
    setConfirmando(u);
  }, []);

  const eliminar = useCallback(async () => {
    if (!confirmando) return;
    setEliminando(true);
    try {
      await fetchApi(`/Unidad/${confirmando.id}`, { method: 'DELETE' });
      setItems((prev) =>
        prev.map((u) => (u.id === confirmando.id ? { ...u, activo: false } : u)),
      );
      setConfirmando(null);
    } catch (error) {
      console.error("Error al eliminar", error);
    } finally {
      setEliminando(false);
    }
  }, [confirmando]);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : [
            "flotillaId",
            "anio",
            "capacidadKg",
            "kmOdometroInicial",
            "kmOdometroActual",
          ].includes(name)
            ? value === ""
              ? null
              : Number(value)
            : value,
    }));
  };

  const columns: ColumnDef<Unidad>[] = [
    { key: "id", label: "ID" },
    { key: "flotillaId", label: "Flotilla" },
    { key: "placas", label: "Placas" },
    { key: "tipoVehiculo", label: "Tipo" },
    { key: "marca", label: "Marca" },
    { key: "modelo", label: "Modelo" },
    { key: "anio", label: "Año" },
    { key: "capacidadKg", label: "Capacidad", render: (u) => u.capacidadKg ?? "-" },
    { key: "kmOdometroInicial", label: "KM Ini", render: (u) => u.kmOdometroInicial ?? "-" },
    { key: "kmOdometroActual", label: "KM Act", render: (u) => u.kmOdometroActual ?? "-" },
    {
      key: "estado",
      label: "Estado",
      render: (u) => (
        <span className="cc-badge-status cc-badge-status--on">{u.estado}</span>
      ),
    },
    {
      key: "activo",
      label: "Activo",
      render: (u) => (
        <span
          className={`cc-badge-status ${u.activo ? "cc-badge-status--on" : "cc-badge-status--off"}`}
        >
          {u.activo ? "Si" : "No"}
        </span>
      ),
    },
  ];

  const filterDefs: FilterDef[] = [
    { key: "id", type: "text", placeholder: "Filtrar" },
    { key: "flotillaId", type: "text", placeholder: "Filtrar" },
    { key: "placas", type: "text", placeholder: "Filtrar" },
    { key: "tipoVehiculo", type: "text", placeholder: "Filtrar" },
    { key: "marca", type: "text", placeholder: "Filtrar" },
    { key: "modelo", type: "text", placeholder: "Filtrar" },
    { key: "anio", type: "text", placeholder: "Filtrar" },
    { key: "capacidadKg", type: "text", placeholder: "Filtrar" },
    { key: "kmOdometroInicial", type: "text", placeholder: "Filtrar" },
    { key: "kmOdometroActual", type: "text", placeholder: "Filtrar" },
    {
      key: "estado",
      type: "select",
      options: [
        { value: "", label: "Todos" },
        ...ESTADOS.map((e) => ({ value: e, label: e })),
      ],
    },
    {
      key: "activo",
      type: "select",
      options: [
        { value: "", label: "Todos" },
        { value: "si", label: "Si" },
        { value: "no", label: "No" },
      ],
    },
  ];

  const actions: ActionDef<Unidad>[] = [
    {
      label: "Editar",
      icon: <Pencil size={14} />,
      className: "cc-dropdown-item--edit",
      onClick: abrirEditar,
    },
    {
      label: "Eliminar",
      icon: <Trash2 size={14} />,
      className: "cc-dropdown-item--delete",
      onClick: abrirConfirmar,
    },
  ];

  return (
    <div className="cc-page">
      <div className="cc-header">
        <div className="cc-title-group">
          <h1 className="cc-title">Unidades</h1>
          <span className="cc-badge">
            {filtered.length} de {items.length}
          </span>
        </div>
        <button
          id="btn-agregar-unidad"
          className="cc-btn-add"
          onClick={abrirAgregar}
        >
          <Plus size={17} strokeWidth={2.5} />
          <span>Nueva unidad</span>
        </button>
      </div>

      <TablaGenerica<Unidad>
        data={paginated}
        columns={columns}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        filters={filters as unknown as Record<string, string>}
        filterDefs={filterDefs}
        onFilterChange={onFilterChange}
        actions={actions}
        idAccessor={(u) => u.id}
      />

      <div className="cc-footer-bar">
        <button
          id="btn-exportar-unidades"
          className="cc-btn-excel"
          onClick={() => exportarExcel(sorted)}
        >
          <FileSpreadsheet size={16} />
          <span>Excel</span>
        </button>
        <div className="cc-pagesize-wrap">
          <label htmlFor="sel-ps-uni" className="cc-pagesize-label">
            Mostrar
          </label>
          <select
            id="sel-ps-uni"
            className="cc-pagesize-select"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {OPCIONES_PAGINA.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="cc-pagesize-label">por pagina</span>
        </div>
        <div className="cc-pagination">
          <button
            className="cc-btn-page"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`cc-btn-page${page === i ? " cc-btn-page--active" : ""}`}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="cc-btn-page"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight size={15} />
          </button>
          <span className="cc-pagination-info">
            {sorted.length === 0
              ? "0-0"
              : `${page * pageSize + 1}-${Math.min((page + 1) * pageSize, sorted.length)}`}{" "}
            de {sorted.length}
          </span>
        </div>
      </div>

      <UnidadModalForm
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={(e) => {
          e.preventDefault();
          guardar();
        }}
        onChange={onChange}
        form={form}
        editando={editando}
        guardando={guardando}
      />

      <UnidadModalDelete
        confirmando={confirmando}
        onClose={() => {
          setConfirmando(null);
          setConfirmInput("");
        }}
        onConfirm={eliminar}
        confirmInput={confirmInput}
        setConfirmInput={setConfirmInput}
        eliminando={eliminando}
      />
    </div>
  );
}
