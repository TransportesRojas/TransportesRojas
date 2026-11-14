import { useEffect, useState } from "react";
import { X, Loader2, ShieldCheck, Briefcase, CheckSquare, Square, Building2 } from "lucide-react";
import type { Empleado, FormData } from "./types";
import { fetchApi } from "../../../services/api";
import { BuscadorSucursal } from "../../../components/BuscadorSucursal";
import {
  bloquearTeclasNoNumericas,
  bloquearTeclasNumericas,
} from "../../../utils/inputValidation";

interface EmpleadoModalFormProps {
  abierto: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onPuestoChange: (puestoId: number | null) => void;
  onToggleRolAdicional: (rolId: number) => void;
  onSucursalChange?: (sucursalId: number | null) => void;
  form: FormData;
  editando: Empleado | null;
  guardando: boolean;
}

const PUESTO_ROL_DEFAULT_MAP: Record<string, string> = {
  "chofer": "chofer",
  "supervisor": "supervisor",
  "jefe de flotilla": "jefe de flotilla",
  "atencion a clientes": "personal de sucursal",
  "personal de sucursal": "personal de sucursal",
  "recursos humanos": "rh",
  "rh": "rh",
  "administrativo": "personal administrativo",
  "personal administrativo": "personal administrativo",
  "gerente general": "jefe",
  "gerente": "jefe",
  "director": "jefe",
};

