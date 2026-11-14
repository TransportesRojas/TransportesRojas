import React, { useEffect, useState } from "react";
import { X, Lock, Eye, EyeOff, Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { fetchApi } from "../services/api";
import { useToast } from "./Toast";
import { extraerMensajeErrorApi } from "../utils/errorMessages";

interface ModalCambiarPasswordProps {
  abierto: boolean;
  onClose: () => void;
}

export function ModalCambiarPassword({ abierto, onClose }: ModalCambiarPasswordProps) {
  const { toast } = useToast();
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");

  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    setPasswordActual("");
    setPasswordNueva("");
    setPasswordConfirmar("");
    setMostrarActual(false);
    setMostrarNueva(false);
    setMostrarConfirmar(false);
    setErrorLocal(null);
    setGuardando(false);
  }, [abierto]);

  if (!abierto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    setErrorLocal(null);

    if (!passwordActual.trim()) {
      setErrorLocal("Ingresa tu contraseña actual.");
      return;
    }

    if (passwordNueva.length < 6) {
      setErrorLocal("La nueva contraseña debe contener al menos 6 caracteres.");
      return;
    }

    if (passwordNueva !== passwordConfirmar) {
      setErrorLocal("Las contraseñas no coinciden. Verifica la confirmación.");
      return;
    }

    if (passwordActual === passwordNueva) {
      setErrorLocal("La nueva contraseña debe ser diferente de la actual.");
      return;
    }

    setGuardando(true);
    try {
      await fetchApi("/Usuario/cambiar-password", {
        method: "POST",
        body: JSON.stringify({
          passwordActual,
          passwordNueva,
        }),
      });

      toast.success("Tu contraseña ha sido actualizada con éxito.");
      setPasswordActual("");
      setPasswordNueva("");
      setPasswordConfirmar("");
      onClose();
    } catch (err: any) {
      console.error("Error al cambiar contraseña:", err);
      const msg = extraerMensajeErrorApi(err, "No se pudo actualizar la contraseña.");
      setErrorLocal(msg);
      toast.error(msg);
    } finally {
      setGuardando(false);
    }
  };

  const handleCerrar = () => {
    setPasswordActual("");
    setPasswordNueva("");
    setPasswordConfirmar("");
    setErrorLocal(null);
    onClose();
  };

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cambiar-password-titulo"
    >
      <div className="cc-modal" style={{ maxWidth: 460, width: "100%" }}>
        <div className="cc-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-tr-navy flex items-center justify-center">
              <KeyRound size={17} />
            </div>
            <div>
              <h2 id="modal-cambiar-password-titulo" className="cc-modal-title text-base font-extrabold text-tr-navy">
                Cambiar Contraseña
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Actualiza las credenciales de acceso a tu cuenta
              </p>
            </div>
          </div>
          <button
            type="button"
            className="cc-btn-close"
            onClick={handleCerrar}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {errorLocal && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold flex items-center gap-2">
            <Lock size={15} className="shrink-0 text-red-600" />
            <span>{errorLocal}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="cc-field">
            <label htmlFor="pwd-actual" className="text-xs font-bold text-slate-700">
              Contraseña Actual *
            </label>
            <div className="relative">
              <input
                id="pwd-actual"
                type={mostrarActual ? "text" : "password"}
                required
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                placeholder="Ingresa tu contraseña actual"
                className="w-full pr-10 text-xs py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-tr-navy focus:ring-1 focus:ring-tr-navy transition-all"
              />
              <button
                type="button"
                onClick={() => setMostrarActual((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label={mostrarActual ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {mostrarActual ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="cc-field">
            <label htmlFor="pwd-nueva" className="text-xs font-bold text-slate-700">
              Nueva Contraseña *
            </label>
            <div className="relative">
              <input
                id="pwd-nueva"
                type={mostrarNueva ? "text" : "password"}
                required
                minLength={6}
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pr-10 text-xs py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-tr-navy focus:ring-1 focus:ring-tr-navy transition-all"
              />
              <button
                type="button"
                onClick={() => setMostrarNueva((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label={mostrarNueva ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {mostrarNueva ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="text-[10.5px] text-slate-500 flex items-center gap-1 mt-0.5">
              <ShieldCheck size={13} className="text-emerald-600" />
              La contraseña debe contener al menos 6 caracteres.
            </span>
          </div>

          <div className="cc-field">
            <label htmlFor="pwd-confirmar" className="text-xs font-bold text-slate-700">
              Confirmar Nueva Contraseña *
            </label>
            <div className="relative">
              <input
                id="pwd-confirmar"
                type={mostrarConfirmar ? "text" : "password"}
                required
                minLength={6}
                value={passwordConfirmar}
                onChange={(e) => setPasswordConfirmar(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                className="w-full pr-10 text-xs py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-tr-navy focus:ring-1 focus:ring-tr-navy transition-all"
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmar((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label={mostrarConfirmar ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {mostrarConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="cc-modal-actions pt-4 mt-2">
            <button
              type="button"
              className="cc-btn-cancel"
              onClick={handleCerrar}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              id="btn-guardar-cambio-password"
              type="submit"
              className="cc-btn-save flex items-center gap-2"
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Actualizar contraseña</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
