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
  type Cliente,
  type FormData,
  type SortDir,
  type SortCol,
  type Filters,
  FORM_VACIO,
  FILTERS_VACIO,
  OPCIONES_PAGINA,
} from "./types";
import { ClienteModalForm } from "./ClienteModalForm";
import { ClienteModalDelete } from "./ClienteModalDelete";
import {
  TablaGenerica,
  type ColumnDef,
  type FilterDef,
  type ActionDef,
} from "../../../components/TablaGenerica";
function exportarExcel(datos: Cliente[]) {
  const cols = [
    "ID",
    "Nombre",
    "Ap. Paterno",
    "Ap. Materno",
    "Telefono",
    "Email",
    "Usuario ID",
    "Activo",
  ];
  const rows = datos.map((c) => [
    c.id,
    c.nombre,
    c.apellidoPaterno,
    c.apellidoMaterno,
    c.telefono,
    c.email,
    c.usuarioId ?? "",
    c.activo ? "Si" : "No",
  ]);
  const csv = [cols, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clientes.csv";
  a.click();
  URL.revokeObjectURL(url);
}
export default function CrudClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [, setLoading] = useState(false);
  const cargarClientes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/Cliente");
      setClientes(data);
    } catch (error) {
      console.error("Error al cargar clientes", error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Filters>(FILTERS_VACIO);
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState<Cliente | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const filtered = clientes.filter((c) => {
    if (filters.activo === "si" && !c.activo) return false;
    if (filters.activo === "no" && c.activo) return false;
    const match = (v: string | number | null, f: string) =>
      !f ||
      String(v ?? "")
        .toLowerCase()
        .includes(f.toLowerCase());
    return (
      match(c.id, filters.id) &&
      match(c.nombre, filters.nombre) &&
      match(c.apellidoPaterno, filters.apellidoPaterno) &&
      match(c.apellidoMaterno, filters.apellidoMaterno) &&
      match(c.telefono, filters.telefono) &&
      match(c.email, filters.email) &&
      match(c.usuarioId, filters.usuarioId)
    );
  });
  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    const av = a[sortCol],
      bv = b[sortCol];
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
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
  const cambiarPageSize = useCallback((v: number) => {
    setPageSize(v);
    setPage(0);
  }, []);
  const onFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFilters((prev) => ({ ...prev, [name]: value }));
      setPage(0);
    },
    [],
  );
  const handleSort = useCallback(
    (col: string) => {
      const c = col as keyof Cliente;
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
  const abrirEditar = useCallback((c: Cliente) => {
    setEditando(c);
    setForm({
      usuarioId: c.usuarioId,
      nombre: c.nombre,
      apellidoPaterno: c.apellidoPaterno,
      apellidoMaterno: c.apellidoMaterno,
      telefono: c.telefono,
      email: c.email,
      activo: c.activo,
    });
    setModalAbierto(true);
  }, []);
  const guardar = useCallback(async () => {
    setGuardando(true);
    try {
      if (editando) {
        const actualizado = await fetchApi(`/Cliente/${editando.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        setClientes((prev) =>
          prev.map((c) => (c.id === editando.id ? actualizado : c)),
        );
      } else {
        const nuevo = await fetchApi("/Cliente", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setClientes((prev) => [...prev, nuevo]);
      }
      setModalAbierto(false);
    } catch (error) {
      console.error("Error al guardar cliente", error);
      alert("Error al guardar cliente");
    } finally {
      setGuardando(false);
    }
  }, [editando, form]);
  const abrirConfirmar = useCallback((c: Cliente) => {
    setConfirmInput("");
    setConfirmando(c);
  }, []);
  const eliminar = useCallback(async () => {
    if (!confirmando) return;
    setEliminando(true);
    try {
      await fetchApi(`/Cliente/${confirmando.id}`, { method: "DELETE" });
      setClientes((prev) =>
        prev.map((c) => (c.id === confirmando.id ? { ...c, activo: false } : c)),
      );
      setConfirmando(null);
    } catch (error) {
      console.error("Error al eliminar cliente", error);
      alert("Error al eliminar cliente");
    } finally {
      setEliminando(false);
    }
  }, [confirmando]);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "usuarioId"
            ? value === ""
              ? null
              : Number(value)
            : value,
    }));
  };
  const columns: ColumnDef<Cliente>[] = [
    { key: "id", label: "ID" },
    { key: "nombre", label: "Nombre" },
    { key: "apellidoPaterno", label: "Ap. Paterno" },
    { key: "apellidoMaterno", label: "Ap. Materno" },
    { key: "telefono", label: "Telefono" },
    { key: "email", label: "Email" },
    { key: "usuarioId", label: "Usuario ID", render: (c) => c.usuarioId ?? "-" },
    {
      key: "activo",
      label: "Activo",
      render: (c) => (
        <span
          className={`cc-badge-status ${c.activo ? "cc-badge-status--on" : "cc-badge-status--off"}`}
        >
          {c.activo ? "Si" : "No"}
        </span>
      ),
    },
  ];
  const filterDefs: FilterDef[] = [
    { key: "id", type: "text", placeholder: "Filtrar..." },
    { key: "nombre", type: "text", placeholder: "Filtrar..." },
    { key: "apellidoPaterno", type: "text", placeholder: "Filtrar..." },
    { key: "apellidoMaterno", type: "text", placeholder: "Filtrar..." },
    { key: "telefono", type: "text", placeholder: "Filtrar..." },
    { key: "email", type: "text", placeholder: "Filtrar..." },
    { key: "usuarioId", type: "text", placeholder: "Filtrar..." },
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
  const actions: ActionDef<Cliente>[] = [
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
          <h1 className="cc-title">Clientes</h1>
          <span className="cc-badge">
            {filtered.length} de {clientes.length}
          </span>
        </div>
        <button
          id="btn-agregar-cliente"
          className="cc-btn-add"
          onClick={abrirAgregar}
        >
          <Plus size={17} strokeWidth={2.5} />
          <span>Nuevo cliente</span>
        </button>
      </div>
      <TablaGenerica<Cliente>
        data={paginated}
        columns={columns}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        filters={filters as unknown as Record<string, string>}
        filterDefs={filterDefs}
        onFilterChange={onFilterChange}
        actions={actions}
        idAccessor={(c) => c.id}
      />
      <div className="cc-footer-bar">
        <button
          id="btn-exportar-excel"
          className="cc-btn-excel"
          onClick={() => exportarExcel(sorted)}
          title="Exportar a Excel"
        >
          <FileSpreadsheet size={16} />
          <span>Excel</span>
        </button>
        <div className="cc-pagesize-wrap">
          <label htmlFor="sel-pagesize" className="cc-pagesize-label">
            Mostrar
          </label>
          <select
            id="sel-pagesize"
            className="cc-pagesize-select"
            value={pageSize}
            onChange={(e) => cambiarPageSize(Number(e.target.value))}
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
            id="btn-pagina-anterior"
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
              id={`btn-pagina-${i + 1}`}
              className={`cc-btn-page${page === i ? " cc-btn-page--active" : ""}`}
              onClick={() => setPage(i)}
              aria-current={page === i ? "page" : undefined}
            >
              {i + 1}
            </button>
          ))}
          <button
            id="btn-pagina-siguiente"
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
      <ClienteModalForm
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
      <ClienteModalDelete
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
