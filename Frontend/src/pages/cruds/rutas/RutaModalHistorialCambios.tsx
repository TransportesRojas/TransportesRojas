import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  History,
  AlertTriangle,
  Search,
  CheckCircle2,
  Truck,
  User,
  MapPin,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { envioService, extraerMensajeErrorApi } from "../../../services/envioService";
import { useToast } from "../../../components/Toast";
import type { CambioRutaItemResponse } from "../envios/types";

interface RutaModalHistorialCambiosProps {
  abierto: boolean;
  rutaIdFiltro?: number | null;
  onClose: () => void;
}

export function RutaModalHistorialCambios({
  abierto,
  rutaIdFiltro,
  onClose,
}: RutaModalHistorialCambiosProps) {
  const { toast } = useToast();
  const [cambios, setCambios] = useState<CambioRutaItemResponse[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [detalleSeleccionado, setDetalleSeleccionado] =
    useState<CambioRutaItemResponse | null>(null);

  const cargarHistorial = useCallback(async () => {
    try {
      setCargando(true);
      const data = await envioService.obtenerHistorialCambiosRuta({
        rutaId: rutaIdFiltro ?? undefined,
      });
      setCambios(data || []);
    } catch (err) {
      toast.error(
        extraerMensajeErrorApi(err, "Error al consultar el historial de cambios de ruta.")
      );
    } finally {
      setCargando(false);
    }
  }, [rutaIdFiltro, toast]);

  useEffect(() => {
    if (abierto) {
      void cargarHistorial();
      setDetalleSeleccionado(null);
    }
  }, [abierto, cargarHistorial]);

  if (!abierto) return null;

  const filtrados = cambios.filter((c) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      c.folio.toLowerCase().includes(q) ||
      c.choferNombre.toLowerCase().includes(q) ||
      (c.unidadPlacas || "").toLowerCase().includes(q) ||
      c.motivo.toLowerCase().includes(q) ||
      (c.referenciaLugar || "").toLowerCase().includes(q)
    );
  });

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-[#0B2D4A] to-[#123d63] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <History className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">
                Historial de Cambios de Trayecto y Desvíos
              </h3>
              <p className="text-xs text-sky-200">
                {rutaIdFiltro
                  ? `Filtrado por Ruta #${rutaIdFiltro}`
                  : "Reportes emitidos por operadores en recorrido"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void cargarHistorial()}
              disabled={cargando}
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Actualizar listado"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por folio, chofer, placas, motivo o lugar..."
              className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Total reportes: {filtrados.length}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cargando ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
              <p className="text-sm">Cargando reportes de desvíos viales...</p>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <AlertTriangle className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                No se encontraron reportes de cambios de ruta
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                Cuando los choferes notifiquen desvíos o incidencias en sus rutas activas,
                se registrarán automáticamente aquí con su folio formal.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtrados.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setDetalleSeleccionado(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${detalleSeleccionado?.id === item.id
                      ? "border-sky-500 bg-sky-50/30 shadow-xs ring-1 ring-sky-400"
                      : "border-slate-200 hover:border-slate-300 bg-white hover:shadow-xs"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                        {item.folio}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Ruta #{item.rutaId}
                      </span>
                    </div>
                    {item.afectaEntrega ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> Afecta Entrega
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Sin retraso
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-slate-800 mb-1 leading-snug">
                    {item.motivo}
                  </h4>

                  {item.referenciaLugar && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.referenciaLugar}</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2">
                    "{item.descripcionTrayecto}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {item.choferNombre}
                      </span>
                      {item.unidadPlacas && (
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {item.unidadPlacas}
                        </span>
                      )}
                    </div>
                    <span>{new Date(item.fechaRegistro).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Validez normativa: Cumple con la especificación de auditoría vial y seguridad de flota.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cerrar Historial
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
