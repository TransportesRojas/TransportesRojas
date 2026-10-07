import { X, Loader2 } from "lucide-react";
import { type TipoMant, type FormData, TIPOS_VEH } from "./types";

interface TipoMantModalFormProps {
  abierto: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  form: FormData;
  editando: TipoMant | null;
  guardando: boolean;
}

export function TipoMantModalForm({
  abierto,
  onClose,
  onSave,
  onChange,
  form,
  editando,
  guardando,
}: TipoMantModalFormProps) {
  if (!abierto) return null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-tm-titulo"
    >
      <div className="cc-modal">
        <div className="cc-modal-header">
          <h2 id="modal-tm-titulo" className="cc-modal-title">
            {editando
              ? "Editar tipo de mantenimiento"
              : "Nuevo tipo de mantenimiento"}
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
            <div className="cc-field cc-field--wide">
              <label htmlFor="ftm-nombre">Nombre *</label>
              <input
                id="ftm-nombre"
                name="nombre"
                type="text"
                required
                value={form.nombre}
                onChange={onChange}
                placeholder="Nombre del tipo"
              />
            </div>
            <div className="cc-field cc-field--wide">
              <label htmlFor="ftm-desc">Descripcion</label>
              <input
                id="ftm-desc"
                name="descripcion"
                type="text"
                value={form.descripcion ?? ""}
                onChange={onChange}
                placeholder="Descripcion"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="ftm-km">KM Intervalo</label>
              <input
                id="ftm-km"
                name="kmIntervalo"
                type="number"
                value={form.kmIntervalo ?? ""}
                onChange={onChange}
                placeholder="Ej: 5000"
                min={0}
              />
            </div>
            <div className="cc-field">
              <label htmlFor="ftm-aplica">Aplica a tipo vehiculo</label>
              <input
                id="ftm-aplica"
                name="aplicaATipoVehiculo"
                type="text"
                value={form.aplicaATipoVehiculo ?? ""}
                onChange={onChange}
                placeholder="Ej: Camion"
                list="tipos-veh-list"
              />
              <datalist id="tipos-veh-list">
                {TIPOS_VEH.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            {editando && (
              <div className="cc-field cc-field--toggle" style={{ gridColumn: "1 / -1" }}>
                <span className="cc-toggle-label">Estado</span>
                <label className="cc-toggle" htmlFor="ftm-activo">
                  <input
                    id="ftm-activo"
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
