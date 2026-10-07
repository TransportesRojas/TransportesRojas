import { X, Loader2 } from "lucide-react";
import type { Cliente, FormData } from "./types";

interface ClienteModalFormProps {
  abierto: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  form: FormData;
  editando: Cliente | null;
  guardando: boolean;
}

export function ClienteModalForm({
  abierto,
  onClose,
  onSave,
  onChange,
  form,
  editando,
  guardando,
}: ClienteModalFormProps) {
  if (!abierto) return null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
    >
      <div className="cc-modal">
        <div className="cc-modal-header">
          <h2 id="modal-titulo" className="cc-modal-title">
            {editando ? "Editar cliente" : "Nuevo cliente"}
          </h2>
          <button
            id="btn-cerrar-modal"
            className="cc-btn-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <form id="form-cliente" className="cc-form" onSubmit={onSave}>
          <div className="cc-form-grid">
            <div className="cc-field">
              <label htmlFor="f-nombre">Nombre *</label>
              <input
                id="f-nombre"
                name="nombre"
                type="text"
                required
                value={form.nombre}
                onChange={onChange}
                placeholder="Nombre(s)"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="f-ap-paterno">Apellido paterno *</label>
              <input
                id="f-ap-paterno"
                name="apellidoPaterno"
                type="text"
                required
                value={form.apellidoPaterno}
                onChange={onChange}
                placeholder="Apellido paterno"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="f-ap-materno">Apellido materno</label>
              <input
                id="f-ap-materno"
                name="apellidoMaterno"
                type="text"
                value={form.apellidoMaterno}
                onChange={onChange}
                placeholder="Apellido materno"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="f-telefono">Teléfono *</label>
              <input
                id="f-telefono"
                name="telefono"
                type="tel"
                required
                pattern="[0-9]{10}"
                title="Debe ingresar exactamente 10 dígitos numéricos"
                maxLength={10}
                minLength={10}
                value={form.telefono}
                onChange={onChange}
                placeholder="Ej. 6671234567"
              />
            </div>
            <div className="cc-field cc-field--wide">
              <label htmlFor="f-email">Email *</label>
              <input
                id="f-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={onChange}
                placeholder="correo@ejemplo.com"
              />
            </div>

            {editando && (
              <div className="cc-field cc-field--toggle">
                <span className="cc-toggle-label">Estado del cliente</span>
                <label className="cc-toggle" htmlFor="f-activo">
                  <input
                    id="f-activo"
                    name="activo"
                    type="checkbox"
                    checked={form.activo}
                    onChange={onChange}
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
              id="btn-cancelar-modal"
              type="button"
              className="cc-btn-cancel"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              id="btn-guardar-cliente"
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
