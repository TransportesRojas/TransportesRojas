import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Camera,
  PenTool,
  Loader2,
  Phone,
  RotateCcw,
  Check,
} from "lucide-react";
import { envioService, extraerMensajeErrorApi } from "../../../services/envioService";
import { useToast } from "../../../components/Toast";
import { type EnvioListadoItem, obtenerMetaEstadoEnvio } from "./types";
import {
  bloquearTeclasNoNumericas,
  limpiarSoloDigitos,
} from "../../../utils/inputValidation";

interface EnvioModalValidarEntregaProps {
  abierto: boolean;
  envio: EnvioListadoItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EnvioModalValidarEntrega({
  abierto,
  envio,
  onClose,
  onSuccess,
}: EnvioModalValidarEntregaProps) {
  if (!abierto || !envio) return null;

  return (
    <FormularioValidarEntregaInterno
      key={envio.id}
      envio={envio}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function FormularioValidarEntregaInterno({
  envio,
  onClose,
  onSuccess,
}: {
  envio: EnvioListadoItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [guardando, setGuardando] = useState(false);

  const [codigoSeguridad, setCodigoSeguridad] = useState("");
  const [evidenciaFotoUrl, setEvidenciaFotoUrl] = useState("");
  const [evidenciaFotoNombre, setEvidenciaFotoNombre] = useState("");
  const [firmaUrl, setFirmaUrl] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Firma digital en canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [firmando, setFirmando] = useState(false);
  const [tieneFirmaEnCanvas, setTieneFirmaEnCanvas] = useState(false);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const metaEstado = obtenerMetaEstadoEnvio(envio.estado);

  // Evidencia fotográfica
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La fotografía no puede superar 5 MB de tamaño.");
      return;
    }

    setEvidenciaFotoNombre(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") {
        setEvidenciaFotoUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Trazado en canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setFirmando(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!firmando) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0B2D4A";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setTieneFirmaEnCanvas(true);
  };

  const stopDrawing = () => {
    if (!firmando) return;
    setFirmando(false);
    const canvas = canvasRef.current;
    if (canvas && tieneFirmaEnCanvas) {
      setFirmaUrl(canvas.toDataURL("image/png"));
    }
  };

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTieneFirmaEnCanvas(false);
    setFirmaUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    if (!evidenciaFotoUrl) {
      toast.error("La foto de evidencia de la entrega es obligatoria.");
      return;
    }

    const firmaFinal = firmaUrl || (tieneFirmaEnCanvas && canvasRef.current ? canvasRef.current.toDataURL("image/png") : "");
    if (!firmaFinal) {
      toast.error("La firma de recibido del destinatario es obligatoria.");
      return;
    }

    if (!observaciones.trim()) {
      toast.error("La nota de entrega es obligatoria.");
      return;
    }

    const pinLimpio = codigoSeguridad.replace(/\D/g, "");

    try {
      setGuardando(true);
      await envioService.validarEntrega(envio.id, {
        entregaExitosa: true,
        codigoSeguridad: pinLimpio.length === 6 ? pinLimpio : null,
        observaciones: observaciones.trim(),
        evidenciaFotoUrl: evidenciaFotoUrl.trim(),
        firmaUrl: firmaFinal,
        kmFinalOdometro: null,
      });

      toast.success(`¡Entrega confirmada exitosamente para la guía ${envio.guia}!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(extraerMensajeErrorApi(err, "No fue posible procesar la confirmación de entrega."));
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-validar-entrega-titulo"
    >
      <div className="cc-modal !max-w-2xl">
        <div className="cc-modal-header">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 id="modal-validar-entrega-titulo" className="cc-modal-title">
              Confirmación de Entrega en Destino
            </h2>
          </div>
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

        <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
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
            <div className="text-xs text-slate-700 font-semibold">
              Recibe: {envio.destinatarioNombre} ·{" "}
              <span className="text-slate-500 font-normal">
                {envio.destinoCiudadResumen || "Domicilio destino"}
              </span>
            </div>
          </div>

          {envio.destinatarioTelefono && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-[#0B2D4A]">
              <Phone className="w-3.5 h-3.5 text-[#D64545]" />
              <span>{envio.destinatarioTelefono}</span>
            </div>
          )}
        </div>

        <form className="cc-form space-y-4" onSubmit={handleSubmit}>
          <div className="p-3.5 rounded-2xl bg-[#0B2D4A]/5 border border-[#0B2D4A]/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left space-y-0.5">
              <label
                htmlFor="val-pin-seguridad"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B2D4A]"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>PIN de Seguridad del Destinatario (6 dígitos)</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Ingresa el código si el cliente lo recibió por SMS / Correo.
              </p>
            </div>

            <div className="w-36 shrink-0">
              <input
                id="val-pin-seguridad"
                type="text"
                inputMode="numeric"
                value={codigoSeguridad}
                onKeyDown={(e) => bloquearTeclasNoNumericas(e, false)}
                onChange={(e) =>
                  setCodigoSeguridad(limpiarSoloDigitos(e.target.value, 6))
                }
                placeholder="000000"
                className="w-full text-center font-mono text-lg font-black tracking-widest py-1.5 px-2 rounded-xl bg-white border border-slate-300 focus:border-[#0B2D4A] outline-none text-[#0B2D4A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-tr-navy" />
                  <span>Foto de Evidencia *</span>
                </span>
                {evidenciaFotoUrl && (
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Check size={12} /> Adjunta
                  </span>
                )}
              </label>

              <div className="border border-dashed border-slate-300 hover:border-tr-navy rounded-xl p-3 bg-slate-50 text-center transition-colors">
                {evidenciaFotoUrl ? (
                  <div className="space-y-2">
                    <img
                      src={evidenciaFotoUrl}
                      alt="Evidencia entrega"
                      className="max-h-28 mx-auto rounded-lg object-contain border border-slate-200"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[11px] text-slate-600 truncate max-w-[160px]">
                        {evidenciaFotoNombre || "Foto capturada"}
                      </span>
                      <label
                        htmlFor="input-cambiar-foto"
                        className="text-[11px] text-tr-navy font-bold hover:underline cursor-pointer"
                      >
                        Cambiar
                      </label>
                      <input
                        id="input-cambiar-foto"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFotoChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="input-subir-foto"
                    className="flex flex-col items-center justify-center py-4 cursor-pointer group"
                  >
                    <Camera className="w-8 h-8 text-slate-400 group-hover:text-tr-navy transition-colors mb-1" />
                    <span className="text-xs font-bold text-tr-navy group-hover:underline">
                      Tomar foto o subir evidencia
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      JPG, PNG o WEBP (máx. 5MB)
                    </span>
                    <input
                      id="input-subir-foto"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFotoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-tr-navy" />
                  <span>Firma de Recibido *</span>
                </label>
                {tieneFirmaEnCanvas && (
                  <button
                    type="button"
                    onClick={limpiarFirma}
                    className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1 font-semibold"
                  >
                    <RotateCcw size={11} /> Limpiar
                  </button>
                )}
              </div>

              <div className="border border-slate-300 rounded-xl bg-white overflow-hidden shadow-2xs relative">
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={115}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[115px] bg-white cursor-crosshair touch-none"
                />
                {!tieneFirmaEnCanvas && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs italic">
                    Dibujar firma aquí con el dedo o mouse
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="cc-field cc-field--wide !mt-2">
            <label htmlFor="val-observaciones" className="font-bold text-slate-700 text-xs">
              Nota de Entrega *
            </label>
            <input
              id="val-observaciones"
              type="text"
              required
              maxLength={500}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej. Entregado a titular con credencial de elector. Todo en orden."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm focus:border-tr-navy outline-none"
            />
          </div>

          <div className="cc-modal-actions pt-2 border-t border-slate-100">
            <button
              type="button"
              className="cc-btn-cancel"
              onClick={onClose}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-confirmar-validar-entrega"
              className="cc-btn-save flex items-center justify-center gap-2"
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Confirmando entrega...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirmar Entrega</span>
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
