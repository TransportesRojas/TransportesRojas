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
import { limpiarEnteroPositivo } from "../../../utils/inputValidation";
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
    "#",
    "Nombre",
    "Descripción",
    "KM Intervalo",
    "Aplica a",
    "Estado",
  ];
  const rows = datos.map((t) => [
    `#${t.id}`,
    t.nombre,
    t.descripcion ?? "",
    t.kmIntervalo ?? "",
    t.aplicaATipoVehiculo ?? "",
    t.activo ? "Activo" : "Inactivo",
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
  const { toast } = useToast();
  const [items, setItems] = useState<TipoMant[]>([]);
  const [, setLoading] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/TipoMantenimiento");
      setItems(data);
    } catch (error) {
      console.error("Error al cargar tipos de mantenimiento", error);
      toast.error("Error al cargar los tipos de mantenimiento");
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
  const [editando, setEditando] = useState<TipoMant | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState<TipoMant | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const filtered = items.filter((t) => {
    if (filters.activo === "si" && !t.activo) return false;
    if (filters.activo === "no" && t.activo) return false;

    if (busquedaGlobal.trim()) {
      const q = busquedaGlobal.toLowerCase();
      const match = [
        t.id,
        t.nombre,
        t.descripcion,
        t.kmIntervalo,
        t.aplicaATipoVehiculo,
      ].some((val) => String(val ?? "").toLowerCase().includes(q));
      if (!match) return false;
    }

    const m = (v: string | number | boolean | null, f: string) =>
      !f ||
      String(v ?? "")
        .toLowerCase()
        .includes(f.toLowerCase());

    return (
      m(t.id, filters.id) &&
      m(t.nombre, filters.nombre) &&
      m(t.descripcion, filters.descripcion) &&
      m(t.kmIntervalo, filters.kmIntervalo)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortCol) {
      const av = a[sortCol],
        bv = b[sortCol];
      if (av == null) return 1;
      if (bv == null) return -1;
      return (sortDir === "asc" ? 1 : -1) * (av < bv ? -1 : av > bv ? 1 : 0);
    }
    if (a.activo !== b.activo) {
      return a.activo ? -1 : 1;
    }
    return a.id - b.id;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice(page * pageSize, page * pageSize + pageSize);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalAbierto(false);
        setConfirmando(null);
        setConfirmInput("");
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
    if (guardando) return;
    setGuardando(true);
    try {
      if (editando) {
        const actualizado = await fetchApi(`/TipoMantenimiento/${editando.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
        setItems((prev) => prev.map((t) => (t.id === editando.id ? actualizado : t)));
        toast.success(`Tipo de mantenimiento "${form.nombre}" actualizado.`);
      } else {
        const nuevo = await fetchApi('/TipoMantenimiento', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        setItems((prev) => [...prev, nuevo]);
        toast.success(`Tipo de mantenimiento "${form.nombre}" creado exitosamente.`);
      }
      setModalAbierto(false);
    } catch (error: any) {
      console.error("Error al guardar tipo de mantenimiento", error);
      toast.error(extraerMensajeErrorApi(error, "Error al procesar el tipo de mantenimiento."));
    } finally {
      setGuardando(false);
    }
  }, [editando, form, guardando, toast]);

  const abrirConfirmar = useCallback((t: TipoMant) => {
    setConfirmInput("");
    setConfirmando(t);
  }, []);

  const eliminar = useCallback(async () => {
    if (!confirmando || eliminando) return;
    setEliminando(true);
    try {
      await fetchApi(`/TipoMantenimiento/${confirmando.id}`, { method: 'DELETE' });
      setItems((prev) =>
        prev.map((t) => (t.id === confirmando.id ? { ...t, activo: false } : t)),
      );
      toast.info(`Tipo de mantenimiento "${confirmando.nombre}" dado de baja.`);
      setConfirmando(null);
    } catch (error: any) {
      console.error("Error al eliminar", error);
      toast.error(extraerMensajeErrorApi(error, "Error al dar de baja el tipo de mantenimiento."));
    } finally {
      setEliminando(false);
    }
  }, [confirmando, eliminando, toast]);

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
            ? (() => {
                const limpio = limpiarEnteroPositivo(value, 7);
                return limpio === "" ? null : Number(limpio);
              })()
            : value,
    }));
  };

  const columns: ColumnDef<TipoMant>[] = [
    { key: "nombre", label: "Nombre" },
    {
      key: "descripcion",
      label: "Descripción",
      render: (t) => t.descripcion || <span className="text-slate-400 italic">-</span>,
    },
    {
      key: "kmIntervalo",
      label: "Intervalo KM",
      render: (t) => (
        <span className="font-mono text-xs text-slate-800">
          {t.kmIntervalo ? `${t.kmIntervalo.toLocaleString()} km` : "-"}
        </span>
      ),
    },
    {
      key: "aplicaATipoVehiculo",
      label: "Aplica A",
      render: (t) => t.aplicaATipoVehiculo || <span className="text-slate-400 italic">Todos</span>,
    },
    {
      key: "activo",
      label: "Estado",
      render: (t) => (
        <span
          className={`cc-badge-status ${t.activo ? "cc-badge-status--on" : "cc-badge-status--off"}`}
        >
          {t.activo ? "Activo" : "Inactivo"}
        </span>
      ),
    },
  ];

  const filterDefs: FilterDef[] = [
    {
      key: "activo",
      label: "Estado",
      type: "select",
      options: [
        { value: "si", label: "Activos" },
        { value: "", label: "Todos" },
        { value: "no", label: "Inactivos" },
      ],
    },
  ];

  const rolesAdminMant = ["RH", "Jefe"];
  const puedeCrear = hasPermissionOrRole("tipo_mantenimiento.administrar", rolesAdminMant);
  const puedeEditar = hasPermissionOrRole("tipo_mantenimiento.administrar", rolesAdminMant);
  const puedeEliminar = hasPermissionOrRole("tipo_mantenimiento.administrar", rolesAdminMant);

  const actions: ActionDef<TipoMant>[] = [
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
          <h1 className="cc-title">Tipos de Mantenimiento</h1>
        </div>
        {puedeCrear && (
          <button
            id="btn-agregar-tipomant"
            className="cc-btn-add"
            onClick={abrirAgregar}
          >
            <Plus size={17} strokeWidth={2.5} />
            <span>Nuevo tipo</span>
          </button>
        )}
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
        placeholderGlobal="Buscar tipos de mantenimiento por nombre o descripción..."
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
