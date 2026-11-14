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
import { useToast } from "../../../components/Toast";
import { extraerMensajeErrorApi } from "../../../utils/errorMessages";
import { hasPermissionOrRole } from "../../../utils/auth";
import {
  type Puesto,
  type FormData,
  type SortDir,
  type SortCol,
  type Filters,
  FORM_VACIO,
  FILTERS_VACIO,
  OPCIONES_PAGINA,
} from "./types";
import { PuestoModalForm } from "./PuestoModalForm";
import { PuestoModalDelete } from "./PuestoModalDelete";
import {
  TablaGenerica,
  type ColumnDef,
  type FilterDef,
  type ActionDef,
} from "../../../components/TablaGenerica";

function exportarExcel(datos: Puesto[]) {
  const cols = ["#", "Nombre", "Descripción"];
  const rows = datos.map((p) => [`#${p.id}`, p.nombre, p.descripcion ?? ""]);
  const csv = [cols, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "puestos.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CrudPuestos() {
  const { toast } = useToast();
  const [items, setItems] = useState<Puesto[]>([]);
  const [, setLoading] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/Puesto");
      setItems(data);
    } catch (error) {
      console.error("Error al cargar puestos", error);
      toast.error("Error al cargar los puestos laborales.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Filters>(FILTERS_VACIO);
  const [busquedaGlobal, setBusquedaGlobal] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Puesto | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState<Puesto | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const filtered = items.filter((p) => {
    if (busquedaGlobal.trim()) {
      const q = busquedaGlobal.toLowerCase();
      const match = [p.id, p.nombre, p.descripcion].some((val) =>
        String(val ?? "").toLowerCase().includes(q)
      );
      if (!match) return false;
    }

    const m = (v: string | number | null, f: string) =>
      !f ||
      String(v ?? "")
        .toLowerCase()
        .includes(f.toLowerCase());
    return (
      m(p.id, filters.id) &&
      m(p.nombre, filters.nombre) &&
      m(p.descripcion, filters.descripcion)
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
      const c = col as keyof Puesto;
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

  const abrirEditar = useCallback((p: Puesto) => {
    setEditando(p);
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
    });
    setModalAbierto(true);
  }, []);

  const guardar = useCallback(async () => {
    if (guardando) return;
    setGuardando(true);
    try {
      if (editando) {
        const actualizado = await fetchApi(`/Puesto/${editando.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
        setItems((prev) => prev.map((p) => (p.id === editando.id ? actualizado : p)));
        toast.success(`Puesto "${form.nombre}" actualizado.`);
      } else {
        const nuevo = await fetchApi('/Puesto', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        setItems((prev) => [...prev, nuevo]);
        toast.success(`Puesto "${form.nombre}" creado con éxito.`);
      }
      setModalAbierto(false);
    } catch (error: any) {
      console.error("Error al guardar puesto", error);
      toast.error(extraerMensajeErrorApi(error, "Error al procesar el puesto."));
    } finally {
      setGuardando(false);
    }
  }, [editando, form, guardando, toast]);

  const abrirConfirmar = useCallback((p: Puesto) => {
    setConfirmInput("");
    setConfirmando(p);
  }, []);

  const eliminar = useCallback(async () => {
    if (!confirmando || eliminando) return;
    setEliminando(true);
    try {
      await fetchApi(`/Puesto/${confirmando.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((p) => p.id !== confirmando.id));
      toast.info(`Puesto "${confirmando.nombre}" eliminado.`);
      setConfirmando(null);
    } catch (error: any) {
      console.error("Error al eliminar puesto", error);
      toast.error(extraerMensajeErrorApi(error, "Error al eliminar el puesto."));
    } finally {
      setEliminando(false);
    }
  }, [confirmando, eliminando, toast]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const columns: ColumnDef<Puesto>[] = [
    {
      key: "nombre",
      label: "Puesto",
      render: (p) => <span className="font-bold text-slate-800 text-xs">{p.nombre}</span>,
    },
    {
      key: "descripcion",
      label: "Descripción",
      render: (p) => p.descripcion || <span className="text-slate-400 italic">Sin descripción</span>,
    },
  ];

  const filterDefs: FilterDef[] = [
    {
      key: "nombre",
      label: "Puesto",
      type: "select",
      options: [
        { value: "", label: "Todos los puestos" },
        ...items.map((p) => ({ value: p.nombre, label: p.nombre })),
      ],
    },
  ];

  const rolesAdminPuesto = ["RH", "Jefe"];
  const puedeCrear = hasPermissionOrRole("puesto.administrar", rolesAdminPuesto);
  const puedeEditar = hasPermissionOrRole("puesto.administrar", rolesAdminPuesto);
  const puedeEliminar = hasPermissionOrRole("puesto.administrar", rolesAdminPuesto);

  const actions: ActionDef<Puesto>[] = [
    ...(puedeEditar
      ? [
          {
            label: "Editar",
            icon: <Pencil size={14} />,
            className: "cc-dropdown-item--edit",
            onClick: abrirEditar,
          },
        ]
      : []),
    ...(puedeEliminar
      ? [
          {
            label: "Eliminar",
            icon: <Trash2 size={14} />,
            className: "cc-dropdown-item--delete",
            onClick: abrirConfirmar,
          },
        ]
      : []),
  ];

  return (
    <div className="cc-page">
      <div className="cc-header">
        <div className="cc-title-group">
          <h1 className="cc-title">Puestos de Trabajo</h1>
        </div>
        {puedeCrear && (
          <button
            id="btn-agregar-puesto"
            className="cc-btn-add"
            onClick={abrirAgregar}
          >
            <Plus size={17} strokeWidth={2.5} />
            <span>Nuevo puesto</span>
          </button>
        )}
      </div>

      <TablaGenerica<Puesto>
        data={paginated}
        columns={columns}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        filters={filters as unknown as Record<string, string>}
        filterDefs={filterDefs}
        onFilterChange={onFilterChange}
        actions={actions}
        idAccessor={(p) => p.id}
        busquedaGlobal={busquedaGlobal}
        onBusquedaGlobalChange={(val) => {
          setBusquedaGlobal(val);
          setPage(0);
        }}
        onLimpiarFiltros={() => {
          setFilters(FILTERS_VACIO);
          setBusquedaGlobal("");
          setPage(0);
        }}
        placeholderGlobal="Buscar puestos laborales..."
      />

      <div className="cc-footer-bar">
        <button
          id="btn-exportar-puestos"
          className="cc-btn-excel"
          onClick={() => exportarExcel(sorted)}
        >
          <FileSpreadsheet size={16} />
          <span>Excel</span>
        </button>
        <div className="cc-pagesize-wrap">
          <label htmlFor="sel-ps-puestos" className="cc-pagesize-label">
            Mostrar
          </label>
          <select
            id="sel-ps-puestos"
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
          <span className="cc-pagesize-label">por página</span>
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

      <PuestoModalForm
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

      <PuestoModalDelete
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
