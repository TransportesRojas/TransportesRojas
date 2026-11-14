import { useState, useEffect, useMemo } from "react";
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, LogOut, Check, CircleDot } from "lucide-react";
import { fetchApi } from "../services/api";
import { useToast } from "./Toast";
import { clearSession } from "../utils/auth";
import { extraerMensajeErrorApi } from "../utils/errorMessages";

interface ModalCambioPasswordInicialProps {
  abierto: boolean;
  usuarioId: number;
  passwordActualInicial?: string;
  token?: string;
  onSuccess: () => void;
  onCancelLogout?: () => void;
}

export function validarReglasPassword(password: string) {
  const tieneLongitud = password.length >= 12;
  const countMayus = (password.match(/[A-Z]/g) || []).length;
  const tieneDosMayus = countMayus >= 2;
  const noMayusConsecutivas = !/[A-Z]{2}/.test(password);
  const mayusculasValidas = tieneDosMayus && noMayusConsecutivas;
  const countMinus = (password.match(/[a-z]/g) || []).length;
  const tieneDosMinus = countMinus >= 2;
  const tieneNumero = /\d/.test(password);
  const tieneSimbolo = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  const esValida =
    tieneLongitud &&
    mayusculasValidas &&
    tieneDosMinus &&
    tieneNumero &&
    tieneSimbolo;

  return {
    tieneLongitud,
    tieneDosMayus,
    noMayusConsecutivas,
    mayusculasValidas,
    tieneDosMinus,
    tieneNumero,
    tieneSimbolo,
    esValida,
  };
}

