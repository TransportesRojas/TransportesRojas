import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Pencil,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Briefcase,
  History,
  FolderArchive,
  PauseCircle,
  PlayCircle,
  UserX,
} from "lucide-react";
import "../estilos/cruds.css";
import { fetchApi } from "../../../services/api";
import { useToast } from "../../../components/Toast";
import { extraerMensajeErrorApi } from "../../../utils/errorMessages";
import { hasPermissionOrRole, getSession } from "../../../utils/auth";
import {
  limpiarNombreSinNumeros,
  limpiarSoloDigitos,
  validarNombresPersona,
} from "../../../utils/inputValidation";
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
  EmpleadoModalGestionAcceso,
  type ModoGestionAcceso,
} from "./EmpleadoModalGestionAcceso";
import { EmpleadoModalCambioPuesto } from "./EmpleadoModalCambioPuesto";
import { EmpleadoModalHistorialPuestos } from "./EmpleadoModalHistorialPuestos";
import { EmpleadoModalExpediente } from "./EmpleadoModalExpediente";
import {
  TablaGenerica,
  type ColumnDef,
  type FilterDef,
  type ActionDef,
} from "../../../components/TablaGenerica";

function exportarExcel(datos: Empleado[], sucursalesLista: any[] = []) {
  const cols = [
    "Clave",
    "Nombre Completo",
    "Puesto",
    "Roles",
    "Teléfono",
    "Email",
    "Sucursal",
    "Fecha Ingreso",
    "Estado",
  ];
  const rows = datos.map((e) => {
    const suc = e.sucursalId ? sucursalesLista.find((s) => s.id === e.sucursalId) : null;
    const sucursalTexto = e.sucursalNombre || suc?.nombreCorto || suc?.nombre || "-";
    return [
      `TR-${String(e.id).padStart(3, "0")}`,
      `${e.nombre} ${e.apellidoPaterno} ${e.apellidoMaterno}`.trim(),
      e.puestoNombre || "Sin puesto",
      e.roles?.join(", ") || "-",
      e.telefono ?? "",
      e.email,
      sucursalTexto,
      e.fechaIngreso,
      e.activo ? "Activo" : "Inactivo",
    ];
  });
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

export default function CrudEmpleados() {
  const { toast } = useToast();
  const [items, setItems] = useState<Empleado[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [, setLoading] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const [data, sucs] = await Promise.all([
        fetchApi("/Empleado"),
        fetchApi("/CatalogoGeografico/sucursales-operativas").catch(() =>
          fetchApi("/Sucursal").catch(() => [])
        ),
      ]);
      setItems(data || []);
      setSucursales(sucs || []);
    } catch (error) {
      console.error("Error al cargar empleados", error);
      toast.error("Error al cargar la lista de empleados");
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
  const [editando, setEditando] = useState<Empleado | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState<Empleado | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [eliminando, setEliminando] = useState(false);

  // Modales de historial y acceso
  const [empleadoCambioPuesto, setEmpleadoCambioPuesto] = useState<Empleado | null>(null);
  const [empleadoHistorial, setEmpleadoHistorial] = useState<Empleado | null>(null);
  const [empleadoExpediente, setEmpleadoExpediente] = useState<Empleado | null>(null);

  const [gestionAcceso, setGestionAcceso] = useState<{
    abierto: boolean;
    modo: ModoGestionAcceso;
    empleado: Empleado | null;
  }>({
    abierto: false,
    modo: "suspender",
    empleado: null,
  });

  // Filtrado y ordenamiento
  const filtered = items.filter((e) => {
    if (filters.activo === "si" && (!e.activo || e.estadoAcceso === "suspendido")) return false;
    if (filters.activo === "suspendido" && e.estadoAcceso !== "suspendido") return false;
    if (filters.activo === "no" && (e.activo && e.estadoAcceso !== "suspendido")) return false;

    const suc = e.sucursalId ? sucursales.find((s) => s.id === e.sucursalId) : null;
    const nombreSucursalEfectivo = e.sucursalNombre || suc?.nombreCorto || suc?.nombre || "";

    if (busquedaGlobal.trim()) {
      const q = busquedaGlobal.toLowerCase();
      const matchGlobal = [
        e.id,
        e.nombre,
        e.apellidoPaterno,
        e.apellidoMaterno,
        e.telefono,
        e.email,
        e.puestoNombre,
        nombreSucursalEfectivo,
        e.roles?.join(" "),
      ].some((val) => String(val ?? "").toLowerCase().includes(q));
      if (!matchGlobal) return false;
    }

    const m = (v: string | number | boolean | null | undefined, f: string) =>
      !f ||
      String(v ?? "")
        .toLowerCase()
        .includes(f.toLowerCase());

    return (
      m(e.id, filters.id) &&
      m(e.nombre, filters.nombre) &&
      m(e.apellidoPaterno, filters.apellidoPaterno) &&
      m(e.apellidoMaterno, filters.apellidoMaterno) &&
      m(e.telefono, filters.telefono) &&
      m(e.email, filters.email) &&
      m(nombreSucursalEfectivo, filters.sucursal) &&
      m(e.puestoNombre, filters.puesto) &&
      m(e.roles?.join(", "), filters.rol) &&
      m(e.fechaIngreso, filters.fechaIngreso)
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
        setEmpleadoCambioPuesto(null);
        setEmpleadoHistorial(null);
        setEmpleadoExpediente(null);
        setGestionAcceso({ abierto: false, modo: "suspender", empleado: null });
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
      nombre: e.nombre,
      apellidoPaterno: e.apellidoPaterno,
      apellidoMaterno: e.apellidoMaterno ?? "",
      telefono: e.telefono ?? "",
      email: e.email,
      sucursalId: e.sucursalId,
      puestoId: e.puestoId ?? null,
      rolesAdicionalesIds: [],
      fechaIngreso: e.fechaIngreso,
      activo: e.activo,
    });
    setModalAbierto(true);
  }, []);

  const guardar = useCallback(async () => {
    if (guardando) return;
    const errorNombres = validarNombresPersona(form);
    if (errorNombres) {
      toast.warning(errorNombres);
      return;
    }
    if (!form.sucursalId || Number(form.sucursalId) <= 0) {
      toast.warning("Debe seleccionar una sucursal de adscripción obligatoria.");
      return;
    }
    setGuardando(true);
    try {
      if (editando) {
        const payload = {
          nombre: form.nombre.trim(),
          apellidoPaterno: form.apellidoPaterno.trim(),
          apellidoMaterno: form.apellidoMaterno?.trim() || null,
          telefono: form.telefono,
          email: form.email.trim(),
          sucursalId: form.sucursalId,
          fechaIngreso: form.fechaIngreso,
          activo: form.activo,
        };
        const actualizado = await fetchApi(`/Empleado/${editando.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        const sucMatch = sucursales.find((s) => s.id === form.sucursalId);
        const itemActualizado: Empleado = {
          ...actualizado,
          sucursalId: form.sucursalId,
          sucursalNombre:
            actualizado?.sucursalNombre ||
            sucMatch?.nombreCorto ||
            sucMatch?.nombre ||
            null,
        };
        setItems((prev) =>
          prev.map((e) => (e.id === editando.id ? itemActualizado : e)),
        );
        toast.success(`Empleado "${form.nombre} ${form.apellidoPaterno}" actualizado.`);
      } else {
        const payload = {
          nombre: form.nombre.trim(),
          apellidoPaterno: form.apellidoPaterno.trim(),
          apellidoMaterno: form.apellidoMaterno?.trim() || null,
          telefono: form.telefono,
          email: form.email.trim(),
          sucursalId: form.sucursalId,
          puestoId: form.puestoId,
          rolesAdicionalesIds: form.rolesAdicionalesIds,
          fechaIngreso: form.fechaIngreso,
        };
        const nuevo = await fetchApi(`/Empleado`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setItems((prev) => [...prev, nuevo]);
        toast.success(`Empleado "${form.nombre} ${form.apellidoPaterno}" registrado con éxito.`);
      }
      setModalAbierto(false);
      cargarDatos();
    } catch (error: any) {
      console.error("Error al guardar", error);
      toast.error(extraerMensajeErrorApi(error, "Error al procesar el empleado."));
    } finally {
      setGuardando(false);
    }
  }, [editando, form, guardando, toast, cargarDatos, sucursales]);

  const eliminar = useCallback(async () => {
    if (!confirmando || eliminando) return;
    setEliminando(true);
    try {
      await fetchApi(`/Empleado/${confirmando.id}`, { method: "DELETE" });
      setItems((prev) =>
        prev.map((e) => (e.id === confirmando.id ? { ...e, activo: false } : e)),
      );
      toast.info(`Empleado "${confirmando.nombre} ${confirmando.apellidoPaterno}" dado de baja.`);
      setConfirmando(null);
    } catch (error: any) {
      console.error("Error al eliminar", error);
      toast.error(extraerMensajeErrorApi(error, "Error al dar de baja al empleado."));
    } finally {
      setEliminando(false);
    }
  }, [confirmando, eliminando, toast]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "telefono"
            ? limpiarSoloDigitos(value, 10)
            : ["nombre", "apellidoPaterno", "apellidoMaterno"].includes(name)
              ? limpiarNombreSinNumeros(value)
              : ["sucursalId", "puestoId"].includes(name)
                ? value === ""
                  ? null
                  : Number(value)
                : value,
    }));
  };

  const handlePuestoChange = (puestoId: number | null) => {
    setForm((prev) => ({ ...prev, puestoId }));
  };

  const handleToggleRolAdicional = (rolId: number) => {
    setForm((prev) => {
      const exists = prev.rolesAdicionalesIds.includes(rolId);
      return {
        ...prev,
        rolesAdicionalesIds: exists
          ? prev.rolesAdicionalesIds.filter((id) => id !== rolId)
          : [...prev.rolesAdicionalesIds, rolId],
      };
    });
  };

  const columns: ColumnDef<Empleado>[] = [
    {
      key: "id",
      label: "Clave",
      render: (e) => (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-tr-navy border border-blue-200">
          {`TR-${String(e.id).padStart(3, "0")}`}
        </span>
      ),
    },
    { key: "nombre", label: "Nombre" },
    { key: "apellidoPaterno", label: "Ap. Paterno" },
    { key: "apellidoMaterno", label: "Ap. Materno" },
    {
      key: "puestoNombre",
      label: "Puesto",
      render: (e) => (
        <span className="font-semibold text-xs text-tr-navy bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
          {e.puestoNombre || "Sin puesto"}
        </span>
      ),
    },
    {
      key: "roles",
      label: "Roles",
      render: (e) => (
        <span className="text-xs text-slate-600 font-medium">
          {e.roles && e.roles.length > 0 ? e.roles.join(", ") : "-"}
        </span>
      ),
    },
    { key: "telefono", label: "Teléfono", render: (e) => e.telefono ?? "-" },
    { key: "email", label: "Email" },
    {
      key: "sucursalNombre",
      label: "Sucursal",
      render: (e) => {
        const suc = e.sucursalId ? sucursales.find((s) => s.id === e.sucursalId) : null;
        const nombre = e.sucursalNombre || suc?.nombreCorto || suc?.nombre;
        return (
          <span className="text-xs text-slate-700">
            {nombre ? (
              <span className="font-semibold text-slate-800">{nombre}</span>
            ) : (
              <span className="text-slate-400 italic">Sin sucursal</span>
            )}
          </span>
        );
      },
    },
    { key: "fechaIngreso", label: "Ingreso" },
    {
      key: "activo",
      label: "Estado",
      render: (e) => {
        const est = (e.estadoAcceso || (e.activo ? "activo" : "desactivado")).toLowerCase();
        if (est === "suspendido") {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Suspendido
            </span>
          );
        }
        if (est === "desactivado" || !e.activo) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-[#D64545] border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D64545]" />
              Inactivo
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            Activo
          </span>
        );
      },
    },
  ];

  const opcionesPuestos = useMemo(() => {
    const set = new Set<string>();
    items.forEach((e) => {
      if (e.puestoNombre) set.add(e.puestoNombre);
    });
    return Array.from(set).sort();
  }, [items]);

  const opcionesRoles = useMemo(() => {
    const set = new Set<string>();
    items.forEach((e) => {
      e.roles?.forEach((r) => {
        if (r) set.add(r);
      });
    });
    return Array.from(set).sort();
  }, [items]);

  const opcionesSucursales = useMemo(() => {
    const set = new Set<string>();
    items.forEach((e) => {
      const suc = e.sucursalId ? sucursales.find((s) => s.id === e.sucursalId) : null;
      const nom = e.sucursalNombre || suc?.nombreCorto || suc?.nombre;
      if (nom) set.add(nom);
    });
    sucursales.forEach((s) => {
      const nom = s.nombreCorto || s.nombre;
      if (nom) set.add(nom);
    });
    return Array.from(set).sort();
  }, [items, sucursales]);

  const opcionesAnios = useMemo(() => {
    const set = new Set<string>();
    items.forEach((e) => {
      if (e.fechaIngreso) {
        const y = e.fechaIngreso.slice(0, 4);
        if (/^\d{4}$/.test(y)) set.add(y);
      }
    });
    return Array.from(set).sort().reverse();
  }, [items]);

  const filterDefs: FilterDef[] = [
    {
      key: "activo",
      label: "Estado",
      type: "select",
      options: [
        { value: "", label: "Todos" },
        { value: "si", label: "Activos" },
        { value: "suspendido", label: "Suspendidos" },
        { value: "no", label: "Inactivos" },
      ],
    },
    {
      key: "puesto",
      label: "Puesto",
      type: "select",
      options: [
        { value: "", label: "Todos los puestos" },
        ...opcionesPuestos.map((p: string) => ({ value: p, label: p })),
      ],
    },
    {
      key: "rol",
      label: "Rol",
      type: "select",
      options: [
        { value: "", label: "Todos los roles" },
        ...opcionesRoles.map((r: string) => ({ value: r, label: r })),
      ],
    },
    {
      key: "sucursal",
      label: "Sucursal",
      type: "select",
      options: [
        { value: "", label: "Todas las sucursales" },
        ...opcionesSucursales.map((s: string) => ({ value: s, label: s })),
      ],
    },
    {
      key: "fechaIngreso",
      label: "Año de Ingreso",
      type: "select",
      options: [
        { value: "", label: "Todos los años" },
        ...opcionesAnios.map((a: string) => ({ value: a, label: a })),
      ],
    },
  ];

  const rolesAdminRh = ["RH", "Jefe"];
  const rolesConsultar = ["RH", "Jefe"];

  const puedeCrear = hasPermissionOrRole("empleado.registrar", rolesAdminRh);
  const puedeEditar = hasPermissionOrRole("empleado.editar", rolesAdminRh);
  const puedeCambiarPuesto = hasPermissionOrRole("empleado.cambiar_rol", rolesAdminRh);
  const puedeEliminar = hasPermissionOrRole("empleado.desactivar", rolesAdminRh);
  const puedeConsultar = hasPermissionOrRole("empleado.consultar", rolesConsultar);

  const session = getSession();
  const userRoles = (session.roles || []).map((r) => r.trim().toLowerCase());
  const esSoloRH = userRoles.includes("rh") && !userRoles.includes("jefe");

  const esJefeTarget = (e: Empleado) => {
    const p = (e.puestoNombre || "").toLowerCase();
    const r = (e.roles || []).map((x) => x.toLowerCase());
    return p.includes("jefe") || p.includes("gerente general") || r.includes("jefe");
  };

  const actions: ActionDef<Empleado>[] = [
    ...(puedeEditar
      ? [
        {
          label: "Editar",
          icon: <Pencil size={14} />,
          className: "cc-dropdown-item--edit",
          onClick: abrirEditar,
          visible: (e: Empleado) => !esSoloRH || !esJefeTarget(e),
        },
      ]
      : []),
    ...(puedeConsultar
      ? [
        {
          label: "Consultar Expediente",
          icon: <FolderArchive size={14} />,
          className: "text-emerald-700 hover:bg-emerald-50",
          onClick: (e: Empleado) => setEmpleadoExpediente(e),
        },
      ]
      : []),
    ...(puedeCambiarPuesto
      ? [
        {
          label: "Cambiar Puesto",
          icon: <Briefcase size={14} />,
          className: "text-blue-700 hover:bg-blue-50",
          onClick: (e: Empleado) => setEmpleadoCambioPuesto(e),
          visible: (e: Empleado) => !esSoloRH || !esJefeTarget(e),
        },
      ]
      : []),
    ...(puedeConsultar
      ? [
        {
          label: "Historial Puestos",
          icon: <History size={14} />,
          className: "text-slate-700 hover:bg-slate-100",
          onClick: (e: Empleado) => setEmpleadoHistorial(e),
        },
      ]
      : []),
    ...(puedeEliminar
      ? [
        {
          label: "Suspender acceso temporal",
          icon: <PauseCircle size={14} />,
          className: "text-amber-700 hover:bg-amber-50",
          onClick: (e: Empleado) =>
            setGestionAcceso({ abierto: true, modo: "suspender", empleado: e }),
          visible: (e: Empleado) =>
            (!esSoloRH || !esJefeTarget(e)) && Boolean(e.activo && e.estadoAcceso !== "suspendido"),
        },
        {
          label: "Reactivar acceso",
          icon: <PlayCircle size={14} />,
          className: "text-emerald-700 hover:bg-emerald-50",
          onClick: (e: Empleado) =>
            setGestionAcceso({ abierto: true, modo: "reactivar", empleado: e }),
          visible: (e: Empleado) => (!esSoloRH || !esJefeTarget(e)) && Boolean(!e.activo || e.estadoAcceso === "suspendido"),
        },
        {
          label: "Dar de baja definitiva",
          icon: <UserX size={14} />,
          className: "cc-dropdown-item--delete",
          onClick: (e: Empleado) =>
            setGestionAcceso({ abierto: true, modo: "desactivar", empleado: e }),
          visible: (e: Empleado) => (!esSoloRH || !esJefeTarget(e)) && Boolean(e.activo),
        },
      ]
      : []),
  ];

  return (
    <div className="cc-page">
      <div className="cc-header">
        <div className="cc-title-group">
          <h1 className="cc-title">Empleados</h1>
        </div>
        {puedeCrear && (
          <button
            id="btn-agregar-empleado"
            className="cc-btn-add"
            onClick={abrirAgregar}
          >
            <Plus size={17} strokeWidth={2.5} />
            <span>Nuevo empleado</span>
          </button>
        )}
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
        busquedaGlobal={busquedaGlobal}
        onBusquedaGlobalChange={(val) => {
          setBusquedaGlobal(val);
          setPage(0);
        }}
        onLimpiarFiltros={() => {
          setFilters({ ...FILTERS_VACIO, activo: "" });
          setBusquedaGlobal("");
          setPage(0);
        }}
        placeholderGlobal="Buscar empleados por nombre, puesto, roles, sucursal, correo..."
        pildorasRapidas={{
          key: "activo",
          opciones: [
            { valor: "", etiqueta: "Todos" },
            {
              valor: "si",
              etiqueta: "Activos",
              dotColor: "bg-emerald-500",
              activeClass: "bg-emerald-600 text-white shadow-xs font-bold",
            },
            {
              valor: "no",
              etiqueta: "Inactivos",
              dotColor: "bg-rose-500",
              activeClass: "bg-rose-600 text-white shadow-xs font-bold",
            },
            {
              valor: "suspendido",
              etiqueta: "Suspendidos",
              dotColor: "bg-amber-400",
              activeClass: "bg-amber-500 text-white shadow-xs font-bold",
            },
          ],
        }}
      />

      <div className="cc-footer-bar">
        <button
          id="btn-exportar-empleados"
          className="cc-btn-excel"
          onClick={() => exportarExcel(sorted, sucursales)}
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

      <EmpleadoModalForm
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={(e) => {
          e.preventDefault();
          guardar();
        }}
        onChange={onChange}
        onPuestoChange={handlePuestoChange}
        onToggleRolAdicional={handleToggleRolAdicional}
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

      <EmpleadoModalCambioPuesto
        abierto={Boolean(empleadoCambioPuesto)}
        empleado={empleadoCambioPuesto}
        onClose={() => setEmpleadoCambioPuesto(null)}
        onPuestoCambiado={cargarDatos}
      />

      <EmpleadoModalHistorialPuestos
        abierto={Boolean(empleadoHistorial)}
        empleado={empleadoHistorial}
        onClose={() => setEmpleadoHistorial(null)}
      />

      <EmpleadoModalExpediente
        abierto={Boolean(empleadoExpediente)}
        empleado={empleadoExpediente}
        onClose={() => setEmpleadoExpediente(null)}
      />

      <EmpleadoModalGestionAcceso
        abierto={gestionAcceso.abierto}
        modo={gestionAcceso.modo}
        empleado={gestionAcceso.empleado}
        onClose={() =>
          setGestionAcceso((prev) => ({ ...prev, abierto: false, empleado: null }))
        }
        onSuccess={cargarDatos}
      />
    </div>
  );
}
