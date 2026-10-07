import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TransportesRojasLogin from "./pages/auth/Empleados/TransportesRojasLogin";
import TransportesRojasClientLogin from "./pages/auth/Clientes/TransportesRojasClientLogin";
import RegistroClientes from "./pages/auth/Clientes/Registrar/Registro_Clientes.tsx";
import CrudClientes from "./pages/cruds/cllientes/crud-clientes.tsx";
import CrudEmpleados from "./pages/cruds/empleados/crud-empleados.tsx";
import CrudFlotillas from "./pages/cruds/flotillas/crud-flotillas.tsx";
import CrudPermisos from "./pages/cruds/permisos/crud-permisos.tsx";
import CrudPuestos from "./pages/cruds/puestos/crud-puestos.tsx";
import CrudRoles from "./pages/cruds/roles/crud-roles.tsx";
import CrudSucursales from "./pages/cruds/sucursales/crud-sucursales.tsx";
import CrudTipoMantenimiento from "./pages/cruds/tipomantenimiento/crud-tipomantenimiento.tsx";
import CrudUnidades from "./pages/cruds/unidades/crud-unidades.tsx";
import CrudUsuarios from "./pages/cruds/usuarios/crud-usuarios.tsx";
import BienvenidaCliente from "./pages/bienvenida/BienvenidaCliente.tsx";
import BienvenidaEmpleado from "./pages/bienvenida/BienvenidaEmpleado.tsx";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login-empleados" replace />} />

        <Route path="/login-clientes" element={<TransportesRojasClientLogin />} />
        <Route path="/login-empleados" element={<TransportesRojasLogin />} />
        <Route path="/registro-clientes" element={<RegistroClientes />} />

        <Route path="/cliente/bienvenida" element={<BienvenidaCliente />} />

        <Route path="/admin/bienvenida" element={<BienvenidaEmpleado />} />
        <Route path="/admin/clientes" element={<CrudClientes />} />
        <Route path="/admin/empleados" element={<CrudEmpleados />} />
        <Route path="/admin/flotillas" element={<CrudFlotillas />} />
        <Route path="/admin/permisos" element={<CrudPermisos />} />
        <Route path="/admin/puestos" element={<CrudPuestos />} />
        <Route path="/admin/roles" element={<CrudRoles />} />
        <Route path="/admin/sucursales" element={<CrudSucursales />} />
        <Route path="/admin/tipomantenimiento" element={<CrudTipoMantenimiento />} />
        <Route path="/admin/unidades" element={<CrudUnidades />} />
        <Route path="/admin/usuarios" element={<CrudUsuarios />} />

        <Route path="*" element={<Navigate to="/login-clientes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
