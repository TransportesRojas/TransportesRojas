import { useState, type ReactNode } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { getSession, hasRequiredRole } from "../utils/auth";
import SinAcceso from "../pages/error/SinAcceso";
import { ModalCambioPasswordInicial } from "./ModalCambioPasswordInicial";

interface RutaProtegidaProps {
  tipoPermitido: "Empleado" | "Cliente";
  rolesPermitidos?: string[];
  moduloNombre?: string;
  children?: ReactNode;
}

export default function RutaProtegida({
  tipoPermitido,
  rolesPermitidos,
  moduloNombre,
  children,
}: RutaProtegidaProps) {
  const location = useLocation();
  const session = getSession();
  const [modalForzadoAbierto, setModalForzadoAbierto] = useState(
    Boolean(session.isAuthenticated && session.user?.requiereCambioPassword)
  );

  if (!session.isAuthenticated) {
    const destinoLogin =
      tipoPermitido === "Cliente" ? "/login-clientes" : "/login-empleados";

    return (
      <Navigate
        to={destinoLogin}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  const handleSuccessForzado = () => {
    if (session.user) {
      const userActualizado = { ...session.user, requiereCambioPassword: false };
      localStorage.setItem("user", JSON.stringify(userActualizado));
    }
    setModalForzadoAbierto(false);
  };

  const tipoActual = session.tipoUsuario?.toLowerCase();
  const tipoEsperado = tipoPermitido.toLowerCase();

  if (tipoActual !== tipoEsperado) {
    return (
      <SinAcceso
        modulo={moduloNombre || (tipoPermitido === "Empleado" ? "Portal Administrativo" : "Portal de Clientes")}
        portal={tipoPermitido === "Cliente" ? "cliente" : "empleado"}
        rolesUsuario={session.roles}
        rolesRequeridos={rolesPermitidos}
        mensajePersonalizado={
          tipoPermitido === "Empleado"
            ? "Esta área es de acceso exclusivo para el personal interno de Transportes Rojas."
            : "Esta área es exclusiva para clientes registrados de Transportes Rojas."
        }
      />
    );
  }

  if (rolesPermitidos && rolesPermitidos.length > 0) {
    const autorizado = hasRequiredRole(session.roles, rolesPermitidos);

    if (!autorizado) {
      return (
        <SinAcceso
          modulo={moduloNombre}
          portal={tipoPermitido === "Cliente" ? "cliente" : "empleado"}
          rolesUsuario={session.roles}
          rolesRequeridos={rolesPermitidos}
        />
      );
    }
  }

  return (
    <>
      <div
        className={
          modalForzadoAbierto
            ? "pointer-events-none select-none filter blur-[3px] transition-all duration-300"
            : ""
        }
      >
        {children ? <>{children}</> : <Outlet />}
      </div>

      {modalForzadoAbierto && session.user && (
        <ModalCambioPasswordInicial
          abierto={true}
          usuarioId={session.user.id}
          token={session.token || undefined}
          onSuccess={handleSuccessForzado}
        />
      )}
    </>
  );
}
