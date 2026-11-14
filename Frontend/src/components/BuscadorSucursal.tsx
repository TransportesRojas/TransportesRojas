import { useState, useRef, useEffect } from "react";
import { Search, X, Building2, Check, ChevronDown } from "lucide-react";

export interface SucursalItem {
  id: number;
  nombre: string;
  nombreCorto?: string | null;
  codigo?: string | null;
  municipio?: string | null;
  estado?: string | null;
}

interface BuscadorSucursalProps {
  id?: string;
  sucursales: SucursalItem[];
  sucursalSeleccionadaId: number | null | undefined;
  onSeleccionar: (sucursalId: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  permitirSinAsignar?: boolean;
}

export function BuscadorSucursal({
  id = "buscador-sucursal",
  sucursales,
  sucursalSeleccionadaId,
  onSeleccionar,
  placeholder = "Buscar y seleccionar sucursal...",
  disabled = false,
  permitirSinAsignar = true,
}: BuscadorSucursalProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const contenedorRef = useRef<HTMLDivElement>(null);

  const seleccionada = sucursales.find((s) => s.id === sucursalSeleccionadaId);

  useEffect(() => {
    function handleClickAfuera(e: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(e.target as Node)
      ) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickAfuera);
    return () => document.removeEventListener("mousedown", handleClickAfuera);
  }, []);

  const filtradas = sucursales.filter((s) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase().trim();
    return (
      s.nombre.toLowerCase().includes(q) ||
      (s.nombreCorto && s.nombreCorto.toLowerCase().includes(q)) ||
      (s.codigo && s.codigo.toLowerCase().includes(q)) ||
      (s.municipio && s.municipio.toLowerCase().includes(q)) ||
      (s.estado && s.estado.toLowerCase().includes(q))
    );
  });

  return (
    <div ref={contenedorRef} className="buscador-sucursal-wrap relative w-full">
      <div
        className={`relative flex items-center w-full rounded-lg border transition-all ${
          abierto
            ? "border-[#0B2D4A] ring-2 ring-[#0B2D4A]/15 bg-white shadow-xs"
            : "border-[#A7B3C3] hover:border-slate-400 bg-white"
        } ${disabled ? "opacity-75 bg-slate-100 cursor-not-allowed" : ""}`}
        style={{
          borderWidth: "1.5px",
          minHeight: "40px",
          height: "40px",
        }}
      >
        <div className="pl-3 pr-1 text-slate-400 shrink-0 pointer-events-none">
          <Search size={15} />
        </div>

        <input
          id={id}
          type="text"
          disabled={disabled}
          value={
            abierto
              ? busqueda
              : seleccionada
              ? `${seleccionada.nombre} ${
                  seleccionada.nombreCorto ? `(${seleccionada.nombreCorto})` : ""
                }`
              : ""
          }
          placeholder={seleccionada ? seleccionada.nombre : placeholder}
          onFocus={() => {
            setBusqueda("");
            setAbierto(true);
          }}
          onChange={(e) => {
            setBusqueda(e.target.value);
            if (!abierto) setAbierto(true);
          }}
          className="w-full !border-0 !border-none !bg-transparent !shadow-none !outline-none text-slate-800 placeholder:text-slate-400 text-xs sm:text-sm pl-1 pr-16 h-full"
          style={{
            border: "none",
            background: "transparent",
            boxShadow: "none",
            outline: "none",
            height: "100%",
            paddingTop: "0",
            paddingBottom: "0",
          }}
        />

        <div className="absolute right-2 flex items-center gap-1 shrink-0">
          {seleccionada && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSeleccionar(null);
                setBusqueda("");
              }}
              className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="Quitar asignación"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => setAbierto((prev) => !prev)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
          >
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${
                abierto ? "rotate-180 text-tr-navy" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {abierto && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5 animate-in fade-in zoom-in-95 duration-150">
          {permitirSinAsignar && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                onSeleccionar(null);
                setAbierto(false);
                setBusqueda("");
              }}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                sucursalSeleccionadaId == null
                  ? "bg-blue-50 text-tr-navy font-bold"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span className="italic">-- Sin asignar / Sucursal general --</span>
              {sucursalSeleccionadaId == null && (
                <Check size={14} className="text-tr-navy" />
              )}
            </div>
          )}

          {filtradas.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400 italic">
              No se encontraron sucursales para "{busqueda}"
            </div>
          ) : (
            filtradas.map((suc) => {
              const estaSeleccionada = suc.id === sucursalSeleccionadaId;
              return (
                <div
                  key={suc.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onSeleccionar(suc.id);
                    setAbierto(false);
                    setBusqueda("");
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    estaSeleccionada
                      ? "bg-blue-50/90 text-tr-navy font-bold border border-blue-200"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Building2
                      size={14}
                      className={`shrink-0 ${
                        estaSeleccionada ? "text-tr-navy" : "text-slate-400"
                      }`}
                    />
                    <div className="truncate">
                      <span className="font-semibold text-slate-800">
                        {suc.nombre}
                      </span>
                      {suc.nombreCorto && (
                        <span className="text-slate-500 ml-1">
                          ({suc.nombreCorto})
                        </span>
                      )}
                      {suc.codigo && (
                        <span className="ml-2 font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {suc.codigo}
                        </span>
                      )}
                    </div>
                  </div>
                  {estaSeleccionada && (
                    <Check size={14} className="text-tr-navy shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

