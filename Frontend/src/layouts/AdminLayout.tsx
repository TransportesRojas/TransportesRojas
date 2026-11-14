import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { LogOut, ChevronDown, KeyRound } from "lucide-react";
import logoCircular from "../assets/logocircular.webp";
import { getAllowedModules } from "../config/modules";
import { captureFlyRects, peekFlyRects } from "../utils/flyTransition";
import { getSession, logoutUsuario } from "../utils/auth";
import ModuleSidebar from "../components/ModuleSidebar";
import { ModalCambiarPassword } from "../components/ModalCambiarPassword";
import "./admin-layout.css";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const session = getSession();
  const [roles, setRoles] = useState<string[]>(() => session.roles.map(r => r.toLowerCase()));
  const [userName, setUserName] = useState(() => session.user?.email || session.user?.nombreCompleto || "Empleado");

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("tr_sidebar_open");
    return saved !== null ? saved === "true" : true;
  });

  // Transición de tarjetas entre panel y barra lateral
  const [prevPath, setPrevPath] = useState(location.pathname);
  const [isFlying, setIsFlying] = useState<boolean>(() => peekFlyRects("grid") !== null);
  const [isSidebarAnimating, setIsSidebarAnimating] = useState<boolean>(() => peekFlyRects("grid") !== null);

  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    if (peekFlyRects("grid") !== null) {
      setIsFlying(true);
      setIsSidebarAnimating(true);
    }
  }

  useEffect(() => {
    if (isFlying || isSidebarAnimating) {
      const timer = setTimeout(() => {
        setIsFlying(false);
        setIsSidebarAnimating(false);
      }, 950);
      return () => clearTimeout(timer);
    }
  }, [isFlying, isSidebarAnimating]);

  const hasPendingFly = peekFlyRects("grid") !== null;
  const isWorkspaceHidden = isFlying || hasPendingFly;
  const isSidebarOverflowing = isSidebarAnimating || isWorkspaceHidden;

  useEffect(() => {
    const s = getSession();
    if (!s.isAuthenticated || s.tipoUsuario?.toLowerCase() !== "empleado") {
      navigate("/login-empleados", { replace: true });
      return;
    }
    const rolesNorm = s.roles.map((r: string) => r.toLowerCase());
    const tieneRolAdmin = rolesNorm.some((r) =>
      [
        "rh",
        "supervisor",
        "jefe de flotilla",
        "jefe",
        "personal administrativo",
        "personal de sucursal",
      ].includes(r)
    );
    if (rolesNorm.includes("chofer") && !tieneRolAdmin) {
      navigate("/chofer", { replace: true });
      return;
    }
    setRoles(rolesNorm);
    setUserName(s.user?.email || s.user?.nombreCompleto || "Empleado");
  }, [navigate]);

  // Cierre del menú de usuario
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuAbierto(false);
      }
    };
    if (menuAbierto) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuAbierto]);

  const handleLogout = async () => {
    await logoutUsuario();
    navigate("/login-empleados", { replace: true });
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("tr_sidebar_open", String(next));
      return next;
    });
  };

  const allowedModules = getAllowedModules(roles);
  const isPanel = location.pathname === "/admin/bienvenida" || location.pathname === "/admin";

  return (
    <div className="min-h-screen flex flex-col bg-tr-bg font-[Poppins,Inter,system-ui,sans-serif] text-tr-ink relative">
      <div
        className="h-1 w-full relative z-50 shrink-0 bg-[#0B2D4A]"
      />

      {/* Encabezado */}
      <header className="sticky top-0 z-40 h-16 bg-gradient-to-r from-tr-navy to-[#0F3B62] text-white px-5 sm:px-7 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-4">
          <Link 
            to="/admin/bienvenida" 
            onClick={() => {
              if (!isPanel) captureFlyRects(document, "sidebar");
            }}
            className="flex items-center gap-3 cursor-pointer text-white no-underline group"
            title="Ir al Panel de Control"
          >
            <img
              src={logoCircular}
              alt="Transportes Rojas"
              className="w-[38px] h-[38px] rounded-full object-cover border-2 border-tr-red shadow-[0_0_12px_rgba(214,69,69,0.45)] group-hover:scale-105 transition-transform"
              draggable={false}
            />
            <div>
              <div className="text-lg font-bold tracking-tight leading-tight">Transportes Rojas</div>
              <div className="text-[11px] uppercase tracking-widest text-white/70 font-semibold">Portal Interno</div>
            </div>
          </Link>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            id="btn-usuario-menu"
            type="button"
            onClick={() => setMenuAbierto((prev) => !prev)}
            className="flex items-center gap-3 bg-white/10 hover:bg-white/18 text-white px-3 py-1.5 rounded-xl border border-white/20 hover:border-white/30 transition-all cursor-pointer select-none group shadow-xs active:scale-[0.99]"
            title="Opciones de cuenta"
            aria-expanded={menuAbierto}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-lg bg-tr-red text-white flex items-center justify-center font-black text-xs shadow-xs uppercase shrink-0">
              {userName?.[0] || "U"}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-white tracking-tight leading-tight group-hover:text-blue-100 transition-colors">
                {userName}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-extrabold mt-0.5">
                {roles.join(", ")}
              </div>
            </div>
            <ChevronDown
              size={15}
              className={`text-white/70 transition-transform duration-200 shrink-0 ${menuAbierto ? "rotate-180" : ""}`}
            />
          </button>

          {menuAbierto && (
            <div
              id="menu-usuario-desplegable"
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-slate-800 animate-[fadeInSlide_0.15s_ease-out]"
            >
              <div className="p-3.5 bg-slate-50 border-b border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sesión iniciada como</div>
                <div className="text-xs font-bold text-slate-900 truncate mt-0.5">{userName}</div>
                <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-bold mt-1 inline-block bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {roles.join(", ")}
                </div>
              </div>

              <div className="p-1.5">
                <button
                  id="btn-opcion-cambiar-password"
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    setModalPasswordAbierto(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-tr-navy hover:bg-blue-50/70 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <KeyRound size={15} className="text-tr-navy shrink-0" />
                  <span>Cambiar contraseña</span>
                </button>

                <div className="border-t border-slate-100 my-1" />

                <button
                  id="btn-opcion-salir"
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-left"
                >
                  <LogOut size={15} className="shrink-0" />
                  <span>Salir (Cerrar sesión)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <ModalCambiarPassword
        abierto={modalPasswordAbierto}
        onClose={() => setModalPasswordAbierto(false)}
      />

      {/* Contenido principal */}
      <div className="flex flex-1 min-h-[calc(100vh-68px)] relative">
        {isPanel ? (
          <div className="w-full max-w-[1320px] mx-auto px-6 py-10 pb-16 animate-[fadeInSlide_0.38s_ease-out]">
            <Outlet context={{ roles, userName, allowedModules }} />
          </div>
        ) : (
          <div className="flex w-full min-h-[calc(100vh-68px)] relative">
            <div className={`admin-sidebar-wrapper ${isSidebarOverflowing ? "admin-sidebar-wrapper--animating" : ""} ${!sidebarOpen ? "admin-sidebar-wrapper--collapsed" : ""}`}>
              <ModuleSidebar 
                modules={allowedModules} 
                collapsed={!sidebarOpen}
                onToggleSidebar={toggleSidebar}
                onPrimaryTouchdown={() => setIsFlying(false)}
                onFlyEnd={() => {
                  setIsFlying(false);
                  setIsSidebarAnimating(false);
                }}
              />
            </div>

            <main className={`admin-workspace ${isWorkspaceHidden ? "admin-workspace--flying" : "admin-workspace--revealed"}`}>
              <Outlet />
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
