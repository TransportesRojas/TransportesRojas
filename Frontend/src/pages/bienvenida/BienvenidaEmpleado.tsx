import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, Building2, UserCog, ShieldCheck, Key, 
  Briefcase, Store, Truck, CarFront, Wrench, LogOut
} from "lucide-react";

const MODULES = [
  { path: "/admin/empleados", name: "Empleados", desc: "Gestión de personal", roles: ["rh", "supervisor", "jefe de flotilla"], icon: Users },
  { path: "/admin/clientes", name: "Clientes", desc: "Cartera de clientes", roles: ["rh", "supervisor", "jefe de flotilla", "chofer", "personal administrativo", "personal de sucursal"], icon: Building2 },
  { path: "/admin/usuarios", name: "Usuarios", desc: "Cuentas y contraseñas", roles: ["rh", "personal administrativo"], icon: UserCog },
  { path: "/admin/roles", name: "Roles", desc: "Roles del sistema", roles: ["rh"], icon: ShieldCheck },
  { path: "/admin/permisos", name: "Permisos", desc: "Catálogo de permisos", roles: ["rh"], icon: Key },
  { path: "/admin/puestos", name: "Puestos", desc: "Catálogo de puestos", roles: ["rh", "supervisor"], icon: Briefcase },
  { path: "/admin/sucursales", name: "Sucursales", desc: "Ubicaciones físicas", roles: ["rh", "supervisor", "jefe de flotilla", "personal administrativo", "personal de sucursal"], icon: Store },
  { path: "/admin/flotillas", name: "Flotillas", desc: "Agrupación de camiones", roles: ["rh", "supervisor", "jefe de flotilla"], icon: Truck },
  { path: "/admin/unidades", name: "Unidades", desc: "Camiones individuales", roles: ["rh", "supervisor", "jefe de flotilla", "chofer"], icon: CarFront },
  { path: "/admin/tipomantenimiento", name: "Mantenimiento", desc: "Servicios vehiculares", roles: ["rh"], icon: Wrench },
];

export default function BienvenidaEmpleado() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<string[]>([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/login-empleados");
      return;
    }
    const user = JSON.parse(userStr);
    setRoles(user.roles?.map((r: string) => r.toLowerCase()) || []);
    setUserName(user.email || "Empleado");
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login-empleados");
  };

  const allowedModules = MODULES.filter(mod => 
    mod.roles.some(r => roles.includes(r))
  );

  return (
    <div className="min-h-screen bg-[#F7F9FB] font-[Poppins,sans-serif] text-[#1F2937]">
      <nav className="bg-[#0B2D4A] px-8 py-4 shadow-md flex justify-between items-center text-white">
        <div className="flex items-center gap-3">
          <div className="bg-[#D64545] p-2 rounded-lg">
            <Truck size={24} color="white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">Transportes Rojas</h1>
            <p className="text-xs text-white/70 uppercase tracking-widest font-semibold">Portal Interno</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{userName}</p>
            <p className="text-xs text-[#16A34A] uppercase tracking-wider">{roles.join(", ")}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg text-sm font-medium"
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-[#0B2D4A] mb-3">Panel de Control</h2>
          <p className="text-[#64748B] text-lg max-w-2xl mx-auto">
            Selecciona el módulo al que deseas ingresar. Solo se muestran las opciones autorizadas para tu rol actual.
          </p>
        </div>

        {allowedModules.length === 0 ? (
          <div className="text-center bg-white p-10 rounded-2xl shadow-sm border border-[#E4E8EE]">
            <ShieldCheck size={48} className="mx-auto text-[#D64545] mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-[#0B2D4A] mb-2">Sin accesos asignados</h3>
            <p className="text-[#64748B]">Actualmente tu cuenta no tiene permisos para ver ningún módulo. Contacta a Recursos Humanos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allowedModules.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <button
                  key={idx}
                  onClick={() => navigate(mod.path)}
                  className="group relative flex flex-col bg-white p-6 rounded-2xl border border-[#E4E8EE] shadow-sm hover:shadow-xl hover:border-transparent transition-all duration-300 text-left overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0B2D4A] to-[#143F66] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></div>
                  
                  <div className="relative z-10 flex items-start justify-between mb-4">
                    <div className="bg-[#F7F9FB] p-3 rounded-xl group-hover:bg-white/10 transition-colors">
                      <Icon size={26} className="text-[#0B2D4A] group-hover:text-white transition-colors" />
                    </div>
                  </div>
                  
                  <h3 className="relative z-10 text-lg font-bold text-[#0B2D4A] group-hover:text-white mb-1 transition-colors">
                    {mod.name}
                  </h3>
                  <p className="relative z-10 text-sm text-[#64748B] group-hover:text-white/70 transition-colors">
                    {mod.desc}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
