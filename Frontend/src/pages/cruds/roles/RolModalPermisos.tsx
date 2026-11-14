import { useState, useEffect } from "react";
import { X, Shield, Loader2, CheckSquare, Square, AlertTriangle } from "lucide-react";
import type { Rol, PermisoItem } from "./types";
import { fetchApi } from "../../../services/api";
import { useToast } from "../../../components/Toast";
import { extraerMensajeErrorApi } from "../../../utils/errorMessages";
import { getSession } from "../../../utils/auth";

interface RolModalPermisosProps {
  abierto: boolean;
  rol: Rol | null;
  onClose: () => void;
  onGuardado?: () => void;
}

export function RolModalPermisos({
  abierto,
  rol,
  onClose,
  onGuardado,
}: RolModalPermisosProps) {
  const { toast } = useToast();
  const [permisos, setPermisos] = useState<PermisoItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (abierto && rol) {
      setCargando(true);
      fetchApi(`/Rol/${rol.id}/permisos`)
        .then((data: PermisoItem[]) => {
          setPermisos(data || []);
          const iniciales = new Set<number>();
          (data || []).forEach((p) => {
            if (p.asignado) iniciales.add(p.id);
          });
          setSeleccionados(iniciales);
        })
        .catch((err) => {
          console.error("Error al cargar permisos", err);
          toast.error("Error al cargar los permisos del rol.");
        })
        .finally(() => setCargando(false));
    }
  }, [abierto, rol, toast]);

  const session = getSession();
  const userRoles = (session.roles || []).map((r) => r.trim().toLowerCase());
  const esSoloRH = userRoles.includes("rh") && !userRoles.includes("jefe");
  const nombreRolNorm = (rol?.nombre || "").trim().toLowerCase();
  const esRolBloqueado = esSoloRH && (nombreRolNorm === "rh" || nombreRolNorm === "jefe");

  if (!abierto || !rol) return null;

  const togglePermiso = (id: number) => {
    if (esRolBloqueado) return;
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  };

  const permisosPorModulo = permisos.reduce((acc, p) => {
    const mod = p.modulo || "General";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {} as Record<string, PermisoItem[]>);

  const toggleModulo = (modulo: string) => {
    const lista = permisosPorModulo[modulo] || [];
    const todosSeleccionados = lista.every((p) => seleccionados.has(p.id));
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      lista.forEach((p) => {
        if (todosSeleccionados) {
          nuevo.delete(p.id);
        } else {
          nuevo.add(p.id);
        }
      });
      return nuevo;
    });
  };

  const guardar = async () => {
    if (guardando) return;
    setGuardando(true);
    try {
      await fetchApi(`/Rol/${rol.id}/permisos`, {
        method: "PUT",
        body: JSON.stringify({
          permisoIds: Array.from(seleccionados),
        }),
      });
      toast.success(`Permisos asignados con éxito al rol "${rol.nombre}".`);
      if (onGuardado) onGuardado();
      onClose();
    } catch (error: any) {
      console.error("Error al asignar permisos", error);
      toast.error(extraerMensajeErrorApi(error, "Error al guardar los permisos del rol."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-permisos-titulo"
    >
      <div className="cc-modal max-w-2xl">
        <div className="cc-modal-header">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-tr-navy" />
            <h2 id="modal-permisos-titulo" className="cc-modal-title">
              Permisos del Rol: <span className="text-tr-red">{rol.nombre}</span>
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

        {esRolBloqueado && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Rol Protegido:</strong> Por políticas institucionales de control de accesos, Recursos Humanos no tiene permitido modificar los permisos asignados a RH ni Jefe.
            </span>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 mb-4 flex items-center justify-between">
          <div>
            Total seleccionados:{" "}
            <strong className="text-slate-900">{seleccionados.size}</strong> de{" "}
            {permisos.length} permisos
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSeleccionados(new Set(permisos.map((p) => p.id)))
              }
              className="text-tr-navy hover:underline text-[11px] font-semibold"
            >
              Seleccionar todos
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => setSeleccionados(new Set())}
              className="text-tr-red hover:underline text-[11px] font-semibold"
            >
              Deseleccionar todos
            </button>
          </div>
        </div>

        {cargando ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-tr-navy" />
            <span className="text-xs">Cargando permisos disponibles...</span>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {Object.entries(permisosPorModulo).map(([modulo, lista]) => {
              const todosModulo = lista.every((p) => seleccionados.has(p.id));
              const algunoModulo = lista.some((p) => seleccionados.has(p.id));

              return (
                <div
                  key={modulo}
                  className="p-3 bg-white border border-slate-200 rounded-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <button
                      type="button"
                      onClick={() => toggleModulo(modulo)}
                      className="flex items-center gap-2 text-xs font-bold text-slate-900 hover:text-tr-navy text-left select-none"
                    >
                      {todosModulo ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square
                          className={`w-4 h-4 shrink-0 ${algunoModulo ? "text-amber-500" : "text-slate-300"}`}
                        />
                      )}
                      <span className="uppercase tracking-wider">{modulo}</span>
                    </button>
                    <span className="text-[11px] font-mono text-slate-400">
                      {lista.filter((p) => seleccionados.has(p.id)).length}/
                      {lista.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {lista.map((permiso) => {
                      const activo = seleccionados.has(permiso.id);
                      return (
                        <label
                          key={permiso.id}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                            activo
                              ? "bg-emerald-50/70 border-emerald-200 text-slate-900"
                              : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/70"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={activo}
                            onChange={() => togglePermiso(permiso.id)}
                            className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-800">
                              {permiso.descripcion || permiso.codigo}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400 truncate">
                              {permiso.codigo}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="cc-modal-actions mt-5">
          <button
            type="button"
            className="cc-btn-cancel"
            onClick={onClose}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="cc-btn-save"
            onClick={guardar}
            disabled={guardando || cargando || esRolBloqueado}
          >
            {guardando ? (
              <>
                <Loader2 size={15} className="cc-spin" /> Guardando...
              </>
            ) : (
              "Guardar Asignación"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
