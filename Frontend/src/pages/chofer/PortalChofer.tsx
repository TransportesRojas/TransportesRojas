import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  Navigation,
  MapPin,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  LogOut,
  ShieldCheck,
  Layers,
  ChevronDown,
  KeyRound,
  Gauge,
} from "lucide-react";
import {
  envioService,
  extraerMensajeErrorApi,
  type RutaChoferActivaResponse,
  type ParadaChoferItem,
} from "../../services/envioService";
import { getSession, logoutUsuario } from "../../utils/auth";
import {
  bloquearTeclasNoNumericas,
  limpiarDecimalPositivo,
} from "../../utils/inputValidation";
import { useToast } from "../../components/Toast";
import { ModalCambiarPassword } from "../../components/ModalCambiarPassword";
import { EnvioModalValidarEntrega } from "../cruds/envios/EnvioModalValidarEntrega";
import { EnvioModalEstadoEspecial } from "../cruds/envios/EnvioModalEstadoEspecial";
import { EnvioModalCierreOdometroDia } from "../cruds/envios/EnvioModalCierreOdometroDia";
import { RutaModalNotificarCambio } from "../cruds/rutas/RutaModalNotificarCambio";
import {
  type EnvioListadoItem,
  type SucursalOperativaItem,
  obtenerMetaEstadoEnvio,
} from "../cruds/envios/types";

