import { X, Loader2 } from "lucide-react";
import type { Cliente, FormData } from "./types";
import {
  bloquearTeclasNoNumericas,
  bloquearTeclasNumericas,
} from "../../../utils/inputValidation";

interface ClienteModalFormProps {
  abierto: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
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
                onKeyDown={bloquearTeclasNumericas}
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
                onKeyDown={bloquearTeclasNumericas}
                onChange={onChange}
                placeholder="Apellido paterno"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="f-ap-materno">Apellido materno (opcional)</label>
              <input
                id="f-ap-materno"
                name="apellidoMaterno"
                type="text"
                value={form.apellidoMaterno}
                onKeyDown={bloquearTeclasNumericas}
                onChange={onChange}
                placeholder="Apellido materno (opcional)"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="f-telefono">Teléfono *</label>
              <input
                id="f-telefono"
                name="telefono"
                type="tel"
                inputMode="numeric"
                required
                pattern="[0-9]{10}"
                title="Debe ingresar exactamente 10 dígitos numéricos"
                minLength={10}
                value={form.telefono}
                onKeyDown={(e) => bloquearTeclasNoNumericas(e, false)}
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
              <div className="cc-field cc-field--wide">
                <label htmlFor="f-motivo">Motivo de la edición *</label>
                <textarea
                  id="f-motivo"
                  name="motivoEdicion"
                  required
                  rows={2}
                  value={form.motivoEdicion ?? ""}
                  onChange={onChange}
                  placeholder="Describe la razón por la cual se actualizan los datos del cliente..."
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-tr-navy outline-none"
                />
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
