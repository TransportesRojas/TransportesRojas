import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  RefreshCw,
  Navigation,
  Truck,
  User,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  Eye,
  Compass,
  Fuel,
  ChevronLeft,
  ChevronRight,
  History,
  X,
  Gauge,
} from "lucide-react";
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
  type ModoModalRuta,
  OPCIONES_PAGINA,
  formatearFechaCorta,
  usuarioTienePermisoEnvio,
  obtenerMetaEstadoEnvio,
} from "../envios/types";
import {
  EnvioModalAsignarRuta,
  optimizarSecuenciaEnvios,
  calcularItinerarioCompleto,
} from "../envios/EnvioModalAsignarRuta";
import { EnvioModalValidarEntrega } from "../envios/EnvioModalValidarEntrega";
import { EnvioModalDetalle } from "../envios/EnvioModalDetalle";
import { EnvioModalCierreOdometroDia } from "../envios/EnvioModalCierreOdometroDia";
import { MapaRutaInteractivo } from "./MapaRutaInteractivo";
import { RutaModalHistorialCambios } from "./RutaModalHistorialCambios";
import { getSession, hasRequiredRole } from "../../../utils/auth";

type TabSeccionRutas = "pendientes" | "planeadas" | "transito" | "concluidas";

interface RutaOperativaAgrupada {
  rutaId?: number;
  claveRuta: string;
  folioRuta: string;
  choferNombre: string;
  unidadPlacas: string;
  sucursalOrigen: string;
  fechaProgramada: string;
  estadoGeneral: "planeada" | "en_ruta" | "completada";
  envios: EnvioListadoItem[];
  distanciaTotalKm: number;
  tiempoTotalMin: number;
  combustibleTotalLitros: number;
  corredorPrincipal: string;
  pesoTotalKg: number;
}

