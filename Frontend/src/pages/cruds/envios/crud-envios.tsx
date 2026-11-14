import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Store,
  CalendarClock,
  RotateCcw,
  Ban,
  X,
} from "lucide-react";
import { getSession, hasRequiredRole } from "../../../utils/auth";
import "../estilos/cruds.css";
import { useToast } from "../../../components/Toast";
import { envioService, extraerMensajeErrorApi } from "../../../services/envioService";
import {
  TablaGenerica,
  type ColumnDef,
  type FilterDef,
  type ActionDef,
} from "../../../components/TablaGenerica";
import {
  type EnvioListadoItem,
  type EnvioFilters,
  type ModoModalEstadoEspecial,
  type ModoModalRecepcion,
  type ModoModalRuta,
  type SortCol,
  type SortDir,
  type SucursalOperativaItem,
  ENVIO_FILTERS_VACIO,
  LISTA_ESTADOS_ENVIO,
  OPCIONES_PAGINA,
  formatearFechaCorta,
  formatearFechaHora,
  obtenerMetaEstadoEnvio,
  usuarioTienePermisoEnvio,
} from "./types";
import { EnvioModalDetalle } from "./EnvioModalDetalle";
import { EnvioModalCrear } from "./EnvioModalCrear";
import { EnvioModalRecepcion } from "./EnvioModalRecepcion";
import { EnvioModalAsignarRuta } from "./EnvioModalAsignarRuta";
import { EnvioModalValidarEntrega } from "./EnvioModalValidarEntrega";
import { EnvioModalEstadoEspecial } from "./EnvioModalEstadoEspecial";