export default function PortalChofer() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [ruta, setRuta] = useState<RutaChoferActivaResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [iniciandoRecorrido, setIniciandoRecorrido] = useState(false);
  const [kmInicialInput, setKmInicialInput] = useState<string>("");
  const [mostrarModalKmInicial, setMostrarModalKmInicial] = useState(false);

  const [paradaValidar, setParadaValidar] = useState<ParadaChoferItem | null>(null);
  const [paradaReprogramar, setParadaReprogramar] = useState<ParadaChoferItem | null>(null);
  const [modalDesvioAbierto, setModalDesvioAbierto] = useState(false);
  const [modalCierreDiaAbierto, setModalCierreDiaAbierto] = useState(false);
  const [sucursales, setSucursales] = useState<SucursalOperativaItem[]>([]);

  const session = getSession();
  const nombreChofer =
    session.user?.nombreCompleto || session.user?.email || "Operador de Unidad";

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const inicialesChofer =
    nombreChofer
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "CH";

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

  const cargarRuta = useCallback(async () => {
    setCargando(true);
    try {
      const data = await envioService.obtenerRutaChoferActiva();
      setRuta(data);
    } catch (err) {
      console.error("Error al cargar ruta activa del chofer:", err);
      toast.error(
        extraerMensajeErrorApi(err, "No fue posible consultar la ruta activa.")
      );
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarRuta();
    envioService
      .obtenerSucursalesOperativas()
      .then(setSucursales)
      .catch(() => { });
  }, [cargarRuta]);

  const handleCerrarSesion = async () => {
    try {
      await logoutUsuario();
      toast.info("Sesión finalizada.");
      navigate("/login-empleados", { replace: true });
    } catch {
      navigate("/login-empleados", { replace: true });
    }
  };

  const handleConfirmarInicioRuta = async () => {
    if (!ruta || iniciandoRecorrido) return;
    setIniciandoRecorrido(true);
    try {
      const kmNum = kmInicialInput.trim() ? Number(kmInicialInput) : undefined;
      const resp = await envioService.iniciarRecorridoRuta(ruta.rutaId, {
        kmInicialOdometro: kmNum,
      });
      toast.success(
        resp.mensaje ||
        "¡Recorrido iniciado! Los códigos PIN dinámicos fueron enviados a los destinatarios."
      );
      setMostrarModalKmInicial(false);
      setKmInicialInput("");
      await cargarRuta();
    } catch (err) {
      toast.error(
        extraerMensajeErrorApi(err, "No fue posible iniciar el recorrido de la ruta.")
      );
    } finally {
      setIniciandoRecorrido(false);
    }
  };

  const paradaAEnvioItem = (p: ParadaChoferItem): EnvioListadoItem => ({
    id: p.envioId,
    guia: p.guia,
    estado: p.estado,
    remitenteId: 0,
    remitenteNombre: "Remitente Transportes Rojas",
    destinatarioNombre: p.destinatarioNombre,
    destinatarioTelefono: p.destinatarioTelefono,
    destinoCiudadResumen: p.destinoCiudad,
    destinoCalleCompleta: p.destinoDireccion,
    requiereRecoleccion: false,
    pesoKg: p.pesoKg || 1,
    largoCm: 10,
    anchoCm: 10,
    altoCm: 10,
    descripcion: p.tipoPaquete || "Paquete",
    intentoReparto: 1,
    fechaCreacion: new Date().toISOString(),
  });

  const porcentajeProgreso =
    ruta && ruta.totalEnvios > 0
      ? Math.round((ruta.enviosEntregados / ruta.totalEnvios) * 100)
      : 0;

  const esRutaEnTransito = ["en_curso", "en_ruta", "enruta"].includes(
    ruta?.estadoRuta?.toLowerCase() ?? ""
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-16">
      {/* Encabezado de operador */}
      <header className="sticky top-0 z-20 bg-[#0B2D4A] text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#D64545] font-black">
              <Truck size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white">
                  Transportes Rojas
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D64545] text-white">
                  Chofer
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate max-w-[200px] sm:max-w-xs">
                {nombreChofer}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cargarRuta}
              disabled={cargando}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
              title="Actualizar ruta"
            >
              <RotateCw size={17} className={cargando ? "animate-spin" : ""} />
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                id="btn-chofer-menu"
                type="button"
                onClick={() => setMenuAbierto((prev) => !prev)}
                className="flex items-center gap-2.5 bg-white/10 hover:bg-white/18 text-white px-3 py-1.5 rounded-xl border border-white/20 hover:border-white/30 transition-all cursor-pointer select-none group shadow-xs active:scale-[0.99]"
                aria-expanded={menuAbierto}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-lg bg-[#D64545] text-white flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-xs ring-1 ring-white/30">
                  {inicialesChofer}
                </div>

                <div className="hidden sm:flex flex-col text-left leading-tight min-w-0 max-w-[160px]">
                  <span className="text-xs font-bold text-white truncate group-hover:text-white">
                    {nombreChofer}
                  </span>
                  <span className="text-[10px] text-blue-200 font-medium truncate capitalize">
                    Chofer
                  </span>
                </div>

                <ChevronDown
                  size={14}
                  className={`text-white/70 group-hover:text-white transition-transform duration-200 ${menuAbierto ? "rotate-180 text-white" : ""
                    }`}
                />
              </button>

              {menuAbierto && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800 truncate m-0">
                      {nombreChofer}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate m-0 mt-0.5 capitalize">
                      Rol: Chofer / Operador
                    </p>
                  </div>

                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuAbierto(false);
                        setModalPasswordAbierto(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-tr-navy hover:bg-blue-50/70 rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <KeyRound size={15} className="text-[#0B2D4A] shrink-0" />
                      <span>Cambiar contraseña</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      id="btn-chofer-logout"
                      onClick={() => {
                        setMenuAbierto(false);
                        handleCerrarSesion();
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
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {cargando && !ruta ? (
          <div className="p-12 text-center bg-white rounded-3xl shadow-sm border border-slate-200">
            <RotateCw size={32} className="mx-auto text-[#0B2D4A] animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-600">
              Consultando asignación de ruta para hoy...
            </p>
          </div>
        ) : !ruta || ruta.paradas.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <Navigation size={32} />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg font-bold text-slate-800">
                Sin ruta de entrega activa
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                No tienes ninguna ruta operativa asignada en este momento. Las rutas
                son asignadas por el Jefe de Flotilla o Supervisor desde el centro de
                despacho.
              </p>
            </div>
            <button
              onClick={cargarRuta}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B2D4A] hover:bg-[#071E33] text-white text-xs font-bold transition-all shadow-sm"
            >
              <RotateCw size={15} />
              <span>Verificar nueva asignación</span>
            </button>
          </div>
        ) : (
          <>
            {/* Resumen de ruta */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-lg text-[#0B2D4A]">
                      {ruta.nombreRuta || `Ruta #${ruta.rutaId}`}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${esRutaEnTransito
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-blue-100 text-blue-800 border border-blue-300"
                        }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${esRutaEnTransito
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-blue-500"
                          }`}
                      />
                      {esRutaEnTransito ? "En Tránsito Activo" : "Ruta Planeada"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Truck size={14} className="text-[#D64545]" />
                      Unidad: {ruta.unidadPlacas || "Sin placas"} (
                      {ruta.unidadNumeroEconomico || "Eco"})
                    </span>
                    <span>•</span>
                    <span>{ruta.totalEnvios} paquetes totales</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!esRutaEnTransito ? (
                    <button
                      type="button"
                      id="btn-chofer-iniciar-ruta"
                      onClick={() => {
                        setKmInicialInput("");
                        setMostrarModalKmInicial(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Play size={15} fill="currentColor" />
                      <span>Iniciar Recorrido (Salida)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="btn-chofer-notificar-desvio"
                      onClick={() => setModalDesvioAbierto(true)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-300 font-bold text-xs transition-all cursor-pointer"
                    >
                      <AlertTriangle size={15} />
                      <span>Notificar Desvío Vial</span>
                    </button>
                  )}

                  {ruta.unidadId && (
                    <button
                      type="button"
                      id="btn-chofer-cierre-odometro"
                      onClick={() => setModalCierreDiaAbierto(true)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0B2D4A]/5 hover:bg-[#0B2D4A]/10 text-[#0B2D4A] border border-slate-300 font-bold text-xs transition-all cursor-pointer"
                    >
                      <Gauge size={15} />
                      <span>Cierre de Odómetro</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Progreso de entregas del día</span>
                  <span className="font-mono text-[#0B2D4A]">
                    {ruta.enviosEntregados} de {ruta.totalEnvios} ({porcentajeProgreso}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-[#0B2D4A] to-[#16A34A] transition-all duration-500 rounded-full"
                    style={{ width: `${porcentajeProgreso}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Itinerario de paradas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={16} className="text-[#0B2D4A]" />
                  <span>Itinerario de Paradas ({ruta.paradas.length})</span>
                </h3>
                <span className="text-xs text-slate-500">Orden de visita</span>
              </div>

              <div className="space-y-3">
                {ruta.paradas.map((parada, idx) => {
                  const meta = obtenerMetaEstadoEnvio(parada.estado);
                  const entregado =
                    parada.estado?.toLowerCase() === "entregado";
                  const reprogramado =
                    parada.estado?.toLowerCase() === "reprogramado";

                  return (
                    <div
                      key={parada.envioId}
                      className={`bg-white rounded-2xl p-4 sm:p-5 shadow-sm border transition-all ${entregado
                        ? "border-emerald-200 bg-emerald-50/20 opacity-80"
                        : reprogramado
                          ? "border-amber-200 bg-amber-50/20"
                          : "border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-sm shrink-0 ${entregado
                              ? "bg-emerald-500 text-white"
                              : "bg-[#0B2D4A] text-white"
                              }`}
                          >
                            {entregado ? <CheckCircle2 size={18} /> : `#${idx + 1}`}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                {parada.guia}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${meta.badgeClass}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`}
                                />
                                {meta.etiqueta}
                              </span>
                            </div>

                            <h4 className="font-bold text-sm text-slate-900">
                              {parada.destinatarioNombre}
                            </h4>

                            <div className="flex items-start gap-1.5 text-xs text-slate-600">
                              <MapPin
                                size={14}
                                className="text-[#D64545] shrink-0 mt-0.5"
                              />
                              <span>
                                {parada.destinoDireccion} ·{" "}
                                <strong className="text-slate-700">
                                  {parada.destinoCiudad}
                                </strong>
                              </span>
                            </div>

                            {parada.observaciones && (
                              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                                {parada.observaciones}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap sm:flex-col items-stretch gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          {parada.destinatarioTelefono && (
                            <a
                              href={`tel:${parada.destinatarioTelefono}`}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                            >
                              <Phone size={13} className="text-[#16A34A]" />
                              <span>{parada.destinatarioTelefono}</span>
                            </a>
                          )}

                          {!entregado && (
                            <>
                              <button
                                onClick={() => setParadaValidar(parada)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0B2D4A] hover:bg-[#071E33] text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                              >
                                <ShieldCheck size={14} className="text-emerald-400" />
                                <span>Validar Entrega</span>
                              </button>

                              <button
                                onClick={() => setParadaReprogramar(parada)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-600 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
                              >
                                <AlertTriangle size={13} className="text-amber-600" />
                                <span>Incidencia</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modales operativos */}
      {mostrarModalKmInicial && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Play size={24} fill="currentColor" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                Iniciar Recorrido de Ruta
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Al confirmar la salida, el sistema cambiará el estado de los paquetes a{" "}
                <strong>En Ruta</strong>, generará el <strong>código PIN dinámico</strong>{" "}
                de 6 dígitos para cada destinatario y les enviará la notificación por SMS.
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label
                htmlFor="chofer-km-inicial-input"
                className="text-xs font-bold text-slate-700"
              >
                Kilometraje Inicial del Odómetro (opcional)
              </label>
              <input
                id="chofer-km-inicial-input"
                type="text"
                inputMode="decimal"
                value={kmInicialInput}
                onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
                onChange={(e) => setKmInicialInput(limpiarDecimalPositivo(e.target.value, 2))}
                placeholder="Ej. 125430"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0B2D4A]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMostrarModalKmInicial(false);
                  setKmInicialInput("");
                }}
                disabled={iniciandoRecorrido}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarInicioRuta}
                disabled={iniciandoRecorrido}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                {iniciandoRecorrido ? "Iniciando..." : "Confirmar Salida"}
              </button>
            </div>
          </div>
        </div>
      )}

      {paradaValidar && (
        <EnvioModalValidarEntrega
          abierto={Boolean(paradaValidar)}
          envio={paradaAEnvioItem(paradaValidar)}
          onClose={() => setParadaValidar(null)}
          onSuccess={() => {
            setParadaValidar(null);
            cargarRuta();
          }}
        />
      )}

      {paradaReprogramar && (
        <EnvioModalEstadoEspecial
          abierto={Boolean(paradaReprogramar)}
          modo="reprogramar"
          envio={paradaAEnvioItem(paradaReprogramar)}
          sucursales={sucursales}
          onClose={() => setParadaReprogramar(null)}
          onSuccess={() => {
            setParadaReprogramar(null);
            cargarRuta();
          }}
        />
      )}

      {modalDesvioAbierto && ruta && (
        <RutaModalNotificarCambio
          abierto={modalDesvioAbierto}
          rutaId={ruta.rutaId}
          folioRuta={ruta.nombreRuta}
          choferNombre={nombreChofer}
          unidadPlacas={ruta.unidadPlacas || undefined}
          onClose={() => setModalDesvioAbierto(false)}
          onSuccess={() => {
            setModalDesvioAbierto(false);
            cargarRuta();
          }}
        />
      )}

      <ModalCambiarPassword
        abierto={modalPasswordAbierto}
        onClose={() => setModalPasswordAbierto(false)}
      />

      <EnvioModalCierreOdometroDia
        abierto={modalCierreDiaAbierto}
        unidadIdPrefijado={ruta?.unidadId}
        onClose={() => setModalCierreDiaAbierto(false)}
        onSuccess={cargarRuta}
      />
    </div>
  );
}

