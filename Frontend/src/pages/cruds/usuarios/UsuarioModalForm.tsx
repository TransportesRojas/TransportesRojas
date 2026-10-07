import { X, Loader2 } from "lucide-react";
import { type Usuario, type FormData, TIPOS_USR } from "./types";

interface UsuarioModalFormProps {
  abierto: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  form: FormData;
  editando: Usuario | null;
  guardando: boolean;
}

export function UsuarioModalForm({
  abierto,
  onClose,
  onSave,
  onChange,
  form,
  editando,
  guardando,
}: UsuarioModalFormProps) {
  if (!abierto) return null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-usr-titulo"
    >
      <div className="cc-modal">
        <div className="cc-modal-header">
          <h2 id="modal-usr-titulo" className="cc-modal-title">
            {editando ? "Editar usuario" : "Nuevo usuario"}
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
              <label htmlFor="fu-email">Email *</label>
              <input
                id="fu-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={onChange}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fu-tipo">Tipo de usuario *</label>
              <select
                id="fu-tipo"
                name="tipoUsuario"
                className="cc-filter-select"
                required
                value={form.tipoUsuario}
                onChange={onChange}
              >
                {TIPOS_USR.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="cc-field">
              <label htmlFor="fu-pass">
                {editando ? "Nueva contraseña" : "Contraseña *"}
              </label>
              <input
                id="fu-pass"
                name="password"
                type="password"
                required={!editando}
                value={form.password}
                onChange={onChange}
                placeholder={
                  editando
                    ? "Dejar en blanco para no cambiar"
                    : "Minimo 6 caracteres"
                }
                minLength={6}
              />
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
