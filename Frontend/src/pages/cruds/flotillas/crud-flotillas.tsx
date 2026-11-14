import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Truck,
  Layers,
  Package,
} from "lucide-react";
import "../estilos/cruds.css";
import { fetchApi } from "../../../services/api";
import { useToast } from "../../../components/Toast";
import { extraerMensajeErrorApi } from "../../../utils/errorMessages";
import { getSession, hasPermissionOrRole, hasRequiredRole } from "../../../utils/auth";
import {
  type Flotilla,
  type FormData,
  type SortDir,
  type SortCol,
  type Filters,
  type SucursalItem,
  type EmpleadoItem,
  type UnidadItem,
  FORM_VACIO,
  FILTERS_VACIO,
  OPCIONES_PAGINA,
} from "./types";
import { FlotillaModalForm } from "./FlotillaModalForm";
import { FlotillaModalDelete } from "./FlotillaModalDelete";
import { FlotillaModalResumen } from "./FlotillaModalResumen";
import { UnidadModalForm } from "./UnidadModalForm";
import { UnidadModalDelete } from "./UnidadModalDelete";
import { FlotillaModalAsignarEnvios } from "./FlotillaModalAsignarEnvios";
import {
  TablaGenerica,
  type ColumnDef,
  type FilterDef,
  type ActionDef,
} from "../../../components/TablaGenerica";

