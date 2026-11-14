import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CalendarClock,
  Ban,
  RotateCcw,
  CheckCircle2,
  Store,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { envioService, extraerMensajeErrorApi } from "../../../services/envioService";
import { useToast } from "../../../components/Toast";
import {
  type EnvioListadoItem,
  type ModoModalEstadoEspecial,
  type SucursalOperativaItem,
  obtenerMetaEstadoEnvio,
} from "./types";

interface EnvioModalEstadoEspecialProps {
  abierto: boolean;
  modo: ModoModalEstadoEspecial;
  envio: EnvioListadoItem | null;
  sucursales: SucursalOperativaItem[];
  onClose: () => void;
  onSuccess: () => void;
}

function obtenerMananaOnceAmLocal(): string {
  const f = new Date();
  f.setDate(f.getDate() + 1);
  f.setHours(11, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}T${pad(
    f.getHours()
  )}:${pad(f.getMinutes())}`;
}

const TITULOS_MODAL: Record<ModoModalEstadoEspecial, string> = {
  reprogramar: "Reporte de Incidencia en Ruta",
  cancelar: "Cancelar Envío y Guía",
  devolucion: "Iniciar Proceso de Devolución",
  confirmar_devolucion: "Recepción y Cierre de Devolución",
};

export function EnvioModalEstadoEspecial({
  abierto,
  modo,
  envio,
  sucursales,
  onClose,
  onSuccess,
}: EnvioModalEstadoEspecialProps) {
  if (!abierto || !envio) return null;

  return (
    <FormularioEstadoEspecialInterno
      key={`${envio.id}-${modo}`}
      modo={modo}
      envio={envio}
      sucursales={sucursales}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function FormularioEstadoEspecialInterno({
  modo,
  envio,
  sucursales,
  onClose,
  onSuccess,
}: {
  modo: ModoModalEstadoEspecial;
  envio: EnvioListadoItem;
  sucursales: SucursalOperativaItem[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const [subTipoIncidencia, setSubTipoIncidencia] = useState<"reprogramar" | "cancelar_devolucion">("reprogramar");
  const [tipoIncidencia, setTipoIncidencia] = useState("cliente_ausente");
  const [nuevaFechaHora, setNuevaFechaHora] = useState(obtenerMananaOnceAmLocal);

  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [origenSolicitud, setOrigenSolicitud] = useState("no_entregable");
  const [sucursalDestinoId, setSucursalDestinoId] = useState(() =>
    envio.sucursalRecepcionId ? String(envio.sucursalRecepcionId) : ""
  );

  const [entregadoAlRemitente, setEntregadoAlRemitente] = useState(true);
  const [aceptadaPorRemitente, setAceptadaPorRemitente] = useState(true);

  const metaEstado = obtenerMetaEstadoEnvio(envio.estado);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    try {
      setGuardando(true);

      if (modo === "reprogramar") {
        if (subTipoIncidencia === "reprogramar") {
          if (!nuevaFechaHora) {
            toast.error("Indica la nueva fecha y hora de entrega reprogramada.");
            setGuardando(false);
            return;
          }
          const parsedFecha = new Date(nuevaFechaHora);
          if (Number.isNaN(parsedFecha.getTime()) || parsedFecha.getTime() <= Date.now()) {
            toast.error("La nueva fecha y hora programada debe ser futura.");
            setGuardando(false);
            return;
          }
          if (!motivo.trim()) {
            toast.error("Especifica el motivo de reprogramación.");
            setGuardando(false);
            return;
          }

          await envioService.reprogramar(envio.id, {
            nuevaFechaHora: parsedFecha.toISOString(),
            tipoIncidencia,
            motivo: motivo.trim(),
          });
          toast.success(`Envío ${envio.guia} reprogramado correctamente.`);
        } else {
          if (!motivo.trim()) {
            toast.error("El motivo de cancelación es obligatorio.");
            setGuardando(false);
            return;
          }

          await envioService.registrarDevolucion(envio.id, {
            motivo: motivo.trim(),
            origenSolicitud: "cancelacion_en_ruta",
            sucursalDestinoId: sucursalDestinoId ? Number(sucursalDestinoId) : null,
            observaciones: observaciones.trim() || null,
          });
          toast.warning(`Envío ${envio.guia} cancelado en ruta e ingresado en estado de Devolución.`);
        }
      } else if (modo === "cancelar") {
        if (!motivo.trim()) {
          toast.error("Especifica el motivo auditable de cancelación.");
          setGuardando(false);
          return;
        }

        await envioService.cancelar(envio.id, {
          motivo: motivo.trim(),
        });
        toast.success(`La guía ${envio.guia} ha sido cancelada.`);
      } else if (modo === "devolucion") {
        if (!motivo.trim()) {
          toast.error("Indica el motivo por el cual el paquete entra en devolución.");
          setGuardando(false);
          return;
        }

        await envioService.registrarDevolucion(envio.id, {
          motivo: motivo.trim(),
          origenSolicitud,
          sucursalDestinoId: sucursalDestinoId ? Number(sucursalDestinoId) : null,
          observaciones: observaciones.trim() || null,
        });
        toast.success(`Proceso de devolución iniciado para la guía ${envio.guia}.`);
      } else {
        await envioService.confirmarDevolucion(envio.id, {
          entregadoAlRemitente,
          aceptadaPorRemitente: entregadoAlRemitente ? aceptadaPorRemitente : true,
          observaciones: observaciones.trim() || null,
        });
        toast.success(
          entregadoAlRemitente
            ? `Devolución cerrada: paquete ${envio.guia} retornado al remitente.`
            : `Arribo en sucursal registrado para la devolución ${envio.guia}.`
        );
      }

      onSuccess();
      onClose();
    } catch (err) {
      toast.error(extraerMensajeErrorApi(err, "No se pudo completar la operación."));
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-estado-especial-titulo"
    >
      <div className="cc-modal !max-w-2xl">
        <div className="cc-modal-header">
          <h2 id="modal-estado-especial-titulo" className="cc-modal-title">
            {TITULOS_MODAL[modo]}
          </h2>
          <button
            type="button"
            className="cc-btn-close"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-[#0B2D4A] px-2.5 py-0.5 rounded-lg bg-white border border-slate-200">
                {envio.guia}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${metaEstado.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${metaEstado.dotClass}`} />
                {metaEstado.etiqueta}
              </span>
            </div>
            <div className="text-xs text-slate-600">
              <strong>Remitente:</strong> {envio.remitenteNombre} ·{" "}
              <strong>Destinatario:</strong> {envio.destinatarioNombre}
            </div>
          </div>
        </div>

        <form className="cc-form space-y-5" onSubmit={handleSubmit}>
          {/* Incidencia y reprogramación */}
          {modo === "reprogramar" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSubTipoIncidencia("reprogramar")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${subTipoIncidencia === "reprogramar"
                      ? "bg-blue-50/90 border-[#0B2D4A] ring-2 ring-[#0B2D4A]/15 font-bold text-[#0B2D4A]"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  <CalendarClock
                    size={20}
                    className={subTipoIncidencia === "reprogramar" ? "text-[#0B2D4A]" : "text-slate-400"}
                  />
                  <div>
                    <div className="text-xs font-bold">Reprogramación</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      Agendar nuevo intento de entrega
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSubTipoIncidencia("cancelar_devolucion")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${subTipoIncidencia === "cancelar_devolucion"
                      ? "bg-rose-50/90 border-[#D64545] ring-2 ring-[#D64545]/15 font-bold text-[#D64545]"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  <Ban
                    size={20}
                    className={subTipoIncidencia === "cancelar_devolucion" ? "text-[#D64545]" : "text-slate-400"}
                  />
                  <div>
                    <div className="text-xs font-bold">Cancelación / Devolución</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      Cancelar y pasar a estado de devolución
                    </div>
                  </div>
                </button>
              </div>

              {subTipoIncidencia === "reprogramar" ? (
                <div className="cc-form-grid !mb-0">
                  <div className="cc-field">
                    <label htmlFor="esp-tipo-incidencia">Tipo de incidencia *</label>
                    <select
                      id="esp-tipo-incidencia"
                      value={tipoIncidencia}
                      onChange={(e) => setTipoIncidencia(e.target.value)}
                    >
                      <option value="cliente_ausente">Destinatario ausente en domicilio</option>
                      <option value="direccion_incorrecta">Dirección incompleta o incorrecta</option>
                      <option value="vial">Contingencia vial / bloqueo / clima</option>
                      <option value="paquete_danado">Incidencia o daño en embalaje</option>
                      <option value="otra">Otra causa operativa</option>
                    </select>
                  </div>

                  <div className="cc-field">
                    <label htmlFor="esp-nueva-fecha">Nueva fecha y hora programada *</label>
                    <input
                      id="esp-nueva-fecha"
                      type="datetime-local"
                      required
                      value={nuevaFechaHora}
                      onChange={(e) => setNuevaFechaHora(e.target.value)}
                    />
                  </div>

                  <div className="cc-field cc-field--wide">
                    <label htmlFor="esp-motivo-reprog">Motivo detallado de reprogramación *</label>
                    <input
                      id="esp-motivo-reprog"
                      type="text"
                      required
                      maxLength={500}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ej. Se acordó vía telefónica nueva visita en horario matutino..."
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Transición a Devolución:</strong> Al confirmar la cancelación por incidencia, el paquete cambiará automáticamente al estado <strong>En Devolución</strong> para regresar a la sucursal de adscripción.
                    </span>
                  </div>

                  <div className="cc-form-grid !mb-0">
                    <div className="cc-field cc-field--wide">
                      <label htmlFor="esp-motivo-cancel-dev">
                        Motivo obligatorio de cancelación / devolución *
                      </label>
                      <textarea
                        id="esp-motivo-cancel-dev"
                        required
                        rows={2}
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Especifique detalladamente el motivo de cancelación (ej. Destinatario rechazó el paquete definitivamente)..."
                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-tr-navy outline-none"
                      />
                    </div>

                    <div className="cc-field">
                      <label htmlFor="esp-suc-retorno">Sucursal de retorno del paquete</label>
                      <select
                        id="esp-suc-retorno"
                        value={sucursalDestinoId}
                        onChange={(e) => setSucursalDestinoId(e.target.value)}
                      >
                        <option value="">-- Misma sucursal de origen --</option>
                        {sucursales.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre} {s.nombreCorto ? `(${s.nombreCorto})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="cc-field">
                      <label htmlFor="esp-obs-cancel-dev">Observaciones adicionales</label>
                      <input
                        id="esp-obs-cancel-dev"
                        type="text"
                        maxLength={500}
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Detalles sobre el estado físico o resguardo..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cancelación */}
          {modo === "cancelar" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-950">
                <AlertTriangle className="w-5 h-5 text-[#D64545] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-[#D64545]">
                    Acción irreversible de baja operativa
                  </div>
                  <p className="leading-relaxed">
                    Al cancelar la guía <strong>{envio.guia}</strong>, se anularán las citas de
                    recolección pendientes y quedará registrado tu usuario y el motivo en la
                    bitácora de auditoría.
                  </p>
                </div>
              </div>

              <div className="cc-field">
                <label htmlFor="esp-motivo-cancelar">Motivo de cancelación *</label>
                <input
                  id="esp-motivo-cancelar"
                  type="text"
                  required
                  maxLength={500}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej. Solicitud expresa del cliente remitente antes de salida a ruta..."
                />
              </div>
            </div>
          )}

          {/* Inicio de devolución */}
          {modo === "devolucion" && (
            <div className="cc-form-grid !mb-0">
              <div className="cc-field">
                <label htmlFor="esp-origen-devolucion">Causa / Origen de devolución *</label>
                <select
                  id="esp-origen-devolucion"
                  value={origenSolicitud}
                  onChange={(e) => setOrigenSolicitud(e.target.value)}
                >
                  <option value="no_entregable">No entregable tras intentos de visita</option>
                  <option value="rechazo_destinatario">Rechazado por el destinatario</option>
                  <option value="solicitud_remitente">Retorno solicitado por el remitente</option>
                </select>
              </div>

              <div className="cc-field">
                <label htmlFor="esp-sucursal-retorno">
                  <span className="inline-flex items-center gap-1">
                    <Store className="w-3.5 h-3.5" />
                    <span>Sucursal destino de retorno</span>
                  </span>
                </label>
                <select
                  id="esp-sucursal-retorno"
                  value={sucursalDestinoId}
                  onChange={(e) => setSucursalDestinoId(e.target.value)}
                >
                  <option value="">Sucursal de origen del envío</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombreCorto || s.nombre}
                      {s.municipio ? ` (${s.municipio})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cc-field cc-field--wide">
                <label htmlFor="esp-motivo-devolucion">Motivo detallado de devolución *</label>
                <input
                  id="esp-motivo-devolucion"
                  type="text"
                  required
                  maxLength={500}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Especifica el motivo por el cual el paquete retorna al remitente..."
                />
              </div>

              <div className="cc-field cc-field--wide">
                <label htmlFor="esp-obs-devolucion">Observaciones de traslado (opcional)</label>
                <input
                  id="esp-obs-devolucion"
                  type="text"
                  maxLength={400}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Condición física del paquete para resguardo en sucursal..."
                />
              </div>
            </div>
          )}

          {/* Cierre de devolución */}
          {modo === "confirmar_devolucion" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEntregadoAlRemitente(true)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${entregadoAlRemitente
                      ? "bg-emerald-50/80 border-[#16A34A] ring-2 ring-emerald-500/15"
                      : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${entregadoAlRemitente
                        ? "bg-[#16A34A] text-white"
                        : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#0B2D4A]">
                      Entregado al Remitente (Cerrar)
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Concluye el ciclo cambiando el estado a <strong>Devuelto</strong>.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEntregadoAlRemitente(false)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${!entregadoAlRemitente
                      ? "bg-blue-50/80 border-[#0B2D4A] ring-2 ring-[#0B2D4A]/15"
                      : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${!entregadoAlRemitente
                        ? "bg-[#0B2D4A] text-white"
                        : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#0B2D4A]">
                      Recibido en Sucursal de Retorno
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Registra arribo en mostrador en espera del remitente.
                    </p>
                  </div>
                </button>
              </div>

              {entregadoAlRemitente && (
                <div className="cc-field">
                  <label htmlFor="esp-conformidad-remitente">
                    Conformidad de recepción del remitente
                  </label>
                  <select
                    id="esp-conformidad-remitente"
                    value={aceptadaPorRemitente ? "si" : "no"}
                    onChange={(e) => setAceptadaPorRemitente(e.target.value === "si")}
                  >
                    <option value="si">Aceptada de conformidad por el remitente</option>
                    <option value="no">Recibida con observaciones / inconformidad</option>
                  </select>
                </div>
              )}

              <div className="cc-field">
                <label htmlFor="esp-obs-cierre-dev">
                  Observaciones de cierre / recepción (opcional)
                </label>
                <input
                  id="esp-obs-cierre-dev"
                  type="text"
                  maxLength={500}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Identificación mostrada por el remitente, estado del paquete..."
                />
              </div>
            </div>
          )}

          <div className="cc-modal-actions">
            <button
              type="button"
              className="cc-btn-cancel"
              onClick={onClose}
              disabled={guardando}
            >
              Volver
            </button>
            <button
              type="submit"
              id="btn-confirmar-estado-especial"
              className={
                modo === "cancelar" || (modo === "reprogramar" && subTipoIncidencia === "cancelar_devolucion")
                  ? "cc-btn-delete"
                  : "cc-btn-save"
              }
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : modo === "reprogramar" ? (
                subTipoIncidencia === "reprogramar" ? (
                  <>
                    <CalendarClock size={16} />
                    <span>Confirmar Reprogramación</span>
                  </>
                ) : (
                  <>
                    <Ban size={16} />
                    <span>Confirmar Cancelación y Devolución</span>
                  </>
                )
              ) : modo === "cancelar" ? (
                <>
                  <Ban size={16} />
                  <span>Confirmar Cancelación</span>
                </>
              ) : modo === "devolucion" ? (
                <>
                  <RotateCcw size={16} />
                  <span>Iniciar Devolución</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Registrar Confirmación</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

