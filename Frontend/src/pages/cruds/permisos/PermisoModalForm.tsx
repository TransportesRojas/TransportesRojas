import { X, Loader2 } from "lucide-react";
import { type Permiso, type FormData, MODULOS } from "./types";

interface PermisoModalFormProps {
  abierto: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  form: FormData;
  editando: Permiso | null;
  guardando: boolean;
}

export function PermisoModalForm({
  abierto,
  onClose,
  onSave,
  onChange,
  form,
  editando,
  guardando,
}: PermisoModalFormProps) {
  if (!abierto) return null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-perm-titulo"
    >
      <div className="cc-modal">
        <div className="cc-modal-header">
          <h2 id="modal-perm-titulo" className="cc-modal-title">
            {editando ? "Editar permiso" : "Nuevo permiso"}
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
              <label htmlFor="fp2-codigo">Codigo *</label>
              <input
                id="fp2-codigo"
                name="codigo"
                type="text"
                required
                value={form.codigo}
                onChange={onChange}
                placeholder="PERM_XXX"
                style={{ textTransform: "uppercase" }}
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fp2-modulo">Modulo *</label>
              <input
                id="fp2-modulo"
                name="modulo"
                type="text"
                required
                value={form.modulo}
                onChange={onChange}
                placeholder="Nombre del modulo"
                list="modulos-list"
              />
              <datalist id="modulos-list">
                {MODULOS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <div className="cc-field cc-field--wide">
              <label htmlFor="fp2-nombre">Nombre *</label>
              <input
                id="fp2-nombre"
                name="nombre"
                type="text"
                required
                value={form.nombre}
                onChange={onChange}
                placeholder="Nombre del permiso"
              />
            </div>
            <div className="cc-field cc-field--wide">
              <label htmlFor="fp2-desc">Descripcion</label>
              <input
                id="fp2-desc"
                name="descripcion"
                type="text"
                value={form.descripcion ?? ""}
                onChange={onChange}
                placeholder="Descripcion del permiso"
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
