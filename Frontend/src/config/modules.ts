import { 
  Package, Users, Building2, ShieldCheck, 
  Briefcase, Store, Truck, Wrench, Navigation, type LucideIcon 
} from "lucide-react";

export interface ModuleConfig {
  id: string;
  path: string;
  name: string;
  desc: string;
  roles: string[];
  icon: LucideIcon;
}

export const MODULES: ModuleConfig[] = [
  { id: "envios", path: "/admin/envios", name: "Envíos", desc: "Guías, rastreo y entregas", roles: ["personal administrativo", "personal de sucursal", "jefe"], icon: Package },
  { id: "rutas", path: "/admin/rutas", name: "Rutas", desc: "Creación de rutas y mapa", roles: ["jefe de flotilla", "jefe"], icon: Navigation },
  { id: "empleados", path: "/admin/empleados", name: "Empleados", desc: "Gestión de personal", roles: ["rh", "jefe"], icon: Users },
  { id: "clientes", path: "/admin/clientes", name: "Clientes", desc: "Cartera de clientes", roles: ["personal administrativo", "jefe"], icon: Building2 },
  { id: "roles", path: "/admin/roles", name: "Roles", desc: "Roles del sistema", roles: ["rh", "jefe"], icon: ShieldCheck },
  { id: "puestos", path: "/admin/puestos", name: "Puestos", desc: "Catálogo de puestos", roles: ["rh", "jefe"], icon: Briefcase },
  { id: "sucursales", path: "/admin/sucursales", name: "Sucursales", desc: "Ubicaciones físicas", roles: ["rh", "jefe"], icon: Store },
  { id: "flotillas", path: "/admin/flotillas", name: "Flotillas", desc: "Agrupación de camiones", roles: ["supervisor", "jefe"], icon: Truck },
  { id: "tipomantenimiento", path: "/admin/tipomantenimiento", name: "Mantenimiento", desc: "Servicios vehiculares", roles: ["rh", "jefe"], icon: Wrench },
];

export function getAllowedModules(userRoles: string[]): ModuleConfig[] {
  const normalized = userRoles.map(r => r.toLowerCase());
  return MODULES.filter(mod => mod.roles.some(r => normalized.includes(r)));
}

export function getModuleById(id: string): ModuleConfig | undefined {
  return MODULES.find(m => m.id.toLowerCase() === id.toLowerCase());
}

export function getModuleRoles(id: string): string[] {
  const mod = getModuleById(id);
  return mod ? mod.roles : [];
}

