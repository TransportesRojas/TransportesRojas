import { X, Loader2 } from "lucide-react";
import type { Rol, FormData } from "./types";

interface RolModalFormProps {
  abierto: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  form: FormData;
  editando: Rol | null;
  guardando: boolean;
}

export function RolModalForm({
  abierto,
  onClose,
  onSave,
  onChange,
  form,
  editando,
  guardando,
}: RolModalFormProps) {
  if (!abierto) return null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-rol-titulo"
    >
      <div className="cc-modal">
        <div className="cc-modal-header">
          <h2 id="modal-rol-titulo" className="cc-modal-title">
            {editando ? "Editar rol" : "Nuevo rol"}
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
              <label htmlFor="fr-nombre">Nombre *</label>
              <input
                id="fr-nombre"
                name="nombre"
                type="text"
                required
                value={form.nombre}
                onChange={onChange}
                placeholder="Nombre del rol"
              />
            </div>
            <div className="cc-field cc-field--wide">
              <label htmlFor="fr-desc">Descripción</label>
              <input
                id="fr-desc"
                name="descripcion"
                type="text"
                value={form.descripcion ?? ""}
                onChange={onChange}
                placeholder="Descripción opcional"
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
