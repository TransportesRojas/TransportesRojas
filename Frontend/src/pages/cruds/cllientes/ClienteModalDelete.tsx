import { AlertTriangle, Loader2 } from "lucide-react";
import type { Cliente } from "./types";

interface ClienteModalDeleteProps {
  confirmando: Cliente | null;
  onClose: () => void;
  onConfirm: () => void;
  confirmInput: string;
  setConfirmInput: (val: string) => void;
  eliminando: boolean;
}

export function ClienteModalDelete({
  confirmando,
  onClose,
  onConfirm,
  confirmInput,
  setConfirmInput,
  eliminando,
}: ClienteModalDeleteProps) {
  if (!confirmando) return null;

  return (
    <div
      className="cc-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-titulo"
    >
      <div className="cc-modal cc-modal--confirm">
        <div className="cc-confirm-icon">
          <AlertTriangle size={40} />
        </div>
        <h2 id="confirm-titulo" className="cc-confirm-title">
          Eliminar cliente
        </h2>
        <p className="cc-confirm-desc">
          ¿Estás seguro de que deseas eliminar al cliente con el ID&nbsp;
          <strong className="cc-confirm-id">{confirmando.id}</strong>?
        </p>
        <p className="cc-confirm-name">
          {confirmando.nombre} {confirmando.apellidoPaterno}{" "}
          {confirmando.apellidoMaterno}
        </p>
        <p className="cc-confirm-note">
          Esta acción marcará al cliente como inactivo y puede revertirse.
        </p>

        <div className="cc-confirm-input-wrap">
          <label htmlFor="input-confirmar" className="cc-confirm-input-label">
            Escribe <strong>confirmar</strong> para continuar
          </label>
          <input
            id="input-confirmar"
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
            id="btn-cancelar-eliminar"
            type="button"
            className="cc-btn-cancel"
            onClick={onClose}
            disabled={eliminando}
            autoFocus
          >
            No, cancelar
          </button>
          <button
            id="btn-confirmar-eliminar"
            type="button"
            className="cc-btn-delete"
            onClick={onConfirm}
            disabled={
              eliminando || confirmInput.trim().toLowerCase() !== "confirmar"
            }
          >
            {eliminando ? (
              <>
                <Loader2 size={15} className="cc-spin" /> Eliminando...
              </>
            ) : (
              "Sí, eliminar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
