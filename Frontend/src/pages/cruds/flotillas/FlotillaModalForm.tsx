import { X, Loader2 } from "lucide-react";
import type { Flotilla, FormData } from "./types";

interface FlotillaModalFormProps {
  abierto: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  form: FormData;
  editando: Flotilla | null;
  guardando: boolean;
}

export function FlotillaModalForm({
  abierto,
  onClose,
  onSave,
  onChange,
  form,
  editando,
  guardando,
}: FlotillaModalFormProps) {
  if (!abierto) return null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-flt-titulo"
    >
      <div className="cc-modal">
        <div className="cc-modal-header">
          <h2 id="modal-flt-titulo" className="cc-modal-title">
            {editando ? "Editar flotilla" : "Nueva flotilla"}
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
              <label htmlFor="ff-nombre">Nombre *</label>
              <input
                id="ff-nombre"
                name="nombre"
                type="text"
                required
                value={form.nombre}
                onChange={onChange}
                placeholder="Nombre de la flotilla"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="ff-codigo">Codigo</label>
              <input
                id="ff-codigo"
                name="codigo"
                type="text"
                value={form.codigo ?? ""}
                onChange={onChange}
                placeholder="FLT-001"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="ff-suc">ID Sucursal</label>
              <input
                id="ff-suc"
                name="sucursalId"
                type="number"
                value={form.sucursalId ?? ""}
                onChange={onChange}
                placeholder="--"
                min={1}
              />
            </div>
            <div className="cc-field">
              <label htmlFor="ff-sup">ID Supervisor</label>
              <input
                id="ff-sup"
                name="supervisorId"
                type="number"
                value={form.supervisorId ?? ""}
                onChange={onChange}
                placeholder="--"
                min={1}
              />
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
