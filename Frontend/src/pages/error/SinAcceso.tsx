import { useNavigate, Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home, LogOut, Lock, KeyRound } from "lucide-react";
import { getSession, clearSession } from "../../utils/auth";
import logoCircular from "../../assets/logocircular.webp";

interface SinAccesoProps {
  modulo?: string;
  rolesUsuario?: string[];
  rolesRequeridos?: string[];
  portal?: "empleado" | "cliente";
  mensajePersonalizado?: string;
}

export default function SinAcceso({
  modulo,
  rolesUsuario,
  rolesRequeridos,
  portal = "empleado",
  mensajePersonalizado,
}: SinAccesoProps) {
  const navigate = useNavigate();
  const session = getSession();

  const usuarioRoles = rolesUsuario || session.roles || [];
  const esClienteAutenticado =
    portal === "cliente" || session.tipoUsuario?.toLowerCase() === "cliente";
  const rutaInicio = esClienteAutenticado ? "/cliente/bienvenida" : "/admin/bienvenida";
  const rutaLogin = esClienteAutenticado ? "/login-clientes" : "/login-empleados";

  const handleCerrarSesion = () => {
    clearSession();
    navigate(rutaLogin, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col font-[Poppins,Inter,system-ui,sans-serif] text-slate-800 relative selection:bg-rose-500 selection:text-white">
      <div
        className="h-1.5 w-full shrink-0 shadow-sm bg-[#0B2D4A]"
      />

      <header className="bg-gradient-to-r from-[#0B2D4A] to-[#143F66] text-white px-6 py-3.5 flex items-center justify-between shadow-md">
        <Link to={rutaInicio} className="flex items-center gap-3 no-underline text-white group" title="Ir al inicio">
          <img
            src={logoCircular}
            alt="Transportes Rojas"
            className="w-[38px] h-[38px] rounded-full object-cover border-2 border-[#D64545] shadow-[0_0_12px_rgba(214,69,69,0.45)]"
          />
          <span className="text-lg font-extrabold text-white tracking-tight">
            Transportes <span className="text-[#D64545]">Rojas</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
            Seguridad y Control de Accesos
          </span>
          <button
            onClick={handleCerrarSesion}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut size={14} />
            <span>Salir</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden animate-[card-pop_0.5s_ease-out]">

          <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock size={18} className="text-rose-100" />
              <span className="font-semibold tracking-wide text-sm uppercase">
                Restricción de Privilegios
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-10 flex flex-col items-center text-center">

            <div className="relative mb-6">
              <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-rose-50 to-rose-100 border-2 border-rose-200 flex items-center justify-center shadow-inner">
                <ShieldAlert size={48} className="text-rose-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#0B2D4A] text-white p-2 rounded-full shadow-md border-2 border-white">
                <KeyRound size={16} />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2D4A] tracking-tight mb-2">
              Acceso Denegado
            </h1>
            <p className="text-slate-600 max-w-lg text-sm sm:text-base leading-relaxed mb-6">
              {mensajePersonalizado || (
                <>
                  No tienes los permisos o roles necesarios para ingresar al módulo{" "}
                  {modulo ? <strong className="text-rose-600 font-semibold">"{modulo}"</strong> : "solicitado"}.
                  Por motivos de seguridad y auditoría institucional, esta ruta ha sido bloqueada.
                </>
              )}
            </p>

            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 text-left mb-8 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 text-xs">
                <span className="font-semibold text-slate-500 uppercase tracking-wider">
                  Usuario autenticado:
                </span>
                <span className="font-medium text-[#0B2D4A] truncate">
                  {session.user?.email || session.user?.nombreCompleto || "Usuario activo"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 text-xs">
                <span className="font-semibold text-slate-500 uppercase tracking-wider">
                  Tus roles asignados:
                </span>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {usuarioRoles.length > 0 ? (
                    usuarioRoles.map((r) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 bg-slate-200 text-slate-700 font-medium rounded-md capitalize"
                      >
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">Sin roles asignados</span>
                  )}
                </div>
              </div>

              {rolesRequeridos && rolesRequeridos.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider">
                    Roles con autorización:
                  </span>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {rolesRequeridos.map((r) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 font-medium rounded-md capitalize"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Regresar</span>
              </button>

              <button
                type="button"
                id="btn-ir-panel-principal"
                onClick={() => navigate(rutaInicio, { replace: true })}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0B2D4A] hover:bg-[#143F66] text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                <Home size={16} />
                <span>Ir al Panel Principal</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-6">
              ¿Crees que se trata de un error? Comunícate con el área de{" "}
              <strong className="text-slate-600">Recursos Humanos o Sistemas</strong> para solicitar los permisos correspondientes.
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-slate-500 border-t border-slate-200 bg-white/50">
        Transportes Rojas &copy; {new Date().getFullYear()} &bull; Sistema de Gestión y Logística
      </footer>
    </div>
  );
}