export default function CrudRutas() {
  const { toast } = useToast();
  const [items, setItems] = useState<EnvioListadoItem[]>([]);
  const [cargando, setCargando] = useState(false);

  const session = useMemo(() => getSession(), []);
  const sucursalUsuario = session.user?.sucursal;
  const puedeFiltrarTodasSucursales = hasRequiredRole(session.roles, ["Jefe", "RH"]);

  const [tabActiva, setTabActiva] = useState<TabSeccionRutas>("planeadas");

  const [filters, setFilters] = useState<{ sucursal: string }>(() => ({
    sucursal: (!puedeFiltrarTodasSucursales && sucursalUsuario) ? sucursalUsuario : "",
  }));
  const [busquedaGlobal, setBusquedaGlobal] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [claveRutaSeleccionadaMapa, setClaveRutaSeleccionadaMapa] = useState<string>("");
  const [mostrarMapaManual, setMostrarMapaManual] = useState<boolean>(false);

  // Modales operativos
  const [modalRuta, setModalRuta] = useState<{
    envio: EnvioListadoItem | null;
    modo: ModoModalRuta;
  } | null>(null);
  const [envioValidarEntrega, setEnvioValidarEntrega] =
    useState<EnvioListadoItem | null>(null);
  const [envioDetalle, setEnvioDetalle] = useState<EnvioListadoItem | null>(null);
  const [modalHistorialCambiosAbierto, setModalHistorialCambiosAbierto] = useState(false);
  const [rutaIdFiltroHistorial, setRutaIdFiltroHistorial] = useState<number | null>(null);
  const [modalCierreOdometroAbierto, setModalCierreOdometroAbierto] = useState(false);

  const permisos = useMemo(
    () => ({
      planificarRuta:
        usuarioTienePermisoEnvio("ruta.planificar", [
          "Jefe de flotilla",
          "Jefe",
        ]) ||
        usuarioTienePermisoEnvio("ruta.asignar_recursos", [
          "Jefe de flotilla",
          "Jefe",
        ]),
      iniciarRuta: usuarioTienePermisoEnvio("ruta.iniciar_recorrido", [
        "Chofer",
      ]),
      validarEntrega: usuarioTienePermisoEnvio("envio.validar_entrega", [
        "Chofer",
      ]),
    }),
    []
  );

  const cargarDatos = useCallback(
    async (silencioso = false) => {
      try {
        setCargando(true);
        const listaEnvios = await envioService.listar({ take: 500 });
        setItems(listaEnvios || []);
        if (silencioso) {
          toast.info("Rutas y asignaciones actualizadas.");
        }
      } catch (error) {
        toast.error(
          extraerMensajeErrorApi(error, "Error al consultar las rutas de entrega.")
        );
      } finally {
        setCargando(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    void cargarDatos(false);
  }, [cargarDatos]);

  // Agrupación de envíos en rutas
  const rutasAgrupadas = useMemo<RutaOperativaAgrupada[]>(() => {
    const conRuta = items.filter(
      (e) =>
        Boolean(e.choferAsignadoNombre) ||
        Boolean(e.unidadAsignadaPlacas) ||
        ["asignado_flotilla", "en_ruta", "entregado"].includes(String(e.estado))
    );

    const grupos = new Map<string, EnvioListadoItem[]>();

    for (const env of conRuta) {
      const chofer = env.choferAsignadoNombre?.trim() || "Chofer por confirmar";
      const placas = env.unidadAsignadaPlacas?.trim() || "Unidad por confirmar";
      const etapa = env.estado === "entregado" ? "HIST" : "ACTIVA";
      const clave = `${chofer}__${placas}__${etapa}`;
      const lista = grupos.get(clave) ?? [];
      lista.push(env);
      grupos.set(clave, lista);
    }

    const resultado: RutaOperativaAgrupada[] = [];
    let contador = 1;

    grupos.forEach((listaEnvios, clave) => {
      const ordenados = optimizarSecuenciaEnvios(listaEnvios);
      const itinerario = calcularItinerarioCompleto(ordenados, 8.5, false);
      const primero = ordenados[0];

      const tieneEnRuta = ordenados.some((e) => e.estado === "en_ruta");
      const todosEntregados =
        ordenados.length > 0 && ordenados.every((e) => e.estado === "entregado");

      const estadoGeneral: "planeada" | "en_ruta" | "completada" = tieneEnRuta
        ? "en_ruta"
        : todosEntregados
          ? "completada"
          : "planeada";

      const pesoTotalKg = Number(
        ordenados.reduce((acc, item) => acc + (Number(item.pesoKg) || 0), 0).toFixed(2)
      );

      const rutaIdDb = ordenados.find((e) => e.rutaAsignadaId && e.rutaAsignadaId > 0)?.rutaAsignadaId;

      resultado.push({
        rutaId: rutaIdDb ?? undefined,
        claveRuta: clave,
        folioRuta: rutaIdDb ? `RUTA-${String(rutaIdDb).padStart(4, "0")}` : `RUTA-${String(contador).padStart(3, "0")}`,
        choferNombre: primero.choferAsignadoNombre || "Chofer asignado",
        unidadPlacas: primero.unidadAsignadaPlacas || "Unidad asignada",
        sucursalOrigen:
          primero.sucursalRecepcionNombre || "Sucursal Matriz Culiacán Centro",
        fechaProgramada: formatearFechaCorta(
          primero.fechaEntregaEstimada || primero.fechaCreacion
        ),
        estadoGeneral,
        envios: ordenados,
        distanciaTotalKm: itinerario.distanciaTotalKm,
        tiempoTotalMin: itinerario.tiempoTotalMin,
        combustibleTotalLitros: itinerario.combustibleTotalLitros,
        corredorPrincipal: itinerario.corredorPrincipalResumen,
        pesoTotalKg,
      });
      contador++;
    });

    const pesoEstado = { en_ruta: 0, planeada: 1, completada: 2 };
    return resultado.sort(
      (a, b) => pesoEstado[a.estadoGeneral] - pesoEstado[b.estadoGeneral]
    );
  }, [items]);

  const enviosSinRutaPendientes = useMemo(
    () =>
      items.filter(
        (e) =>
          (e.estado === "asignado_flotilla" ||
            (e.estado === "reprogramado" && Boolean(e.flotillaAsignadaNombre))) &&
          (!e.rutaAsignadaId || e.rutaAsignadaId === 0)
      ),
    [items]
  );

  const metricas = useMemo(() => {
    const planeadas = rutasAgrupadas.filter((r) => r.estadoGeneral === "planeada").length;
    const enRecorrido = rutasAgrupadas.filter((r) => r.estadoGeneral === "en_ruta").length;
    const completadas = rutasAgrupadas.filter(
      (r) => r.estadoGeneral === "completada"
    ).length;

    return {
      totalRutas: rutasAgrupadas.length,
      planeadas,
      enRecorrido,
      completadas,
      pendientesSinRuta: enviosSinRutaPendientes.length,
    };
  }, [rutasAgrupadas, enviosSinRutaPendientes.length]);

  useEffect(() => {
    if (rutasAgrupadas.length === 0) {
      setClaveRutaSeleccionadaMapa("");
      return;
    }
    setClaveRutaSeleccionadaMapa((prev) => {
      if (prev && rutasAgrupadas.some((r) => r.claveRuta === prev)) {
        return prev;
      }
      const enTransito = rutasAgrupadas.find((r) => r.estadoGeneral === "en_ruta");
      if (enTransito) return enTransito.claveRuta;
      return rutasAgrupadas[0].claveRuta;
    });
  }, [rutasAgrupadas]);

  const rutaActivaMapa = useMemo(
    () =>
      rutasAgrupadas.find((r) => r.claveRuta === claveRutaSeleccionadaMapa) ??
      rutasAgrupadas[0] ??
      null,
    [rutasAgrupadas, claveRutaSeleccionadaMapa]
  );

  const itinerarioMapaActivo = useMemo(() => {
    if (!rutaActivaMapa) return null;
    return calcularItinerarioCompleto(rutaActivaMapa.envios, 8.5, false);
  }, [rutaActivaMapa]);

  const opcionesSucursales = useMemo(() => {
    const set = new Set<string>();
    rutasAgrupadas.forEach((r) => {
      if (r.sucursalOrigen) set.add(r.sucursalOrigen);
    });
    enviosSinRutaPendientes.forEach((e) => {
      if (e.sucursalRecepcionNombre) set.add(e.sucursalRecepcionNombre);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rutasAgrupadas, enviosSinRutaPendientes]);

  useEffect(() => {
    if (!puedeFiltrarTodasSucursales && sucursalUsuario && opcionesSucursales.length > 0) {
      const norm = sucursalUsuario.trim().toLowerCase();
      const match = opcionesSucursales.find(
        (opc) => opc.toLowerCase().includes(norm) || norm.includes(opc.toLowerCase())
      );
      if (match) {
        setFilters({ sucursal: match });
      }
    }
  }, [puedeFiltrarTodasSucursales, sucursalUsuario, opcionesSucursales]);

  // Filtros por pestaña y sucursal
  const enviosPendientesFiltrados = useMemo(() => {
    return enviosSinRutaPendientes.filter((e) => {
      if (filters.sucursal) {
        const sucFiltro = filters.sucursal.toLowerCase().trim();
        const sucOrigen = (e.sucursalRecepcionNombre || "").toLowerCase().trim();
        if (sucOrigen !== sucFiltro && !sucOrigen.includes(sucFiltro) && !sucFiltro.includes(sucOrigen)) {
          return false;
        }
      }
      if (busquedaGlobal.trim()) {
        const q = busquedaGlobal.trim().toLowerCase();
        const coincide =
          e.guia.toLowerCase().includes(q) ||
          e.destinatarioNombre.toLowerCase().includes(q) ||
          (e.remitenteNombre || "").toLowerCase().includes(q) ||
          (e.destinoCiudadResumen || "").toLowerCase().includes(q) ||
          (e.destinoCodigoPostal || "").toLowerCase().includes(q);
        if (!coincide) return false;
      }
      return true;
    });
  }, [enviosSinRutaPendientes, filters.sucursal, busquedaGlobal]);

  const rutasFiltradasPorTab = useMemo(() => {
    return rutasAgrupadas.filter((r) => {
      if (tabActiva === "planeadas" && r.estadoGeneral !== "planeada") return false;
      if (tabActiva === "transito" && r.estadoGeneral !== "en_ruta") return false;
      if (tabActiva === "concluidas" && r.estadoGeneral !== "completada") return false;

      if (filters.sucursal) {
        const sucFiltro = filters.sucursal.toLowerCase().trim();
        const sucRuta = (r.sucursalOrigen || "").toLowerCase().trim();
        if (sucRuta !== sucFiltro && !sucRuta.includes(sucFiltro) && !sucFiltro.includes(sucRuta)) {
          return false;
        }
      }
      if (busquedaGlobal.trim()) {
        const q = busquedaGlobal.trim().toLowerCase();
        const coincide =
          r.folioRuta.toLowerCase().includes(q) ||
          r.choferNombre.toLowerCase().includes(q) ||
          r.unidadPlacas.toLowerCase().includes(q) ||
          r.sucursalOrigen.toLowerCase().includes(q) ||
          r.corredorPrincipal.toLowerCase().includes(q) ||
          r.envios.some(
            (e) =>
              e.guia.toLowerCase().includes(q) ||
              e.destinatarioNombre.toLowerCase().includes(q) ||
              (e.destinoCiudadResumen || "").toLowerCase().includes(q) ||
              (e.destinoCodigoPostal || "").toLowerCase().includes(q)
          );
        if (!coincide) return false;
      }
      return true;
    });
  }, [rutasAgrupadas, tabActiva, filters.sucursal, busquedaGlobal]);

  const cambiarTab = (nuevaTab: TabSeccionRutas) => {
    setTabActiva(nuevaTab);
    setPage(0);
    setBusquedaGlobal("");
  };

  const totalItemsActivos =
    tabActiva === "pendientes"
      ? enviosPendientesFiltrados.length
      : rutasFiltradasPorTab.length;
  const totalPages = Math.max(1, Math.ceil(totalItemsActivos / pageSize));

  const paginatedPendientes = useMemo(
    () => enviosPendientesFiltrados.slice(page * pageSize, page * pageSize + pageSize),
    [enviosPendientesFiltrados, page, pageSize]
  );

  const paginatedRutas = useMemo(
    () => rutasFiltradasPorTab.slice(page * pageSize, page * pageSize + pageSize),
    [rutasFiltradasPorTab, page, pageSize]
  );

  // Columnas de tablas
  const columnsRutas: ColumnDef<RutaOperativaAgrupada>[] = [
    {
      key: "folioRuta",
      label: "Ruta / Folio",
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={() => {
              setClaveRutaSeleccionadaMapa(r.claveRuta);
              setMostrarMapaManual(true);
              window.scrollTo({ top: 320, behavior: "smooth" });
            }}
            className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#0B2D4A] text-[#0B2D4A] hover:text-white border border-slate-200 transition-colors cursor-pointer"
            title="Ver esta ruta en el mapa interactivo"
          >
            {r.folioRuta}
          </button>
          <span className="text-[10.5px] font-semibold text-slate-500">
            {r.sucursalOrigen} · {r.fechaProgramada}
          </span>
        </div>
      ),
    },
    {
      key: "choferNombre",
      label: "Chofer Asignado",
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0B2D4A]/10 text-[#0B2D4A] flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-xs">{r.choferNombre}</span>
            <span className="text-[11px] text-slate-500">Operador titular</span>
          </div>
        </div>
      ),
    },
    {
      key: "unidadPlacas",
      label: "Unidad Vehicular",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-mono font-extrabold text-xs text-[#0B2D4A] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-fit">
            {r.unidadPlacas}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">
            Carga: {r.pesoTotalKg.toFixed(2)} kg
          </span>
        </div>
      ),
    },
    {
      key: "corredorPrincipal",
      label: "Itinerario / Paradas",
      render: (r) => (
        <div className="flex flex-col max-w-[260px]">
          <span
            className="font-semibold text-slate-800 text-xs truncate"
            title={r.corredorPrincipal}
          >
            {r.corredorPrincipal}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0B2D4A] border border-blue-200 text-[10.5px] font-extrabold">
              {r.envios.length} parada{r.envios.length === 1 ? "" : "s"}
            </span>
            <span className="text-[11px] text-slate-500 truncate">
              {r.envios.map((e) => e.guia).join(", ")}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "distanciaTotalKm",
      label: "Distancia / Tiempo / Combustible",
      render: (r) => (
        <div className="flex flex-col text-xs">
          <span className="font-extrabold text-[#0B2D4A]">
            {r.distanciaTotalKm} km · ~{r.tiempoTotalMin} min
          </span>
          <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
            <Fuel className="w-3 h-3 text-amber-600" />
            Combustible est.: {r.combustibleTotalLitros.toFixed(2)} L
          </span>
        </div>
      ),
    },
    {
      key: "estadoGeneral",
      label: "Estado",
      render: (r) => {
        if (r.estadoGeneral === "en_ruta") {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#2563EB] border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
              En Tránsito
            </span>
          );
        }
        if (r.estadoGeneral === "completada") {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#16A34A] border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
              Completada
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Planeada / Por Salir
          </span>
        );
      },
    },
  ];

  const columnsPendientes: ColumnDef<EnvioListadoItem>[] = [
    {
      key: "guia",
      label: "Guía de Envío",
      render: (e) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-extrabold text-[#0B2D4A]">{e.guia}</span>
          <span className="text-[11px] text-slate-500">{formatearFechaCorta(e.fechaCreacion)}</span>
        </div>
      ),
    },
    {
      key: "flotillaAsignadaNombre",
      label: "Flotilla Asignada",
      render: (e) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-800">
            {e.flotillaAsignadaNombre || (e.flotillaAsignadaId ? `Flotilla #${e.flotillaAsignadaId}` : "Sin Flotilla")}
          </span>
          <span className="text-[11px] text-slate-500">Asignada por Supervisor</span>
        </div>
      ),
    },
    {
      key: "destinatarioNombre",
      label: "Destinatario / Domicilio",
      render: (e) => (
        <div className="flex flex-col max-w-[240px]">
          <span className="text-xs font-bold text-slate-800 truncate">{e.destinatarioNombre}</span>
          <span className="text-[11px] text-slate-500 truncate">
            {e.destinoCiudadResumen || "Destino local"}{" "}
            {e.destinoCodigoPostal ? `(CP ${e.destinoCodigoPostal})` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "sucursalRecepcionNombre",
      label: "Sucursal Recepción",
      render: (e) => (
        <span className="text-xs font-semibold text-slate-700">
          {e.sucursalRecepcionNombre || "Sucursal Matriz"}
        </span>
      ),
    },
    {
      key: "pesoKg",
      label: "Carga / Tipo",
      render: (e) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[#0B2D4A]">{e.pesoKg} kg</span>
          <span className="text-[11px] text-slate-500 truncate max-w-[160px]">
            {e.descripcion || "Paquetería estándar"}
          </span>
        </div>
      ),
    },
    {
      key: "estado",
      label: "Estado Actual",
      render: (e) => {
        const meta = obtenerMetaEstadoEnvio(e.estado);
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.badgeClass}`}
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
      key: "sucursal",
      label: puedeFiltrarTodasSucursales ? "Sucursal" : "Sucursal asignada",
      type: "select",
      options: puedeFiltrarTodasSucursales
        ? [
            { value: "", label: "Todas las sucursales" },
            ...opcionesSucursales.map((s) => ({ value: s, label: s })),
          ]
        : [
            {
              value: filters.sucursal || sucursalUsuario || "",
              label: filters.sucursal || sucursalUsuario || "Sucursal asignada",
            },
          ],
    },
  ];

  // Acciones de administración y supervisión
  const actionsRutas: ActionDef<RutaOperativaAgrupada>[] = [
    {
      label: "Ver ruta en el mapa",
      icon: <Compass size={14} />,
      className: "text-[#0B2D4A] hover:bg-blue-50 font-bold",
      onClick: (ruta) => {
        setClaveRutaSeleccionadaMapa(ruta.claveRuta);
        setMostrarMapaManual(true);
        window.scrollTo({ top: 320, behavior: "smooth" });
      },
    },
    {
      label: "Reasignar Chofer / Unidad / Paradas",
      icon: <Truck size={14} />,
      className: "text-indigo-800 hover:bg-indigo-50 font-bold",
      visible: (r) => permisos.planificarRuta && r.estadoGeneral !== "completada",
      onClick: (ruta) => {
        setModalRuta({ envio: ruta.envios[0] ?? null, modo: "asignar" });
      },
    },
    {
      label: "Ver historial de desvíos",
      icon: <History size={14} />,
      className: "text-slate-700 hover:bg-slate-100",
      onClick: (ruta) => {
        const idRuta = ruta.rutaId || ruta.envios.find((e) => e.rutaAsignadaId)?.rutaAsignadaId;
        setRutaIdFiltroHistorial(idRuta ?? null);
        setModalHistorialCambiosAbierto(true);
      },
    },
    {
      label: "Ver detalle de guías",
      icon: <Eye size={14} />,
      className: "text-slate-700 hover:bg-slate-100",
      onClick: (ruta) => {
        if (ruta.envios[0]) setEnvioDetalle(ruta.envios[0]);
      },
    },
  ];

  const actionsPendientes: ActionDef<EnvioListadoItem>[] = [
    {
      label: "Planificar Ruta",
      icon: <Truck size={14} />,
      className: "text-[#0B2D4A] hover:bg-blue-50 font-bold",
      visible: () => permisos.planificarRuta,
      onClick: (envio) => {
        setModalRuta({ envio, modo: "asignar" });
      },
    },
    {
      label: "Ver expediente del envío",
      icon: <Eye size={14} />,
      className: "text-slate-700 hover:bg-slate-100",
      onClick: (envio) => {
        setEnvioDetalle(envio);
      },
    },
  ];

  const deberiaMostrarMapa =
    (tabActiva === "transito" && Boolean(rutaActivaMapa && itinerarioMapaActivo)) ||
    (mostrarMapaManual && Boolean(rutaActivaMapa && itinerarioMapaActivo));

  return (
    <div className="cc-page">
      <div className="cc-header">
        <div className="cc-title-group">
          <h1 className="cc-title">Gestión de Rutas y Asignaciones</h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            id="btn-refrescar-rutas"
            onClick={() => void cargarDatos(true)}
            disabled={cargando}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-[#0B2D4A] hover:bg-slate-50 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            id="btn-historial-cambios-ruta"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs shadow-2xs transition-all cursor-pointer"
            onClick={() => {
              setRutaIdFiltroHistorial(null);
              setModalHistorialCambiosAbierto(true);
            }}
            title="Consultar historial de desvíos, incidencias y cambios de trayecto autorizados"
          >
            <History className="w-4 h-4 text-amber-700" />
            <span>Historial de Desvíos</span>
          </button>

          {hasRequiredRole(session.roles, [
            "Supervisor",
            "Jefe de flotilla",
            "Jefe",
          ]) && (
            <button
              type="button"
              id="btn-cierre-odometro-rutas"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#0B2D4A] font-bold text-xs shadow-2xs transition-all cursor-pointer"
              onClick={() => setModalCierreOdometroAbierto(true)}
              title="Registrar kilometraje final del día en odómetro por unidad"
            >
              <Gauge className="w-4 h-4 text-[#0B2D4A]" />
              <span>Cierre Odómetro</span>
            </button>
          )}

          <button
            type="button"
            id="btn-total-rutas-resumen"
            onClick={() => cambiarTab("planeadas")}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-[#0B2D4A] shadow-2xs transition-all cursor-pointer"
            title="Total de rutas consolidadas en el sistema"
          >
            <Navigation className="w-4 h-4 text-[#0B2D4A]" />
            <span>Total Rutas</span>
            <span className="px-2 py-0.5 rounded-md bg-[#0B2D4A] text-white font-extrabold text-[11px]">
              {metricas.totalRutas}
            </span>
          </button>

          {permisos.planificarRuta && (
            <button
              type="button"
              id="btn-crear-nueva-ruta"
              className="cc-btn-add"
              onClick={() => setModalRuta({ envio: null, modo: "asignar" })}
              title="Crear una nueva ruta asignando Flotilla, Chofer, Unidad y paradas con cálculo de mejor ruta"
            >
              <Plus size={17} strokeWidth={2.5} />
              <span>Nueva Ruta</span>
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de estado */}
      <div className="flex border-b border-slate-200 mb-6 gap-1 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => cambiarTab("pendientes")}
          className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${tabActiva === "pendientes"
            ? "border-[#D64545] text-[#D64545] bg-rose-50/50 rounded-t-xl"
            : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
        >
          <Package className="w-4 h-4" />
          <span>1. Envíos en Flotilla por Planificar</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold ${tabActiva === "pendientes"
              ? "bg-[#D64545] text-white"
              : "bg-slate-200 text-slate-700"
              }`}
          >
            {metricas.pendientesSinRuta}
          </span>
        </button>

        <button
          type="button"
          onClick={() => cambiarTab("planeadas")}
          className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${tabActiva === "planeadas"
            ? "border-amber-600 text-amber-900 bg-amber-50/50 rounded-t-xl"
            : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
        >
          <Clock className="w-4 h-4" />
          <span>2. Rutas Planeadas</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold ${tabActiva === "planeadas"
              ? "bg-amber-600 text-white"
              : "bg-slate-200 text-slate-700"
              }`}
          >
            {metricas.planeadas}
          </span>
        </button>

        <button
          type="button"
          onClick={() => cambiarTab("transito")}
          className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${tabActiva === "transito"
            ? "border-[#2563EB] text-[#2563EB] bg-blue-50/50 rounded-t-xl"
            : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
        >
          <Truck className="w-4 h-4" />
          <span>3. Monitoreo en Tránsito</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold ${tabActiva === "transito"
              ? "bg-[#2563EB] text-white"
              : "bg-slate-200 text-slate-700"
              }`}
          >
            {metricas.enRecorrido}
          </span>
        </button>

        <button
          type="button"
          onClick={() => cambiarTab("concluidas")}
          className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${tabActiva === "concluidas"
            ? "border-[#16A34A] text-[#16A34A] bg-emerald-50/50 rounded-t-xl"
            : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>4. Rutas Concluidas / Historial</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold ${tabActiva === "concluidas"
              ? "bg-[#16A34A] text-white"
              : "bg-slate-200 text-slate-700"
              }`}
          >
            {metricas.completadas}
          </span>
        </button>
      </div>

      {/* Mapa interactivo */}
      {deberiaMostrarMapa && rutaActivaMapa && itinerarioMapaActivo && (
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#0B2D4A]">
              <MapPin className="w-4 h-4 text-[#D64545]" />
              <span>Mapa interactivo de la ruta:</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {rutasAgrupadas.map((r) => {
                const activa = r.claveRuta === rutaActivaMapa.claveRuta;
                return (
                  <button
                    key={r.claveRuta}
                    type="button"
                    onClick={() => setClaveRutaSeleccionadaMapa(r.claveRuta)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${activa
                      ? "bg-[#0B2D4A] text-white border-[#0B2D4A] shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                  >
                    {r.folioRuta} · {r.choferNombre} ({r.unidadPlacas}) · {r.envios.length} parada
                    {r.envios.length === 1 ? "" : "s"}
                  </button>
                );
              })}

              {mostrarMapaManual && tabActiva !== "transito" && (
                <button
                  type="button"
                  onClick={() => setMostrarMapaManual(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-2"
                  title="Ocultar visor del mapa"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <MapaRutaInteractivo
            paradas={itinerarioMapaActivo.paradas}
            sucursalOrigenNombre={rutaActivaMapa.sucursalOrigen}
            choferNombre={rutaActivaMapa.choferNombre}
            unidadPlacas={rutaActivaMapa.unidadPlacas}
            distanciaTotalKm={itinerarioMapaActivo.distanciaTotalKm}
            tiempoTotalMin={itinerarioMapaActivo.tiempoTotalMin}
            combustibleTotalLitros={itinerarioMapaActivo.combustibleTotalLitros}
            alturaPx={400}
            mostrarControlesOperativosChofer={false}
            onIniciarRecorrido={() => { }}
            onValidarEntregaPin={() => { }}
            onVerDetalleEnvio={(envio) => setEnvioDetalle(envio)}
          />
        </div>
      )}

      {/* Listado */}
      {tabActiva === "pendientes" ? (
        <TablaGenerica<EnvioListadoItem>
          data={paginatedPendientes}
          columns={columnsPendientes}
          sortCol={null}
          sortDir="asc"
          onSort={() => { }}
          filters={filters}
          filterDefs={filterDefs}
          onFilterChange={(e) => {
            if (!puedeFiltrarTodasSucursales && e.target.name === "sucursal") return;
            setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
            setPage(0);
          }}
          actions={actionsPendientes}
          idAccessor={(e) => String(e.id)}
          busquedaGlobal={busquedaGlobal}
          onBusquedaGlobalChange={(val) => {
            setBusquedaGlobal(val);
            setPage(0);
          }}
          onLimpiarFiltros={() => {
            setFilters({
              sucursal: (!puedeFiltrarTodasSucursales && sucursalUsuario) ? (filters.sucursal || sucursalUsuario) : "",
            });
            setBusquedaGlobal("");
            setPage(0);
          }}
          placeholderGlobal="Buscar paquete pendiente por guía, destinatario, remitente o ciudad..."
        />
      ) : (
        <TablaGenerica<RutaOperativaAgrupada>
          data={paginatedRutas}
          columns={columnsRutas}
          sortCol={null}
          sortDir="asc"
          onSort={() => { }}
          filters={filters}
          filterDefs={filterDefs}
          onFilterChange={(e) => {
            if (!puedeFiltrarTodasSucursales && e.target.name === "sucursal") return;
            setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
            setPage(0);
          }}
          actions={actionsRutas}
          idAccessor={(r) => r.folioRuta}
          busquedaGlobal={busquedaGlobal}
          onBusquedaGlobalChange={(val) => {
            setBusquedaGlobal(val);
            setPage(0);
          }}
          onLimpiarFiltros={() => {
            setFilters({
              sucursal: (!puedeFiltrarTodasSucursales && sucursalUsuario) ? (filters.sucursal || sucursalUsuario) : "",
            });
            setBusquedaGlobal("");
            setPage(0);
          }}
          placeholderGlobal="Buscar ruta por chofer, unidad, guía, folio o corredor..."
        />
      )}

      <div className="cc-footer-bar">
        <div className="cc-pagesize-wrap">
          <label htmlFor="sel-ps-rutas" className="cc-pagesize-label">
            Mostrar
          </label>
          <select
            id="sel-ps-rutas"
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
            {totalItemsActivos === 0
              ? "0-0"
              : `${page * pageSize + 1}-${Math.min(
                (page + 1) * pageSize,
                totalItemsActivos
              )}`}{" "}
            de {totalItemsActivos}
          </span>
        </div>
      </div>

      {/* Modales */}
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

      <EnvioModalDetalle
        abierto={Boolean(envioDetalle)}
        envioBase={envioDetalle}
        onClose={() => setEnvioDetalle(null)}
      />

      <RutaModalHistorialCambios
        abierto={modalHistorialCambiosAbierto}
        rutaIdFiltro={rutaIdFiltroHistorial}
        onClose={() => setModalHistorialCambiosAbierto(false)}
      />

      <EnvioModalCierreOdometroDia
        abierto={modalCierreOdometroAbierto}
        onClose={() => setModalCierreOdometroAbierto(false)}
        onSuccess={() => void cargarDatos(false)}
      />
    </div>
  );
}
