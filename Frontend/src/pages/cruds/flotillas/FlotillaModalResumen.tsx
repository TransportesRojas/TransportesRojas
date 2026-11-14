import { useState, useEffect } from "react";
import { X, Truck, Wrench, Calendar, DollarSign, Loader2 } from "lucide-react";
import type { Flotilla } from "./types";
import { fetchApi } from "../../../services/api";

interface UnidadItem {
  id: number;
  numeroEconomico: string;
  placas: string;
  marca: string;
  modelo: string;
  anio: number;
  estado: string;
  activo: boolean;
}

interface MantenimientoItem {
  id: number;
  unidadId: number;
  unidadPlacas: string;
  tipoMantenimientoNombre: string;
  fecha: string;
  costo: number;
  estatus: string;
  observaciones: string | null;
}

interface FlotillaResumen {
  id: number;
  nombre: string;
  codigo: string | null;
  sucursalNombre: string | null;
  supervisorNombre: string | null;
  activo: boolean;
  unidades: UnidadItem[];
  mantenimientos: MantenimientoItem[];
}

interface FlotillaModalResumenProps {
  abierto: boolean;
  flotilla: Flotilla | null;
  onClose: () => void;
}

export function FlotillaModalResumen({
  abierto,
  flotilla,
  onClose,
}: FlotillaModalResumenProps) {
  const [resumen, setResumen] = useState<FlotillaResumen | null>(null);
  const [cargando, setCargando] = useState(false);
  const [tabActiva, setTabActiva] = useState<"unidades" | "mantenimientos">("unidades");

  useEffect(() => {
    if (abierto && flotilla) {
      setCargando(true);
      fetchApi(`/Flotilla/${flotilla.id}/resumen`)
        .then((data: FlotillaResumen) => setResumen(data))
        .catch((err) => console.error("Error al cargar resumen de flotilla", err))
        .finally(() => setCargando(false));
    }
  }, [abierto, flotilla]);

  if (!abierto || !flotilla) return null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-flotilla-resumen-titulo"
    >
      <div className="cc-modal max-w-3xl">
        <div className="cc-modal-header">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-tr-navy" />
            <h2 id="modal-flotilla-resumen-titulo" className="cc-modal-title">
              Flotilla: <span className="text-tr-red">{flotilla.nombre}</span>
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

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Código</span>
            <span className="font-mono font-bold text-slate-900">{flotilla.codigo || "S/C"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Sucursal</span>
            <span className="font-medium text-slate-800">{resumen?.sucursalNombre || "Central"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Supervisor</span>
            <span className="font-medium text-slate-800">{resumen?.supervisorNombre || "No asignado"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Estado</span>
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${flotilla.activo ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
              {flotilla.activo ? "Activa" : "Inactiva"}
            </span>
          </div>
        </div>

        <div className="flex border-b border-slate-200 mb-3 gap-2">
          <button
            type="button"
            onClick={() => setTabActiva("unidades")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              tabActiva === "unidades"
                ? "border-tr-navy text-tr-navy bg-slate-50 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Unidades Asignadas ({resumen?.unidades?.length ?? 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setTabActiva("mantenimientos")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              tabActiva === "mantenimientos"
                ? "border-tr-navy text-tr-navy bg-slate-50 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Historial Mantenimiento ({resumen?.mantenimientos?.length ?? 0})</span>
          </button>
        </div>

        {cargando ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-tr-navy" />
            <span className="text-xs">Cargando unidades y mantenimientos...</span>
          </div>
        ) : tabActiva === "unidades" ? (
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {!resumen?.unidades || resumen.unidades.length === 0 ? (
              <div className="py-8 text-center text-slate-400 italic text-xs">
                No hay unidades vehiculares asignadas a esta flotilla.
              </div>
            ) : (
              resumen.unidades.map((u) => (
                <div
                  key={u.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50/70 transition-colors flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-tr-navy flex items-center justify-center font-bold">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {u.marca} {u.modelo} ({u.anio})
                      </div>
                      <div className="text-slate-500 font-mono text-[11px]">
                        Económico: <strong className="text-slate-700">{u.numeroEconomico}</strong> &bull; Placas: <strong className="text-slate-700">{u.placas}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {u.estado}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {!resumen?.mantenimientos || resumen.mantenimientos.length === 0 ? (
              <div className="py-8 text-center text-slate-400 italic text-xs">
                No se registran eventos de mantenimiento preventivo o correctivo para esta flotilla.
              </div>
            ) : (
              resumen.mantenimientos.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50/70 transition-colors text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-amber-600" />
                      <span>{m.tipoMantenimientoNombre}</span>
                      <span className="font-mono text-slate-500 text-xs">({m.unidadPlacas})</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-emerald-700">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>${m.costo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{m.fecha}</span>
                      <span className="mx-1">&bull;</span>
                      <span className="font-medium text-slate-700">Estatus: {m.estatus}</span>
                    </div>
                    {m.observaciones && (
                      <span className="italic text-slate-600 max-w-xs truncate">
                        "{m.observaciones}"
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
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
