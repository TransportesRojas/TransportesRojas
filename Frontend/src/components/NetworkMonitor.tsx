import { useState, useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import SinConexionEmpleado from "../pages/error/SinConexionEmpleado";
import SinConexionCliente from "../pages/error/SinConexionCliente";
import { getSession } from "../utils/auth";

interface NetworkMonitorProps {
  children: ReactNode;
}

export default function NetworkMonitor({ children }: NetworkMonitorProps) {
  const location = useLocation();
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? !navigator.onLine : false;
  });
  const [showRestoredBanner, setShowRestoredBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowRestoredBanner(true);
      const timer = setTimeout(() => {
        setShowRestoredBanner(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowRestoredBanner(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (
    location.pathname.startsWith("/sin-conexion") ||
    location.pathname === "/403"
  ) {
    return <>{children}</>;
  }

  if (isOffline) {
    const session = getSession();
    const isEmployeeRoute =
      location.pathname.startsWith("/admin") ||
      location.pathname.startsWith("/login-empleados");
    const isClientRoute =
      location.pathname.startsWith("/cliente") ||
      location.pathname.startsWith("/login-clientes") ||
      location.pathname.startsWith("/registro-clientes");

    let isEmpleado = isEmployeeRoute;
    if (!isEmployeeRoute && !isClientRoute) {
      isEmpleado = session.tipoUsuario?.toLowerCase() === "empleado";
    }

    return isEmpleado ? (
      <SinConexionEmpleado onReconnected={() => setIsOffline(false)} />
    ) : (
      <SinConexionCliente onReconnected={() => setIsOffline(false)} />
    );
  }

  return (
    <>
      {showRestoredBanner && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-3 right-3 z-[9999] bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold animate-[card-pop_0.3s_ease]"
        >
          <CheckCircle2 size={18} className="text-emerald-200 shrink-0" />
          <span>¡Conexión restaurada con éxito!</span>
        </aside>
      )}
      {children}
    </>
  );
}
