import { useState, useEffect } from "react";
import { X, History, Calendar, Loader2 } from "lucide-react";
import type { Empleado, HistorialPuestoItem } from "./types";
import { fetchApi } from "../../../services/api";

interface EmpleadoModalHistorialPuestosProps {
  abierto: boolean;
  empleado: Empleado | null;
  onClose: () => void;
}

export function EmpleadoModalHistorialPuestos({
  abierto,
  empleado,
  onClose,
}: EmpleadoModalHistorialPuestosProps) {
  const [historial, setHistorial] = useState<HistorialPuestoItem[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (abierto && empleado) {
      setCargando(true);
      fetchApi(`/Empleado/${empleado.id}/puestos-historial`)
        .then((data) => setHistorial(data || []))
        .catch((err) => console.error("Error al cargar historial", err))
        .finally(() => setCargando(false));
    }
  }, [abierto, empleado]);

  if (!abierto || !empleado) return null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-historial-titulo"
    >
      <div className="cc-modal max-w-xl">
        <div className="cc-modal-header">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-tr-navy" />
            <h2 id="modal-historial-titulo" className="cc-modal-title">
              Historial de Puestos
            </h2>
          </div>
          <button
            className="cc-btn-close"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 mb-4">
          <div className="font-bold text-slate-900 text-sm">
            {empleado.nombre} {empleado.apellidoPaterno} {empleado.apellidoMaterno}
          </div>
          <div className="text-slate-500 mt-0.5">
            Ingreso: {empleado.fechaIngreso} &bull; Puesto actual:{" "}
            <span className="font-semibold text-slate-800">
              {empleado.puestoNombre || "Sin puesto"}
            </span>
          </div>
        </div>

        {cargando ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-tr-navy" />
            <span className="text-xs">Cargando historial de puestos...</span>
          </div>
        ) : historial.length === 0 ? (
          <div className="py-8 text-center text-slate-400 italic text-xs">
            No se registran cambios de puesto para este empleado.
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {historial.map((h, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    {h.puestoNombre}
                    {h.fechaFin === null && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold uppercase">
                        Vigente
                      </span>
                    )}
                  </div>
                  {h.motivoCambio && (
                    <div className="text-slate-600 mt-1 italic">
                      Motivo: {h.motivoCambio}
                    </div>
                  )}
                </div>
                <div className="text-right text-slate-500 shrink-0 flex items-center gap-1 font-mono text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {h.fechaInicio} &rarr; {h.fechaFin ? h.fechaFin : "Actualidad"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="cc-modal-actions mt-4">
          <button type="button" className="cc-btn-cancel" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
