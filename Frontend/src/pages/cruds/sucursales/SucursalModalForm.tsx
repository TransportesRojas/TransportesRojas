import { useState, useEffect, useRef } from "react";
import { X, Loader2, MapPin, Search, CheckCircle2 } from "lucide-react";
import type { Sucursal, FormData } from "./types";
import { envioService } from "../../../services/envioService";
import { bloquearTeclasNoNumericas } from "../../../utils/inputValidation";

interface SucursalModalFormProps {
  abierto: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSetForm?: React.Dispatch<React.SetStateAction<FormData>>;
  form: FormData;
  editando: Sucursal | null;
  guardando: boolean;
}

export function SucursalModalForm({
  abierto,
  onClose,
  onSave,
  onChange,
  onSetForm,
  form,
  editando,
  guardando,
}: SucursalModalFormProps) {
  const [buscandoCp, setBuscandoCp] = useState(false);
  const [colonias, setColonias] = useState<string[]>([]);
  const [coloniaSeleccionada, setColoniaSeleccionada] = useState("");
  const ultimoCpConsultado = useRef<string>("");

  useEffect(() => {
    setColoniaSeleccionada("");
  }, [abierto, editando?.id]);

  useEffect(() => {
    if (!abierto) {
      setColonias([]);
      setColoniaSeleccionada("");
      ultimoCpConsultado.current = "";
      return;
    }

    const cp = (form.codigoPostal || "").replace(/\D/g, "");
    if (cp.length === 5 && cp !== ultimoCpConsultado.current) {
      ultimoCpConsultado.current = cp;
      setBuscandoCp(true);

      envioService
        .consultarCodigoPostal(cp)
        .then((res) => {
          if (res) {
            if (onSetForm) {
              onSetForm((prev) => ({
                ...prev,
                estado: res.estadoNombre || prev.estado,
                municipio: res.municipioNombre || prev.municipio,
              }));
            }
            if (res.colonias && Array.isArray(res.colonias)) {
              const noms = res.colonias.map((c) => c.nombre);
              setColonias(noms);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          setBuscandoCp(false);
        });
    }
  }, [form.codigoPostal, abierto, onSetForm]);

  const handleSeleccionarColonia = (colonia: string) => {
    setColoniaSeleccionada(colonia);
    if (!colonia) return;

    if (onSetForm) {
      onSetForm((prev) => {
        const calleActual = (prev.calle || "").trim();
        if (!calleActual.toLowerCase().includes(colonia.toLowerCase())) {
          return {
            ...prev,
            calle: calleActual ? `${calleActual}, Col. ${colonia}` : `Col. ${colonia}`,
          };
        }
        return prev;
      });
    }
  };

  if (!abierto) return null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-suc-titulo"
    >
      <div className="cc-modal !max-w-2xl">
        <div className="cc-modal-header">
          <h2 id="modal-suc-titulo" className="cc-modal-title">
            {editando ? "Editar sucursal" : "Nueva sucursal"}
          </h2>
          <button
            className="cc-btn-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <form className="cc-form space-y-5" onSubmit={onSave}>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              1. Datos Generales de la Sucursal
            </div>
            <div className="cc-form-grid !mb-0">
              <div className="cc-field cc-field--wide">
                <label htmlFor="fs-nombre">Nombre oficial *</label>
                <input
                  id="fs-nombre"
                  name="nombre"
                  type="text"
                  required
                  value={form.nombre}
                  onChange={onChange}
                  placeholder="Ej. Sucursal Central Culiacán"
                />
              </div>
              <div className="cc-field">
                <label htmlFor="fs-alias">Alias / Nombre corto</label>
                <input
                  id="fs-alias"
                  name="nombreCorto"
                  type="text"
                  value={form.nombreCorto ?? ""}
                  onChange={onChange}
                  placeholder="Ej. Matriz Culiacán / Norte"
                />
              </div>
              <div className="cc-field">
                <label htmlFor="fs-codigo">Clave / Código</label>
                <input
                  id="fs-codigo"
                  name="codigo"
                  type="text"
                  value={form.codigo ?? ""}
                  onChange={onChange}
                  placeholder="Ej. SUC-001"
                />
              </div>
              <div className="cc-field cc-field--wide">
                <label htmlFor="fs-tel">Teléfono de atención</label>
                <input
                  id="fs-tel"
                  name="telefono"
                  type="tel"
                  inputMode="numeric"
                  value={form.telefono ?? ""}
                  onKeyDown={(e) => bloquearTeclasNoNumericas(e, false)}
                  onChange={onChange}
                  placeholder="10 dígitos (ej. 6671234567)"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin size={13} className="text-[#D64545]" />
                <span>2. Ubicación y Dirección Operativa</span>
              </span>
              {buscandoCp && (
                <span className="text-xs text-[#0B2D4A] font-semibold flex items-center gap-1">
                  <Loader2 size={13} className="animate-spin" />
                  <span>Buscando código postal...</span>
                </span>
              )}
            </div>

            <div className="cc-form-grid !mb-0">
              <div className="cc-field">
                <label htmlFor="fs-cp" className="flex items-center justify-between">
                  <span>Código postal (5 dígitos) *</span>
                  <Search size={12} className="text-slate-400" />
                </label>
                <div className="relative">
                  <input
                    id="fs-cp"
                    name="codigoPostal"
                    type="text"
                    inputMode="numeric"
                    required
                    value={form.codigoPostal ?? ""}
                    onKeyDown={(e) => bloquearTeclasNoNumericas(e, false)}
                    onChange={onChange}
                    placeholder="Ej. 80000"
                    className="font-mono font-bold"
                  />
                  {form.codigoPostal && form.codigoPostal.length === 5 && !buscandoCp && (
                    <CheckCircle2
                      size={15}
                      className="absolute right-3 top-3 text-emerald-600"
                    />
                  )}
                </div>
              </div>

              <div className="cc-field">
                <label htmlFor="fs-estado">Estado *</label>
                <input
                  id="fs-estado"
                  name="estado"
                  type="text"
                  required
                  value={form.estado ?? ""}
                  onChange={onChange}
                  placeholder="Estado (autocompletado por CP)"
                />
              </div>

              <div className="cc-field">
                <label htmlFor="fs-municipio">Municipio / Ciudad *</label>
                <input
                  id="fs-municipio"
                  name="municipio"
                  type="text"
                  required
                  value={form.municipio ?? ""}
                  onChange={onChange}
                  placeholder="Municipio o Ciudad"
                />
              </div>

              {colonias.length > 0 ? (
                <div className="cc-field">
                  <label htmlFor="fs-colonia">Colonia / Asentamiento</label>
                  <select
                    id="fs-colonia"
                    value={coloniaSeleccionada}
                    onChange={(e) => handleSeleccionarColonia(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-tr-navy outline-none"
                  >
                    <option value="">-- Seleccionar colonia para agregar --</option>
                    {colonias.map((c, i) => (
                      <option key={i} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="cc-field">
                  <label htmlFor="fs-col-info">Asentamiento / Región</label>
                  <input
                    id="fs-col-info"
                    type="text"
                    disabled
                    placeholder="Se autodetectará al ingresar CP"
                    className="bg-slate-50 text-slate-400 cursor-not-allowed"
                  />
                </div>
              )}

              <div className="cc-field cc-field--wide">
                <label htmlFor="fs-calle">Calle, número y referencias *</label>
                <input
                  id="fs-calle"
                  name="calle"
                  type="text"
                  required
                  value={form.calle ?? ""}
                  onChange={onChange}
                  placeholder="Calle, número exterior, interior y colonia..."
                />
              </div>
            </div>
          </div>

          <div className="cc-modal-actions pt-3 border-t border-slate-100">
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
                "Actualizar Sucursal"
              ) : (
                "Guardar Sucursal"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
