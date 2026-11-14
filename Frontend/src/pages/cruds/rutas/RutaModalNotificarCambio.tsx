import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, Send, Loader2, Navigation, MapPin } from "lucide-react";
import { envioService, extraerMensajeErrorApi } from "../../../services/envioService";
import { useToast } from "../../../components/Toast";
import type { NotificarCambioRutaPayload } from "../envios/types";

interface RutaModalNotificarCambioProps {
  abierto: boolean;
  rutaId: number;
  folioRuta?: string;
  choferNombre?: string;
  unidadPlacas?: string;
  onClose: () => void;
  onSuccess: (folioGenerado: string) => void;
}

const MOTIVOS_SUGERIDOS = [
  "Cierre vial temporal por obras o mantenimiento",
  "Accidente vehicular o bloqueo de tránsito",
  "Manifestación o evento público en vía principal",
  "Inundación, socavón o derrumbe en la calzada",
  "Falla mecánica temporal / Desvío a taller de apoyo",
  "Otro motivo operativo de fuerza mayor",
];

export function RutaModalNotificarCambio({
  abierto,
  rutaId,
  folioRuta,
  choferNombre,
  unidadPlacas,
  onClose,
  onSuccess,
}: RutaModalNotificarCambioProps) {
  const { toast } = useToast();
  const [motivo, setMotivo] = useState(MOTIVOS_SUGERIDOS[0]);
  const [motivoPersonalizado, setMotivoPersonalizado] = useState("");
  const [referenciaLugar, setReferenciaLugar] = useState("");
  const [descripcionTrayecto, setDescripcionTrayecto] = useState("");
  const [afectaEntrega, setAfectaEntrega] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setMotivo(MOTIVOS_SUGERIDOS[0]);
    setMotivoPersonalizado("");
    setReferenciaLugar("");
    setDescripcionTrayecto("");
    setAfectaEntrega(false);
    setEnviando(false);
  }, [abierto, rutaId]);

  if (!abierto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;

    const motivoFinal =
      motivo === "Otro motivo operativo de fuerza mayor"
        ? motivoPersonalizado.trim()
        : motivo.trim();

    if (!motivoFinal) {
      toast.warning("Por favor, especifica el motivo del cambio de ruta o desvío.");
      return;
    }

    if (!descripcionTrayecto.trim()) {
      toast.warning("Debes describir el trayecto alternativo tomado.");
      return;
    }

    try {
      setEnviando(true);
      const payload: NotificarCambioRutaPayload = {
        motivo: motivoFinal,
        referenciaLugar: referenciaLugar.trim() || null,
        descripcionTrayecto: descripcionTrayecto.trim(),
        afectaEntrega,
        fechaEvento: new Date().toISOString(),
      };

      const resultado = await envioService.notificarCambioRuta(rutaId, payload);
      toast.success(
        `Desvío notificado con éxito. Folio registrado: ${resultado.folio}`
      );
      onSuccess(resultado.folio);
      onClose();
    } catch (err) {
      toast.error(extraerMensajeErrorApi(err, "Error al notificar el cambio de trayecto."));
    } finally {
      setEnviando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">
                Notificar Cambio de Trayecto
              </h3>
              <p className="text-xs text-amber-100">
                {folioRuta ? `Ruta: ${folioRuta}` : `Ruta #${rutaId}`}
                {choferNombre ? ` · Chofer: ${choferNombre}` : ""}
                {unidadPlacas ? ` · Unidad: ${unidadPlacas}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={enviando}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
            <strong>Aviso de seguridad operativa:</strong> Este reporte notifica de inmediato al
            Jefe de Flotilla y a Supervisión sobre cualquier desvío de la ruta original, registrando
            un folio formal con validez operativa.
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Motivo del Desvío o Cambio vial <span className="text-red-500">*</span>
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full text-sm rounded-xl border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              {MOTIVOS_SUGERIDOS.map((m, idx) => (
                <option key={idx} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {motivo === "Otro motivo operativo de fuerza mayor" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Especifique el motivo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={motivoPersonalizado}
                onChange={(e) => setMotivoPersonalizado(e.target.value)}
                placeholder="Describe brevemente la causa del desvío..."
                className="w-full text-sm rounded-xl border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                maxLength={250}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Lugar / Tramo o Intersección afectada
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={referenciaLugar}
                onChange={(e) => setReferenciaLugar(e.target.value)}
                placeholder="Ej. Crucero Blvd. Pedro Infante y Pte. Hidalgo"
                className="w-full text-sm rounded-xl border border-slate-300 pl-9 pr-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                maxLength={250}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Descripción del Trayecto Alternativo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Navigation className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                value={descripcionTrayecto}
                onChange={(e) => setDescripcionTrayecto(e.target.value)}
                rows={3}
                placeholder="Ej. Se tomó vía alterna por Blvd. Zaragoza Maytorena hacia Tres Ríos, evitando el congestionamiento..."
                className="w-full text-sm rounded-xl border border-slate-300 pl-9 pr-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                maxLength={500}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {descripcionTrayecto.length}/500 caracteres
            </p>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <input
              type="checkbox"
              id="afectaEntrega"
              checked={afectaEntrega}
              onChange={(e) => setAfectaEntrega(e.target.checked)}
              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="afectaEntrega" className="text-xs text-slate-700 cursor-pointer">
              <strong>¿Se prevé afectación o retraso en alguna entrega?</strong>
              <span className="block text-slate-500 text-[11px] mt-0.5">
                Marca esta casilla si el desvío puede demorar la hora comprometida con los destinatarios.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registrando aviso...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Emitir Aviso al Jefe de Flotilla
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

