import { X, Loader2 } from "lucide-react";
import { type Unidad, type FormData, TIPOS_VEH, ESTADOS } from "./types";

interface UnidadModalFormProps {
  abierto: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  form: FormData;
  editando: Unidad | null;
  guardando: boolean;
}

export function UnidadModalForm({
  abierto,
  onClose,
  onSave,
  onChange,
  form,
  editando,
  guardando,
}: UnidadModalFormProps) {
  if (!abierto) return null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-uni-titulo"
    >
      <div className="cc-modal" style={{ maxWidth: "800px" }}>
        <div className="cc-modal-header">
          <h2 id="modal-uni-titulo" className="cc-modal-title">
            {editando ? "Editar unidad" : "Nueva unidad"}
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
          <div
            className="cc-form-grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            <div className="cc-field">
              <label htmlFor="fu-flot">ID Flotilla *</label>
              <input
                id="fu-flot"
                name="flotillaId"
                type="number"
                required
                value={form.flotillaId || ""}
                onChange={onChange}
                min={1}
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fu-pla">Placas *</label>
              <input
                id="fu-pla"
                name="placas"
                type="text"
                required
                value={form.placas}
                onChange={onChange}
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fu-tipo">Tipo vehiculo *</label>
              <input
                id="fu-tipo"
                name="tipoVehiculo"
                type="text"
                required
                value={form.tipoVehiculo}
                onChange={onChange}
                list="tipos-veh"
              />
              <datalist id="tipos-veh">
                {TIPOS_VEH.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="cc-field">
              <label htmlFor="fu-mar">Marca *</label>
              <input
                id="fu-mar"
                name="marca"
                type="text"
                required
                value={form.marca}
                onChange={onChange}
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fu-mod">Modelo *</label>
              <input
                id="fu-mod"
                name="modelo"
                type="text"
                required
                value={form.modelo}
                onChange={onChange}
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fu-anio">Año *</label>
              <input
                id="fu-anio"
                name="anio"
                type="number"
                required
                value={form.anio}
                onChange={onChange}
                min={1900}
                max={2100}
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fu-cap">Capacidad (Kg)</label>
              <input
                id="fu-cap"
                name="capacidadKg"
                type="number"
                value={form.capacidadKg ?? ""}
                onChange={onChange}
                min={0}
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fu-kmi">KM Inicial</label>
              <input
                id="fu-kmi"
                name="kmOdometroInicial"
                type="number"
                value={form.kmOdometroInicial ?? ""}
                onChange={onChange}
                min={0}
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fu-kma">KM Actual</label>
              <input
                id="fu-kma"
                name="kmOdometroActual"
                type="number"
                value={form.kmOdometroActual ?? ""}
                onChange={onChange}
                min={0}
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fu-est">Estado *</label>
              <select
                id="fu-est"
                name="estado"
                className="cc-filter-select"
                required
                value={form.estado}
                onChange={onChange}
              >
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            {editando && (
              <div
                className="cc-field cc-field--toggle"
                style={{ gridColumn: "1 / -1" }}
              >
                <span className="cc-toggle-label">Estado</span>
                <label className="cc-toggle" htmlFor="fu-activo">
                  <input
                    id="fu-activo"
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
                  <Loader2 size={15} className="cc-spin" /> Guardando...
                </>
              ) : editando ? (
                "Actualizar"
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