function exportarExcel(datos: Flotilla[]) {
  const cols = [
    "Clave",
    "Nombre",
    "Código",
    "Sucursal ID",
    "Supervisor ID",
    "Activo",
  ];
  const rows = datos.map((f) => [
    `#${f.id}`,
    f.nombre,
    f.codigo ?? "",
    f.sucursalId ?? "",
    f.supervisorId ?? "",
    f.activo ? "Sí" : "No",
  ]);
  const csv = [cols, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "flotillas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CrudFlotillas() {
  const { toast } = useToast();
  const [items, setItems] = useState<Flotilla[]>([]);
  const [sucursales, setSucursales] = useState<SucursalItem[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoItem[]>([]);
  const [unidades, setUnidades] = useState<UnidadItem[]>([]);
  const [tabPrincipal, setTabPrincipal] = useState<"flotillas" | "unidades">("flotillas");
  const [, setLoading] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const [dataFlt, dataSuc, dataEmp, dataUni] = await Promise.all([
        fetchApi("/Flotilla"),
        fetchApi("/Sucursal")
          .catch(() => fetchApi("/CatalogoGeografico/sucursales-operativas"))
          .catch(() => []),
        fetchApi("/Flotilla/supervisores-operativos")
          .catch(() => fetchApi("/Empleado"))
          .catch(() => []),
        fetchApi("/Unidad?take=200").catch(() => []),
      ]);
      setItems(dataFlt || []);
      setSucursales(dataSuc || []);
      setEmpleados(dataEmp || []);
      setUnidades(dataUni || []);
    } catch (error) {
      console.error("Error al cargar flotillas o unidades", error);
      toast.error("Error al cargar los datos operativos de flotillas");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const session = getSession();
  const sucursalUsuarioId =
    (session.user as any)?.sucursalId ||
    (session.user?.sucursal
      ? sucursales.find((s) => s.nombre.toLowerCase() === session.user?.sucursal?.toLowerCase())?.id
      : null) ||
    null;

  const listaJefes = empleados.filter((e) => {
    const puesto = (e.puestoNombre || "").toLowerCase();
    return puesto.includes("jefe") || puesto.includes("flotilla") || puesto.includes("supervisor");
  });
  const jefesParaForm = listaJefes.length > 0 ? listaJefes : empleados;

  const puedeFiltrarTodasSucursales = hasRequiredRole(session.roles, ["Jefe", "RH"]);
  const nombreSucursalAsignada =
    sucursales.find((s) => s.id === sucursalUsuarioId)?.nombre ||
    session.user?.sucursal ||
    "Tu sucursal";

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Filters>(() => ({
    ...FILTERS_VACIO,
    sucursalId: (!puedeFiltrarTodasSucursales && sucursalUsuarioId) ? String(sucursalUsuarioId) : "",
  }));

  useEffect(() => {
    if (!puedeFiltrarTodasSucursales && sucursalUsuarioId && !filters.sucursalId) {
      setFilters((prev) => ({ ...prev, sucursalId: String(sucursalUsuarioId) }));
    }
  }, [puedeFiltrarTodasSucursales, sucursalUsuarioId, filters.sucursalId]);
  const [busquedaGlobal, setBusquedaGlobal] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Flotilla | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState<Flotilla | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const [flotillaResumen, setFlotillaResumen] = useState<Flotilla | null>(null);
  const [flotillaAsignarEnvios, setFlotillaAsignarEnvios] = useState<Flotilla | null>(null);

  // Gestión de unidades
  const [modalUnidadAbierto, setModalUnidadAbierto] = useState(false);
  const [unidadEditando, setUnidadEditando] = useState<UnidadItem | null>(null);
  const [unidadConfirmando, setUnidadConfirmando] = useState<UnidadItem | null>(null);
  const [confirmInputUnidad, setConfirmInputUnidad] = useState("");
  const [eliminandoUnidad, setEliminandoUnidad] = useState(false);
  const [busquedaUnidades, setBusquedaUnidades] = useState("");
  const [pageUnidades, setPageUnidades] = useState(0);
  const [pageSizeUnidades, setPageSizeUnidades] = useState(10);

  const eliminarUnidad = async () => {
    if (!unidadConfirmando || eliminandoUnidad) return;
    try {
      setEliminandoUnidad(true);
      await fetchApi(`/Unidad/${unidadConfirmando.id}`, { method: "DELETE" });
      toast.success(`Unidad con placas ${unidadConfirmando.placas} desactivada/retirada.`);
      setUnidadConfirmando(null);
      setConfirmInputUnidad("");
      void cargarDatos();
    } catch (err: any) {
      console.error("Error al desactivar unidad", err);
      toast.error(extraerMensajeErrorApi(err, "Error al desactivar la unidad vehicular."));
    } finally {
      setEliminandoUnidad(false);
    }
  };

  const filtered = items.filter((f) => {
    if (filters.activo === "si" && !f.activo) return false;
    if (filters.activo === "no" && f.activo) return false;

    if (busquedaGlobal.trim()) {
      const q = busquedaGlobal.toLowerCase();
      const match = [f.id, f.nombre, f.codigo, f.sucursalId, f.supervisorId].some(
        (val) => String(val ?? "").toLowerCase().includes(q)
      );
      if (!match) return false;
    }

    if (!puedeFiltrarTodasSucursales && sucursalUsuarioId) {
      if (f.sucursalId !== sucursalUsuarioId) return false;
    }

    const m = (v: string | number | boolean | null, fi: string) =>
      !fi ||
      String(v ?? "")
        .toLowerCase()
        .includes(fi.toLowerCase());

    return (
      m(f.id, filters.id) &&
      m(f.nombre, filters.nombre) &&
      m(f.codigo, filters.codigo) &&
      m(f.sucursalId, filters.sucursalId) &&
      m(f.supervisorId, filters.supervisorId)
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
        setFlotillaResumen(null);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const onFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      if (!puedeFiltrarTodasSucursales && name === "sucursalId") return;
      setFilters((prev) => ({ ...prev, [name]: value }));
      setPage(0);
    },
    [puedeFiltrarTodasSucursales],
  );

  const handleSort = useCallback(
    (col: string) => {
      const c = col as keyof Flotilla;
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
    setForm({
      ...FORM_VACIO,
      sucursalId: sucursalUsuarioId,
    });
    setModalAbierto(true);
  }, [sucursalUsuarioId]);

  const abrirEditar = useCallback((f: Flotilla) => {
    setEditando(f);
    setForm({
      nombre: f.nombre,
      codigo: f.codigo ?? "",
      sucursalId: f.sucursalId,
      supervisorId: f.supervisorId,
      activo: f.activo,
    });
    setModalAbierto(true);
  }, []);

  const guardar = useCallback(
    async (
      _e?: React.FormEvent,
      unidadesIds?: number[],
      choferesIds?: number[]
    ) => {
      if (guardando) return;
      setGuardando(true);
      try {
        if (editando) {
          const actualizado = await fetchApi(`/Flotilla/${editando.id}`, {
            method: "PUT",
            body: JSON.stringify(form),
          });

          if (unidadesIds !== undefined || choferesIds !== undefined) {
            await fetchApi(`/Flotilla/${editando.id}/asignaciones`, {
              method: "PUT",
              body: JSON.stringify({
                unidadesIds: unidadesIds || [],
                choferesIds: choferesIds || [],
              }),
            });
          }

          setItems((prev) =>
            prev.map((f) => (f.id === editando.id ? actualizado : f)),
          );
          toast.success(`Flotilla "${form.nombre}" actualizada.`);
        } else {
          const nuevo = await fetchApi(`/Flotilla`, {
            method: "POST",
            body: JSON.stringify(form),
          });
          setItems((prev) => [...prev, nuevo]);
          toast.success(`Flotilla "${form.nombre}" creada con éxito.`);
        }
        setModalAbierto(false);
      } catch (error: any) {
        console.error("Error al guardar", error);
        toast.error(extraerMensajeErrorApi(error, "Error al procesar la flotilla."));
      } finally {
        setGuardando(false);
      }
    },
    [editando, form, guardando, toast],
  );

  const abrirConfirmar = useCallback((f: Flotilla) => {
    setConfirmInput("");
    setConfirmando(f);
  }, []);

  const eliminar = useCallback(async () => {
    if (!confirmando || eliminando) return;
    setEliminando(true);
    try {
      await fetchApi(`/Flotilla/${confirmando.id}`, { method: "DELETE" });
      setItems((prev) =>
        prev.map((f) => (f.id === confirmando.id ? { ...f, activo: false } : f)),
      );
      toast.info(`Flotilla "${confirmando.nombre}" dada de baja.`);
      setConfirmando(null);
    } catch (error: any) {
      console.error("Error al eliminar", error);
      toast.error(extraerMensajeErrorApi(error, "Error al dar de baja la flotilla."));
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
          : ["sucursalId", "supervisorId"].includes(name)
            ? value === ""
              ? null
              : Number(value)
            : value,
    }));
  };

  const columns: ColumnDef<Flotilla>[] = [
    {
      key: "codigo",
      label: "Clave",
      render: (f) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
          {f.codigo || `#${f.id}`}
        </span>
      ),
    },
    { key: "nombre", label: "Nombre" },
    {
      key: "sucursalId",
      label: "Sucursal",
      render: (f) => {
        const suc = sucursales.find((s) => s.id === f.sucursalId);
        return (
          <span className="text-xs text-slate-700 font-medium">
            {suc ? (suc.nombreCorto ? `${suc.nombreCorto} (${suc.nombre})` : suc.nombre) : (f.sucursalId ? `Sucursal #${f.sucursalId}` : <span className="text-slate-400 italic">Sin sucursal</span>)}
          </span>
        );
      },
    },
    {
      key: "supervisorId",
      label: "Jefe de Flotilla",
      render: (f) => {
        const jefe = empleados.find((e) => e.id === f.supervisorId);
        return (
          <span className="text-xs text-slate-700 font-medium">
            {jefe ? `${jefe.nombre} ${jefe.apellidoPaterno}` : (f.supervisorId ? `Jefe #${f.supervisorId}` : <span className="text-slate-400 italic">No asignado</span>)}
          </span>
        );
      },
    },
    {
      key: "activo",
      label: "Estado",
      render: (f) => (
        <span
          className={`cc-badge-status ${f.activo ? "cc-badge-status--on" : "cc-badge-status--off"}`}
        >
          {f.activo ? "Activo" : "Inactivo"}
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
    {
      key: "sucursalId",
      label: puedeFiltrarTodasSucursales ? "Sucursal" : "Sucursal asignada",
      type: "select",
      options: puedeFiltrarTodasSucursales
        ? [
            { value: "", label: "Todas las sucursales" },
            ...sucursales.map((s) => ({
              value: String(s.id),
              label: s.nombreCorto || s.nombre,
            })),
          ]
        : [
            {
              value: String(sucursalUsuarioId || ""),
              label: nombreSucursalAsignada,
            },
          ],
    },
  ];

  const rolesAdminFlotilla = ["Supervisor", "Jefe"];
  const rolesConsultarFlotilla = ["Supervisor", "Jefe"];
  const rolesAdminUnidad = ["Supervisor", "Jefe"];

  const puedeCrear = hasPermissionOrRole("flotilla.registrar", rolesAdminFlotilla);
  const puedeEditar = hasPermissionOrRole("flotilla.editar", rolesAdminFlotilla);
  const puedeEliminar = hasPermissionOrRole("flotilla.desactivar", rolesAdminFlotilla);
  const puedeConsultar = hasPermissionOrRole("flotilla.consultar", rolesConsultarFlotilla);
  const puedeAsignarEnvios = hasPermissionOrRole("envio.asignar_flotilla", [
    "Supervisor",
    "Jefe",
  ]);

  const puedeCrearUnidad = hasPermissionOrRole("unidad.registrar", rolesAdminUnidad);
  const puedeEditarUnidad = hasPermissionOrRole("unidad.editar", rolesAdminUnidad);
  const puedeEliminarUnidad = hasPermissionOrRole("unidad.desactivar", rolesAdminUnidad);

  const actions: ActionDef<Flotilla>[] = [
    ...(puedeAsignarEnvios
      ? [
          {
            label: "Asignar Envíos a esta Flotilla",
            icon: <Package size={14} />,
            className: "text-[#0B2D4A] hover:bg-blue-50 font-bold",
            visible: (f: Flotilla) => f.activo,
            onClick: (f: Flotilla) => setFlotillaAsignarEnvios(f),
          },
        ]
      : []),
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
    ...(puedeConsultar
      ? [
          {
            label: "Ver Unidades y Mantenimiento",
            icon: <Truck size={14} />,
            className: "text-blue-700 hover:bg-blue-50",
            onClick: (f: Flotilla) => setFlotillaResumen(f),
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

  const [filtersUnidades, setFiltersUnidades] = useState<Record<string, string>>({
    disponibilidad: "",
    estado: "",
    flotillaId: "",
  });
  const [sortColUnidades, setSortColUnidades] = useState<string | null>(null);
  const [sortDirUnidades, setSortDirUnidades] = useState<SortDir>("asc");

  const onFilterChangeUnidades = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFiltersUnidades((prev) => ({ ...prev, [e.target.name]: e.target.value }));
      setPageUnidades(0);
    },
    []
  );

  const handleSortUnidades = useCallback(
    (col: string) => {
      setSortDirUnidades((prev) =>
        sortColUnidades === col ? (prev === "asc" ? "desc" : "asc") : "asc"
      );
      setSortColUnidades(col);
      setPageUnidades(0);
    },
    [sortColUnidades]
  );

  const filterDefsUnidades: FilterDef[] = [
    {
      key: "estado",
      label: "Estado Operativo",
      type: "select",
      options: [
        { value: "", label: "Todos los estados" },
        { value: "Disponible", label: "Disponible" },
        { value: "Asignada", label: "Asignada" },
        { value: "Mantenimiento", label: "En Mantenimiento" },
        { value: "FueraServicio", label: "Fuera de Servicio" },
      ],
    },
    {
      key: "flotillaId",
      label: "Flotilla Asignada",
      type: "select",
      options: [
        { value: "", label: "Todas las flotillas" },
        { value: "sin_flotilla", label: "-- Unidades generales (Sin flotilla) --" },
        ...items.map((f) => ({ value: String(f.id), label: f.nombre })),
      ],
    },
  ];

  const unidadesFiltradas = useMemo(() => {
    return unidades.filter((u) => {
      const estadoLower = (u.estado || "Disponible").toLowerCase();

      if (filtersUnidades.disponibilidad) {
        if (filtersUnidades.disponibilidad === "disponible") {
          if (estadoLower !== "disponible") return false;
        } else if (filtersUnidades.disponibilidad === "asignada") {
          if (estadoLower !== "asignada") return false;
        } else if (filtersUnidades.disponibilidad === "no_disponible") {
          if (estadoLower === "disponible") return false;
        }
      }

      if (filtersUnidades.estado && estadoLower !== filtersUnidades.estado.toLowerCase()) {
        return false;
      }

      if (filtersUnidades.flotillaId) {
        if (filtersUnidades.flotillaId === "sin_flotilla" && u.flotillaId) return false;
        if (filtersUnidades.flotillaId !== "sin_flotilla" && String(u.flotillaId) !== filtersUnidades.flotillaId) return false;
      }

      if (busquedaUnidades.trim()) {
        const q = busquedaUnidades.toLowerCase();
        const match = [
          u.id,
          u.placas,
          u.marca,
          u.modelo,
          u.tipoVehiculo,
          u.flotillaNombre,
        ].some((val) => String(val ?? "").toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [unidades, filtersUnidades, busquedaUnidades]);

  const unidadesOrdenadas = useMemo(() => {
    if (!sortColUnidades) return unidadesFiltradas;
    return [...unidadesFiltradas].sort((a, b) => {
      let av: any = a[sortColUnidades as keyof UnidadItem];
      let bv: any = b[sortColUnidades as keyof UnidadItem];

      if (sortColUnidades === "flotillaId") {
        av = a.flotillaNombre || (a.flotillaId ? items.find((f) => f.id === a.flotillaId)?.nombre : "") || "";
        bv = b.flotillaNombre || (b.flotillaId ? items.find((f) => f.id === b.flotillaId)?.nombre : "") || "";
      } else if (sortColUnidades === "modelo") {
        av = `${a.marca || ""} ${a.modelo || ""}`.trim();
        bv = `${b.marca || ""} ${b.modelo || ""}`.trim();
      }

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      if (typeof av === "number" && typeof bv === "number") {
        return (sortDirUnidades === "asc" ? 1 : -1) * (av - bv);
      }

      const strA = String(av).toLowerCase();
      const strB = String(bv).toLowerCase();
      return (sortDirUnidades === "asc" ? 1 : -1) * strA.localeCompare(strB, "es", { numeric: true });
    });
  }, [unidadesFiltradas, sortColUnidades, sortDirUnidades, items]);

  const totalPagesUnidades = Math.max(1, Math.ceil(unidadesOrdenadas.length / pageSizeUnidades));
  const unidadesPaginadas = useMemo(() => {
    const inicio = pageUnidades * pageSizeUnidades;
    return unidadesOrdenadas.slice(inicio, inicio + pageSizeUnidades);
  }, [unidadesOrdenadas, pageUnidades, pageSizeUnidades]);

  const columnsUnidades: ColumnDef<UnidadItem>[] = [
    {
      key: "placas",
      label: "Placas",
      render: (u: UnidadItem) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
            {u.placas}
          </span>
          {!u.activo && (
            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
              Baja
            </span>
          )}
        </div>
      ),
    },
    {
      key: "modelo",
      label: "Vehículo",
      render: (u: UnidadItem) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">
            {u.marca} {u.modelo}
          </div>
          <div className="text-[11px] text-slate-500">
            Año {u.anio || "S/A"} &bull; {u.tipoVehiculo || "General"}
          </div>
        </div>
      ),
    },
    {
      key: "capacidadKg",
      label: "Capacidad (Kg)",
      render: (u: UnidadItem) => (
        <span className="font-semibold text-slate-800">
          {Number(u.capacidadKg || 0).toLocaleString()} kg
        </span>
      ),
    },
    {
      key: "kmOdometroActual",
      label: "Odómetro Actual",
      render: (u: UnidadItem) => (
        <span className="font-mono text-slate-700">
          {Number(u.kmOdometroActual || 0).toLocaleString()} km
        </span>
      ),
    },
    {
      key: "flotillaId",
      label: "Flotilla Asignada",
      render: (u: UnidadItem) => (
        <span className="text-xs font-medium text-slate-700">
          {u.flotillaNombre || (u.flotillaId ? items.find((f) => f.id === u.flotillaId)?.nombre : "Unidades Generales")}
        </span>
      ),
    },
    {
      key: "estado",
      label: "Estado Operativo",
      render: (u: UnidadItem) => {
        const est = (u.estado || "Disponible").toLowerCase();
        const badgeClass =
          est === "disponible"
            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
            : est === "asignada"
            ? "bg-rose-50 text-rose-800 border-rose-300"
            : est === "mantenimiento"
            ? "bg-amber-50 text-amber-800 border-amber-300"
            : "bg-red-50 text-red-800 border-red-300";
        return (
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeClass}`}>
            {u.estado}
          </span>
        );
      },
    },
  ];

  const actionsUnidades: ActionDef<UnidadItem>[] = [
    ...(puedeEditarUnidad
      ? [
          {
            label: "Editar Unidad",
            icon: <Pencil size={14} />,
            onClick: (u: UnidadItem) => {
              setUnidadEditando(u);
              setModalUnidadAbierto(true);
            },
          },
        ]
      : []),
    ...(puedeEliminarUnidad
      ? [
          {
            label: "Desactivar Unidad",
            icon: <Trash2 size={14} />,
            className: "text-red-600 hover:bg-red-50 font-bold",
            visible: (u: UnidadItem) => u.activo,
            onClick: (u: UnidadItem) => {
              setUnidadConfirmando(u);
              setConfirmInputUnidad("");
            },
          },
        ]
      : []),
  ];

  return (
    <div className="cc-page">
      <div className="cc-header">
        <div className="cc-title-group">
          <h1 className="cc-title">
            {tabPrincipal === "flotillas" ? "Flotillas" : "Unidades"}
          </h1>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {tabPrincipal === "flotillas" && puedeCrear && (
            <button
              id="btn-agregar-flotilla"
              className="cc-btn-add"
              onClick={abrirAgregar}
            >
              <Plus size={17} strokeWidth={2.5} />
              <span>Nueva flotilla</span>
            </button>
          )}

          {tabPrincipal === "unidades" && puedeCrearUnidad && (
            <button
              id="btn-agregar-unidad"
              className="cc-btn-add"
              onClick={() => {
                setUnidadEditando(null);
                setModalUnidadAbierto(true);
              }}
              title="Registrar una nueva unidad vehicular"
            >
              <Plus size={17} strokeWidth={2.5} />
              <span>Nueva Unidad</span>
            </button>
          )}
        </div>
      </div>

      {/* Pestañas principales */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-4">
        <button
          type="button"
          onClick={() => setTabPrincipal("flotillas")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            tabPrincipal === "flotillas"
              ? "border-[#0B2D4A] text-[#0B2D4A] bg-slate-50 rounded-t-lg shadow-2xs"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Truck size={15} />
          <span>Flotillas</span>
        </button>
        <button
          type="button"
          onClick={() => setTabPrincipal("unidades")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            tabPrincipal === "unidades"
              ? "border-[#0B2D4A] text-[#0B2D4A] bg-slate-50 rounded-t-lg shadow-2xs"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers size={15} />
          <span>Unidades</span>
        </button>
      </div>

      {tabPrincipal === "flotillas" ? (
        <>
          <TablaGenerica<Flotilla>
            data={paginated}
            columns={columns}
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={handleSort}
            filters={filters as unknown as Record<string, string>}
            filterDefs={filterDefs}
            onFilterChange={onFilterChange}
            actions={actions}
            idAccessor={(f) => f.id}
            busquedaGlobal={busquedaGlobal}
            onBusquedaGlobalChange={(val) => {
              setBusquedaGlobal(val);
              setPage(0);
            }}
            onLimpiarFiltros={() => {
              setFilters({
                ...FILTERS_VACIO,
                sucursalId: (!puedeFiltrarTodasSucursales && sucursalUsuarioId) ? String(sucursalUsuarioId) : "",
              });
              setBusquedaGlobal("");
              setPage(0);
            }}
            placeholderGlobal="Buscar flotillas por nombre, código o sucursal..."
          />

          <div className="cc-footer-bar">
            <button
              id="btn-exportar-flotillas"
              className="cc-btn-excel"
              onClick={() => exportarExcel(sorted)}
              title="Exportar a Excel"
            >
              <FileSpreadsheet size={16} />
              <span>Excel</span>
            </button>
            <div className="cc-pagesize-wrap">
              <label htmlFor="sel-ps-flot" className="cc-pagesize-label">
                Mostrar
              </label>
              <select
                id="sel-ps-flot"
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
        </>
      ) : (
        <>
          <TablaGenerica<UnidadItem>
            data={unidadesPaginadas}
            columns={columnsUnidades}
            sortCol={sortColUnidades}
            sortDir={sortDirUnidades}
            onSort={handleSortUnidades}
            filters={filtersUnidades}
            filterDefs={filterDefsUnidades}
            onFilterChange={onFilterChangeUnidades}
            pildorasRapidas={{
              key: "disponibilidad",
              opciones: [
                { valor: "", etiqueta: "Todos" },
                {
                  valor: "disponible",
                  etiqueta: "Disponibles",
                  dotColor: "bg-emerald-500",
                  activeClass: "bg-emerald-600 text-white shadow-xs font-bold",
                },
                {
                  valor: "asignada",
                  etiqueta: "Asignadas",
                  dotColor: "bg-amber-500",
                  activeClass: "bg-amber-600 text-white shadow-xs font-bold",
                },
                {
                  valor: "no_disponible",
                  etiqueta: "No disponibles",
                  dotColor: "bg-rose-500",
                  activeClass: "bg-rose-600 text-white shadow-xs font-bold",
                },
              ],
            }}
            actions={actionsUnidades}
            idAccessor={(u) => u.id}
            busquedaGlobal={busquedaUnidades}
            onBusquedaGlobalChange={(val) => {
              setBusquedaUnidades(val);
              setPageUnidades(0);
            }}
            onLimpiarFiltros={() => {
              setBusquedaUnidades("");
              setFiltersUnidades({ disponibilidad: "", estado: "", flotillaId: "" });
              setPageUnidades(0);
            }}
            placeholderGlobal="Buscar unidades por placas, marca, modelo, tipo o flotilla..."
          />

          <div className="cc-footer-bar">
            <div className="cc-pagesize-wrap">
              <label htmlFor="sel-ps-uni" className="cc-pagesize-label">
                Mostrar
              </label>
              <select
                id="sel-ps-uni"
                className="cc-pagesize-select"
                value={pageSizeUnidades}
                onChange={(e) => {
                  setPageSizeUnidades(Number(e.target.value));
                  setPageUnidades(0);
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
                onClick={() => setPageUnidades((p) => Math.max(0, p - 1))}
                disabled={pageUnidades === 0}
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPagesUnidades }, (_, i) => (
                <button
                  key={i}
                  className={`cc-btn-page${pageUnidades === i ? " cc-btn-page--active" : ""}`}
                  onClick={() => setPageUnidades(i)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="cc-btn-page"
                onClick={() => setPageUnidades((p) => Math.min(totalPagesUnidades - 1, p + 1))}
                disabled={pageUnidades >= totalPagesUnidades - 1}
              >
                <ChevronRight size={15} />
              </button>
              <span className="cc-pagination-info">
                {unidadesOrdenadas.length === 0
                  ? "0-0"
                  : `${pageUnidades * pageSizeUnidades + 1}-${Math.min((pageUnidades + 1) * pageSizeUnidades, unidadesOrdenadas.length)}`}{" "}
                de {unidadesOrdenadas.length}
              </span>
            </div>
          </div>
        </>
      )}

      <FlotillaModalForm
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={guardar}
        onChange={onChange}
        form={form}
        editando={editando}
        guardando={guardando}
        sucursales={sucursales}
        jefes={jefesParaForm}
        sucursalFijaId={sucursalUsuarioId}
      />

      <FlotillaModalDelete
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

      <FlotillaModalResumen
        abierto={Boolean(flotillaResumen)}
        flotilla={flotillaResumen}
        onClose={() => setFlotillaResumen(null)}
      />

      <FlotillaModalAsignarEnvios
        abierto={Boolean(flotillaAsignarEnvios)}
        flotilla={flotillaAsignarEnvios}
        onClose={() => setFlotillaAsignarEnvios(null)}
        onSuccess={() => {
          void cargarDatos();
        }}
      />

      <UnidadModalForm
        abierto={modalUnidadAbierto}
        unidadEditar={unidadEditando}
        flotillasDisponibles={items.map((f) => ({ id: f.id, nombre: f.nombre }))}
        onClose={() => {
          setModalUnidadAbierto(false);
          setUnidadEditando(null);
        }}
        onSuccess={() => {
          void cargarDatos();
        }}
      />

      <UnidadModalDelete
        confirmando={unidadConfirmando}
        onClose={() => {
          setUnidadConfirmando(null);
          setConfirmInputUnidad("");
        }}
        onConfirm={eliminarUnidad}
        confirmInput={confirmInputUnidad}
        setConfirmInput={setConfirmInputUnidad}
        eliminando={eliminandoUnidad}
      />
    </div>
  );
}