function exportarEnviosExcel(datos: EnvioListadoItem[]) {
  const cols = [
    "Guía",
    "Estado",
    "Modalidad",
    "Remitente",
    "Teléfono Remitente",
    "Destinatario",
    "Teléfono Destinatario",
    "Destino (Ciudad / Estado)",
    "Código Postal",
    "Sucursal Origen",
    "Sucursal Destino",
    "Flotilla Asignada",
    "Operador (Chofer)",
    "Placas Unidad",
    "Peso (kg)",
    "Dimensiones (cm)",
    "Descripción",
    "Intentos Reparto",
    "Fecha Documentación",
    "Entrega Estimada",
  ];

  const rows = datos.map((e) => {
    const meta = obtenerMetaEstadoEnvio(e.estado);
    return [
      e.guia,
      meta.etiqueta,
      "Recepción en sucursal",
      e.remitenteNombre,
      e.remitenteTelefono ?? "",
      e.destinatarioNombre,
      e.destinatarioTelefono,
      e.destinoCiudadResumen ?? "",
      e.destinoCodigoPostal ?? "",
      e.sucursalRecepcionNombre ?? "",
      e.sucursalDestinoNombre ?? "",
      e.flotillaAsignadaNombre ?? "",
      e.choferAsignadoNombre ?? "",
      e.unidadAsignadaPlacas ?? "",
      Number(e.pesoKg).toFixed(2),
      `${e.largoCm}x${e.anchoCm}x${e.altoCm}`,
      e.descripcion,
      String(e.intentoReparto),
      formatearFechaHora(e.fechaCreacion),
      formatearFechaHora(e.fechaEntregaEstimada),
    ];
  });

  const csv = [cols, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "envios_transportes_rojas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CrudEnvios() {
  const { toast } = useToast();
  const session = useMemo(() => getSession(), []);
  const sucursalUsuario = session.user?.sucursal;
  const puedeFiltrarTodasSucursales = hasRequiredRole(session.roles, [
    "Jefe",
    "RH",
  ]);

  const [items, setItems] = useState<EnvioListadoItem[]>([]);
  const [sucursales, setSucursales] = useState<SucursalOperativaItem[]>([]);
  const [cargando, setCargando] = useState(false);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<EnvioFilters>(() => ({
    ...ENVIO_FILTERS_VACIO,
    sucursal: (!puedeFiltrarTodasSucursales && sucursalUsuario) ? sucursalUsuario : "",
  }));
  const [categoriaKpi, setCategoriaKpi] = useState<
    "todas" | "pendiente" | "transito" | "entregado" | "incidencia"
  >("todas");
  const [busquedaGlobal, setBusquedaGlobal] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("fechaCreacion");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [envioDetalle, setEnvioDetalle] = useState<EnvioListadoItem | null>(null);
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);

  // Modales operativos
  const [modalRecepcion, setModalRecepcion] = useState<{
    envio: EnvioListadoItem;
    modo: ModoModalRecepcion;
  } | null>(null);
  const [modalRuta, setModalRuta] = useState<{
    envio: EnvioListadoItem | null;
    modo: ModoModalRuta;
  } | null>(null);
  const [envioValidarEntrega, setEnvioValidarEntrega] = useState<EnvioListadoItem | null>(
    null
  );
  const [modalEstadoEspecial, setModalEstadoEspecial] = useState<{
    envio: EnvioListadoItem;
    modo: ModoModalEstadoEspecial;
  } | null>(null);

  const permisosOperativos = useMemo(
    () => ({
      registrar: usuarioTienePermisoEnvio("envio.registrar", [
        "Personal administrativo",
        "Jefe",
      ]),
      recepcionSucursal: usuarioTienePermisoEnvio("envio.recepcion_sucursal", [
        "Personal de sucursal",
      ]),
      reprogramar: usuarioTienePermisoEnvio("envio.reprogramar", [
        "Personal administrativo",
        "Jefe",
      ]),
      devolucionRegistrar: usuarioTienePermisoEnvio("envio.devolucion_registrar", [
        "Personal de sucursal",
      ]),
      devolucionConfirmar: usuarioTienePermisoEnvio("envio.devolucion_confirmar", [
        "Personal de sucursal",
      ]),
      cancelar: usuarioTienePermisoEnvio("envio.cancelar", [
        "Personal administrativo",
        "Jefe",
      ]),
    }),
    []
  );

  const puedeRegistrarEnvio = permisosOperativos.registrar;

  const cargarDatos = useCallback(
    async (silencioso = false) => {
      try {
        setCargando(true);
        const [listaEnvios, listaSucursales] = await Promise.all([
          envioService.listar({ take: 500 }),
          envioService.obtenerSucursalesOperativas().catch(() => []),
        ]);
        setItems(listaEnvios || []);
        setSucursales(listaSucursales || []);
        if (silencioso) {
          toast.info("Bandeja de envíos actualizada.");
        }
      } catch (error) {
        toast.error(extraerMensajeErrorApi(error, "Error al consultar la bandeja de envíos."));
      } finally {
        setCargando(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    cargarDatos(false);
  }, [cargarDatos]);

  useEffect(() => {
    if (!puedeFiltrarTodasSucursales && sucursalUsuario && sucursales.length > 0) {
      const norm = sucursalUsuario.trim().toLowerCase();
      const match = sucursales.find(
        (s) =>
          (s.nombre && s.nombre.toLowerCase().includes(norm)) ||
          (s.nombreCorto && norm.includes(s.nombreCorto.toLowerCase()))
      );
      if (match) {
        const nombreExacto = match.nombreCorto || match.nombre;
        setFilters((prev) => ({ ...prev, sucursal: nombreExacto }));
      }
    }
  }, [puedeFiltrarTodasSucursales, sucursalUsuario, sucursales]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEnvioDetalle(null);
        setModalRecepcion(null);
        setModalRuta(null);
        setEnvioValidarEntrega(null);
        setModalEstadoEspecial(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Filtro por sucursal asignada o seleccionada
  const itemsFiltradosSucursal = useMemo(() => {
    return items.filter((e) => {
      if (filters.estado && e.estado !== filters.estado) {
        return false;
      }

      if (filters.sucursal) {
        const sucNom = filters.sucursal.toLowerCase().trim();
        const sucEncontrada = sucursales.find(
          (s) =>
            (s.nombre && s.nombre.toLowerCase().trim() === sucNom) ||
            (s.nombreCorto && s.nombreCorto.toLowerCase().trim() === sucNom) ||
            (s.nombre && s.nombre.toLowerCase().includes(sucNom)) ||
            (s.nombreCorto && sucNom.includes(s.nombreCorto.toLowerCase()))
        );
        const sucId = sucEncontrada ? sucEncontrada.id : null;

        const coincideId =
          sucId !== null &&
          (e.sucursalRecepcionId === sucId || e.sucursalDestinoId === sucId);
        const coincideOrigen = (e.sucursalRecepcionNombre || "").toLowerCase().includes(sucNom);
        const coincideDestino = (e.sucursalDestinoNombre || "").toLowerCase().includes(sucNom);
        if (!coincideId && !coincideOrigen && !coincideDestino) return false;
      }

      return true;
    });
  }, [items, filters.estado, filters.modalidad, filters.sucursal, sucursales]);

  // Indicadores rápidos
  const metricas = useMemo(() => {
    let pendientes = 0;
    let transito = 0;
    let entregados = 0;
    let incidencias = 0;

    for (const item of itemsFiltradosSucursal) {
      const cat = obtenerMetaEstadoEnvio(item.estado).categoria;
      if (cat === "pendiente") pendientes++;
      else if (cat === "transito") transito++;
      else if (cat === "entregado") entregados++;
      else incidencias++;
    }

    return {
      total: itemsFiltradosSucursal.length,
      pendientes,
      transito,
      entregados,
      incidencias,
    };
  }, [itemsFiltradosSucursal]);

  const filtered = useMemo(() => {
    return itemsFiltradosSucursal.filter((e) => {
      const meta = obtenerMetaEstadoEnvio(e.estado);

      if (categoriaKpi !== "todas" && meta.categoria !== categoriaKpi) {
        return false;
      }

      if (busquedaGlobal.trim()) {
        const q = busquedaGlobal.trim().toLowerCase();
        const coincide = [
          e.guia,
          meta.etiqueta,
          e.remitenteNombre,
          e.remitenteTelefono,
          e.destinatarioNombre,
          e.destinatarioTelefono,
          e.destinoCiudadResumen,
          e.destinoCodigoPostal,
          e.sucursalRecepcionNombre,
          e.sucursalDestinoNombre,
          e.flotillaAsignadaNombre,
          e.choferAsignadoNombre,
          e.unidadAsignadaPlacas,
          e.descripcion,
        ].some((val) => String(val ?? "").toLowerCase().includes(q));

        if (!coincide) return false;
      }

      return true;
    });
  }, [itemsFiltradosSucursal, categoriaKpi, busquedaGlobal]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (!sortCol) return 0;
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av == null) return 1;
      if (bv == null) return -1;
      return (sortDir === "asc" ? 1 : -1) * (av < bv ? -1 : av > bv ? 1 : 0);
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice(page * pageSize, page * pageSize + pageSize);

  const onFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      if (!puedeFiltrarTodasSucursales && name === "sucursal") return;
      setFilters((prev) => ({ ...prev, [name]: value }));
      setPage(0);
    },
    [puedeFiltrarTodasSucursales]
  );

  const handleSort = useCallback(
    (col: string) => {
      const c = col as keyof EnvioListadoItem;
      setSortDir((prev) => (sortCol === c ? (prev === "asc" ? "desc" : "asc") : "asc"));
      setSortCol(c);
      setPage(0);
    },
    [sortCol]
  );

  const opcionesSucursales = useMemo(() => {
    const nombres = new Set<string>();
    sucursales.forEach((s) => {
      const n = (s.nombreCorto || s.nombre || "").trim();
      if (n) nombres.add(n);
    });
    items.forEach((e) => {
      if (e.sucursalRecepcionNombre) nombres.add(e.sucursalRecepcionNombre);
      if (e.sucursalDestinoNombre) nombres.add(e.sucursalDestinoNombre);
    });
    return Array.from(nombres).sort((a, b) => a.localeCompare(b));
  }, [sucursales, items]);

  const columns: ColumnDef<EnvioListadoItem>[] = [
    {
      key: "guia",
      label: "Guía",
      render: (e) => (
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={() => setEnvioDetalle(e)}
            className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#0B2D4A] text-[#0B2D4A] hover:text-white border border-slate-200 hover:border-[#0B2D4A] transition-colors cursor-pointer tracking-wide"
            title="Ver expediente y línea de tiempo"
          >
            {e.guia}
          </button>
          <span className="text-[10.5px] font-semibold text-slate-500">
            {formatearFechaCorta(e.fechaCreacion)}
          </span>
        </div>
      ),
    },
    {
      key: "remitenteNombre",
      label: "Remitente",
      render: (e) => (
        <div className="flex flex-col max-w-[165px]">
          <span
            className="font-semibold text-slate-800 text-xs truncate"
            title={e.remitenteNombre}
          >
            {e.remitenteNombre}
          </span>
          {e.remitenteTelefono && (
            <span className="font-mono text-[11px] text-slate-500">{e.remitenteTelefono}</span>
          )}
        </div>
      ),
    },
    {
      key: "destinatarioNombre",
      label: "Destinatario / Destino",
      render: (e) => (
        <div className="flex flex-col max-w-[185px]">
          <span
            className="font-semibold text-slate-800 text-xs truncate"
            title={e.destinatarioNombre}
          >
            {e.destinatarioNombre}
          </span>
          <span
            className="text-[11px] text-slate-500 truncate"
            title={`${e.destinoCiudadResumen || "Destino nacional"}${e.destinoCodigoPostal ? ` · C.P. ${e.destinoCodigoPostal}` : ""
              }`}
          >
            {e.destinoCiudadResumen || "Destino nacional"}
            {e.destinoCodigoPostal ? ` · C.P. ${e.destinoCodigoPostal}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "sucursalDestinoNombre",
      label: "Ruta Operativa",
      render: (e) => (
        <div className="flex flex-col gap-0.5 text-xs max-w-[215px]">
          <div
            className="flex items-center gap-1 text-slate-700 font-medium truncate"
            title={`${e.sucursalRecepcionNombre || "Origen"} → ${e.sucursalDestinoNombre || "Cobertura"
              }`}
          >
            <span className="truncate">{e.sucursalRecepcionNombre || "Origen"}</span>
            <ArrowRight className="w-3 h-3 text-[#D64545] shrink-0" />
            <span className="truncate">{e.sucursalDestinoNombre || "Cobertura"}</span>
          </div>
          {e.flotillaAsignadaNombre ? (
            <span className="text-[11px] text-[#0B2D4A] font-semibold truncate">
              {e.flotillaAsignadaNombre}
              {e.unidadAsignadaPlacas ? ` · ${e.unidadAsignadaPlacas}` : ""}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 italic">Sin flotilla asignada</span>
          )}
        </div>
      ),
    },
    {
      key: "pesoKg",
      label: "Paquete / Entrega Est.",
      render: (e) => (
        <div className="flex flex-col max-w-[175px]">
          <span className="font-bold text-slate-800 text-xs">
            {Number(e.pesoKg).toFixed(2)} kg{" "}
            <span className="font-normal text-slate-500 text-[11px]">
              ({e.largoCm}×{e.anchoCm}×{e.altoCm} cm)
            </span>
          </span>
          <span className="text-[11px] text-slate-500 truncate" title={e.descripcion}>
            {e.fechaEntregaEstimada
              ? `Est: ${formatearFechaCorta(e.fechaEntregaEstimada)} · `
              : ""}
            {e.descripcion}
          </span>
        </div>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      render: (e) => {
        const meta = obtenerMetaEstadoEnvio(e.estado);
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
            {meta.etiqueta}
          </span>
        );
      },
    },
  ];

  const filterDefs: FilterDef[] = [
    {
      key: "estado",
      label: "Estado del envío",
      type: "select",
      options: [
        { value: "", label: "Todos los estados" },
        ...LISTA_ESTADOS_ENVIO.map((m) => ({
          value: m.codigo,
          label: m.etiqueta,
        })),
      ],
    },
    {
      key: "sucursal",
      label: puedeFiltrarTodasSucursales ? "Sucursal involucrada" : "Sucursal asignada",
      type: "select",
      options: puedeFiltrarTodasSucursales
        ? [
          { value: "", label: "Todas las sucursales" },
          ...opcionesSucursales.map((nombre) => ({
            value: nombre,
            label: nombre,
          })),
        ]
        : [
          {
            value: filters.sucursal || sucursalUsuario || "",
            label: filters.sucursal || sucursalUsuario || "Sucursal asignada",
          },
        ],
    },
  ];

  const actions: ActionDef<EnvioListadoItem>[] = [
    {
      label: "Ver expediente y rastreo",
      icon: <Eye size={14} />,
      className: "text-[#0B2D4A] hover:bg-blue-50 font-bold",
      onClick: (envio) => setEnvioDetalle(envio),
    },
    {
      label: "Recibir en sucursal (pesaje)",
      icon: <Store size={14} />,
      className: "text-[#0B2D4A] hover:bg-blue-50",
      visible: (e) =>
        permisosOperativos.recepcionSucursal &&
        ["registrado"].includes(String(e.estado)),
      onClick: (envio) => setModalRecepcion({ envio, modo: "sucursal" }),
    },
    {
      label: "Reprogramar entrega",
      icon: <CalendarClock size={14} />,
      className: "text-amber-800 hover:bg-amber-50",
      visible: (e) =>
        permisosOperativos.reprogramar &&
        !["entregado", "cancelado", "en_devolucion", "devuelto"].includes(String(e.estado)),
      onClick: (envio) => setModalEstadoEspecial({ envio, modo: "reprogramar" }),
    },
    {
      label: "Iniciar devolución",
      icon: <RotateCcw size={14} />,
      className: "text-rose-800 hover:bg-rose-50",
      visible: (e) =>
        permisosOperativos.devolucionRegistrar &&
        [
          "en_ruta",
          "no_entregado",
          "reprogramado",
          "recibido_sucursal",
          "asignado_flotilla",
        ].includes(String(e.estado)),
      onClick: (envio) => setModalEstadoEspecial({ envio, modo: "devolucion" }),
    },
    {
      label: "Confirmar devolución",
      icon: <CheckCircle2 size={14} />,
      className: "text-[#16A34A] hover:bg-emerald-50 font-bold",
      visible: (e) =>
        permisosOperativos.devolucionConfirmar && e.estado === "en_devolucion",
      onClick: (envio) => setModalEstadoEspecial({ envio, modo: "confirmar_devolucion" }),
    },
    {
      label: "Cancelar envío",
      icon: <Ban size={14} />,
      className: "text-[#D64545] hover:bg-red-50",
      visible: (e) =>
        permisosOperativos.cancelar &&
        !["entregado", "cancelado", "en_devolucion", "devuelto"].includes(String(e.estado)),
      onClick: (envio) => setModalEstadoEspecial({ envio, modo: "cancelar" }),
    },
  ];

  const alternarKpi = (
    cat: "todas" | "pendiente" | "transito" | "entregado" | "incidencia"
  ) => {
    setCategoriaKpi((prev) => (prev === cat ? "todas" : cat));
    setPage(0);
  };

  return (
    <div className="cc-page">
      <div className="cc-header">
        <div className="cc-title-group flex items-center gap-3">
          <h1 className="cc-title">Envíos</h1>
          {filters.sucursal && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#0B2D4A]">
              <Store className="w-3.5 h-3.5 text-[#0B2D4A]" />
              <span>Sucursal: <strong>{filters.sucursal}</strong></span>
              {puedeFiltrarTodasSucursales && (
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, sucursal: "" }))}
                  className="ml-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  title="Ver todas las sucursales"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            id="btn-refrescar-envios"
            onClick={() => cargarDatos(true)}
            disabled={cargando}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-[#0B2D4A] hover:bg-slate-50 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
            title="Actualizar bandeja de envíos"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          {puedeRegistrarEnvio && (
            <button
              type="button"
              id="btn-agregar-envio"
              className="cc-btn-add"
              onClick={() => setModalCrearAbierto(true)}
            >
              <Plus size={17} strokeWidth={2.5} />
              <span>Nuevo envío</span>
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de estado */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto mb-6 bg-white p-2 rounded-2xl shadow-2xs">
        <button
          type="button"
          onClick={() => alternarKpi("todas")}
          className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            categoriaKpi === "todas"
              ? "border-[#0B2D4A] text-[#0B2D4A] bg-blue-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <Package className="w-4 h-4 text-[#0B2D4A]" />
          <span>Todos los envíos</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold ${
              categoriaKpi === "todas"
                ? "bg-[#0B2D4A] text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {metricas.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => alternarKpi("pendiente")}
          className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            categoriaKpi === "pendiente"
              ? "border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <Clock className="w-4 h-4 text-amber-600" />
          <span>1. Recepción en Sucursal</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold ${
              categoriaKpi === "pendiente"
                ? "bg-amber-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {metricas.pendientes}
          </span>
        </button>

        <button
          type="button"
          onClick={() => alternarKpi("transito")}
          className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            categoriaKpi === "transito"
              ? "border-[#2563EB] text-[#2563EB] bg-blue-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <Truck className="w-4 h-4 text-[#2563EB]" />
          <span>2. En Ruta / Flotilla</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold ${
              categoriaKpi === "transito"
                ? "bg-[#2563EB] text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {metricas.transito}
          </span>
        </button>

        <button
          type="button"
          onClick={() => alternarKpi("entregado")}
          className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            categoriaKpi === "entregado"
              ? "border-[#16A34A] text-[#16A34A] bg-emerald-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          <span>3. Entregados</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold ${
              categoriaKpi === "entregado"
                ? "bg-[#16A34A] text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {metricas.entregados}
          </span>
        </button>

        <button
          type="button"
          onClick={() => alternarKpi("incidencia")}
          className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            categoriaKpi === "incidencia"
              ? "border-[#D64545] text-[#D64545] bg-red-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-[#D64545]" />
          <span>4. Incidencias / Devolución</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold ${
              categoriaKpi === "incidencia"
                ? "bg-[#D64545] text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {metricas.incidencias}
          </span>
        </button>
      </div>

      {/* Listado de envíos */}
      <TablaGenerica<EnvioListadoItem>
        data={paginated}
        columns={columns}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        filters={filters as unknown as Record<string, string>}
        filterDefs={filterDefs}
        onFilterChange={onFilterChange}
        actions={actions}
        idAccessor={(e) => e.guia}
        busquedaGlobal={busquedaGlobal}
        onBusquedaGlobalChange={(val) => {
          setBusquedaGlobal(val);
          setPage(0);
        }}
        onLimpiarFiltros={() => {
          setFilters({
            ...ENVIO_FILTERS_VACIO,
            sucursal: (!puedeFiltrarTodasSucursales && sucursalUsuario) ? (filters.sucursal || sucursalUsuario) : "",
          });
          setCategoriaKpi("todas");
          setBusquedaGlobal("");
          setPage(0);
        }}
        placeholderGlobal="Buscar por número de guía (TR-...), remitente, destinatario, ciudad o C.P..."
      />

      <div className="cc-footer-bar">
        <button
          type="button"
          id="btn-exportar-envios"
          className="cc-btn-excel"
          onClick={() => exportarEnviosExcel(sorted)}
          title="Exportar envíos filtrados a Excel (CSV)"
        >
          <FileSpreadsheet size={16} />
          <span>Excel</span>
        </button>

        <div className="cc-pagesize-wrap">
          <label htmlFor="sel-ps-envios" className="cc-pagesize-label">
            Mostrar
          </label>
          <select
            id="sel-ps-envios"
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
            type="button"
            className="cc-btn-page"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              type="button"
              key={i}
              className={`cc-btn-page${page === i ? " cc-btn-page--active" : ""}`}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
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

      {/* Modales */}
      <EnvioModalDetalle
        abierto={Boolean(envioDetalle)}
        envioBase={envioDetalle}
        onClose={() => setEnvioDetalle(null)}
      />

      <EnvioModalCrear
        abierto={modalCrearAbierto}
        sucursalesIniciales={sucursales}
        onClose={() => setModalCrearAbierto(false)}
        onCreated={() => {
          void cargarDatos(false);
        }}
      />

      <EnvioModalRecepcion
        abierto={Boolean(modalRecepcion)}
        modo={modalRecepcion?.modo ?? "sucursal"}
        envio={modalRecepcion?.envio ?? null}
        sucursales={sucursales}
        onClose={() => setModalRecepcion(null)}
        onSuccess={() => {
          void cargarDatos(false);
        }}
      />

      <EnvioModalAsignarRuta
        abierto={Boolean(modalRuta)}
        modo={modalRuta?.modo ?? "asignar"}
        envio={modalRuta?.envio ?? null}
        enviosDisponibles={items}
        onClose={() => setModalRuta(null)}
        onSuccess={() => {
          void cargarDatos(false);
        }}
      />

      <EnvioModalValidarEntrega
        abierto={Boolean(envioValidarEntrega)}
        envio={envioValidarEntrega}
        onClose={() => setEnvioValidarEntrega(null)}
        onSuccess={() => {
          void cargarDatos(false);
        }}
      />

      <EnvioModalEstadoEspecial
        abierto={Boolean(modalEstadoEspecial)}
        modo={modalEstadoEspecial?.modo ?? "reprogramar"}
        envio={modalEstadoEspecial?.envio ?? null}
        sucursales={sucursales}
        onClose={() => setModalEstadoEspecial(null)}
        onSuccess={() => {
          void cargarDatos(false);
        }}
      />
    </div>
  );
}

