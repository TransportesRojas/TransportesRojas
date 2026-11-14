import { useState, useEffect, useCallback } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Shield,
} from "lucide-react";
import "../estilos/cruds.css";
import { fetchApi } from "../../../services/api";
import { useToast } from "../../../components/Toast";
import { extraerMensajeErrorApi } from "../../../utils/errorMessages";
import { hasPermissionOrRole, getSession } from "../../../utils/auth";
import {
  type Rol,
  type FormData,
  type SortDir,
  type SortCol,
  type Filters,
  FORM_VACIO,
  FILTERS_VACIO,
  OPCIONES_PAGINA,
} from "./types";
import { RolModalForm } from "./RolModalForm";
import { RolModalDelete } from "./RolModalDelete";
import { RolModalPermisos } from "./RolModalPermisos";
import {
  TablaGenerica,
  type ColumnDef,
  type FilterDef,
  type ActionDef,
} from "../../../components/TablaGenerica";

function exportarExcel(datos: Rol[]) {
  const cols = ["#", "Nombre", "Descripción"];
  const rows = datos.map((r) => [`#${r.id}`, r.nombre, r.descripcion ?? ""]);
  const csv = [cols, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "roles.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CrudRoles() {
  const { toast } = useToast();
  const [items, setItems] = useState<Rol[]>([]);
  const [, setLoading] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/Rol");
      setItems(data);
    } catch (error) {
      console.error("Error al cargar roles", error);
      toast.error("Error al cargar roles del sistema.");
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
  const [editando, setEditando] = useState<Rol | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState<Rol | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const [rolPermisos, setRolPermisos] = useState<Rol | null>(null);

  const filtered = items.filter((r) => {
    if (busquedaGlobal.trim()) {
      const q = busquedaGlobal.toLowerCase();
      const match = [r.id, r.nombre, r.descripcion].some((val) =>
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
      m(r.id, filters.id) &&
      m(r.nombre, filters.nombre) &&
      m(r.descripcion, filters.descripcion)
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
        setRolPermisos(null);
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
      const c = col as keyof Rol;
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

  const abrirEditar = useCallback((r: Rol) => {
    setEditando(r);
    setForm({
      nombre: r.nombre,
      descripcion: r.descripcion ?? "",
    });
    setModalAbierto(true);
  }, []);

  const guardar = useCallback(async () => {
    if (guardando) return;
    setGuardando(true);
    try {
      if (editando) {
        const actualizado = await fetchApi(`/Rol/${editando.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
        setItems((prev) => prev.map((r) => (r.id === editando.id ? actualizado : r)));
        toast.success(`Rol "${form.nombre}" actualizado correctamente.`);
      } else {
        const nuevo = await fetchApi('/Rol', {
          method: 'POST',
          body: JSON.stringify(form)
        });
        setItems((prev) => [...prev, nuevo]);
        toast.success(`Rol "${form.nombre}" registrado exitosamente.`);
      }
      setModalAbierto(false);
    } catch (error: any) {
      console.error("Error al guardar rol", error);
      toast.error(extraerMensajeErrorApi(error, "Error al procesar el rol."));
    } finally {
      setGuardando(false);
    }
  }, [editando, form, guardando, toast]);

  const abrirConfirmar = useCallback((r: Rol) => {
    setConfirmInput("");
    setConfirmando(r);
  }, []);

  const eliminar = useCallback(async () => {
    if (!confirmando || eliminando) return;
    setEliminando(true);
    try {
      await fetchApi(`/Rol/${confirmando.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((r) => r.id !== confirmando.id));
      toast.info(`Rol "${confirmando.nombre}" eliminado.`);
      setConfirmando(null);
    } catch (error: any) {
      console.error("Error al eliminar", error);
      toast.error(extraerMensajeErrorApi(error, "Error al eliminar el rol."));
    } finally {
      setEliminando(false);
    }
  }, [confirmando, eliminando, toast]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const columns: ColumnDef<Rol>[] = [
    {
      key: "nombre",
      label: "Rol",
      render: (r) => (
        <span className="font-bold text-slate-800 text-xs">{r.nombre}</span>
      ),
    },
    {
      key: "descripcion",
      label: "Descripción",
      render: (r) => r.descripcion || <span className="text-slate-400 italic">Sin descripción</span>,
    },
  ];

  const filterDefs: FilterDef[] = [
    {
      key: "nombre",
      label: "Rol",
      type: "select",
      options: [
        { value: "", label: "Todos los roles" },
        ...items.map((r) => ({ value: r.nombre, label: r.nombre })),
      ],
    },
  ];

  const rolesAdminRol = ["RH", "Jefe"];
  const puedeCrear = hasPermissionOrRole("rol.administrar", rolesAdminRol);
  const puedeEditar = hasPermissionOrRole("rol.administrar", rolesAdminRol);
  const puedeEliminar = hasPermissionOrRole("rol.administrar", rolesAdminRol);

  const session = getSession();
  const userRoles = (session.roles || []).map((r) => r.trim().toLowerCase());
  const esSoloRH = userRoles.includes("rh") && !userRoles.includes("jefe");

  const esRolProtegidoParaRH = (r: Rol) => {
    const n = (r.nombre || "").trim().toLowerCase();
    return n === "rh" || n === "jefe";
  };

  const actions: ActionDef<Rol>[] = [
    ...(puedeEditar
      ? [
          {
            label: "Editar",
            icon: <Pencil size={14} />,
            className: "cc-dropdown-item--edit",
            onClick: abrirEditar,
            visible: (r: Rol) => !esSoloRH || !esRolProtegidoParaRH(r),
          },
          {
            label: "Asignar Permisos",
            icon: <Shield size={14} />,
            className: "text-emerald-700 hover:bg-emerald-50",
            onClick: (r: Rol) => setRolPermisos(r),
            visible: (r: Rol) => !esSoloRH || !esRolProtegidoParaRH(r),
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
            visible: (r: Rol) => !esSoloRH || !esRolProtegidoParaRH(r),
          },
        ]
      : []),
  ];

  return (
    <div className="cc-page">
      <div className="cc-header">
        <div className="cc-title-group">
          <h1 className="cc-title">Roles de Acceso</h1>
        </div>
        {puedeCrear && (
          <button
            id="btn-agregar-rol"
            className="cc-btn-add"
            onClick={abrirAgregar}
          >
            <Plus size={17} strokeWidth={2.5} />
            <span>Nuevo rol</span>
          </button>
        )}
      </div>

      <TablaGenerica<Rol>
        data={paginated}
        columns={columns}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        filters={filters as unknown as Record<string, string>}
        filterDefs={filterDefs}
        onFilterChange={onFilterChange}
        actions={actions}
        idAccessor={(r) => r.id}
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
        placeholderGlobal="Buscar roles por nombre o descripción..."
      />

      <div className="cc-footer-bar">
        <button
          id="btn-exportar-roles"
          className="cc-btn-excel"
          onClick={() => exportarExcel(sorted)}
        >
          <FileSpreadsheet size={16} />
          <span>Excel</span>
        </button>
        <div className="cc-pagesize-wrap">
          <label htmlFor="sel-ps-roles" className="cc-pagesize-label">
            Mostrar
          </label>
          <select
            id="sel-ps-roles"
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

      <RolModalForm
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

      <RolModalDelete
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

      <RolModalPermisos
        abierto={Boolean(rolPermisos)}
        rol={rolPermisos}
        onClose={() => setRolPermisos(null)}
        onGuardado={cargarDatos}
      />
    </div>
  );
}
