import { useState, useEffect, useMemo } from "react";
import { X, Loader2, Truck, Users, FileText, CheckSquare, Square, Search } from "lucide-react";
import type { Flotilla, FormData, SucursalItem, EmpleadoItem, UnidadOpcion, ChoferOpcion, FlotillaAsignaciones } from "./types";
import { fetchApi } from "../../../services/api";
import { BuscadorSucursal } from "../../../components/BuscadorSucursal";

interface FlotillaModalFormProps {
  abierto: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent, unidadesIds?: number[], choferesIds?: number[]) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  form: FormData;
  editando: Flotilla | null;
  guardando: boolean;
  sucursales: SucursalItem[];
  jefes: EmpleadoItem[];
  sucursalFijaId?: number | null;
}

export function FlotillaModalForm({
  abierto,
  onClose,
  onSave,
  onChange,
  form,
  editando,
  guardando,
  sucursales,
  jefes,
  sucursalFijaId,
}: FlotillaModalFormProps) {
  const [tabActiva, setTabActiva] = useState<"general" | "unidades" | "choferes">("general");
  const [cargandoAsignaciones, setCargandoAsignaciones] = useState(false);
  const [unidadesDisponibles, setUnidadesDisponibles] = useState<UnidadOpcion[]>([]);
  const [choferesDisponibles, setChoferesDisponibles] = useState<ChoferOpcion[]>([]);
  const [unidadesSeleccionadas, setUnidadesSeleccionadas] = useState<Set<number>>(new Set());
  const [choferesSeleccionados, setChoferesSeleccionados] = useState<Set<number>>(new Set());
  const [busquedaChofer, setBusquedaChofer] = useState("");

  useEffect(() => {
    if (abierto) {
      setTabActiva("general");
      setBusquedaChofer("");
      if (editando) {
        setCargandoAsignaciones(true);
        fetchApi(`/Flotilla/${editando.id}/asignaciones`)
          .then((data: FlotillaAsignaciones) => {
            setUnidadesDisponibles(data.unidadesDisponibles || []);
            setChoferesDisponibles(data.choferesDisponibles || []);
            setUnidadesSeleccionadas(new Set(data.unidadesIds || []));
            setChoferesSeleccionados(new Set(data.choferesIds || []));
          })
          .catch((err) => {
            console.error("Error al cargar asignaciones de flotilla", err);
          })
          .finally(() => setCargandoAsignaciones(false));
      } else {
        setUnidadesDisponibles([]);
        setChoferesDisponibles([]);
        setUnidadesSeleccionadas(new Set());
        setChoferesSeleccionados(new Set());
      }
    }
  }, [abierto, editando]);

  const toggleUnidad = (id: number) => {
    setUnidadesSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleChofer = (id: number) => {
    setChoferesSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const choferesFiltrados = useMemo(() => {
    if (!busquedaChofer.trim()) return choferesDisponibles;
    const q = busquedaChofer.trim().toLowerCase();
    return choferesDisponibles.filter((c) => {
      const nombre = (c.nombreCompleto || "").toLowerCase();
      const clave = (c.clave || "").toLowerCase();
      const idStr = String(c.id);
      return nombre.includes(q) || clave.includes(q) || idStr.includes(q);
    });
  }, [choferesDisponibles, busquedaChofer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editando) {
      onSave(
        e,
        Array.from(unidadesSeleccionadas),
        Array.from(choferesSeleccionados)
      );
    } else {
      onSave(e);
    }
  };

  if (!abierto) return null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-flt-titulo"
    >
      <div className="cc-modal" style={{ maxWidth: editando ? 700 : 560, width: "100%" }}>
        <div className="cc-modal-header">
          <div className="flex items-center gap-2">
            <h2 id="modal-flt-titulo" className="cc-modal-title">
              {editando ? `Editar flotilla: ${editando.nombre}` : "Nueva flotilla"}
            </h2>
          </div>
          <button
            type="button"
            className="cc-btn-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {editando && (
          <div className="flex border-b border-slate-200 px-6 bg-slate-50 gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTabActiva("general")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-md transition-colors border-b-2 ${
                tabActiva === "general"
                  ? "border-tr-navy text-tr-navy bg-white shadow-sm"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText size={14} />
              Datos Generales
            </button>
            <button
              type="button"
              onClick={() => setTabActiva("unidades")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-md transition-colors border-b-2 ${
                tabActiva === "unidades"
                  ? "border-tr-navy text-tr-navy bg-white shadow-sm"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Truck size={14} />
              Unidades ({unidadesSeleccionadas.size})
            </button>
            <button
              type="button"
              onClick={() => setTabActiva("choferes")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-md transition-colors border-b-2 ${
                tabActiva === "choferes"
                  ? "border-tr-navy text-tr-navy bg-white shadow-sm"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users size={14} />
              Choferes ({choferesSeleccionados.size})
            </button>
          </div>
        )}

        <form className="cc-form" onSubmit={handleSubmit}>
          {tabActiva === "general" && (
            <div className="cc-form-grid">
              <div className="cc-field">
                <label htmlFor="ff-nombre">Nombre de la flotilla *</label>
                <input
                  id="ff-nombre"
                  name="nombre"
                  type="text"
                  required
                  value={form.nombre}
                  onChange={onChange}
                  placeholder="Ej. Flotilla Norte A"
                />
              </div>

              <div className="cc-field">
                <label htmlFor="ff-codigo">Código</label>
                <input
                  id="ff-codigo"
                  name="codigo"
                  type="text"
                  value={form.codigo ?? ""}
                  onChange={onChange}
                  placeholder="Ej. FLT-001"
                />
              </div>

              <div className="cc-field">
                <label htmlFor="ff-suc">Sucursal</label>
                <BuscadorSucursal
                  id="ff-suc"
                  sucursales={sucursales}
                  sucursalSeleccionadaId={form.sucursalId ? Number(form.sucursalId) : null}
                  onSeleccionar={(id) =>
                    onChange({
                      target: { name: "sucursalId", value: id ? String(id) : "" },
                    } as any)
                  }
                  disabled={Boolean(sucursalFijaId && !editando)}
                  placeholder="Buscar sucursal para la flotilla..."
                />
                {sucursalFijaId && !editando && (
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Asignada automáticamente por tu sucursal.
                  </span>
                )}
              </div>

              <div className="cc-field">
                <label htmlFor="ff-jefe">Jefe de Flotilla</label>
                <select
                  id="ff-jefe"
                  name="supervisorId"
                  value={form.supervisorId ?? ""}
                  onChange={onChange}
                >
                  <option value="">-- Sin Jefe asignado --</option>
                  {jefes.map((j) => (
                    <option key={j.id} value={j.id}>
                      {`TR-${String(j.id).padStart(3, "0")} - ${j.nombre} ${j.apellidoPaterno}`}
                    </option>
                  ))}
                </select>
              </div>

              {editando && (
                <div className="cc-field cc-field--toggle" style={{ gridColumn: "1 / -1" }}>
                  <span className="cc-toggle-label">Estado</span>
                  <label className="cc-toggle" htmlFor="ff-activo">
                    <input
                      id="ff-activo"
                      name="activo"
                      type="checkbox"
                      checked={form.activo}
                      onChange={onChange as any}
                    />
                    <span className="cc-toggle-track">
                      <span className="cc-toggle-thumb" />
                    </span>
                    <span
                      className={`cc-toggle-text ${form.activo ? "cc-toggle-text--on" : "cc-toggle-text--off"}`}
                    >
                      {form.activo ? "Activo" : "Inactivo"}
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {tabActiva === "unidades" && (
            <div className="p-4">
              <p className="text-xs text-slate-600 mb-3">
                Selecciona las unidades asignadas a esta flotilla. Si una unidad pertenece a otra flotilla, se reasignará automáticamente.
              </p>
              {cargandoAsignaciones ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 size={24} className="cc-spin mr-2" /> Cargando unidades...
                </div>
              ) : unidadesDisponibles.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No hay unidades activas registradas en el sistema.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                  {unidadesDisponibles.map((u) => {
                    const checked = unidadesSeleccionadas.has(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUnidad(u.id)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          checked
                            ? "bg-blue-50/70 border-blue-200 text-tr-navy font-medium shadow-xs"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="pt-0.5 text-tr-navy">
                          {checked ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold">{u.placas}</span>
                            {u.asignadaAOtraFlotilla && !checked && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-normal">
                                En: {u.flotillaNombre || "Otra"}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {u.tipoVehiculo || "Vehículo"} {u.modelo ? `• ${u.modelo}` : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tabActiva === "choferes" && (
            <div className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                <p className="text-xs text-slate-600 font-medium">
                  Selecciona los choferes y operadores asignados a esta flotilla.
                </p>
                <span className="text-[11px] font-semibold text-tr-navy bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full self-start sm:self-auto">
                  {choferesSeleccionados.size} seleccionado(s)
                </span>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  id="buscar-empleado-flotilla"
                  value={busquedaChofer}
                  onChange={(e) => setBusquedaChofer(e.target.value)}
                  placeholder="Buscar por nombre o número de empleado (ej. TR-001 o Carlos)..."
                  className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tr-navy/20 focus:border-tr-navy transition-all bg-white"
                />
                {busquedaChofer && (
                  <button
                    type="button"
                    onClick={() => setBusquedaChofer("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {busquedaChofer && (
                <div className="text-[11px] text-slate-500 mb-2 flex items-center justify-between px-0.5">
                  <span>
                    Coincidencias: <strong>{choferesFiltrados.length}</strong> de {choferesDisponibles.length} choferes
                  </span>
                  <button
                    type="button"
                    onClick={() => setBusquedaChofer("")}
                    className="text-tr-navy hover:underline text-[11px]"
                  >
                    Ver todos
                  </button>
                </div>
              )}

              {cargandoAsignaciones ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 size={24} className="cc-spin mr-2" /> Cargando choferes...
                </div>
              ) : choferesDisponibles.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No hay choferes disponibles para asignar.
                </div>
              ) : choferesFiltrados.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">No se encontraron choferes</p>
                  <p className="mt-1 text-[11px]">No hay resultados para "{busquedaChofer}". Revisa el nombre o número de empleado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                  {choferesFiltrados.map((c) => {
                    const checked = choferesSeleccionados.has(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleChofer(c.id)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          checked
                            ? "bg-blue-50/70 border-blue-200 text-tr-navy font-medium shadow-xs"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                        title={c.nombreCompleto}
                      >
                        <div className="pt-0.5 text-tr-navy">
                          {checked ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold truncate" title={c.nombreCompleto}>
                              {c.nombreCompleto}
                            </span>
                            <span className="font-mono text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded shrink-0 font-medium">
                              {c.clave || `TR-${String(c.id).padStart(3, "0")}`}
                            </span>
                          </div>
                          {c.asignadoAOtraFlotilla && !checked && (
                            <div className="text-[10px] text-amber-700 mt-0.5 truncate">
                              Asignado a: {c.flotillaNombre || "Otra flotilla"}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="cc-modal-actions">
            <button
              type="button"
              className="cc-btn-cancel"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="cc-btn-save"
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <Loader2 size={15} className="cc-spin mr-1" /> Guardando...
                </>
              ) : editando ? (
                "Actualizar flotilla"
              ) : (
                "Guardar flotilla"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
