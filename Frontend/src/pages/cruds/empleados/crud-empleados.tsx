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
  type Empleado,
  type FormData,
  type SortDir,
  type SortCol,
  type Filters,
  FORM_VACIO,
  FILTERS_VACIO,
  OPCIONES_PAGINA,
} from "./types";
import { EmpleadoModalForm } from "./EmpleadoModalForm";
import { EmpleadoModalDelete } from "./EmpleadoModalDelete";
import {
  TablaGenerica,
  type ColumnDef,
  type FilterDef,
  type ActionDef,
} from "../../../components/TablaGenerica";

function exportarExcel(datos: Empleado[]) {
  const cols = [
    "ID",
    "Usuario ID",
    "Nombre",
    "Ap. Paterno",
    "Ap. Materno",
    "Telefono",
    "Email",
    "Sucursal ID",
    "Fecha Ingreso",
    "Activo",
  ];
  const rows = datos.map((e) => [
    e.id,
    e.usuarioId,
    e.nombre,
    e.apellidoPaterno,
    e.apellidoMaterno,
    e.telefono ?? "",
    e.email,
    e.sucursalId ?? "",
    e.fechaIngreso,
    e.activo ? "Si" : "No",
  ]);
  const csv = [cols, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "empleados.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const FILTER_COLS: (keyof Filters)[] = [
  "id",
  "usuarioId",
  "nombre",
  "apellidoPaterno",
  "apellidoMaterno",
  "telefono",
  "email",
  "sucursalId",
  "fechaIngreso",
];

export default function CrudEmpleados() {
  const [items, setItems] = useState<Empleado[]>([]);
  const [, setLoading] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/Empleado");
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
  const [editando, setEditando] = useState<Empleado | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState<Empleado | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const filtered = items.filter((e) => {
    if (filters.activo === "si" && !e.activo) return false;
    if (filters.activo === "no" && e.activo) return false;
    const m = (v: string | number | boolean | null | undefined, f: string) =>
      !f ||
      String(v ?? "")
        .toLowerCase()
        .includes(f.toLowerCase());
    return FILTER_COLS.every((col) =>
      m(e[col as keyof Empleado], filters[col]),
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
      const c = col as keyof Empleado;
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

  const abrirEditar = useCallback((e: Empleado) => {
    setEditando(e);
    setForm({
      usuarioId: e.usuarioId,
      nombre: e.nombre,
      apellidoPaterno: e.apellidoPaterno,
      apellidoMaterno: e.apellidoMaterno,
      telefono: e.telefono ?? "",
      email: e.email,
      sucursalId: e.sucursalId,
      fechaIngreso: e.fechaIngreso,
      activo: e.activo,
    });
    setModalAbierto(true);
  }, []);

  const guardar = useCallback(async () => {
    setGuardando(true);
    try {
      if (editando) {
        const actualizado = await fetchApi(`/Empleado/${editando.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        setItems((prev) => prev.map((e) => (e.id === editando.id ? actualizado : e)));
      } else {
        const nuevo = await fetchApi(`/Empleado`, {
          method: "POST",
          body: JSON.stringify(form),
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

  const abrirConfirmar = useCallback((e: Empleado) => {
    setConfirmInput("");
    setConfirmando(e);
  }, []);

  const eliminar = useCallback(async () => {
    if (!confirmando) return;
    setEliminando(true);
    try {
      await fetchApi(`/Empleado/${confirmando.id}`, { method: "DELETE" });
      setItems((prev) =>
        prev.map((e) => (e.id === confirmando.id ? { ...e, activo: false } : e)),
      );
      setConfirmando(null);
    } catch (error) {
      console.error("Error al eliminar", error);
    } finally {
      setEliminando(false);
    }
  }, [confirmando]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : ["usuarioId", "sucursalId", "rolId"].includes(name)
            ? value === ""
              ? null
              : Number(value)
            : value,
    }));
  };

  const columns: ColumnDef<Empleado>[] = [
    { key: "id", label: "ID" },
    { key: "usuarioId", label: "Usr ID" },
    { key: "nombre", label: "Nombre" },
    { key: "apellidoPaterno", label: "Ap. Paterno" },
    { key: "apellidoMaterno", label: "Ap. Materno" },
    { key: "telefono", label: "Telefono", render: (e) => e.telefono ?? "-" },
    { key: "email", label: "Email" },
    { key: "sucursalId", label: "Suc. ID", render: (e) => e.sucursalId ?? "-" },
    { key: "fechaIngreso", label: "Ingreso" },
    {
      key: "activo",
      label: "Activo",
      render: (e) => (
        <span
          className={`cc-badge-status ${e.activo ? "cc-badge-status--on" : "cc-badge-status--off"}`}
        >
          {e.activo ? "Si" : "No"}
        </span>
      ),
    },
  ];

  const filterDefs: FilterDef[] = [
    { key: "id", type: "text", placeholder: "Filtrar..." },
    { key: "usuarioId", type: "text", placeholder: "Filtrar..." },
    { key: "nombre", type: "text", placeholder: "Filtrar..." },
    { key: "apellidoPaterno", type: "text", placeholder: "Filtrar..." },
    { key: "apellidoMaterno", type: "text", placeholder: "Filtrar..." },
    { key: "telefono", type: "text", placeholder: "Filtrar..." },
    { key: "email", type: "text", placeholder: "Filtrar..." },
    { key: "sucursalId", type: "text", placeholder: "Filtrar..." },
    { key: "fechaIngreso", type: "text", placeholder: "Filtrar..." },
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

  const actions: ActionDef<Empleado>[] = [
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
          <h1 className="cc-title">Empleados</h1>
          <span className="cc-badge">
            {filtered.length} de {items.length}
          </span>
        </div>
        <button
          id="btn-agregar-empleado"
          className="cc-btn-add"
          onClick={abrirAgregar}
        >
          <Plus size={17} strokeWidth={2.5} />
          <span>Nuevo empleado</span>
        </button>
      </div>

      <TablaGenerica<Empleado>
        data={paginated}
        columns={columns}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        filters={filters as unknown as Record<string, string>}
        filterDefs={filterDefs}
        onFilterChange={onFilterChange}
        actions={actions}
        idAccessor={(e) => e.id}
      />

      <div className="cc-footer-bar">
        <button
          id="btn-exportar-empleados"
          className="cc-btn-excel"
          onClick={() => exportarExcel(sorted)}
          title="Exportar a Excel"
        >
          <FileSpreadsheet size={16} />
          <span>Excel</span>
        </button>

        <div className="cc-pagesize-wrap">
          <label htmlFor="sel-ps-emp" className="cc-pagesize-label">
            Mostrar
          </label>
          <select
            id="sel-ps-emp"
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
            aria-label="Pagina anterior"
          >
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`cc-btn-page${page === i ? " cc-btn-page--active" : ""}`}
              onClick={() => setPage(i)}
              aria-current={page === i ? "page" : undefined}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="cc-btn-page"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            aria-label="Pagina siguiente"
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

      <EmpleadoModalForm
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

      <EmpleadoModalDelete
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
