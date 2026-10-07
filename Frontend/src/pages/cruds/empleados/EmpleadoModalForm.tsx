import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { Empleado, FormData } from "./types";
import { fetchApi } from "../../../services/api";

interface EmpleadoModalFormProps {
  abierto: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  form: FormData;
  editando: Empleado | null;
  guardando: boolean;
}

export function EmpleadoModalForm({
  abierto,
  onClose,
  onSave,
  onChange,
  form,
  editando,
  guardando,
}: EmpleadoModalFormProps) {
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    if (abierto) {
      fetchApi("/Sucursal").then((data) => setSucursales(data || []));
      fetchApi("/Rol").then((data) => setRoles(data || []));
    }
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-emp-titulo"
    >
      <div className="cc-modal">
        <div className="cc-modal-header">
          <h2 id="modal-emp-titulo" className="cc-modal-title">
            {editando ? "Editar empleado" : "Nuevo empleado"}
          </h2>
          <button
            className="cc-btn-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <form className="cc-form" onSubmit={onSave}>
          <div className="cc-form-grid">
            <div className="cc-field">
              <label htmlFor="fe-nombre">Nombre *</label>
              <input
                id="fe-nombre"
                name="nombre"
                type="text"
                required
                value={form.nombre}
                onChange={onChange}
                placeholder="Nombre(s)"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fe-ap-p">Apellido paterno *</label>
              <input
                id="fe-ap-p"
                name="apellidoPaterno"
                type="text"
                required
                value={form.apellidoPaterno}
                onChange={onChange}
                placeholder="Apellido paterno"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fe-ap-m">Apellido materno</label>
              <input
                id="fe-ap-m"
                name="apellidoMaterno"
                type="text"
                value={form.apellidoMaterno}
                onChange={onChange}
                placeholder="Apellido materno"
              />
            </div>
            <div className="cc-field">
              <label htmlFor="fe-tel">Teléfono *</label>
              <input
                id="fe-tel"
                name="telefono"
                type="tel"
                required
                pattern="[0-9]{10}"
                title="Debe ingresar exactamente 10 dígitos numéricos"
                maxLength={10}
                minLength={10}
                value={form.telefono ?? ""}
                onChange={onChange}
                placeholder="Ej. 6671234567"
              />
            </div>
            <div className="cc-field cc-field--wide">
              <label htmlFor="fe-email">Email *</label>
              <input
                id="fe-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={onChange}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="cc-field">
              <label htmlFor="fe-suc">Sucursal</label>
              <select
                id="fe-suc"
                name="sucursalId"
                value={form.sucursalId ?? ""}
                onChange={onChange}
                className="w-full rounded-md border border-gray-300 p-2 text-sm"
              >
                <option value="">-- Sin asignar --</option>
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            {!editando && (
              <div className="cc-field">
                <label htmlFor="fe-rol">Rol del sistema *</label>
                <select
                  id="fe-rol"
                  name="rolId"
                  required
                  value={form.rolId ?? ""}
                  onChange={onChange}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm"
                >
                  <option value="">-- Sin asignar --</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="cc-field">
              <label htmlFor="fe-fecha">Fecha de ingreso *</label>
              <input
                id="fe-fecha"
                name="fechaIngreso"
                type="date"
                required
                value={form.fechaIngreso}
                onChange={onChange}
              />
            </div>
            {editando && (
              <div className="cc-field cc-field--toggle">
                <span className="cc-toggle-label">Estado</span>
                <label className="cc-toggle" htmlFor="fe-activo">
                  <input
                    id="fe-activo"
                    name="activo"
                    type="checkbox"
                    checked={form.activo}
                    onChange={onChange}
                  />
                  <span className="cc-toggle-track">
                    <span className="cc-toggle-thumb" />
                  </span>
                  <span
                    className={`cc-toggle-text ${form.activo ? "cc-toggle-text--on" : "cc-toggle-text--off"}`}
                  >
                    {form.activo ? "Activo" : "Inactivo"}
                  </span>
                </label>
              </div>
            )}
          </div>
          <div className="cc-modal-actions">
            <button
              type="button"
              className="cc-btn-cancel"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="cc-btn-save"
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <Loader2 size={15} className="cc-spin" /> Guardando...
                </>
              ) : editando ? (
                "Actualizar"
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
