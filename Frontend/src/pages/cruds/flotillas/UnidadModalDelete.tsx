import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import "../estilos/cruds.css";
import type { UnidadItem } from "./types";

interface UnidadModalDeleteProps {
  confirmando: UnidadItem | null;
  onClose: () => void;
  onConfirm: () => void;
  confirmInput: string;
  setConfirmInput: (val: string) => void;
  eliminando: boolean;
}

export function UnidadModalDelete({
  confirmando,
  onClose,
  onConfirm,
  confirmInput,
  setConfirmInput,
  eliminando,
}: UnidadModalDeleteProps) {
  if (!confirmando) return null;

  return (
    <div
      className="cc-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-uni-titulo"
    >
      <div className="cc-modal cc-modal--confirm">
        <div className="cc-confirm-icon">
          <AlertTriangle size={40} className="text-amber-500" />
        </div>
        <h2 id="confirm-uni-titulo" className="cc-confirm-title">
          Desactivar o dar de baja unidad
        </h2>
        <p className="cc-confirm-desc">
          ¿Estás seguro de que deseas retirar o desactivar la unidad con placas{" "}
          <strong className="cc-confirm-id">{confirmando.placas}</strong>?
        </p>
        <p className="cc-confirm-name">
          {confirmando.marca} {confirmando.modelo} ({confirmando.anio ?? "S/A"}) &bull; {confirmando.tipoVehiculo}
        </p>
        <p className="text-xs text-slate-500 mb-3 text-center">
          Si la unidad ya cuenta con historial de rutas o mantenimientos, pasará a estatus inactivo (Fuera de Servicio) para preservar la trazabilidad contable y operativa.
        </p>
        <div className="cc-confirm-input-wrap">
          <label
            htmlFor="input-confirmar-uni"
            className="cc-confirm-input-label"
          >
            Escribe <strong>confirmar</strong> para continuar
          </label>
          <input
            id="input-confirmar-uni"
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
          >
            Cancelar
          </button>
          <button
            type="button"
            className="cc-btn-delete"
            disabled={confirmInput.trim().toLowerCase() !== "confirmar" || eliminando}
            onClick={onConfirm}
          >
            {eliminando ? (
              <>
                <Loader2 size={16} className="cc-spin" />
                <span>Procesando baja...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Desactivar Unidad</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

