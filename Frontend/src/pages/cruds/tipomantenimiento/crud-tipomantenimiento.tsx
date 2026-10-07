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
  type TipoMant,
  type FormData,
  type SortDir,
  type SortCol,
  type Filters,
  FORM_VACIO,
  FILTERS_VACIO,
  OPCIONES_PAGINA,
} from "./types";
import { TipoMantModalForm } from "./TipoMantModalForm";
import { TipoMantModalDelete } from "./TipoMantModalDelete";
import {
  TablaGenerica,
  type ColumnDef,
  type FilterDef,
  type ActionDef,
} from "../../../components/TablaGenerica";

function exportarExcel(datos: TipoMant[]) {
  const cols = [
    "ID",
    "Nombre",
    "Descripcion",
    "KM Intervalo",
    "Aplica a",
    "Activo",
  ];
  const rows = datos.map((t) => [
    t.id,
    t.nombre,
    t.descripcion ?? "",
    t.kmIntervalo ?? "",
    t.aplicaATipoVehiculo ?? "",
    t.activo ? "Si" : "No",
  ]);
  const csv = [cols, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tipos-mantenimiento.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CrudTipoMantenimiento() {
  const [items, setItems] = useState<TipoMant[]>([]);
  const [, setLoading] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/TipoMantenimiento");
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
  const [editando, setEditando] = useState<TipoMant | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState<TipoMant | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const filtered = items.filter((t) => {
    if (filters.activo === "si" && !t.activo) return false;
    if (filters.activo === "no" && t.activo) return false;
    const m = (v: string | number | boolean | null, f: string) =>
      !f ||
      String(v ?? "")
        .toLowerCase()
        .includes(f.toLowerCase());
    return [
      "id",
      "nombre",
      "descripcion",
      "kmIntervalo",
      "aplicaATipoVehiculo",
    ].every((col) =>
      m(t[col as keyof TipoMant], filters[col as keyof Filters]),
    );
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
      const c = col as keyof TipoMant;
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

  const abrirEditar = useCallback((t: TipoMant) => {
    setEditando(t);
    setForm({
      nombre: t.nombre,
      descripcion: t.descripcion ?? "",
      kmIntervalo: t.kmIntervalo,
      aplicaATipoVehiculo: t.aplicaATipoVehiculo ?? "",
      activo: t.activo,
    });
    setModalAbierto(true);
  }, []);

  const guardar = useCallback(async () => {
    setGuardando(true);
    try {
      if (editando) {
        const actualizado = await fetchApi(`/TipoMantenimiento/${editando.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
        setItems((prev) => prev.map((t) => (t.id === editando.id ? actualizado : t)));
      } else {
        const nuevo = await fetchApi('/TipoMantenimiento', {
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

  const abrirConfirmar = useCallback((t: TipoMant) => {
    setConfirmInput("");
    setConfirmando(t);
  }, []);

  const eliminar = useCallback(async () => {
    if (!confirmando) return;
    setEliminando(true);
    try {
      await fetchApi(`/TipoMantenimiento/${confirmando.id}`, { method: 'DELETE' });
      setItems((prev) =>
        prev.map((t) => (t.id === confirmando.id ? { ...t, activo: false } : t)),
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
          : name === "kmIntervalo"
            ? value === ""
              ? null
              : Number(value)
            : value,
    }));
  };

  const columns: ColumnDef<TipoMant>[] = [
    { key: "id", label: "ID" },
    { key: "nombre", label: "Nombre" },
    { key: "descripcion", label: "Descripcion", render: (t) => t.descripcion ?? "-" },
    {
      key: "kmIntervalo",
      label: "KM Intervalo",
      render: (t) => (t.kmIntervalo != null ? `${t.kmIntervalo.toLocaleString()} km` : "-"),
    },
    { key: "aplicaATipoVehiculo", label: "Aplica a", render: (t) => t.aplicaATipoVehiculo ?? "-" },
    {
      key: "activo",
      label: "Activo",
      render: (t) => (
        <span
          className={`cc-badge-status ${t.activo ? "cc-badge-status--on" : "cc-badge-status--off"}`}
        >
          {t.activo ? "Si" : "No"}
        </span>
      ),
    },
  ];

  const filterDefs: FilterDef[] = [
    { key: "id", type: "text", placeholder: "Filtrar" },
    { key: "nombre", type: "text", placeholder: "Filtrar" },
    { key: "descripcion", type: "text", placeholder: "Filtrar" },
    { key: "kmIntervalo", type: "text", placeholder: "Filtrar" },
    { key: "aplicaATipoVehiculo", type: "text", placeholder: "Filtrar" },
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

  const actions: ActionDef<TipoMant>[] = [
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
          <h1 className="cc-title">Tipos de Mantenimiento</h1>
          <span className="cc-badge">
            {filtered.length} de {items.length}
          </span>
        </div>
        <button
          id="btn-agregar-tipomant"
          className="cc-btn-add"
          onClick={abrirAgregar}
        >
          <Plus size={17} strokeWidth={2.5} />
          <span>Nuevo tipo</span>
        </button>
      </div>

      <TablaGenerica<TipoMant>
        data={paginated}
        columns={columns}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        filters={filters as unknown as Record<string, string>}
        filterDefs={filterDefs}
        onFilterChange={onFilterChange}
        actions={actions}
        idAccessor={(t) => t.id}
      />

      <div className="cc-footer-bar">
        <button
          id="btn-exportar-tipomant"
          className="cc-btn-excel"
          onClick={() => exportarExcel(sorted)}
        >
          <FileSpreadsheet size={16} />
          <span>Excel</span>
        </button>
        <div className="cc-pagesize-wrap">
          <label htmlFor="sel-ps-tm" className="cc-pagesize-label">
            Mostrar
          </label>
          <select
            id="sel-ps-tm"
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

      <TipoMantModalForm
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

      <TipoMantModalDelete
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
