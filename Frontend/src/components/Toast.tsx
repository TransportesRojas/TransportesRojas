import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

const DEDUPE_COOLDOWN_MS = 3200;
const MAX_TOASTS_ACTIVOS = 3;

function construirClaveToast(tipo: ToastType, mensaje: string): string {
  return `${tipo}::${mensaje.trim().replace(/\s+/g, " ").toLowerCase()}`;
}

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  tipo: ToastType;
  mensaje: string;
  titulo?: string;
  duracion?: number;
}

interface ToastContextType {
  mostrarToast: (mensaje: string, tipo?: ToastType, titulo?: string, duracion?: number) => void;
  toast: {
    success: (mensaje: string, titulo?: string) => void;
    error: (mensaje: string, titulo?: string) => void;
    warning: (mensaje: string, titulo?: string) => void;
    info: (mensaje: string, titulo?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe ser utilizado dentro de un ToastProvider");
  }
  return context;
}

const ICON_MAP = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-[#D64545] shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
  info: <Info className="w-5 h-5 text-[#0B2D4A] shrink-0" />,
};

const BORDER_LEFT_MAP = {
  success: "border-l-4 border-l-emerald-500",
  error: "border-l-4 border-l-[#D64545]",
  warning: "border-l-4 border-l-amber-500",
  info: "border-l-4 border-l-[#0B2D4A]",
};

const DEFAULT_TITLES = {
  success: "Éxito",
  error: "Error",
  warning: "Advertencia",
  info: "Información",
};

function ToastElement({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const duracion = toast.duracion ?? 3800;
  const [pausado, setPausado] = useState(false);
  const [progreso, setProgreso] = useState(100);
  const tiempoRestanteRef = useRef(duracion);

  useEffect(() => {
    if (duracion <= 0) return;

    let rafId: number;
    let fin = Date.now() + tiempoRestanteRef.current;

    const actualizar = () => {
      if (pausado) return;
      const restante = fin - Date.now();
      tiempoRestanteRef.current = restante;
      if (restante <= 0) {
        onDismiss(toast.id);
      } else {
        setProgreso((restante / duracion) * 100);
        rafId = requestAnimationFrame(actualizar);
      }
    };

    if (!pausado) {
      fin = Date.now() + tiempoRestanteRef.current;
      rafId = requestAnimationFrame(actualizar);
    }

    return () => cancelAnimationFrame(rafId);
  }, [pausado, duracion, onDismiss, toast.id]);

  return (
    <div
      role="alert"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      className={`relative flex items-start gap-3 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 p-3.5 pointer-events-auto overflow-hidden transition-all duration-300 transform translate-x-0 ${BORDER_LEFT_MAP[toast.tipo]}`}
      style={{
        boxShadow: "0 10px 25px -5px rgba(11, 45, 74, 0.12), 0 8px 10px -6px rgba(11, 45, 74, 0.08)",
      }}
    >
      <div className="pt-0.5">{ICON_MAP[toast.tipo]}</div>
      <div className="flex-1 min-w-0 pr-1">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-800">
          {toast.titulo || DEFAULT_TITLES[toast.tipo]}
        </div>
        <div className="text-xs text-slate-600 mt-0.5 break-words leading-relaxed">
          {toast.mensaje}
        </div>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
        aria-label="Cerrar notificación"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {duracion > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 overflow-hidden"
        >
          <div
            className={`h-full transition-[width] duration-75 ${
              toast.tipo === "success"
                ? "bg-emerald-500"
                : toast.tipo === "error"
                ? "bg-[#D64545]"
                : toast.tipo === "warning"
                ? "bg-amber-500"
                : "bg-[#0B2D4A]"
            }`}
            style={{ width: `${progreso}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const activeKeysRef = useRef<Set<string>>(new Set());
  const recentTimestampsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    activeKeysRef.current = new Set(toasts.map((t) => construirClaveToast(t.tipo, t.mensaje)));
  }, [toasts]);

  const onDismiss = useCallback((id: string) => {
    setToasts((prev) => {
      const next = prev.filter((t) => t.id !== id);
      activeKeysRef.current = new Set(next.map((t) => construirClaveToast(t.tipo, t.mensaje)));
      return next;
    });
  }, []);

  const mostrarToast = useCallback(
    (mensaje: string, tipo: ToastType = "info", titulo?: string, duracion?: number) => {
      const mensajeLimpio = (mensaje || "").trim();
      if (!mensajeLimpio) return;

      const clave = construirClaveToast(tipo, mensajeLimpio);
      const ahora = Date.now();

      for (const [k, ts] of recentTimestampsRef.current.entries()) {
        if (ahora - ts > DEDUPE_COOLDOWN_MS) {
          recentTimestampsRef.current.delete(k);
        }
      }

      const ultimo = recentTimestampsRef.current.get(clave);
      if (
        activeKeysRef.current.has(clave) ||
        (ultimo !== undefined && ahora - ultimo < DEDUPE_COOLDOWN_MS)
      ) {
        return;
      }

      recentTimestampsRef.current.set(clave, ahora);
      activeKeysRef.current.add(clave);

      const id = `${ahora}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => {
        if (prev.some((t) => construirClaveToast(t.tipo, t.mensaje) === clave)) {
          return prev;
        }
        const siguiente = [...prev, { id, mensaje: mensajeLimpio, tipo, titulo, duracion }];
        const recortado = siguiente.slice(-MAX_TOASTS_ACTIVOS);
        activeKeysRef.current = new Set(recortado.map((t) => construirClaveToast(t.tipo, t.mensaje)));
        return recortado;
      });
    },
    []
  );

  const toast = useMemo(
    () => ({
      success: (msg: string, title?: string) => mostrarToast(msg, "success", title),
      error: (msg: string, title?: string) => mostrarToast(msg, "error", title),
      warning: (msg: string, title?: string) => mostrarToast(msg, "warning", title),
      info: (msg: string, title?: string) => mostrarToast(msg, "info", title),
    }),
    [mostrarToast]
  );

  return (
    <ToastContext.Provider value={{ mostrarToast, toast }}>
      {children}
      <div
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastElement key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
