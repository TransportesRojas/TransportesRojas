import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Store,
  Truck,
  Scale,
  Package,
  Loader2,
  CheckCircle2,
  Camera,
} from "lucide-react";
import { envioService, extraerMensajeErrorApi } from "../../../services/envioService";
import { useToast } from "../../../components/Toast";
import { BotonSubirFoto } from "../../../components/BotonSubirFoto";
import {
  bloquearTeclasNoNumericas,
  limpiarDecimalPositivo,
} from "../../../utils/inputValidation";
import {
  type EnvioListadoItem,
  type ModoModalRecepcion,
  type SucursalOperativaItem,
  obtenerMetaEstadoEnvio,
} from "./types";

interface EnvioModalRecepcionProps {
  abierto: boolean;
  modo: ModoModalRecepcion;
  envio: EnvioListadoItem | null;
  sucursales: SucursalOperativaItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EnvioModalRecepcion({
  abierto,
  modo,
  envio,
  sucursales,
  onClose,
  onSuccess,
}: EnvioModalRecepcionProps) {
  if (!abierto || !envio) return null;

  return (
    <FormularioRecepcionInterno
      key={`${envio.id}-${modo}`}
      modo={modo}
      envio={envio}
      sucursales={sucursales}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function FormularioRecepcionInterno({
  modo,
  envio,
  sucursales,
  onClose,
  onSuccess,
}: {
  modo: ModoModalRecepcion;
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

  const [pesoVerificadoKg, setPesoVerificadoKg] = useState(() =>
    Number(envio.pesoKg).toFixed(2)
  );
  const [largoVerificadoCm, setLargoVerificadoCm] = useState(() => String(envio.largoCm));
  const [anchoVerificadoCm, setAnchoVerificadoCm] = useState(() => String(envio.anchoCm));
  const [altoVerificadoCm, setAltoVerificadoCm] = useState(() => String(envio.altoCm));
  const [sucursalId, setSucursalId] = useState(() =>
    envio.sucursalRecepcionId ? String(envio.sucursalRecepcionId) : ""
  );
  const [evidenciaFotoUrl] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const metaEstado = obtenerMetaEstadoEnvio(envio.estado);

  const diferenciaPeso = useMemo(() => {
    const pReal = Number(pesoVerificadoKg);
    if (!Number.isFinite(pReal) || pReal <= 0) return null;
    return Number((pReal - Number(envio.pesoKg)).toFixed(2));
  }, [pesoVerificadoKg, envio.pesoKg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    try {
      setGuardando(true);

      if (modo === "recoleccion") {
        await envioService.confirmarRecoleccion(envio.id, {
          observaciones: observaciones.trim() || null,
        });
        toast.success(`Recolección confirmada para la guía ${envio.guia}.`);
      } else {
        const pesoNum = Number(pesoVerificadoKg);
        const largoNum = Number(largoVerificadoCm);
        const anchoNum = Number(anchoCmSanitized(anchoVerificadoCm));
        const altoNum = Number(altoVerificadoCm);

        if (!Number.isFinite(pesoNum) || pesoNum <= 0) {
          toast.error("El peso verificado en báscula debe ser mayor a 0 kg.");
          setGuardando(false);
          return;
        }
        if (
          !Number.isFinite(largoNum) ||
          largoNum <= 0 ||
          !Number.isFinite(anchoNum) ||
          anchoNum <= 0 ||
          !Number.isFinite(altoNum) ||
          altoNum <= 0
        ) {
          toast.error("Las dimensiones verificadas deben ser mayores a 0 cm.");
          setGuardando(false);
          return;
        }

        await envioService.registrarRecepcion(envio.id, {
          pesoVerificadoKg: pesoNum,
          largoVerificadoCm: largoNum,
          anchoVerificadoCm: anchoNum,
          altoVerificadoCm: altoNum,
          sucursalId: sucursalId ? Number(sucursalId) : null,
          evidenciaFotoUrl: evidenciaFotoUrl.trim() || null,
          observaciones: observaciones.trim() || null,
        });
        toast.success(`Paquete ${envio.guia} recibido y verificado en sucursal.`);
      }

      onSuccess();
      onClose();
    } catch (err) {
      toast.error(extraerMensajeErrorApi(err, "No fue posible registrar la operación."));
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-recepcion-envio-titulo"
    >
      <div className="cc-modal !max-w-2xl">
        <div className="cc-modal-header">
          <h2 id="modal-recepcion-envio-titulo" className="cc-modal-title">
            {modo === "recoleccion"
              ? "Confirmar Recolección a Domicilio"
              : "Recepción y Pesaje en Sucursal"}
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
              <strong>Destino:</strong> {envio.destinoCiudadResumen || "Nacional"}
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="text-[10.5px] font-bold uppercase text-slate-400 block">
              Documentado
            </span>
            <span className="font-extrabold text-[#0B2D4A]">
              {Number(envio.pesoKg).toFixed(2)} kg ({envio.largoCm}×{envio.anchoCm}×
              {envio.altoCm} cm)
            </span>
          </div>
        </div>

        <form className="cc-form space-y-5" onSubmit={handleSubmit}>
          {modo === "recoleccion" ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-sky-50/80 border border-sky-200 text-xs text-sky-950 flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                <div>
                  Al confirmar la recolección, la cita programada quedará marcada como{" "}
                  <strong>Atendida</strong> y el envío pasará al estado{" "}
                  <strong>Recolectado</strong> listo para ingresar a sucursal o asignarse a
                  hoja de ruta.
                </div>
              </div>

              <div className="cc-field">
                <label htmlFor="rec-obs-domicilio">
                  Observaciones de recolección (opcional)
                </label>
                <input
                  id="rec-obs-domicilio"
                  type="text"
                  maxLength={500}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej. Paquete sellado recibido de manos del remitente sin daños..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0B2D4A] inline-flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-[#D64545]" />
                  <span>Verificación Física en Báscula y Cinta</span>
                </span>

                {diferenciaPeso !== null && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      Math.abs(diferenciaPeso) < 0.01
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {Math.abs(diferenciaPeso) < 0.01
                      ? "Coincide con peso declarado"
                      : `Diferencia en báscula: ${diferenciaPeso > 0 ? "+" : ""}${diferenciaPeso} kg`}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="cc-field">
                  <label htmlFor="rec-peso">Peso báscula (kg) *</label>
                  <input
                    id="rec-peso"
                    type="text"
                    inputMode="decimal"
                    required
                    value={pesoVerificadoKg}
                    onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
                    onChange={(e) => setPesoVerificadoKg(limpiarDecimalPositivo(e.target.value, 2))}
                  />
                </div>

                <div className="cc-field">
                  <label htmlFor="rec-largo">Largo real (cm) *</label>
                  <input
                    id="rec-largo"
                    type="text"
                    inputMode="decimal"
                    required
                    value={largoVerificadoCm}
                    onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
                    onChange={(e) => setLargoVerificadoCm(limpiarDecimalPositivo(e.target.value, 2))}
                  />
                </div>

                <div className="cc-field">
                  <label htmlFor="rec-ancho">Ancho real (cm) *</label>
                  <input
                    id="rec-ancho"
                    type="text"
                    inputMode="decimal"
                    required
                    value={anchoVerificadoCm}
                    onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
                    onChange={(e) => setAnchoVerificadoCm(limpiarDecimalPositivo(e.target.value, 2))}
                  />
                </div>

                <div className="cc-field">
                  <label htmlFor="rec-alto">Alto real (cm) *</label>
                  <input
                    id="rec-alto"
                    type="text"
                    inputMode="decimal"
                    required
                    value={altoVerificadoCm}
                    onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
                    onChange={(e) => setAltoVerificadoCm(limpiarDecimalPositivo(e.target.value, 2))}
                  />
                </div>
              </div>

              <div className="cc-form-grid !mb-0">
                <div className="cc-field">
                  <label htmlFor="rec-sucursal">
                    <span className="inline-flex items-center gap-1">
                      <Store className="w-3.5 h-3.5" />
                      <span>Sucursal de Recepción</span>
                    </span>
                  </label>
                  <select
                    id="rec-sucursal"
                    value={sucursalId}
                    onChange={(e) => setSucursalId(e.target.value)}
                  >
                    <option value="">Sucursal adscrita del operador / guía</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombreCorto || s.nombre}
                        {s.municipio ? ` (${s.municipio})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cc-field">
                  <label htmlFor="rec-foto">
                    <span className="inline-flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Evidencia fotográfica (opcional)</span>
                    </span>
                  </label>
                  <BotonSubirFoto id="rec-foto" />
                </div>

                <div className="cc-field cc-field--wide">
                  <label htmlFor="rec-observaciones">
                    Observaciones de recepción en mostrador (opcional)
                  </label>
                  <input
                    id="rec-observaciones"
                    type="text"
                    maxLength={500}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Estado del empaque, sellos de seguridad, etiquetas..."
                  />
                </div>
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
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-confirmar-recepcion-envio"
              className="cc-btn-save"
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : modo === "recoleccion" ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirmar Recolección</span>
                </>
              ) : (
                <>
                  <Package size={16} />
                  <span>Confirmar Recepción en Sucursal</span>
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

function anchoCmSanitized(val: string): string {
  return val.trim();
}

