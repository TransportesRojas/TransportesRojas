import React, { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
export interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}
export interface FilterDef {
  key: string;
  type: "text" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
}
export interface ActionDef<T> {
  label: string;
  icon: React.ReactNode;
  onClick: (item: T) => void;
  className?: string;
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
    return <ChevronsUpDown size={12} className="cc-si cc-si--off" />;
  return sortDir === "asc" ? (
    <ChevronUp size={12} className="cc-si cc-si--on" />
  ) : (
    <ChevronDown size={12} className="cc-si cc-si--on" />
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
}: TablaGenericaProps<T>) {
  const [menuAbierto, setMenuAbierto] = useState<string | number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuAbierto(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAbierto(null);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);
  const handleMenuToggle = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    setMenuAbierto((prev) => (prev === id ? null : id));
  };
  return (
    <div className="cc-table-wrapper">
      <table className="cc-table" aria-label="Tabla de datos">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.sortable !== false ? "cc-th-sortable" : ""}
                onClick={() => col.sortable !== false && onSort(col.key)}
              >
                <span className="cc-th-inner">
                  {col.label}
                  {col.sortable !== false && (
                    <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                  )}
                </span>
              </th>
            ))}
            {actions && actions.length > 0 && (
              <th className="cc-th-actions">Acciones</th>
            )}
          </tr>
          <tr className="cc-filter-row">
            {filterDefs.map((def, index) => (
              <td key={def.key || index}>
                {def.type === "text" ? (
                  <input
                    className="cc-filter-input"
                    name={def.key}
                    value={filters[def.key] || ""}
                    onChange={onFilterChange}
                    placeholder={def.placeholder || "Filtrar..."}
                    aria-label={`Filtrar ${def.key}`}
                  />
                ) : def.type === "select" ? (
                  <select
                    className="cc-filter-select"
                    name={def.key}
                    value={filters[def.key] || ""}
                    onChange={onFilterChange}
                    aria-label={`Filtrar ${def.key}`}
                  >
                    {def.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </td>
            ))}
            {actions && actions.length > 0 && <td />}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (actions && actions.length > 0 ? 1 : 0)}
                className="cc-td-empty"
              >
                Sin resultados para los filtros aplicados
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const id = idAccessor(item);
              return (
                <tr key={id} className="cc-row">
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                  {actions && actions.length > 0 && (
                    <td className="cc-td-actions">
                      <div
                        className="cc-menu-wrap"
                        ref={menuAbierto === id ? menuRef : undefined}
                      >
                        <button
                          id={`btn-opciones-${id}`}
                          className="cc-btn-options"
                          aria-haspopup="true"
                          aria-expanded={menuAbierto === id}
                          onClick={(e) => handleMenuToggle(e, id)}
                          title="Opciones"
                        >
                          &#8942;
                        </button>
                        {menuAbierto === id && (
                          <div className="cc-dropdown" role="menu">
                            {actions.map((action, i) => (
                              <button
                                key={i}
                                className={`cc-dropdown-item ${action.className || ""}`}
                                role="menuitem"
                                onClick={() => {
                                  setMenuAbierto(null);
                                  action.onClick(item);
                                }}
                              >
                                {action.icon}
                                <span>{action.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
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
  );
}
