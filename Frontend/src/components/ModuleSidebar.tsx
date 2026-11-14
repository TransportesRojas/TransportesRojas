import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { House, ChevronRight, PanelLeftClose, PanelLeft } from "lucide-react";
import { type ModuleConfig } from "../config/modules";
import { captureFlyRects, peekFlyRects, clearFlyRects, playFlyAnimation } from "../utils/flyTransition";

interface ModuleSidebarProps {
  modules: ModuleConfig[];
  collapsed?: boolean;
  onToggleSidebar?: () => void;
  onPrimaryTouchdown?: () => void;
  onFlyEnd?: () => void;
}

export default function ModuleSidebar({ 
  modules, 
  collapsed = false,
  onToggleSidebar,
  onPrimaryTouchdown, 
  onFlyEnd 
}: ModuleSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const snap = peekFlyRects("grid");
    if (!snap) return;

    const cancel = playFlyAnimation(itemRefs.current, snap, {
      floatingClass: "admin-fly-floating",
      entrance: "left",
      onStart: () => {
        document.querySelector(".admin-sidebar-wrapper")?.classList.add("admin-sidebar-wrapper--animating");
      },
      onPrimaryTouchdown: () => {
        clearFlyRects();
        onPrimaryTouchdown?.();
      },
      onDone: () => {
        document.querySelector(".admin-sidebar-wrapper")?.classList.remove("admin-sidebar-wrapper--animating");
        clearFlyRects();
        onFlyEnd?.();
      },
    });

    return () => {
      cancel();
      document.querySelector(".admin-sidebar-wrapper")?.classList.remove("admin-sidebar-wrapper--animating");
    };
  }, [modules.length]);

  const handleNavigate = (path: string) => {
    if (location.pathname === path) return;
    navigate(path);
  };

  const handleReturnToPanel = () => {
    captureFlyRects(document, "sidebar");
    navigate("/admin/bienvenida");
  };

  return (
    <aside className="admin-sidebar" aria-label="Menú de catálogos">
      <div className="admin-sidebar-header">
        <div className="admin-sidebar-header-box">
          <button
            onClick={handleReturnToPanel}
            className="admin-sidebar-back-btn"
            title="Panel de Control (Ver en cuadrícula)"
          >
            <div className="admin-sidebar-back-icon">
              <House size={17} />
            </div>
            <div className="admin-sidebar-back-text">
              <span className="admin-sidebar-back-title">Panel de Control</span>
              <span className="admin-sidebar-back-sub">Ver en cuadrícula</span>
            </div>
          </button>

          <div className="admin-sidebar-header-divider" />

          <button
            onClick={onToggleSidebar}
            className="admin-sidebar-toggle-btn"
            title={collapsed ? "Expandir columna (Ver nombres)" : "Colapsar columna (Solo iconos)"}
            aria-label={collapsed ? "Expandir columna" : "Colapsar columna"}
          >
            {collapsed ? <PanelLeft size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
      </div>

      <nav className="admin-sidebar-nav">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const isActive = location.pathname.startsWith(mod.path);

          return (
            <div key={mod.id} className="admin-sidebar-slot">
              <button
                data-fly-id={mod.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(mod.id, el);
                  else itemRefs.current.delete(mod.id);
                }}
                onClick={() => handleNavigate(mod.path)}
                className={`admin-sidebar-item ${isActive ? "admin-sidebar-item--active" : ""}`}
                title={`${mod.name} — ${mod.desc}`}
              >
                <div className="admin-sidebar-item-icon-wrap">
                  <Icon size={19} className="admin-sidebar-item-icon" />
                </div>
                <div className="admin-sidebar-item-content">
                  <span className="admin-sidebar-item-name">{mod.name}</span>
                  <span className="admin-sidebar-item-desc">{mod.desc}</span>
                </div>
                <ChevronRight size={15} className="admin-sidebar-item-arrow" />
              </button>
            </div>
          );
        })}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-sidebar-footer-pill">
          <span className="admin-sidebar-dot" />
          <span className="admin-sidebar-footer-text">Transportes Rojas</span>
        </div>
      </div>
    </aside>
  );
}
