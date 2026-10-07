import { X, Loader2 } from "lucide-react";
import type { Puesto, FormData } from "./types";

interface PuestoModalFormProps {
  abierto: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  form: FormData;
  editando: Puesto | null;
  guardando: boolean;
}

export function PuestoModalForm({
  abierto,
  onClose,
  onSave,
  onChange,
  form,
  editando,
  guardando,
}: PuestoModalFormProps) {
  if (!abierto) return null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-puesto-titulo"
    >
      <div className="cc-modal">
        <div className="cc-modal-header">
          <h2 id="modal-puesto-titulo" className="cc-modal-title">
            {editando ? "Editar puesto" : "Nuevo puesto"}
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
              <label htmlFor="fp-nombre">Nombre *</label>
              <input
                id="fp-nombre"
                name="nombre"
                type="text"
                required
                value={form.nombre}
                onChange={onChange}
                placeholder="Nombre del puesto"
              />
            </div>
            <div className="cc-field cc-field--wide">
              <label htmlFor="fp-desc">Descripcion</label>
              <input
                id="fp-desc"
                name="descripcion"
                type="text"
                value={form.descripcion ?? ""}
                onChange={onChange}
                placeholder="Descripcion opcional"
              />
            </div>
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