export function EmpleadoModalForm({
  abierto,
  onClose,
  onSave,
  onChange,
  onPuestoChange,
  onToggleRolAdicional,
  onSucursalChange,
  form,
  editando,
  guardando,
}: EmpleadoModalFormProps) {
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [puestos, setPuestos] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    if (abierto) {
      fetchApi("/Sucursal")
        .catch(() => fetchApi("/CatalogoGeografico/sucursales-operativas"))
        .then((data) => setSucursales(data || []))
        .catch(() => setSucursales([]));
      fetchApi("/Puesto").then((data) => setPuestos(data || []));
      fetchApi("/Rol").then((data) => setRoles(data || []));
    }
  }, [abierto]);

  if (!abierto) return null;

  const puestoSeleccionado = puestos.find((p) => p.id === form.puestoId);
  const nombrePuestoNorm = puestoSeleccionado?.nombre?.toLowerCase().trim() || "";
  let rolDefaultSugerido: any = null;
  if (nombrePuestoNorm) {
    const rolKey = Object.keys(PUESTO_ROL_DEFAULT_MAP).find((k) =>
      nombrePuestoNorm.includes(k)
    );
    if (rolKey) {
      const targetRolName = PUESTO_ROL_DEFAULT_MAP[rolKey];
      rolDefaultSugerido = roles.find(
        (r) => r.nombre.toLowerCase().trim() === targetRolName
      );
    }
  }

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-emp-titulo"
    >
      <div className="cc-modal max-w-2xl">
        <div className="cc-modal-header">
          <h2 id="modal-emp-titulo" className="cc-modal-title">
            {editando ? "Editar empleado" : "Nuevo empleado"}
          </h2>
          <button
            className="cc-btn-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <form className="cc-form" onSubmit={onSave}>
          <div className="cc-form-grid">
            <div className="cc-field">
              <label htmlFor="fe-nombre">Nombre(s) *</label>
              <input
                id="fe-nombre"
                name="nombre"
                type="text"
                required
                value={form.nombre}
                onKeyDown={bloquearTeclasNumericas}
                onChange={onChange}
                placeholder="Nombre oficial"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fe-ap-p">Apellido paterno *</label>
              <input
                id="fe-ap-p"
                name="apellidoPaterno"
                type="text"
                required
                value={form.apellidoPaterno}
                onKeyDown={bloquearTeclasNumericas}
                onChange={onChange}
                placeholder="Primer apellido"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fe-ap-m">Apellido materno (opcional)</label>
              <input
                id="fe-ap-m"
                name="apellidoMaterno"
                type="text"
                value={form.apellidoMaterno}
                onKeyDown={bloquearTeclasNumericas}
                onChange={onChange}
                placeholder="Segundo apellido (opcional)"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fe-tel">Teléfono (10 dígitos) *</label>
              <input
                id="fe-tel"
                name="telefono"
                type="tel"
                inputMode="numeric"
                required
                pattern="[0-9]{10}"
                title="Debe ingresar exactamente 10 dígitos numéricos"
                minLength={10}
                value={form.telefono ?? ""}
                onKeyDown={(e) => bloquearTeclasNoNumericas(e, false)}
                onChange={onChange}
                placeholder="Ej. 6671234567"
              />
            </div>
            <div className="cc-field cc-field--wide">
              <label htmlFor="fe-email">Correo Electrónico *</label>
              <input
                id="fe-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={onChange}
                placeholder="nombre.apellido@transportesrojas.com"
              />
            </div>

            <div className="cc-field">
              <label htmlFor="fe-suc" className="flex items-center gap-1.5 font-bold text-slate-800">
                <Building2 className="w-4 h-4 text-tr-navy" />
                <span>Sucursal de Adscripción *</span>
              </label>
              <BuscadorSucursal
                id="fe-suc"
                sucursales={sucursales}
                sucursalSeleccionadaId={form.sucursalId}
                permitirSinAsignar={false}
                placeholder="Seleccione la sucursal obligatoria..."
                onSeleccionar={(sucId) => {
                  if (onSucursalChange) {
                    onSucursalChange(sucId);
                  } else {
                    onChange({
                      target: { name: "sucursalId", value: sucId ? String(sucId) : "" },
                    } as any);
                  }
                }}
              />
            </div>

            <div className="cc-field">
              <label htmlFor="fe-fecha">Fecha de ingreso *</label>
              <input
                id="fe-fecha"
                name="fechaIngreso"
                type="date"
                required
                value={form.fechaIngreso}
                onChange={onChange}
              />
            </div>

            {!editando && (
              <div className="cc-field cc-field--wide">
                <label htmlFor="fe-puesto" className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Briefcase className="w-4 h-4 text-tr-navy" />
                  <span>Puesto Laboral *</span>
                </label>
                <select
                  id="fe-puesto"
                  required
                  value={form.puestoId ?? ""}
                  onChange={(e) =>
                    onPuestoChange(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-tr-navy outline-none"
                >
                  <option value="">-- Seleccione el puesto del empleado --</option>
                  {puestos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                {rolDefaultSugerido && (
                  <div className="mt-1.5 text-xs text-slate-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Rol base predeterminado por puesto:{" "}
                      <strong className="text-slate-900">{rolDefaultSugerido.nombre}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {!editando && (
              <div className="cc-field cc-field--wide">
                <label className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1 block">
                  Roles de Acceso en el Sistema
                </label>
                {!form.puestoId ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Para configurar los roles, primero debes seleccionar el <strong>Puesto Laboral</strong> del empleado arriba.
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {roles.map((r) => {
                      const esDefault =
                        rolDefaultSugerido && rolDefaultSugerido.id === r.id;
                      const estaSeleccionado =
                        esDefault || form.rolesAdicionalesIds.includes(r.id);

                      return (
                        <div
                          key={r.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (!esDefault) onToggleRolAdicional(r.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              if (!esDefault) onToggleRolAdicional(r.id);
                            }
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-all select-none ${estaSeleccionado
                              ? "bg-blue-50/90 border-blue-300 text-tr-navy font-semibold shadow-2xs"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                            } ${esDefault ? "cursor-default opacity-90" : ""}`}
                        >
                          <div className="shrink-0 text-tr-navy flex items-center justify-center">
                            {estaSeleccionado ? (
                              <CheckSquare size={16} className="text-[#0B2D4A]" />
                            ) : (
                              <Square size={16} className="text-slate-400" />
                            )}
                          </div>
                          <span className="flex-1 font-medium text-slate-800 uppercase tracking-wide text-[11px]">
                            {r.nombre}
                          </span>
                          {esDefault && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold shrink-0">
                              Predeterminado
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="cc-modal-actions mt-5">
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
                  <Loader2 size={15} className="cc-spin" /> Guardando...
                </>
              ) : editando ? (
                "Actualizar"
              ) : (
                "Guardar Empleado"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
