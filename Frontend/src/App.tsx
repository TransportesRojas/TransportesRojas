import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TransportesRojasLogin from "./pages/auth/Empleados/TransportesRojasLogin";
import TransportesRojasClientLogin from "./pages/auth/Clientes/TransportesRojasClientLogin";
import ActivarCuenta from "./pages/auth/Clientes/ActivarCuenta";
import CrudClientes from "./pages/cruds/cllientes/crud-clientes.tsx";
import CrudEmpleados from "./pages/cruds/empleados/crud-empleados.tsx";
import CrudEnvios from "./pages/cruds/envios/crud-envios.tsx";
import CrudRutas from "./pages/cruds/rutas/crud-rutas.tsx";
import CrudFlotillas from "./pages/cruds/flotillas/crud-flotillas.tsx";
import CrudPuestos from "./pages/cruds/puestos/crud-puestos.tsx";
import CrudRoles from "./pages/cruds/roles/crud-roles.tsx";
import CrudSucursales from "./pages/cruds/sucursales/crud-sucursales.tsx";
import CrudTipoMantenimiento from "./pages/cruds/tipomantenimiento/crud-tipomantenimiento.tsx";
import BienvenidaCliente from "./pages/bienvenida/BienvenidaCliente.tsx";
import BienvenidaEmpleado from "./pages/bienvenida/BienvenidaEmpleado.tsx";
import PortalChofer from "./pages/chofer/PortalChofer";
import AdminLayout from "./layouts/AdminLayout";
import RutaProtegida from "./components/RutaProtegida";
import NetworkMonitor from "./components/NetworkMonitor";
import SinAcceso from "./pages/error/SinAcceso";
import SinConexionEmpleado from "./pages/error/SinConexionEmpleado";
import SinConexionCliente from "./pages/error/SinConexionCliente";
import { getModuleRoles } from "./config/modules";
import { ToastProvider } from "./components/Toast";

function AppRouter() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <NetworkMonitor>
          <Routes>
            <Route path="/" element={<Navigate to="/login-empleados" replace />} />

            {/* Autenticación pública */}
            <Route path="/login-clientes" element={<TransportesRojasClientLogin />} />
            <Route path="/login-empleados" element={<TransportesRojasLogin />} />
            <Route path="/registro-clientes" element={<Navigate to="/login-clientes" replace />} />
            <Route path="/activar-cuenta" element={<ActivarCuenta />} />

            {/* Páginas de estado y error */}
            <Route path="/403" element={<SinAcceso />} />
            <Route path="/sin-conexion/empleado" element={<SinConexionEmpleado />} />
            <Route path="/sin-conexion/cliente" element={<SinConexionCliente />} />

            {/* Portal de clientes */}
            <Route
              path="/cliente/bienvenida"
              element={
                <RutaProtegida tipoPermitido="Cliente" moduloNombre="Portal de Clientes">
                  <BienvenidaCliente />
                </RutaProtegida>
              }
            />

            {/* Portal de choferes */}
            <Route
              path="/chofer"
              element={
                <RutaProtegida
                  tipoPermitido="Empleado"
                  rolesPermitidos={["chofer"]}
                  moduloNombre="Portal del Chofer"
                >
                  <PortalChofer />
                </RutaProtegida>
              }
            />

            {/* Panel administrativo */}
            <Route
              path="/admin"
              element={
                <RutaProtegida tipoPermitido="Empleado" moduloNombre="Portal Interno">
                  <AdminLayout />
                </RutaProtegida>
              }
            >
              <Route index element={<Navigate to="bienvenida" replace />} />
              <Route path="bienvenida" element={<BienvenidaEmpleado />} />

              {/* Módulos CRUD */}
              <Route
                path="envios"
                element={
                  <RutaProtegida
                    tipoPermitido="Empleado"
                    rolesPermitidos={getModuleRoles("envios")}
                    moduloNombre="Envíos"
                  >
                    <CrudEnvios />
                  </RutaProtegida>
                }
              />
              <Route
                path="rutas"
                element={
                  <RutaProtegida
                    tipoPermitido="Empleado"
                    rolesPermitidos={getModuleRoles("rutas")}
                    moduloNombre="Rutas"
                  >
                    <CrudRutas />
                  </RutaProtegida>
                }
              />
              <Route
                path="clientes"
                element={
                  <RutaProtegida
                    tipoPermitido="Empleado"
                    rolesPermitidos={getModuleRoles("clientes")}
                    moduloNombre="Clientes"
                  >
                    <CrudClientes />
                  </RutaProtegida>
                }
              />
              <Route
                path="empleados"
                element={
                  <RutaProtegida
                    tipoPermitido="Empleado"
                    rolesPermitidos={getModuleRoles("empleados")}
                    moduloNombre="Empleados"
                  >
                    <CrudEmpleados />
                  </RutaProtegida>
                }
              />
              <Route
                path="flotillas"
                element={
                  <RutaProtegida
                    tipoPermitido="Empleado"
                    rolesPermitidos={getModuleRoles("flotillas")}
                    moduloNombre="Flotillas"
                  >
                    <CrudFlotillas />
                  </RutaProtegida>
                }
              />
              <Route
                path="puestos"
                element={
                  <RutaProtegida
                    tipoPermitido="Empleado"
                    rolesPermitidos={getModuleRoles("puestos")}
                    moduloNombre="Puestos"
                  >
                    <CrudPuestos />
                  </RutaProtegida>
                }
              />
              <Route
                path="roles"
                element={
                  <RutaProtegida
                    tipoPermitido="Empleado"
                    rolesPermitidos={getModuleRoles("roles")}
                    moduloNombre="Roles"
                  >
                    <CrudRoles />
                  </RutaProtegida>
                }
              />
              <Route
                path="sucursales"
                element={
                  <RutaProtegida
                    tipoPermitido="Empleado"
                    rolesPermitidos={getModuleRoles("sucursales")}
                    moduloNombre="Sucursales"
                  >
                    <CrudSucursales />
                  </RutaProtegida>
                }
              />
              <Route
                path="tipomantenimiento"
                element={
                  <RutaProtegida
                    tipoPermitido="Empleado"
                    rolesPermitidos={getModuleRoles("tipomantenimiento")}
                    moduloNombre="Mantenimiento"
                  >
                    <CrudTipoMantenimiento />
                  </RutaProtegida>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/login-empleados" replace />} />
          </Routes>
        </NetworkMonitor>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default AppRouter;
