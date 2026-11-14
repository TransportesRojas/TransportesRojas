import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Search,
  AlertCircle,
  Package,
  Truck,
  Headset,
  RotateCcw,
  RefreshCw,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  XCircle,
  MapPin,
  Store,
  Loader2,
  X,
  ChevronDown,
  KeyRound,
} from "lucide-react";
import logoCircular from "../../assets/logocircular.webp";
import { clearSession, getSession, parseJwt } from "../../utils/auth";
import { envioService, extraerMensajeErrorApi } from "../../services/envioService";
import { useToast } from "../../components/Toast";
import { ModalCambiarPassword } from "../../components/ModalCambiarPassword";
import {
  type CrearEnvioResponse,
  type EnvioDetalleResponse,
  type EnvioListadoItem,
  type RastreoPublicoResponse,
  formatearDireccionCompleta,
  formatearFechaCorta,
  formatearFechaHora,
  obtenerMetaEstadoEnvio,
} from "../cruds/envios/types";
import { ClienteModalNuevoEnvio } from "./ClienteModalNuevoEnvio";
import "./bienvenida-cliente.css";

const COLOR_ROJO = "#D64545";
const COLOR_VERDE = "#16A34A";

export default function BienvenidaCliente() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const session = getSession();
  const nombreCliente = session.user?.nombreCompleto || session.user?.nombre || "Cliente";
  const emailCliente = session.user?.email || "";
  const tokenActual = session.token;

  const clienteIdActual = (() => {
    if (!tokenActual) return null;
    const payload = parseJwt(tokenActual);
    const raw = payload?.cliente_id;
    const num = raw !== undefined && raw !== null ? Number(raw) : NaN;
    return Number.isFinite(num) && num > 0 ? num : null;
  })();

  // Rastreo y envíos del cliente
  const [guiaBusqueda, setGuiaBusqueda] = useState("");
  const [resultadoRastreo, setResultadoRastreo] = useState<RastreoPublicoResponse | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorRastreo, setErrorRastreo] = useState("");
  const [haBuscado, setHaBuscado] = useState(false);

  const [misEnvios, setMisEnvios] = useState<EnvioListadoItem[]>([]);
  const [cargandoMisEnvios, setCargandoMisEnvios] = useState(true);
  const [errorMisEnvios, setErrorMisEnvios] = useState("");

  const [envioSeleccionadoId, setEnvioSeleccionadoId] = useState<number | null>(null);
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<EnvioDetalleResponse | null>(
    null
  );
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [mostrarPin, setMostrarPin] = useState(false);
  const [copiadoPinDetalle, setCopiadoPinDetalle] = useState(false);

  // Modales y menú de cuenta
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [envioACancelar, setEnvioACancelar] = useState<EnvioListadoItem | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuAbierto(false);
      }
    };
    if (menuAbierto) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuAbierto]);

  const onCerrarSesion = () => {
    clearSession();
    navigate("/login-clientes", { replace: true });
  };

  const iniciales = nombreCliente
    .split(" ")
    .filter(Boolean)
    .map((p: string) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const recargarMisEnvios = async (silencioso = false) => {
    if (!silencioso) {
      setCargandoMisEnvios(true);
    }
    setErrorMisEnvios("");

    try {
      const lista = await envioService.listar({ skip: 0, take: 50 });
      setMisEnvios(lista || []);
    } catch (err) {
      setErrorMisEnvios(
        extraerMensajeErrorApi(err, "No fue posible cargar tus envíos en este momento.")
      );
    } finally {
      setCargandoMisEnvios(false);
    }
  };

  useEffect(() => {
    let activo = true;
    envioService
      .listar({ skip: 0, take: 50 })
      .then((lista) => {
        if (activo) {
          setMisEnvios(lista || []);
        }
      })
      .catch((err) => {
        if (activo) {
          setErrorMisEnvios(
            extraerMensajeErrorApi(err, "No fue posible consultar tu historial de envíos.")
          );
        }
      })
      .finally(() => {
        if (activo) setCargandoMisEnvios(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const ejecutarRastreoGuia = async (guiaRaw: string) => {
    const guia = guiaRaw.trim().toUpperCase();
    setErrorRastreo("");
    setResultadoRastreo(null);

    if (!guia) {
      setErrorRastreo("Ingresa un número de guía para rastrear.");
      return;
    }

    setGuiaBusqueda(guia);
    setBuscando(true);
    setHaBuscado(true);

    try {
      const respuesta = await envioService.rastrearPorGuia(guia);
      setResultadoRastreo(respuesta);
    } catch (err) {
      const msg = extraerMensajeErrorApi(
        err,
        `No encontramos envíos con la guía "${guia}". Verifica el número e intenta de nuevo.`
      );
      setErrorRastreo(msg);
    } finally {
      setBuscando(false);
    }
  };

  async function buscarGuia(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    await ejecutarRastreoGuia(guiaBusqueda);
  }

  const seleccionarMiEnvio = async (env: EnvioListadoItem) => {
    setEnvioSeleccionadoId(env.id);
    setMostrarPin(false);
    setCopiadoPinDetalle(false);

    void ejecutarRastreoGuia(env.guia);

    setCargandoDetalle(true);
    try {
      const det = await envioService.obtenerDetalle(env.id);
      setDetalleSeleccionado(det);
    } catch (err) {
      toast.error(extraerMensajeErrorApi(err, "No se pudo consultar el detalle del envío."));
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleEnvioCreado = (respuesta: CrearEnvioResponse) => {
    void recargarMisEnvios(true);
    setEnvioSeleccionadoId(respuesta.envio.id);
    setDetalleSeleccionado(respuesta.envio);
    setMostrarPin(false);
    void ejecutarRastreoGuia(respuesta.guia);
  };

  const handleEnvioCancelado = (actualizado: EnvioDetalleResponse) => {
    setEnvioACancelar(null);
    setDetalleSeleccionado(actualizado);
    void recargarMisEnvios(true);
    if (guiaBusqueda.trim().toUpperCase() === actualizado.guia.toUpperCase()) {
      void ejecutarRastreoGuia(actualizado.guia);
    }
  };

  const copiarPinDetalle = async (pin: string) => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopiadoPinDetalle(true);
      setTimeout(() => setCopiadoPinDetalle(false), 2000);
      toast.info("PIN de seguridad copiado al portapapeles.");
    } catch {
      toast.error("No fue posible copiar el PIN automáticamente.");
    }
  };

  const resumenMisEnvios = useMemo(() => {
    let activos = 0;
    let entregados = 0;
    for (const e of misEnvios) {
      const est = (e.estado || "").toLowerCase();
      if (est === "entregado") {
        entregados += 1;
      } else if (est !== "cancelado" && est !== "devuelto") {
        activos += 1;
      }
    }
    return { total: misEnvios.length, activos, entregados };
  }, [misEnvios]);

  const puedeCancelarEnvio = (env: { estado: string; remitenteId: number }) => {
    const est = (env.estado || "").toLowerCase();
    const estadoPermitido = est === "registrado" || est === "recoleccion_programada";
    if (!estadoPermitido) return false;
    if (clienteIdActual !== null && env.remitenteId !== clienteIdActual) return false;
    return true;
  };

  return (
    <div className="bc-page min-h-screen flex flex-col relative overflow-x-hidden text-tr-ink">
      <FondoDecorativo />

      {/* Encabezado */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 h-16 bg-tr-navy border-b-[3.5px] border-tr-red shadow-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img
              src={logoCircular}
              alt="Transportes Rojas"
              className="w-[38px] h-[38px] rounded-full object-cover border-2 border-tr-red shadow-[0_0_12px_rgba(214,69,69,0.45)]"
              draggable={false}
            />
            <span className="text-lg font-extrabold text-white tracking-tight">
              Transportes <span className="text-tr-red">Rojas</span>
            </span>
          </div>

          <ul className="hidden md:flex items-center gap-6 list-none m-0 p-0 ml-2">
            <li>
              <a
                href="#servicios"
                className="text-xs font-semibold text-tr-gray tracking-wide hover:text-white transition-colors cursor-pointer"
              >
                Servicios
              </a>
            </li>
            <li>
              <a
                href="#como-funciona"
                className="text-xs font-semibold text-tr-gray tracking-wide hover:text-white transition-colors cursor-pointer"
              >
                Cómo funciona
              </a>
            </li>
            <li>
              <a
                href="#nosotros"
                className="text-xs font-semibold text-tr-gray tracking-wide hover:text-white transition-colors cursor-pointer"
              >
                Nosotros
              </a>
            </li>
          </ul>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            id="btn-usuario-menu"
            type="button"
            onClick={() => setMenuAbierto((prev) => !prev)}
            className="flex items-center gap-3 bg-white/10 hover:bg-white/18 text-white px-3 py-1.5 rounded-xl border border-white/20 hover:border-white/30 transition-all cursor-pointer select-none group shadow-xs active:scale-[0.99]"
            title="Opciones de cuenta"
            aria-expanded={menuAbierto}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-lg bg-tr-red text-white flex items-center justify-center font-black text-xs shadow-xs uppercase shrink-0">
              {iniciales || nombreCliente?.[0] || "C"}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-white tracking-tight leading-tight group-hover:text-blue-100 transition-colors">
                {nombreCliente}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-extrabold mt-0.5">
                Cliente
              </div>
            </div>
            <ChevronDown
              size={15}
              className={`text-white/70 transition-transform duration-200 shrink-0 ${menuAbierto ? "rotate-180" : ""}`}
            />
          </button>

          {menuAbierto && (
            <div
              id="menu-usuario-desplegable"
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-slate-800 animate-[bc-result-pop_0.15s_ease-out]"
            >
              <div className="p-3.5 bg-slate-50 border-b border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sesión iniciada como</div>
                <div className="text-xs font-bold text-slate-900 truncate mt-0.5">{emailCliente || nombreCliente}</div>
                <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-bold mt-1 inline-block bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Cliente
                </div>
              </div>

              <div className="p-1.5">
                <button
                  id="btn-opcion-cambiar-password"
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    setModalPasswordAbierto(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-tr-navy hover:bg-blue-50/70 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <KeyRound size={15} className="text-tr-navy shrink-0" />
                  <span>Cambiar contraseña</span>
                </button>

                <div className="border-t border-slate-100 my-1" />

                <button
                  id="btn-opcion-salir"
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    onCerrarSesion();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <LogOut size={15} className="shrink-0" />
                  <span>Salir (Cerrar sesión)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Contenido principal */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 sm:px-8 py-8 sm:py-11 max-w-[1140px] w-full mx-auto box-border">
        <div className="w-full mb-7 bc-fade-up">
          <div className="inline-flex items-center gap-2.5 bg-white border-[1.5px] border-tr-gray rounded-full px-4 py-1.5 text-xs font-bold text-tr-navy shadow-xs mb-4 tracking-wide">
            <span className="inline-flex gap-1 items-center" aria-hidden="true">
              <span className="inline-block w-1 h-3 -skew-x-[20deg] rounded-[1.5px] bg-tr-navy" />
              <span className="inline-block w-1 h-3 -skew-x-[20deg] rounded-[1.5px] bg-tr-red" />
              <span className="inline-block w-1 h-3 -skew-x-[20deg] rounded-[1.5px] bg-tr-gray" />
            </span>
            <span>Rastreo Oficial y Logística Nacional</span>
          </div>
          <h1 className="m-0 mb-2.5 text-3xl sm:text-4xl font-extrabold text-tr-navy leading-tight tracking-tight">
            Cada envío,{" "}
            <span className="text-tr-red bg-gradient-to-r from-tr-red to-tr-red-dark bg-clip-text text-transparent">
              rastreado hasta la puerta
            </span>
          </h1>
          <p className="m-0 text-base sm:text-lg text-slate-500 font-normal leading-relaxed">
            Entregas de última milla en todo México, con ubicación en vivo y confirmación segura
            con PIN para quien recibe.
          </p>
        </div>

        <div className="w-full mb-7 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-[0_8px_30px_-4px_rgba(11,45,74,0.06)] flex flex-col md:flex-row items-center justify-between gap-5 bc-fade-up">
          <div className="flex items-center gap-4 text-left w-full md:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-tr-navy to-[#143F66] text-white flex items-center justify-center shadow-md shrink-0">
              <Package size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-tr-navy m-0">
                  ¿Deseas enviar un paquete?
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 m-0 mt-0.5 leading-relaxed">
                Genera tu guía en línea y entrega tu paquete en tu sucursal más cercana con confirmación protegida por PIN.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end shrink-0">
            <button
              id="btn-nuevo-envio-cliente"
              type="button"
              onClick={() => setModalNuevoAbierto(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0B2D4A] hover:bg-[#143F66] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 border-none"
            >
              <Package size={17} strokeWidth={2.2} />
              <span>Realizar un envío</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 w-full bc-fade-up-delay items-start">
          {/* Rastreo por guía */}
          <div
            id="rastreo"
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-[0_8px_30px_-4px_rgba(11,45,74,0.08)] hover:shadow-[0_16px_36px_-4px_rgba(11,45,74,0.12)] hover:border-tr-gray transition-all relative overflow-hidden bc-card-stripe"
          >
            <h2 className="m-0 mb-4 text-lg font-extrabold text-tr-navy flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-tr-red to-tr-red-dark text-white inline-flex items-center justify-center shadow-md shrink-0">
                <Search size={18} strokeWidth={2.5} />
              </span>
              Número de guía
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 m-0 mb-3.5 leading-relaxed">
              Ingresa cualquier número de guía oficial para consultar su ubicación y línea de
              tiempo en vivo.
            </p>
            <form
              className="flex flex-col sm:flex-row gap-2.5 mb-5"
              onSubmit={buscarGuia}
              noValidate
            >
              <input
                id="input-guia"
                className="flex-1 bg-white border-[1.5px] border-tr-gray focus:border-tr-navy rounded-xl px-4 py-3 text-sm font-mono uppercase text-tr-ink placeholder:text-slate-400 placeholder:normal-case outline-none focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-60"
                type="text"
                placeholder="Ej. TR-20261107-7XGT"
                value={guiaBusqueda}
                onChange={(e) => setGuiaBusqueda(e.target.value)}
                autoComplete="off"
                disabled={buscando}
              />
              <button
                id="btn-rastrear"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-br from-tr-red to-tr-red-dark hover:from-[#E05353] hover:to-tr-red-dark text-white border-none rounded-xl px-6 py-3 text-sm font-bold cursor-pointer whitespace-nowrap shadow-md hover:shadow-lg transition-all active:translate-y-0 hover:-translate-y-0.5 disabled:opacity-60"
                type="submit"
                disabled={buscando}
              >
                {buscando ? (
                  <>
                    <span className="bc-spinner" aria-hidden="true" />
                    Buscando…
                  </>
                ) : (
                  "Rastrear"
                )}
              </button>
            </form>

            {errorRastreo && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 text-tr-red text-sm font-semibold flex items-center gap-2.5 bc-result-pop mb-4">
                <AlertCircle size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
                <span>{errorRastreo}</span>
              </div>
            )}

            {resultadoRastreo && <PanelResultado resultado={resultadoRastreo} />}

            {!haBuscado && !resultadoRastreo && !errorRastreo && (
              <div className="text-center py-9 px-4 text-slate-400 text-sm flex flex-col items-center">
                <Package size={44} strokeWidth={1.5} className="mb-3 text-tr-navy/40" />
                <p className="m-0 text-slate-500 max-w-xs leading-relaxed">
                  Escribe un número de guía o selecciona uno de <strong>Mis Envíos</strong> para
                  visualizar su recorrido.
                </p>
              </div>
            )}
          </div>

          {/* Mis envíos */}
          <div
            id="panel-mis-envios"
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-[0_8px_30px_-4px_rgba(11,45,74,0.08)] hover:shadow-[0_16px_36px_-4px_rgba(11,45,74,0.12)] hover:border-tr-gray transition-all relative overflow-hidden bc-card-stripe flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xl sm:text-2xl font-extrabold text-tr-navy leading-tight tracking-tight m-0">
                  Bienvenido,{" "}
                  <em className="not-italic text-tr-red bg-gradient-to-r from-tr-red to-tr-red-dark bg-clip-text text-transparent">
                    {nombreCliente}
                  </em>
                </p>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed m-0 mt-1">
                  Consulta tus envíos documentados, revisa tu PIN de seguridad o solicita
                  nuevas recolecciones y guías.
                </p>
              </div>
              <button
                id="btn-refrescar-mis-envios"
                type="button"
                onClick={() => void recargarMisEnvios(false)}
                disabled={cargandoMisEnvios}
                title="Actualizar Mis Envíos"
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-tr-navy text-tr-navy transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={cargandoMisEnvios ? "animate-spin" : ""}
                />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 mb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold uppercase tracking-wider text-tr-navy">
                  Mis Envíos
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-tr-navy border border-blue-200">
                  {resumenMisEnvios.activos} activos
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {resumenMisEnvios.entregados} entregados
                </span>
              </div>
            </div>

            {errorMisEnvios && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-tr-red text-xs font-semibold flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMisEnvios}</span>
              </div>
            )}

            {cargandoMisEnvios ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2.5 text-slate-500 text-xs font-semibold">
                <Loader2 className="w-6 h-6 animate-spin text-tr-navy" />
                <span>Consultando tus envíos registrados...</span>
              </div>
            ) : misEnvios.length === 0 ? (
              <div className="py-8 px-4 rounded-2xl bg-slate-50/80 border border-dashed border-slate-300 text-center flex flex-col items-center gap-3">
                <Package size={38} strokeWidth={1.5} className="text-tr-navy/45" />
                <div>
                  <p className="text-sm font-bold text-tr-navy m-0">
                    Aún no tienes envíos registrados
                  </p>
                  <p className="text-xs text-slate-500 m-0 mt-1 max-w-xs">
                    Genera tu primera guía nacional y entrega tu paquete en la sucursal más cercana.
                  </p>
                </div>
                <button
                  id="btn-primer-envio-cliente"
                  type="button"
                  onClick={() => setModalNuevoAbierto(true)}
                  className="inline-flex items-center gap-2 bg-[#0B2D4A] hover:bg-[#143F66] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer border-none"
                >
                  <Package size={15} strokeWidth={2.2} />
                  <span>Realizar mi primer envío</span>
                </button>
              </div>
            ) : (
              <ul
                id="lista-mis-envios"
                className="list-none p-0 m-0 flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1"
              >
                {misEnvios.map((env) => {
                  const meta = obtenerMetaEstadoEnvio(env.estado);
                  const seleccionado = envioSeleccionadoId === env.id;
                  const esMioComoRemitente =
                    clienteIdActual === null || env.remitenteId === clienteIdActual;

                  return (
                    <li key={env.id}>
                      <button
                        type="button"
                        data-guia={env.guia}
                        onClick={() => void seleccionarMiEnvio(env)}
                        className={`group flex flex-col gap-1.5 rounded-xl px-4 py-3 w-full text-left cursor-pointer transition-all border ${seleccionado
                          ? "bg-blue-50/70 border-tr-navy ring-2 ring-tr-navy/15 shadow-sm"
                          : "bg-white hover:bg-slate-50 border-slate-200 hover:border-tr-gray shadow-2xs"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-mono font-extrabold text-tr-navy group-hover:text-tr-red transition-colors">
                              {env.guia}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {esMioComoRemitente ? "Enviado" : "Para ti"}
                            </span>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                            {meta.etiqueta}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-slate-600 flex-wrap">
                          <span className="font-semibold text-slate-700 truncate max-w-[65%]">
                            Para: {env.destinatarioNombre}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatearFechaCorta(env.fechaCreacion)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 flex-wrap">
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin size={12} className="text-tr-red shrink-0" />
                            <span>
                              {env.destinoCiudadResumen ||
                                env.sucursalDestinoNombre ||
                                "Cobertura nacional"}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                            {env.requiereRecoleccion ? (
                              <>
                                <Truck size={12} className="text-amber-600" />
                                <span>Recolección</span>
                              </>
                            ) : (
                              <>
                                <Store size={12} className="text-tr-navy" />
                                <span>Sucursal</span>
                              </>
                            )}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {envioSeleccionadoId !== null && (
              <div
                id="ficha-detalle-mi-envio"
                className="mt-4 pt-4 border-t border-slate-200 space-y-3 bc-result-pop"
              >
                {cargandoDetalle ? (
                  <div className="py-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-tr-navy" />
                    <span>Cargando expediente y código de seguridad...</span>
                  </div>
                ) : detalleSeleccionado ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-tr-navy">
                        Expediente {detalleSeleccionado.guia}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEnvioSeleccionadoId(null);
                          setDetalleSeleccionado(null);
                        }}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-0"
                      >
                        Ocultar ficha
                      </button>
                    </div>

                    {detalleSeleccionado.codigoSeguridadCliente && (
                      <div className="p-3.5 rounded-xl bg-[#0B2D4A] text-white flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-[10.5px] font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-emerald-400" />
                            <span>PIN de Seguridad de Entrega</span>
                          </div>
                          <div
                            id="detalle-cliente-pin-valor"
                            className="font-mono text-lg font-black tracking-[0.24em] mt-0.5"
                          >
                            {mostrarPin
                              ? detalleSeleccionado.codigoSeguridadCliente
                              : "••••••"}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            id="btn-toggle-pin-cliente"
                            type="button"
                            onClick={() => setMostrarPin((v) => !v)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold border border-white/20 transition-colors cursor-pointer"
                          >
                            {mostrarPin ? <EyeOff size={13} /> : <Eye size={13} />}
                            <span>{mostrarPin ? "Ocultar" : "Ver PIN"}</span>
                          </button>
                          <button
                            id="btn-copiar-pin-detalle-cliente"
                            type="button"
                            onClick={() =>
                              void copiarPinDetalle(
                                detalleSeleccionado.codigoSeguridadCliente || ""
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white text-[#0B2D4A] hover:bg-blue-50 text-[11px] font-bold border-none transition-colors cursor-pointer"
                          >
                            {copiadoPinDetalle ? (
                              <>
                                <Check size={13} className="text-emerald-600" />
                                <span>Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                      <div className="text-slate-700">
                        <strong className="text-tr-navy">Entrega en:</strong>{" "}
                        {formatearDireccionCompleta(detalleSeleccionado.direccionDestino)}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500 pt-1 border-t border-slate-200/80">
                        <span>
                          Paquete: <strong>{detalleSeleccionado.descripcion}</strong> (
                          {Number(detalleSeleccionado.pesoKg).toFixed(2)} kg)
                        </span>
                        <span>
                          Est:{" "}
                          <strong>
                            {formatearFechaCorta(detalleSeleccionado.fechaEntregaEstimada)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {puedeCancelarEnvio(detalleSeleccionado) && (
                      <div className="flex justify-end">
                        <button
                          id="btn-abrir-cancelar-envio-cliente"
                          type="button"
                          onClick={() => setEnvioACancelar(detalleSeleccionado)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-tr-red text-tr-red hover:text-white border border-red-200 hover:border-tr-red text-xs font-bold transition-colors cursor-pointer"
                        >
                          <XCircle size={14} />
                          <span>Solicitar cancelación de envío</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Servicios */}
      <section className="relative z-10 py-16 px-6 bg-tr-bg" id="servicios">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-tr-navy tracking-tight mb-9 flex items-center gap-3">
            <span className="w-1.5 h-6.5 bg-gradient-to-b from-tr-red to-tr-navy rounded-full inline-block" />
            Lo que hacemos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 border-t-[3.5px] border-t-blue-600 rounded-xl p-7 shadow-xs hover:shadow-lg hover:-translate-y-1 hover:border-blue-500/40 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Truck size={26} strokeWidth={2} />
              </div>
              <h3 className="m-0 mb-2 text-base font-extrabold text-tr-navy">
                Envíos nacionales
              </h3>
              <p className="m-0 text-sm text-slate-500 leading-relaxed">
                Recepción, traslado y entrega domicilio a domicilio en todo México.
              </p>
            </div>

            <div className="bg-white border border-slate-200 border-t-[3.5px] border-t-tr-red rounded-xl p-7 shadow-xs hover:shadow-lg hover:-translate-y-1 hover:border-tr-red/40 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-xl bg-tr-red/10 text-tr-red flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Headset size={26} strokeWidth={2} />
              </div>
              <h3 className="m-0 mb-2 text-base font-extrabold text-tr-navy">
                Atención al cliente
              </h3>
              <p className="m-0 text-sm text-slate-500 leading-relaxed">
                Soporte por call center para estatus, reprogramaciones y quejas.
              </p>
            </div>

            <div className="bg-white border border-slate-200 border-t-[3.5px] border-t-orange-500 rounded-xl p-7 shadow-xs hover:shadow-lg hover:-translate-y-1 hover:border-orange-500/40 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <RotateCcw size={26} strokeWidth={2} />
              </div>
              <h3 className="m-0 mb-2 text-base font-extrabold text-tr-navy">Devoluciones</h3>
              <p className="m-0 text-sm text-slate-500 leading-relaxed">
                Retorno y evaluación de mercancía no entregada o rechazada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section
        className="relative z-10 py-16 px-6 bg-white border-t border-slate-200"
        id="como-funciona"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-tr-navy tracking-tight mb-9 flex items-center gap-3">
            <span className="w-1.5 h-6.5 bg-gradient-to-b from-tr-red to-tr-navy rounded-full inline-block" />
            Cómo funciona
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: 1,
                borderTop: "border-t-tr-navy",
                bgNum: "bg-tr-navy",
                titulo: "Registras el envío",
                desc: "Documenta el paquete en línea y acude a la sucursal más cercana a tu ubicación.",
              },
              {
                num: 2,
                borderTop: "border-t-blue-600",
                bgNum: "bg-blue-600",
                titulo: "Se planea la ruta",
                desc: "El sistema optimiza tiempo, distancia y cobertura operativa.",
              },
              {
                num: 3,
                borderTop: "border-t-orange-500",
                bgNum: "bg-orange-500",
                titulo: "Sigues la entrega",
                desc: "Consulta cada evento de tu guía hasta la puerta del destinatario.",
              },
              {
                num: 4,
                borderTop: "border-t-tr-red",
                bgNum: "bg-tr-red",
                titulo: "Confirmas la recepción",
                desc: "El PIN de seguridad de 6 dígitos autoriza y cierra el envío.",
              },
            ].map((paso) => (
              <div
                key={paso.num}
                className={`bg-white border border-slate-200 border-t-[3.5px] ${paso.borderTop} rounded-xl p-6 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200`}
              >
                <span
                  className={`w-8 h-8 rounded-full ${paso.bgNum} text-white font-extrabold flex items-center justify-center text-sm mb-3.5 shadow-xs`}
                >
                  {paso.num}
                </span>
                <h3 className="m-0 mb-2 text-sm font-extrabold text-tr-navy">{paso.titulo}</h3>
                <p className="m-0 text-xs text-slate-500 leading-relaxed">{paso.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pie de página */}
      <footer
        id="nosotros"
        className="relative z-10 bg-tr-navy text-tr-gray bc-footer-stripe pt-1"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto px-6 py-12">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <img
                src={logoCircular}
                alt=""
                className="w-7 h-7 rounded-full object-cover border border-tr-red"
                draggable={false}
              />
              <span className="text-base font-extrabold text-white">
                Transportes <span className="text-tr-red">Rojas</span>
              </span>
            </div>
            <p className="m-0 text-xs text-tr-gray leading-relaxed">
              Última milla, a nivel nacional. Conectamos México.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="m-0 mb-2 text-xs font-extrabold text-white uppercase tracking-wider">
              Servicios
            </h4>
            <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
              <li>
                <a
                  href="#servicios"
                  className="text-xs text-tr-gray hover:text-white transition-colors"
                >
                  Envíos nacionales
                </a>
              </li>
              <li>
                <a
                  href="#como-funciona"
                  className="text-xs text-tr-gray hover:text-white transition-colors"
                >
                  Recolecciones
                </a>
              </li>
              <li>
                <a
                  href="#servicios"
                  className="text-xs text-tr-gray hover:text-white transition-colors"
                >
                  Devoluciones
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="m-0 mb-2 text-xs font-extrabold text-white uppercase tracking-wider">
              Empresa
            </h4>
            <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
              <li>
                <a
                  href="#nosotros"
                  className="text-xs text-tr-gray hover:text-white transition-colors"
                >
                  Nosotros
                </a>
              </li>
              <li>
                <a
                  href="#rastreo"
                  className="text-xs text-tr-gray hover:text-white transition-colors"
                >
                  Rastreo de guías
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="m-0 mb-2 text-xs font-extrabold text-white uppercase tracking-wider">
              Contacto
            </h4>
            <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
              <li className="text-xs text-tr-gray">01 800 000 0000</li>
              <li>
                <a
                  href="mailto:soporte@transportesrojas.mx"
                  className="text-xs text-tr-gray hover:text-white transition-colors"
                >
                  soporte@transportesrojas.mx
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center py-5 px-6 border-t border-white/10 text-xs text-white/50">
          © {new Date().getFullYear()} Transportes Rojas · Culiacán, Sinaloa
        </div>
      </footer>

      {/* Modales */}
      <ModalCambiarPassword
        abierto={modalPasswordAbierto}
        onClose={() => setModalPasswordAbierto(false)}
      />

      <ClienteModalNuevoEnvio
        abierto={modalNuevoAbierto}
        nombreCliente={nombreCliente}
        emailCliente={emailCliente}
        onClose={() => setModalNuevoAbierto(false)}
        onCreated={handleEnvioCreado}
      />

      {envioACancelar && (
        <ModalCancelarEnvioCliente
          envio={envioACancelar}
          onClose={() => setEnvioACancelar(null)}
          onCancelled={handleEnvioCancelado}
        />
      )}
    </div>
  );
}

function PanelResultado({ resultado }: { resultado: RastreoPublicoResponse }) {
  const meta = obtenerMetaEstadoEnvio(resultado.estado);
  const esEntregado = meta.codigo === "entregado";
  const esFinalizadoConIncidencia =
    meta.codigo === "cancelado" || meta.codigo === "devuelto";

  const eventosCronologicos = [...(resultado.eventos || [])].sort(
    (a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime()
  );

  const origenTexto =
    resultado.origenResumen || resultado.sucursalRecepcionNombre || "Origen registrado";
  const destinoTexto =
    resultado.destinoResumen || resultado.sucursalDestinoNombre || "Destino nacional";

  return (
    <div
      id="resultado-rastreo-cliente"
      className="bg-tr-bg border border-slate-200 rounded-xl p-5 text-tr-ink shadow-xs bc-result-pop mb-2"
    >
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <span className="text-base sm:text-lg font-mono font-extrabold text-tr-navy tracking-tight">
          {resultado.guia}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${meta.badgeClass}`}
        >
          {!esEntregado && !esFinalizadoConIncidencia && <IconoPuntoVivo />}
          {meta.etiqueta}
        </span>
      </div>

      <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 text-xs flex flex-col gap-1">
        <div className="font-bold text-tr-navy flex items-center gap-1.5 flex-wrap">
          <span>{origenTexto}</span>
          <span className="text-tr-red">→</span>
          <span>{destinoTexto}</span>
        </div>
        <div className="text-slate-500 flex items-center justify-between gap-2 flex-wrap">
          <span>
            Paquete: <strong>{resultado.descripcionPaquete}</strong> (
            {Number(resultado.pesoKg).toFixed(2)} kg)
          </span>
          {resultado.intentoReparto > 0 && (
            <span className="font-semibold text-slate-600">
              Intentos de reparto: {resultado.intentoReparto}
            </span>
          )}
        </div>
      </div>

      {eventosCronologicos.length > 0 && (
        <ul className="relative list-none p-0 m-0 mb-4 bc-timeline">
          {eventosCronologicos.map((evento, idx) => {
            const esUltimo = idx === eventosCronologicos.length - 1;
            const metaEv = obtenerMetaEstadoEnvio(evento.estado);

            let dotStyle = "bg-emerald-600 border-emerald-600/30";
            if (esUltimo && !esEntregado) {
              dotStyle = esFinalizadoConIncidencia
                ? "bg-slate-500 border-slate-300"
                : "bg-tr-red border-tr-red/30 bc-pulse-dot";
            }

            return (
              <li key={`${evento.fechaEvento}-${idx}`} className="flex items-start gap-3.5 py-2 relative">
                <span
                  className={`w-4 h-4 rounded-full border-[2.5px] shrink-0 relative z-10 mt-0.5 ${dotStyle}`}
                  aria-label={metaEv.etiqueta}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs sm:text-sm font-bold text-tr-ink m-0 leading-snug">
                      {metaEv.etiqueta}
                    </p>
                    <span className="text-[11px] font-medium text-slate-400">
                      {formatearFechaHora(evento.fechaEvento)}
                    </span>
                  </div>
                  {evento.descripcion && (
                    <span className="text-xs text-slate-600 block mt-0.5 leading-relaxed">
                      {evento.descripcion}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between pt-3.5 border-t border-slate-200">
        <span className="text-xs text-slate-500 font-medium">
          {esEntregado || esFinalizadoConIncidencia ? "Estado final" : "Entrega estimada"}
        </span>
        <span
          className={`text-sm sm:text-base font-extrabold ${meta.codigo === "cancelado" ? "text-slate-500" : "text-tr-navy"
            }`}
        >
          {esEntregado
            ? "Entregado satisfactoriamente"
            : meta.codigo === "cancelado"
              ? "Cancelado (sin entrega programada)"
              : meta.codigo === "devuelto"
                ? "Devuelto al remitente"
                : formatearFechaCorta(resultado.fechaEntregaEstimada)}
        </span>
      </div>
    </div>
  );
}

function ModalCancelarEnvioCliente({
  envio,
  onClose,
  onCancelled,
}: {
  envio: EnvioListadoItem;
  onClose: () => void;
  onCancelled: (actualizado: EnvioDetalleResponse) => void;
}) {
  const { toast } = useToast();
  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    setMotivo("");
    setProcesando(false);
  }, [envio.id]);

  const handleConfirmar = async (e: FormEvent) => {
    e.preventDefault();
    if (procesando) return;

    if (!motivo.trim() || motivo.trim().length < 5) {
      toast.error("Indica brevemente el motivo de la cancelación (mínimo 5 caracteres).");
      return;
    }

    try {
      setProcesando(true);
      const actualizado = await envioService.cancelar(envio.id, {
        motivo: motivo.trim(),
      });
      toast.success(`El envío ${envio.guia} fue cancelado correctamente.`);
      onCancelled(actualizado);
    } catch (err) {
      toast.error(extraerMensajeErrorApi(err, "No fue posible cancelar el envío."));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cancelar-cliente-titulo"
      onClick={(e) => {
        if (e.target === e.currentTarget && !procesando) onClose();
      }}
    >
      <div className="cc-modal !max-w-lg">
        <div className="cc-modal-header">
          <h2 id="modal-cancelar-cliente-titulo" className="cc-modal-title">
            Cancelar Envío {envio.guia}
          </h2>
          <button
            type="button"
            className="cc-btn-close"
            onClick={onClose}
            disabled={procesando}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <form className="cc-form space-y-4" onSubmit={handleConfirmar}>
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 leading-relaxed">
            Estás por cancelar la guía <strong className="font-mono">{envio.guia}</strong> con
            destino a <strong>{envio.destinatarioNombre}</strong>. Esta acción es definitiva y
            anulará cualquier cita de recolección pendiente.
          </div>

          <div className="cc-field">
            <label htmlFor="cliente-motivo-cancelacion">Motivo de cancelación *</label>
            <textarea
              id="cliente-motivo-cancelacion"
              rows={3}
              required
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Error en domicilio capturado, cambio de fecha del pedido..."
            />
          </div>

          <div className="cc-modal-actions">
            <button
              type="button"
              className="cc-btn-cancel"
              onClick={onClose}
              disabled={procesando}
            >
              Volver
            </button>
            <button
              id="btn-confirmar-cancelacion-cliente"
              type="submit"
              disabled={procesando}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#D64545] hover:bg-[#B83232] text-white text-xs font-bold border-none cursor-pointer transition-colors disabled:opacity-60"
            >
              {procesando ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Cancelando...</span>
                </>
              ) : (
                <>
                  <XCircle size={15} />
                  <span>Confirmar cancelación</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FondoDecorativo() {
  return (
    <div className="bc-bg-deco" aria-hidden="true">
      <svg viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice">
        <path
          d="M 60 820 C 320 700, 500 520, 720 460 S 1120 260, 1340 100"
          fill="none"
          stroke={COLOR_ROJO}
          strokeWidth="2.5"
          strokeDasharray="6 12"
          opacity="0.45"
        />
        <circle cx="60" cy="820" r="7" fill={COLOR_VERDE} opacity="0.75" />
        <g transform="translate(1340 100)" opacity="0.6">
          <path
            d="M0 -18 C-8 -18 -14 -12 -14 -4 C-14 6 0 20 0 20 C0 20 14 6 14 -4 C14 -12 8 -18 0 -18 Z"
            fill={COLOR_ROJO}
          />
          <circle cx="0" cy="-5" r="4" fill="#fff" />
        </g>
        <circle cx="720" cy="460" r="7" fill={COLOR_ROJO}>
          <animate
            attributeName="r"
            values="7;12;7"
            dur="2.4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="1;0.4;1"
            dur="2.4s"
            repeatCount="indefinite"
          />
        </circle>
        <g opacity="0.2" fill="#fff">
          <path d="M300 640 l18 -6 -4 18 z" />
          <path d="M980 320 l18 -6 -4 18 z" />
          <path d="M1100 550 l12 -4 -3 12 z" />
        </g>
      </svg>
    </div>
  );
}

function IconoPuntoVivo() {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse"
      aria-hidden="true"
    />
  );
}
