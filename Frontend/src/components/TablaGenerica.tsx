import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  X,
  FilterX,
  Filter,
  Check,
} from "lucide-react";

export interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

export interface FilterDef {
  key: string;
  label?: string;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ActionDef<T> {
  label: string;
  icon: React.ReactNode;
  onClick: (item: T) => void;
  className?: string;
  visible?: (item: T) => boolean;
}

export interface PildoraOpcion {
  valor: string;
  etiqueta: string;
  dotColor?: string;
  activeClass?: string;
}

export interface PildorasRapidasDef {
  key: string;
  opciones: PildoraOpcion[];
}

export interface TablaGenericaProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  sortCol: string | null;
  sortDir: "asc" | "desc";
  onSort: (col: string) => void;
  filters: Record<string, string>;
  filterDefs: FilterDef[];
  onFilterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  actions?: ActionDef<T>[];
  idAccessor: (item: T) => string | number;
  busquedaGlobal?: string;
  onBusquedaGlobalChange?: (valor: string) => void;
  placeholderGlobal?: string;
  mostrarBuscadorGlobal?: boolean;
  onLimpiarFiltros?: () => void;
  pildorasRapidas?: PildorasRapidasDef;
}

function SortIcon({
  col,
  sortCol,
  sortDir,
}: {
  col: string;
  sortCol: string | null;
  sortDir: "asc" | "desc";
}) {
  if (sortCol !== col)
    return <ChevronsUpDown size={12} className="opacity-50 text-tr-gray" />;
  return sortDir === "asc" ? (
    <ChevronUp size={12} className="text-tr-red drop-shadow-[0_0_4px_rgba(214,69,69,0.45)]" />
  ) : (
    <ChevronDown size={12} className="text-tr-red drop-shadow-[0_0_4px_rgba(214,69,69,0.45)]" />
  );
}

