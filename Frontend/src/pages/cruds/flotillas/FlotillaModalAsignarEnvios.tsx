import { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Package,
  Search,
  CheckSquare,
  Square,
  Loader2,
  Truck,
  MapPin,
  Scale,
} from "lucide-react";
import type { Flotilla } from "./types";
import type { EnvioListadoItem } from "../envios/types";
import { fetchApi } from "../../../services/api";
import { useToast } from "../../../components/Toast";
import { extraerMensajeErrorApi } from "../../../utils/errorMessages";
import { formatearFechaCorta } from "../envios/types";

interface FlotillaModalAsignarEnviosProps {
  abierto: boolean;
  flotilla: Flotilla | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function FlotillaModalAsignarEnvios({
  abierto,
  flotilla,
  onClose,
  onSuccess,
}: FlotillaModalAsignarEnviosProps) {
  const { toast } = useToast();
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [enviosDisponibles, setEnviosDisponibles] = useState<EnvioListadoItem[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [busqueda, setBusqueda] = useState("");

  const cargarEnvios = useCallback(async () => {
    if (!abierto || !flotilla) return;
    setCargando(true);
    try {
      const data = await fetchApi("/Envio?take=400");
      const todos: EnvioListadoItem[] = Array.isArray(data) ? data : [];
      const pendientes = todos.filter((e) =>
        ["recibido_sucursal", "recoleccion_realizada"].includes(String(e.estado)) ||
        (String(e.estado) === "reprogramado" && !e.flotillaAsignadaNombre)
      );
      setEnviosDisponibles(pendientes);
      setSeleccionados(new Set());
    } catch (err: any) {
      console.error("Error al cargar envíos para asignación a flotilla:", err);
      toast.error(
        extraerMensajeErrorApi(err, "No fue posible consultar los envíos pendientes de asignación.")
      );
    } finally {
      setCargando(false);
    }
  }, [abierto, flotilla, toast]);

  useEffect(() => {
    if (abierto) {
      setBusqueda("");
      void cargarEnvios();
    }
  }, [abierto, cargarEnvios]);

  const enviosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return enviosDisponibles;
    const q = busqueda.trim().toLowerCase();
    return enviosDisponibles.filter((e) =>
      e.guia.toLowerCase().includes(q) ||
      e.destinatarioNombre.toLowerCase().includes(q) ||
      (e.destinoCiudadResumen || "").toLowerCase().includes(q) ||
      (e.destinoCodigoPostal || "").toLowerCase().includes(q) ||
      (e.sucursalRecepcionNombre || "").toLowerCase().includes(q)
    );
  }, [enviosDisponibles, busqueda]);

  const toggleSeleccion = (id: number) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const seleccionarTodos = () => {
    if (seleccionados.size === enviosFiltrados.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(enviosFiltrados.map((e) => e.id)));
    }
  };

  const pesoTotalSeleccionado = useMemo(() => {
    let peso = 0;
    enviosDisponibles.forEach((e) => {
      if (seleccionados.has(e.id)) {
        peso += Number(e.pesoKg) || 0;
      }
    });
    return Number(peso.toFixed(2));
  }, [enviosDisponibles, seleccionados]);

  const handleGuardar = async () => {
    if (!flotilla || seleccionados.size === 0 || guardando) return;
    setGuardando(true);
    try {
      const resp = await fetchApi("/Envio/asignar-envios-flotilla", {
        method: "POST",
        body: JSON.stringify({
          flotillaId: flotilla.id,
          envioIds: Array.from(seleccionados),
        }),
      });
      toast.success(
        resp.mensaje ||
        `${seleccionados.size} envíos asignados exitosamente a la flotilla "${flotilla.nombre}".`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error al asignar envíos a flotilla:", err);
      toast.error(
        extraerMensajeErrorApi(err, "Error al asignar los envíos a la flotilla seleccionada.")
      );
    } finally {
      setGuardando(false);
    }
  };

  if (!abierto || !flotilla) return null;

  return (
    <div className="cc-backdrop" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B2D4A] text-white flex items-center justify-center shadow-sm">
              <Package className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#0B2D4A]">
                Asignar Envíos a Flotilla
              </h2>
              <p className="text-xs text-slate-500">
                Flotilla destino: <span className="font-bold text-slate-700">{flotilla.nombre}</span> ({flotilla.codigo || `#${flotilla.id}`})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por guía, destinatario, CP..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B2D4A]/20 focus:border-[#0B2D4A]"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={seleccionarTodos}
              disabled={enviosFiltrados.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40"
            >
              {seleccionados.size === enviosFiltrados.length && enviosFiltrados.length > 0 ? (
                <>
                  <CheckSquare size={14} className="text-[#0B2D4A]" />
                  <span>Deseleccionar todos</span>
                </>
              ) : (
                <>
                  <Square size={14} className="text-slate-500" />
                  <span>Seleccionar todos ({enviosFiltrados.length})</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 bg-blue-50 text-[#0B2D4A] px-3 py-1.5 rounded-lg text-xs font-extrabold border border-blue-200">
              <Scale size={14} />
              <span>{seleccionados.size} selec. · {pesoTotalSeleccionado} kg</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {cargando ? (
            <div className="py-16 text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0B2D4A] mb-2" />
              <p className="text-xs font-medium">Consultando envíos recibidos en sucursal...</p>
            </div>
          ) : enviosFiltrados.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 p-8">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700 mb-1">
                No hay envíos pendientes de asignar
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Todos los paquetes recibidos en sucursales ya han sido asignados a una flotilla o no coinciden con tu criterio de búsqueda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {enviosFiltrados.map((env) => {
                const isSelected = seleccionados.has(env.id);
                return (
                  <div
                    key={env.id}
                    onClick={() => toggleSeleccion(env.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? "bg-blue-50/70 border-[#0B2D4A] ring-1 ring-[#0B2D4A]"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#0B2D4A]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-extrabold text-[#0B2D4A]">
                          {env.guia}
                        </span>
                        <span className="font-bold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {env.pesoKg} kg
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-800 truncate mb-1">
                        {env.destinatarioNombre}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate mb-1.5">
                        <MapPin size={12} className="shrink-0 text-slate-400" />
                        <span className="truncate">
                          {env.destinoCiudadResumen || "Destino local"}{" "}
                          {env.destinoCodigoPostal ? `(CP ${env.destinoCodigoPostal})` : ""}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] text-slate-400">
                        <span className="truncate">{env.sucursalRecepcionNombre || "Matriz"}</span>
                        <span>{formatearFechaCorta(env.fechaCreacion)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <p className="text-xs text-slate-500">
            <span className="font-bold text-slate-700">{seleccionados.size}</span> envíos seleccionados ({pesoTotalSeleccionado} kg)
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardar}
              disabled={guardando || seleccionados.size === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0B2D4A] hover:bg-[#082035] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Asignando...</span>
                </>
              ) : (
                <>
                  <Truck size={15} />
                  <span>Asignar a Flotilla ({seleccionados.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
