import { useState, useEffect } from "react";
import {
  WifiOff, RefreshCw, Phone,
  MessageCircle, CheckCircle2, ShieldCheck, AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoCircular from "../../assets/logocircular.webp";
import { API_URL } from "../../services/api";

interface SinConexionClienteProps {
  onReconnected?: () => void;
}

export default function SinConexionCliente({ onReconnected }: SinConexionClienteProps) {
  const navigate = useNavigate();
  const [comprobando, setComprobando] = useState(false);
  const [estadoRed, setEstadoRed] = useState<"offline" | "online">("offline");
  const [mensajeEstado, setMensajeEstado] = useState<string | null>(null);

  useEffect(() => {
    function handleOnline() {
      setEstadoRed("online");
      setMensajeEstado("¡Tu conexión ha vuelto! Restaurando tu sesión...");
      setTimeout(() => {
        if (onReconnected) {
          onReconnected();
        } else {
          window.location.reload();
        }
      }, 1200);
    }

    function handleOffline() {
      setEstadoRed("offline");
      setMensajeEstado("Se interrumpió la conexión a internet.");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onReconnected]);

  async function verificarConexion() {
    setComprobando(true);
    setMensajeEstado(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setTimeout(() => {
        setEstadoRed("offline");
        setMensajeEstado("Aún no detectamos conexión a internet en tu dispositivo.");
        setComprobando(false);
      }, 600);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${API_URL}/Cliente`, {
        method: "HEAD",
        signal: controller.signal,
      }).catch(async () => {
        return await fetch(window.location.origin, {
          method: "HEAD",
          cache: "no-store",
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);

      if (res) {
        setEstadoRed("online");
        setMensajeEstado("¡Conexión restaurada! Volviendo a tus envíos...");
        setTimeout(() => {
          if (onReconnected) {
            onReconnected();
          } else {
            navigate("/cliente/bienvenida", { replace: true });
          }
        }, 1000);
        return;
      }
    } catch {
      setEstadoRed("offline");
      setMensajeEstado("Aún no es posible conectar con el servidor. Intenta en un momento.");
    } finally {
      setComprobando(false);
    }
  }

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-x-hidden font-[Poppins,system-ui,sans-serif] text-[#1F2937]"
      style={{
        background:
          "radial-gradient(circle at 15% 10%, rgba(214,69,69,0.12), transparent 45%), radial-gradient(circle at 90% 95%, rgba(37,99,235,0.08), transparent 55%), #0B2D4A",
      }}
    >
      <div className="relative z-10 border-b border-white/[0.08] bg-[#071E33] py-2.5 text-center font-[Poppins,sans-serif] text-[11px] font-semibold tracking-[3px] text-white/75">
        <span className="strip-span relative inline-block px-4">
          TUS ENVÍOS, EN BUENAS MANOS &bull; TRANSPORTES ROJAS
        </span>
      </div>

      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-xl rounded-3xl bg-white p-7 sm:p-10 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.45)] border border-white/20 animate-[card-pop_0.5s_ease-out] text-center">

          <div className="flex items-center justify-center gap-3 mb-6">
            <img
              src={logoCircular}
              alt="Transportes Rojas"
              className="w-11 h-11 rounded-full object-cover border-2 border-[#D64545] shadow-[0_0_12px_rgba(214,69,69,0.35)]"
            />
            <span className="text-xl font-extrabold text-[#0B2D4A] tracking-tight">
              Transportes <span className="text-[#D64545]">Rojas</span>
            </span>
          </div>

          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full bg-rose-500/15 blur-xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 flex items-center justify-center shadow-inner">
              <WifiOff size={44} className="text-[#D64545]" />
            </div>
            <div className="absolute bottom-0 right-0 bg-[#0B2D4A] text-white p-2 rounded-full shadow-md border-2 border-white">
              <ShieldCheck size={16} className="text-emerald-400" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2D4A] tracking-tight mb-3">
            Parece que perdiste tu conexión a internet
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
            No te preocupes: tus paquetes, números de guía y cotizaciones están completamente seguros y guardados en nuestro sistema.
          </p>

          {mensajeEstado && (
            <div
              className={`w-full mb-6 p-3.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 animate-[card-pop_0.3s_ease] ${
                estadoRed === "online"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {estadoRed === "online" ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-[#D64545] shrink-0" />
              )}
              <span>{mensajeEstado}</span>
            </div>
          )}

          <div className="w-full bg-[#F7F9FB] border border-slate-200 rounded-2xl p-5 text-left mb-7 space-y-2.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              ¿Qué puedes hacer?
            </span>
            <div className="text-xs sm:text-sm text-slate-600 space-y-2">
              <p className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D64545] shrink-0 mt-2" />
                <span>Verifica que tus datos móviles o tu conexión a la red Wi-Fi se encuentren activos.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D64545] shrink-0 mt-2" />
                <span>Comprueba si tienes activo el modo avión por error en tu dispositivo.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D64545] shrink-0 mt-2" />
                <span>En cuanto se detecte acceso a internet, la plataforma reanudará tu sesión automáticamente.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center mb-6">
            <button
              type="button"
              onClick={verificarConexion}
              disabled={comprobando}
              className="w-full sm:w-auto min-w-[260px] px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#0B2D4A] to-[#143F66] hover:brightness-110 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw size={17} className={comprobando ? "animate-spin" : ""} />
              <span>{comprobando ? "Comprobando conexión..." : "Reintentar Conexión"}</span>
            </button>
          </div>

          <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <div className="flex items-center gap-2">
              <Phone size={15} className="text-[#0B2D4A]" />
              <span>Atención telefónica: <strong>800 123 7652</strong></span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 font-medium">
              <MessageCircle size={15} />
              <span>Rastreo por WhatsApp activo</span>
            </div>
          </div>

        </div>
      </div>

      <footer className="relative z-10 py-3 text-center text-xs text-white/50">
        Transportes Rojas &copy; {new Date().getFullYear()} &bull; Todos los derechos reservados
      </footer>
    </div>
  );
}
