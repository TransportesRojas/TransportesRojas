import { X, Loader2 } from "lucide-react";
import type { Sucursal, FormData } from "./types";

interface SucursalModalFormProps {
  abierto: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  form: FormData;
  editando: Sucursal | null;
  guardando: boolean;
}

export function SucursalModalForm({
  abierto,
  onClose,
  onSave,
  onChange,
  form,
  editando,
  guardando,
}: SucursalModalFormProps) {
  if (!abierto) return null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-suc-titulo"
    >
      <div className="cc-modal">
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
        <form className="cc-form" onSubmit={onSave}>
          <div className="cc-form-grid">
            <div className="cc-field cc-field--wide">
              <label htmlFor="fs-nombre">Nombre *</label>
              <input
                id="fs-nombre"
                name="nombre"
                type="text"
                required
                value={form.nombre}
                onChange={onChange}
                placeholder="Nombre de la sucursal"
              />
            </div>
            <div className="cc-field cc-field--wide">
              <label htmlFor="fs-calle">Calle / Direccion</label>
              <input
                id="fs-calle"
                name="calle"
                type="text"
                value={form.calle ?? ""}
                onChange={onChange}
                placeholder="Calle y numero"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fs-municipio">Municipio</label>
              <input
                id="fs-municipio"
                name="municipio"
                type="text"
                value={form.municipio ?? ""}
                onChange={onChange}
                placeholder="Ciudad o municipio"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fs-estado">Estado</label>
              <input
                id="fs-estado"
                name="estado"
                type="text"
                value={form.estado ?? ""}
                onChange={onChange}
                placeholder="Estado"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fs-cp">Codigo postal</label>
              <input
                id="fs-cp"
                name="codigoPostal"
                type="text"
                value={form.codigoPostal ?? ""}
                onChange={onChange}
                placeholder="5 digitos"
                maxLength={5}
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fs-tel">Telefono</label>
              <input
                id="fs-tel"
                name="telefono"
                type="tel"
                value={form.telefono ?? ""}
                onChange={onChange}
                placeholder="10 digitos"
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
