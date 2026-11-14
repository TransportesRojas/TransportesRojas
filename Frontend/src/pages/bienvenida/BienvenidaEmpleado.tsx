import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { getAllowedModules } from "../../config/modules";
import { getSession } from "../../utils/auth";
import { captureFlyRects, peekFlyRects, clearFlyRects, playFlyAnimation } from "../../utils/flyTransition";

export default function BienvenidaEmpleado() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<string[]>(() =>
    getSession().roles.map((r: string) => r.toLowerCase())
  );
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/login-empleados");
      return;
    }
    try {
      const user = JSON.parse(userStr);
      setRoles(user.roles?.map((r: string) => r.toLowerCase()) || []);
    } catch {
      navigate("/login-empleados");
    }
  }, [navigate]);

  const allowedModules = getAllowedModules(roles);

  useEffect(() => {
    const snap = peekFlyRects("sidebar");
    if (!snap) return;

    const cancel = playFlyAnimation(cardRefs.current, snap, {
      floatingClass: "admin-fly-floating",
      entrance: "up",
      onDone: () => {
        clearFlyRects();
      },
    });

    return () => {
      cancel();
    };
  }, [allowedModules.length]);

  const handleSelectModule = (modId: string, path: string) => {
    captureFlyRects(document, "grid", modId);
    navigate(path);
  };

  return (
    <div className="w-full">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-extrabold text-tr-navy mb-3 tracking-tight">
          Panel de Control
        </h2>
        <p className="text-tr-ink-muted text-lg max-w-2xl mx-auto">
          Selecciona el módulo al que deseas ingresar.
        </p>
      </div>

      {allowedModules.length === 0 ? (
        <div className="text-center bg-white p-12 rounded-2xl shadow-sm border border-tr-border max-w-lg mx-auto">
          <ShieldCheck size={52} className="mx-auto text-tr-red mb-4 opacity-60" />
          <h3 className="text-xl font-bold text-tr-navy mb-2">Sin accesos asignados</h3>
          <p className="text-tr-ink-muted">
            Actualmente tu cuenta no tiene permisos para ver ningún módulo. Contacta a Recursos Humanos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {allowedModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                data-fly-id={mod.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(mod.id, el);
                  else cardRefs.current.delete(mod.id);
                }}
                onClick={() => handleSelectModule(mod.id, mod.path)}
                className="group relative flex flex-col bg-white p-6 rounded-2xl border border-tr-border shadow-sm hover:shadow-xl hover:border-transparent transition-all duration-300 text-left overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-tr-navy to-tr-navy-light opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />

                <div className="relative z-10 flex items-start justify-between mb-4">
                  <div className="bg-tr-bg p-3 rounded-xl group-hover:bg-white/10 transition-colors shadow-xs">
                    <Icon size={26} className="text-tr-navy group-hover:text-white transition-colors" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center text-tr-gray group-hover:text-white group-hover:translate-x-1 transition-all">
                    <ArrowRight size={18} />
                  </div>
                </div>

                <h3 className="relative z-10 text-lg font-bold text-tr-navy group-hover:text-white mb-1 transition-colors">
                  {mod.name}
                </h3>
                <p className="relative z-10 text-sm text-tr-ink-muted group-hover:text-white/75 transition-colors">
                  {mod.desc}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
