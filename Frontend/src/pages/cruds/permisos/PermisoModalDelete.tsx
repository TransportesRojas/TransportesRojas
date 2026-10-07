import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import type { Permiso } from "./types";

interface PermisoModalDeleteProps {
  confirmando: Permiso | null;
  onClose: () => void;
  onConfirm: () => void;
  confirmInput: string;
  setConfirmInput: (val: string) => void;
  eliminando: boolean;
}

export function PermisoModalDelete({
  confirmando,
  onClose,
  onConfirm,
  confirmInput,
  setConfirmInput,
  eliminando,
}: PermisoModalDeleteProps) {
  if (!confirmando) return null;

  return (
    <div
      className="cc-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-perm-titulo"
    >
      <div className="cc-modal cc-modal--confirm">
        <div className="cc-confirm-icon">
          <AlertTriangle size={40} />
        </div>
        <h2 id="confirm-perm-titulo" className="cc-confirm-title">
          Eliminar permiso
        </h2>
        <p className="cc-confirm-desc">
          Estas seguro de que quieres eliminar el permiso con el ID{" "}
          <strong className="cc-confirm-id">{confirmando.id}</strong>?
        </p>
        <p className="cc-confirm-name">{confirmando.nombre}</p>
        <div className="cc-confirm-input-wrap">
          <label
            htmlFor="input-confirmar-perm"
            className="cc-confirm-input-label"
          >
            Escribe <strong>confirmar</strong> para continuar
          </label>
          <input
            id="input-confirmar-perm"
            className="cc-confirm-input"
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder="confirmar"
            autoComplete="off"
            disabled={eliminando}
          />
        </div>
        <div className="cc-modal-actions cc-modal-actions--center">
          <button
            type="button"
            className="cc-btn-cancel"
            onClick={onClose}
            disabled={eliminando}
            autoFocus
          >
            No, cancelar
          </button>
          <button
            type="button"
            className="cc-btn-delete"
            onClick={onConfirm}
            disabled={
              eliminando ||
              confirmInput.trim().toLowerCase() !== "confirmar"
            }
          >
            {eliminando ? (
              <>
                <Loader2 size={15} className="cc-spin" /> Eliminando...
              </>
            ) : (
              <>
                <Trash2 size={15} /> Si, eliminar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