export function ModalCambioPasswordInicial({
  abierto,
  usuarioId,
  passwordActualInicial = "",
  token,
  onSuccess,
  onCancelLogout,
}: ModalCambioPasswordInicialProps) {
  const { toast } = useToast();

  const [passwordActual, setPasswordActual] = useState(passwordActualInicial);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [mostrarPassActual, setMostrarPassActual] = useState(false);
  const [mostrarNuevaPass, setMostrarNuevaPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");

  useEffect(() => {
    if (!abierto) {
      setPasswordActual(passwordActualInicial || "");
      setNuevaPassword("");
      setConfirmarPassword("");
      setErrorLocal("");
    }
  }, [abierto, passwordActualInicial]);

  useEffect(() => {
    if (passwordActualInicial) {
      setPasswordActual(passwordActualInicial);
    }
  }, [passwordActualInicial]);

  useEffect(() => {
    if (abierto) {
      const prevOverflow = document.body.style.overflow;
      const prevTouchAction = document.body.style.touchAction;

      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
      };
    }
  }, [abierto]);

  const reglas = useMemo(() => validarReglasPassword(nuevaPassword), [nuevaPassword]);

  if (!abierto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cargando) return;
    setErrorLocal("");

    if (!passwordActual.trim()) {
      setErrorLocal("Ingresa tu contraseña temporal o actual.");
      return;
    }

    if (!reglas.tieneLongitud) {
      setErrorLocal("La nueva contraseña debe contener al menos 12 caracteres.");
      return;
    }

    if (!reglas.tieneDosMayus) {
      setErrorLocal("La nueva contraseña debe contener al menos 2 letras mayúsculas.");
      return;
    }

    if (!reglas.noMayusConsecutivas) {
      setErrorLocal("Las letras mayúsculas no deben ser consecutivas (deben estar separadas).");
      return;
    }

    if (!reglas.tieneDosMinus) {
      setErrorLocal("La nueva contraseña debe contener al menos 2 letras minúsculas.");
      return;
    }

    if (!reglas.tieneNumero) {
      setErrorLocal("La nueva contraseña debe contener al menos un número.");
      return;
    }

    if (!reglas.tieneSimbolo) {
      setErrorLocal("La nueva contraseña debe contener al menos un carácter especial o símbolo (!, @, #, etc.).");
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setErrorLocal("La confirmación de la contraseña no coincide.");
      return;
    }

    if (nuevaPassword === passwordActual) {
      setErrorLocal("La nueva contraseña no puede ser idéntica a la contraseña temporal.");
      return;
    }

    setCargando(true);
    try {
      const authToken = token || localStorage.getItem("token") || "";
      await fetchApi("/Autenticacion/cambiar-password-inicial", {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: JSON.stringify({
          usuarioId,
          passwordActual: passwordActual.trim(),
          passwordNueva: nuevaPassword,
          nuevaPassword: nuevaPassword,
        }),
      });

      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          userObj.requiereCambioPassword = false;
          localStorage.setItem("user", JSON.stringify(userObj));
        }
      } catch (err) {
        console.error("Error al actualizar estado en localStorage:", err);
      }

      toast.success("Contraseña actualizada exitosamente.");
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorLocal(
        extraerMensajeErrorApi(err, "No fue posible actualizar la contraseña. Revisa tus datos.")
      );
    } finally {
      setCargando(false);
    }
  };

  const handleCerrarSesion = () => {
    if (onCancelLogout) {
      onCancelLogout();
    } else {
      clearSession();
      window.location.href = "/";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 font-[Poppins,sans-serif] select-none pointer-events-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-cambio-password-obligatorio"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200 overflow-hidden select-text pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0B2D4A]" />

        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-4 mt-1">
          <KeyRound size={28} />
        </div>

        <h2 id="titulo-cambio-password-obligatorio" className="text-lg font-bold text-[#0B2D4A] mb-1">
          Cambio Obligatorio de Contraseña
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed mb-5">
          Por motivos de seguridad en tu <strong>primer inicio de sesión</strong>, debes reemplazar tu contraseña temporal por una nueva contraseña personal y segura.
        </p>

        {errorLocal && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs font-semibold text-red-700 flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{errorLocal}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Contraseña Temporal / Actual
            </label>
            <div className="relative">
              <input
                type={mostrarPassActual ? "text" : "password"}
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                required
                placeholder="Contraseña recibida"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2D4A] pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarPassActual(!mostrarPassActual)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={mostrarPassActual ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {mostrarPassActual ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Nueva Contraseña (mínimo 12 caracteres)
            </label>
            <div className="relative">
              <input
                type={mostrarNuevaPass ? "text" : "password"}
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2D4A] pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarNuevaPass(!mostrarNuevaPass)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={mostrarNuevaPass ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {mostrarNuevaPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Requisitos de seguridad */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5 text-[11px]">
            <div className="font-semibold text-slate-600 mb-1">Requisitos de la nueva contraseña:</div>
            
            <div className={`flex items-center gap-1.5 ${reglas.tieneLongitud ? "text-emerald-700 font-medium" : "text-slate-500"}`}>
              {reglas.tieneLongitud ? <Check size={13} className="text-emerald-600 shrink-0" /> : <CircleDot size={11} className="text-slate-400 shrink-0" />}
              <span>Mínimo 12 caracteres ({nuevaPassword.length}/12)</span>
            </div>

            <div className={`flex items-center gap-1.5 ${reglas.mayusculasValidas ? "text-emerald-700 font-medium" : "text-slate-500"}`}>
              {reglas.mayusculasValidas ? <Check size={13} className="text-emerald-600 shrink-0" /> : <CircleDot size={11} className="text-slate-400 shrink-0" />}
              <span>Al menos 2 letras mayúsculas {reglas.tieneDosMayus && !reglas.noMayusConsecutivas ? "(no deben ser consecutivas)" : "(no consecutivas)"}</span>
            </div>

            <div className={`flex items-center gap-1.5 ${reglas.tieneDosMinus ? "text-emerald-700 font-medium" : "text-slate-500"}`}>
              {reglas.tieneDosMinus ? <Check size={13} className="text-emerald-600 shrink-0" /> : <CircleDot size={11} className="text-slate-400 shrink-0" />}
              <span>Al menos 2 letras minúsculas</span>
            </div>

            <div className={`flex items-center gap-1.5 ${reglas.tieneNumero ? "text-emerald-700 font-medium" : "text-slate-500"}`}>
              {reglas.tieneNumero ? <Check size={13} className="text-emerald-600 shrink-0" /> : <CircleDot size={11} className="text-slate-400 shrink-0" />}
              <span>Al menos un número</span>
            </div>

            <div className={`flex items-center gap-1.5 ${reglas.tieneSimbolo ? "text-emerald-700 font-medium" : "text-slate-500"}`}>
              {reglas.tieneSimbolo ? <Check size={13} className="text-emerald-600 shrink-0" /> : <CircleDot size={11} className="text-slate-400 shrink-0" />}
              <span>Al menos un símbolo o carácter especial (!, @, #, $, etc.)</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              required
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2D4A]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={cargando || !reglas.esValida || !confirmarPassword}
              className="w-full py-3 rounded-xl bg-[#0B2D4A] hover:bg-[#071E33] text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Guardando nueva contraseña...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  <span>Establecer Contraseña y Continuar</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center">
          <button
            type="button"
            onClick={handleCerrarSesion}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-none"
          >
            <LogOut size={13} />
            <span>Cerrar sesión e intentar más tarde</span>
          </button>
        </div>
      </div>
    </div>
  );
}