export function TablaGenerica<T>({
  data,
  columns,
  sortCol,
  sortDir,
  onSort,
  filters,
  filterDefs,
  onFilterChange,
  actions,
  idAccessor,
  busquedaGlobal,
  onBusquedaGlobalChange,
  placeholderGlobal = "Buscar en todo el catálogo...",
  mostrarBuscadorGlobal = true,
  onLimpiarFiltros,
  pildorasRapidas,
}: TablaGenericaProps<T>) {
  const [menuAbierto, setMenuAbierto] = useState<string | number | null>(null);
  const [menuPos, setMenuPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
    maxHeight?: number;
    item: T;
  } | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const queryActual = busquedaGlobal !== undefined ? busquedaGlobal : localSearch;

  const handleGlobalSearchChange = (val: string) => {
    if (onBusquedaGlobalChange) {
      onBusquedaGlobalChange(val);
    } else {
      setLocalSearch(val);
    }
  };

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest?.("[id^='btn-opciones-']")) {
          setMenuAbierto(null);
          setMenuPos(null);
        }
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuAbierto(null);
        setMenuPos(null);
      }
    };
    const onScrollOrResize = () => {
      setMenuAbierto(null);
      setMenuPos(null);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  const handleMenuToggle = (e: React.MouseEvent, id: string | number, item: T) => {
    e.stopPropagation();
    if (menuAbierto === id) {
      setMenuAbierto(null);
      setMenuPos(null);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const abrirHaciaArriba = spaceBelow < 280 && spaceAbove > spaceBelow;
    const maxAvailable = abrirHaciaArriba ? spaceAbove - 16 : spaceBelow - 16;

    setMenuAbierto(id);
    setMenuPos({
      top: abrirHaciaArriba ? undefined : rect.bottom + 6,
      bottom: abrirHaciaArriba ? window.innerHeight - rect.top + 6 : undefined,
      right: Math.max(12, window.innerWidth - rect.right),
      maxHeight: Math.max(150, maxAvailable),
      item,
    });
  };


  // Filtrado y opciones de filtros

  const displayData = React.useMemo(() => {
    if (busquedaGlobal !== undefined || !localSearch.trim()) {
      return data;
    }
    const term = localSearch.toLowerCase();
    return data.filter((item) => {
      return Object.values(item as Record<string, any>).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, busquedaGlobal, localSearch]);

  const resolvedFilterDefs = React.useMemo(() => {
    return filterDefs.map((def) => {
      if (def.options && def.options.length > 0) {
        return {
          ...def,
          label: def.label || def.placeholder?.replace(/\.{3}$/, "") || def.key,
        };
      }
      const uniqueVals = new Set<string>();
      data.forEach((item: any) => {
        const val = item[def.key] ?? item[`${def.key}Nombre`];
        if (Array.isArray(val)) {
          val.forEach((v) => {
            if (v && String(v).trim()) uniqueVals.add(String(v).trim());
          });
        } else if (val !== null && val !== undefined && String(val).trim() !== "") {
          uniqueVals.add(String(val).trim());
        }
      });
      const sorted = Array.from(uniqueVals).sort((a, b) => a.localeCompare(b));
      const cleanLabel = def.label || def.placeholder?.replace(/\.{3}$/, "") || def.key;
      const opts = [
        { value: "", label: `Todos (${cleanLabel})` },
        ...sorted.map((v) => ({ value: v, label: v })),
      ];
      return {
        ...def,
        label: cleanLabel,
        type: "select" as const,
        options: opts,
      };
    });
  }, [filterDefs, data]);

  const handleSelectFilter = (key: string, value: string) => {
    onFilterChange({
      target: { name: key, value },
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  const handleLimpiarFiltros = () => {
    const limpios: Record<string, string> = {};
    filterDefs.forEach((f) => {
      limpios[f.key] = "";
    });
    if (onLimpiarFiltros) {
      onLimpiarFiltros();
    } else {
      Object.keys(limpios).forEach((key) => {
        onFilterChange({
          target: { name: key, value: "" },
        } as React.ChangeEvent<HTMLInputElement>);
      });
    }
    if (onBusquedaGlobalChange) {
      onBusquedaGlobalChange("");
    } else {
      setLocalSearch("");
    }
  };

  const clearSingleFilter = (key: string) => {
    handleSelectFilter(key, "");
  };

  const tieneFiltroActivo = filterDefs.some((f) => f.key === "activo");

  const filtrosActivosCount = Object.entries(filters).filter(([, v]) => {
    if (!v || !v.trim()) return false;
    return true;
  }).length;

  const hayFiltrosActivos = Boolean(queryActual.trim()) || filtrosActivosCount > 0;

  const activeChips = React.useMemo(() => {
    const list: { key: string; label: string; displayValue: string }[] = [];

    if (queryActual.trim()) {
      list.push({
        key: "__search__",
        label: "Búsqueda",
        displayValue: `"${queryActual}"`,
      });
    }

    if (!pildorasRapidas || pildorasRapidas.key !== "activo") {
      if (filters.activo === "si") {
        list.push({ key: "activo", label: "Estado", displayValue: "Solo Activos" });
      } else if (filters.activo === "no") {
        list.push({ key: "activo", label: "Estado", displayValue: "Solo Inactivos" });
      } else if (filters.activo === "suspendido") {
        list.push({ key: "activo", label: "Estado", displayValue: "Solo Suspendidos" });
      }
    }

    if (pildorasRapidas && filters[pildorasRapidas.key]) {
      const opt = pildorasRapidas.opciones.find((o) => o.valor === filters[pildorasRapidas.key]);
      if (opt && opt.valor) {
        list.push({
          key: pildorasRapidas.key,
          label: pildorasRapidas.key === "activo" ? "Estado" : "Disponibilidad",
          displayValue: opt.etiqueta.replace(/^[•\s]+/, ""),
        });
      }
    }

    resolvedFilterDefs.forEach((def) => {
      if (def.key === "activo") return;
      if (pildorasRapidas && def.key === pildorasRapidas.key) return;
      const val = filters[def.key];
      if (val !== undefined && val !== null && val.trim() !== "") {
        const opt = def.options?.find((o) => o.value === val);
        list.push({
          key: def.key,
          label: def.label || def.key,
          displayValue: opt ? opt.label : val,
        });
      }
    });

    return list;
  }, [queryActual, filters, resolvedFilterDefs]);

  return (
    <div className="bg-white rounded-2xl border border-tr-border overflow-hidden shadow-sm relative before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:z-10 before:bg-[#0B2D4A]">
      {/* Barra superior de búsqueda y filtros */}
      {mostrarBuscadorGlobal && (
        <div className="px-4 py-3 bg-[#F8FAFC] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={queryActual}
              onChange={(e) => handleGlobalSearchChange(e.target.value)}
              placeholder={placeholderGlobal}
              aria-label="Búsqueda general en la tabla"
              className="w-full pl-9 pr-8 py-1.5 bg-white text-xs text-tr-ink rounded-lg border border-slate-300 focus:border-tr-navy focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400 font-medium"
            />
            {queryActual && (
              <button
                type="button"
                onClick={() => handleGlobalSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {pildorasRapidas ? (
              <div className="inline-flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
                {pildorasRapidas.opciones.map((opt) => {
                  const valorActual = filters[pildorasRapidas.key] || "";
                  const estaActivo = valorActual.toLowerCase() === opt.valor.toLowerCase();
                  return (
                    <button
                      key={opt.valor || "todos"}
                      type="button"
                      onClick={() => handleSelectFilter(pildorasRapidas.key, opt.valor)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${estaActivo
                          ? opt.activeClass || "bg-white text-tr-navy shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                        }`}
                      title={`Filtrar por ${opt.etiqueta}`}
                    >
                      {opt.dotColor && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${estaActivo ? "bg-white" : opt.dotColor
                            }`}
                        />
                      )}
                      <span>{opt.etiqueta}</span>
                    </button>
                  );
                })}
              </div>
            ) : tieneFiltroActivo && (
              <div className="inline-flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => handleSelectFilter("activo", "")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${!filters.activo
                      ? "bg-white text-tr-navy shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                    }`}
                  title="Mostrar todos los registros"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectFilter("activo", "si")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${filters.activo === "si"
                      ? "bg-emerald-600 text-white shadow-xs font-bold"
                      : "text-slate-600 hover:text-emerald-700"
                    }`}
                  title="Mostrar solo registros activos"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${filters.activo === "si" ? "bg-white" : "bg-emerald-500"
                      }`}
                  />
                  Activos
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectFilter("activo", "no")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${filters.activo === "no"
                      ? "bg-rose-600 text-white shadow-xs font-bold"
                      : "text-slate-600 hover:text-rose-700"
                    }`}
                  title="Mostrar solo registros inactivos"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${filters.activo === "no" ? "bg-white" : "bg-rose-500"
                      }`}
                  />
                  Inactivos
                </button>
                {filterDefs.find((f) => f.key === "activo")?.options?.some((o) => o.value === "suspendido") && (
                  <button
                    type="button"
                    onClick={() => handleSelectFilter("activo", "suspendido")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                      filters.activo === "suspendido"
                        ? "bg-amber-500 text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-amber-700"
                    }`}
                    title="Mostrar solo registros suspendidos"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        filters.activo === "suspendido" ? "bg-white" : "bg-amber-400"
                      }`}
                    />
                    Suspendidos
                  </button>
                )}
              </div>
            )}

            {tieneFiltroActivo && (
              <select
                name="activo"
                value={filters.activo ?? ""}
                onChange={(e) => handleSelectFilter("activo", e.target.value)}
                className="sr-only"
                tabIndex={-1}
                aria-label="Filtro de estado activo"
              >
                <option value="">Todos</option>
                <option value="si">Activos</option>
                <option value="no">Inactivos</option>
                <option value="suspendido">Suspendidos</option>
              </select>
            )}

            {filterDefs.length > 0 && (
              <button
                type="button"
                id="btn-toggle-filtros"
                onClick={() => setMostrarFiltros((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${mostrarFiltros || filtrosActivosCount > 0
                    ? "bg-tr-navy text-white border-tr-navy shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-50 border-slate-300"
                  }`}
                title="Abrir panel de filtros preestablecidos"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filtros</span>
                {filtrosActivosCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-tr-red text-white text-[10px] flex items-center justify-center font-bold">
                    {filtrosActivosCount}
                  </span>
                )}
              </button>
            )}

            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={handleLimpiarFiltros}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-tr-red hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Restablecer todos los filtros"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filtros aplicados */}
      {activeChips.length > 0 && (
        <div className="px-4 py-2 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-tr-navy" />
            Filtros aplicados ({activeChips.length}):
          </span>

          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-tr-navy border border-blue-200/90 shadow-2xs transition-all hover:bg-blue-100/80"
            >
              <span className="text-slate-500 font-normal">{chip.label}:</span>
              <strong className="font-semibold text-tr-navy">{chip.displayValue}</strong>
              <button
                type="button"
                onClick={() => {
                  if (chip.key === "__search__") {
                    handleGlobalSearchChange("");
                  } else {
                    clearSingleFilter(chip.key);
                  }
                }}
                className="ml-0.5 p-0.5 rounded-full hover:bg-tr-red/10 hover:text-tr-red text-slate-400 transition-colors cursor-pointer"
                title={`Quitar filtro ${chip.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={handleLimpiarFiltros}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-tr-red hover:text-red-700 hover:underline cursor-pointer transition-colors"
          >
            <FilterX className="w-3 h-3" />
            <span>Limpiar todos</span>
          </button>
        </div>
      )}

      {/* Panel de filtros */}
      {mostrarFiltros && filterDefs.length > 0 && (
        <div className="p-4 bg-gradient-to-b from-[#F8FAFC] to-white border-b border-slate-200 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-tr-navy uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-tr-navy" />
                Criterios Preestablecidos
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                (Seleccione cualquier opción para filtrar automáticamente)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLimpiarFiltros}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-tr-red hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>
              <button
                type="button"
                id="btn-aplicar-filtros"
                onClick={() => setMostrarFiltros(false)}
                className="inline-flex items-center gap-1 px-3.5 py-1 text-xs font-bold text-white bg-tr-navy hover:bg-[#001f35] rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Listo</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {resolvedFilterDefs.map((def) => {
              const labelText = def.label || def.placeholder?.replace(/\.{3}$/, "") || def.key;
              const valorActual = filters[def.key] ?? "";
              const estaActivo = Boolean(valorActual && valorActual.trim());

              return (
                <div
                  key={def.key}
                  className={`flex flex-col gap-1 p-2 rounded-xl border transition-all ${estaActivo
                      ? "bg-blue-50/50 border-tr-navy/40 shadow-2xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                      {labelText}
                    </label>
                    {estaActivo && (
                      <button
                        type="button"
                        onClick={() => clearSingleFilter(def.key)}
                        className="text-[10px] text-slate-400 hover:text-tr-red font-semibold cursor-pointer"
                        title="Limpiar este filtro"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <select
                      className={`w-full bg-white rounded-lg px-2.5 py-1.5 pr-7 text-xs outline-none cursor-pointer border transition-all appearance-none ${estaActivo
                          ? "border-tr-navy text-tr-navy font-bold ring-2 ring-blue-500/15"
                          : "border-slate-300 text-slate-700 hover:border-slate-400"
                        }`}
                      name={def.key}
                      value={valorActual}
                      onChange={(e) => handleSelectFilter(def.key, e.target.value)}
                      aria-label={`Filtrar por ${labelText}`}
                    >
                      {def.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div
        className={`overflow-x-auto min-h-[290px] ${menuAbierto !== null && displayData.length <= 2 ? "pb-24" : ""
          }`}
      >
        <table className="w-full border-collapse text-[13.5px] whitespace-nowrap" aria-label="Tabla de datos">
          <thead>
            <tr className="bg-[#0B2D4A] text-white border-b-[2.5px] border-tr-red">
              {columns.map((col) => {
                const estaOrdenada = sortCol === col.key;
                return (
                  <th
                    key={col.key}
                    style={{
                      backgroundColor: estaOrdenada ? "#143F66" : "#0B2D4A",
                      color: "#FFFFFF",
                    }}
                    className={`px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-white select-none transition-colors ${
                      estaOrdenada ? "bg-[#143F66]" : "bg-[#0B2D4A]"
                    } ${
                      col.sortable !== false ? "cursor-pointer hover:bg-[#143F66]" : ""
                    }`}
                    onClick={() => col.sortable !== false && onSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1.5 text-white">
                      <span>{col.label}</span>
                      {col.sortable !== false && (
                        <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                      )}
                    </span>
                  </th>
                );
              })}
              {actions && actions.length > 0 && (
                <th
                  style={{ backgroundColor: "#0B2D4A", color: "#FFFFFF" }}
                  className="px-3.5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-white w-24 bg-[#0B2D4A]"
                >
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {displayData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions && actions.length > 0 ? 1 : 0)}
                  className="text-center py-12 px-4 text-tr-ink-muted text-sm italic"
                >
                  Sin resultados para los filtros aplicados
                </td>
              </tr>
            ) : (
              displayData.map((item) => {
                const id = idAccessor(item);

                return (
                  <tr
                    key={id}
                    className="bg-white border-b border-slate-200 hover:bg-slate-50/80 hover:shadow-[inset_4px_0_0_#D64545] transition-all"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-tr-ink ${/email|correo/i.test(col.key) ? "normal-case" : "uppercase"}`}
                      >
                        {col.render ? (
                          col.render(item)
                        ) : col.key === "id" ? (
                          <span className="font-mono text-xs text-slate-500 font-semibold">
                            #{String((item as any)[col.key])}
                          </span>
                        ) : (
                          (item as any)[col.key]
                        )}
                      </td>
                    ))}
                    {actions && actions.length > 0 && (
                      <td className="px-2.5 py-1.5 text-center relative">
                        <div className="relative inline-block">
                          <button
                            id={`btn-opciones-${id}`}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-tr-navy/10 hover:text-tr-navy hover:border-tr-gray border border-transparent cursor-pointer transition-colors text-lg"
                            aria-haspopup="true"
                            aria-expanded={menuAbierto === id}
                            onClick={(e) => handleMenuToggle(e, id, item)}
                            title="Opciones"
                          >
                            &#8942;
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Menú de acciones */}
      {menuAbierto !== null && menuPos !== null && actions && actions.length > 0 && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-[9999] flex flex-col min-w-[180px] max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: menuPos.top !== undefined ? `${menuPos.top}px` : "auto",
            bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : "auto",
            right: `${menuPos.right}px`,
            maxHeight: menuPos.maxHeight ? `${menuPos.maxHeight}px` : undefined,
          }}
          role="menu"
        >
          {actions
            .filter((action) => (action.visible ? action.visible(menuPos.item) : true))
            .map((action, i) => (
              <button
                key={i}
                type="button"
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer w-full text-left transition-colors whitespace-nowrap ${action.className || ""}`}
                role="menuitem"
                onClick={() => {
                  setMenuAbierto(null);
                  setMenuPos(null);
                  action.onClick(menuPos.item);
                }}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
        </div>,
        document.body
      )}
    </div>
  );
}
