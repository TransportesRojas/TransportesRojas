import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle, Loader2, KeyRound, ArrowRight } from "lucide-react";
import { fetchApi } from "../../../services/api";
import { extraerMensajeErrorApi } from "../../../utils/errorMessages";
import logoCircular from "../../../assets/logocircular.webp";

export default function ActivarCuenta() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [tokenManual, setTokenManual] = useState(tokenParam);
  const [estado, setEstado] = useState<"cargando" | "exito" | "error" | "formulario">("cargando");
  const [mensaje, setMensaje] = useState("");

  const ejecutarActivacion = async (tokenAValidar: string) => {
    if (!tokenAValidar.trim()) {
      setEstado("formulario");
      return;
    }

    setEstado("cargando");
    setMensaje("");

    try {
      const respuesta = await fetchApi("/Autenticacion/activar-cuenta", {
        method: "POST",
        body: JSON.stringify({ token: tokenAValidar.trim() }),
      });

      setEstado("exito");
      setMensaje(respuesta?.mensaje || "¡Tu cuenta ha sido activada exitosamente!");
    } catch (err: any) {
      setEstado("error");
      setMensaje(
        extraerMensajeErrorApi(err, "El enlace de activación no es válido o ha expirado.")
      );
    }
  };

  useEffect(() => {
    if (tokenParam) {
      void ejecutarActivacion(tokenParam);
    } else {
      setEstado("formulario");
    }
  }, [tokenParam]);

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    void ejecutarActivacion(tokenManual);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 font-[Poppins,Inter,sans-serif] bg-[#F4F7FB] text-slate-800 relative selection:bg-rose-500 selection:text-white"
    >
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-[#0B2D4A] z-50" />

      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-[0_20px_60px_-15px_rgba(11,45,74,0.15)] border border-slate-200/80 text-center animate-in fade-in duration-300">
        <div className="flex justify-center mb-5">
          <img
            src={logoCircular}
            alt="Transportes Rojas"
            className="w-14 h-14 rounded-full object-cover border-2 border-tr-red shadow-md"
          />
        </div>

        <h1 className="text-xl font-black text-[#0B2D4A] tracking-tight mb-2">
          Activación de Cuenta
        </h1>

        {estado === "cargando" && (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-[#0B2D4A] animate-spin" />
            <p className="text-xs font-semibold text-slate-600">
              Validando y activando tu cuenta...
            </p>
          </div>
        )}

        {estado === "exito" && (
          <div className="py-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-base font-bold text-emerald-800 mb-2">
              ¡Activación Completada!
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              {mensaje}
            </p>
            <button
              type="button"
              onClick={() => navigate("/login-clientes")}
              className="w-full py-3.5 rounded-xl bg-[#0B2D4A] hover:bg-[#071E33] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>Ir a Iniciar Sesión</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}

        {estado === "error" && (
          <div className="py-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mb-4">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-base font-bold text-rose-800 mb-2">
              No pudimos activar tu cuenta
            </h2>
            <p className="text-xs text-rose-600/90 leading-relaxed mb-6 bg-rose-50/70 p-3 rounded-xl border border-rose-200 text-left">
              {mensaje}
            </p>

            <form onSubmit={handleSubmitManual} className="space-y-3 text-left">
              <label htmlFor="token-manual" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Pega tu código o token de activación:
              </label>
              <textarea
                id="token-manual"
                rows={3}
                value={tokenManual}
                onChange={(e) => setTokenManual(e.target.value)}
                placeholder="Pega aquí el token recibido por correo..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B2D4A] font-mono"
              />
              <button
                type="submit"
                disabled={!tokenManual.trim()}
                className="w-full py-3 rounded-xl bg-[#0B2D4A] hover:bg-[#071E33] text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                Reintentar Activación
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <Link to="/login-clientes" className="text-[#0B2D4A] font-bold hover:underline">
                Volver al inicio de sesión
              </Link>
              <Link to="/registro-clientes" className="text-slate-500 hover:text-slate-700">
                Registrarme de nuevo
              </Link>
            </div>
          </div>
        )}

        {estado === "formulario" && (
          <div className="py-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-[#0B2D4A] border border-blue-200 flex items-center justify-center mb-4">
              <KeyRound size={24} />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Ingresa el código o token de activación que recibiste en tu correo electrónico para habilitar tu cuenta.
            </p>
            <form onSubmit={handleSubmitManual} className="space-y-3 text-left">
              <textarea
                rows={3}
                value={tokenManual}
                onChange={(e) => setTokenManual(e.target.value)}
                placeholder="Pega aquí el token recibido..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0B2D4A] font-mono"
                required
              />
              <button
                type="submit"
                disabled={!tokenManual.trim()}
                className="w-full py-3 rounded-xl bg-[#0B2D4A] hover:bg-[#071E33] text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                Activar Cuenta
              </button>
            </form>

            <div className="mt-5 text-center">
              <Link to="/login-clientes" className="text-xs text-[#0B2D4A] font-bold hover:underline">
                Ir a Iniciar Sesión
              </Link>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400 font-medium">
        © {new Date().getFullYear()} Transportes Rojas S.A. de C.V.
      </p>
    </div>
  );
}

