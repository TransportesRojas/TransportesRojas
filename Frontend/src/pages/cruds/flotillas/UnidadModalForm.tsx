import React, { useState, useEffect } from "react";
import { X, Truck, Save, Loader2, Gauge, Weight } from "lucide-react";
import "../estilos/cruds.css";
import { fetchApi } from "../../../services/api";
import { useToast } from "../../../components/Toast";
import { extraerMensajeErrorApi } from "../../../utils/errorMessages";
import {
  bloquearTeclasNoNumericas,
  limpiarDecimalPositivo,
  limpiarEnteroPositivo,
} from "../../../utils/inputValidation";
import type { UnidadItem, UnidadFormData } from "./types";
import { UNIDAD_FORM_VACIO } from "./types";

interface UnidadModalFormProps {
  abierto: boolean;
  unidadEditar: UnidadItem | null;
  flotillasDisponibles: { id: number; nombre: string }[];
  flotillaFijaId?: number | null;
  onClose: () => void;
  onSuccess: (unidadCreadaOEditada?: UnidadItem) => void;
}

const ESTADOS_UNIDAD = [
  { valor: "Disponible", etiqueta: "Disponible para rutas" },
  { valor: "Mantenimiento", etiqueta: "En taller / Mantenimiento" },
  { valor: "FueraServicio", etiqueta: "Fuera de servicio / Inactiva" },
];

export function UnidadModalForm({
  abierto,
  unidadEditar,
  flotillasDisponibles,
  flotillaFijaId,
  onClose,
  onSuccess,
}: UnidadModalFormProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<UnidadFormData>(UNIDAD_FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (abierto) {
      setErrores({});
      if (unidadEditar) {
        setForm({
          flotillaId: unidadEditar.flotillaId ?? null,
          placas: unidadEditar.placas || "",
          tipoVehiculo: unidadEditar.tipoVehiculo || "",
          marca: unidadEditar.marca || "",
          modelo: unidadEditar.modelo || "",
          anio: unidadEditar.anio || new Date().getFullYear(),
          capacidadKg: unidadEditar.capacidadKg || 3500,
          kmOdometroInicial: unidadEditar.kmOdometroInicial ?? 0,
          kmOdometroActual: unidadEditar.kmOdometroActual ?? 0,
          estado: unidadEditar.estado || "Disponible",
          activo: unidadEditar.activo ?? true,
        });
      } else {
        setForm({
          ...UNIDAD_FORM_VACIO,
          flotillaId: flotillaFijaId ?? null,
        });
      }
    }
  }, [abierto, unidadEditar, flotillaFijaId]);

  if (!abierto) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "placas"
            ? value.toUpperCase().trim()
            : name === "anio"
              ? limpiarEnteroPositivo(value, 4)
              : name === "capacidadKg" ||
                name === "kmOdometroInicial" ||
                name === "kmOdometroActual"
                ? limpiarDecimalPositivo(value, 2)
                : name === "flotillaId"
                  ? value === ""
                    ? null
                    : Number(value)
                  : value,
    }));

    if (errores[name]) {
      setErrores((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validar = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.placas.trim()) {
      errs.placas = "Las placas de circulación son obligatorias.";
    } else if (form.placas.trim().length < 5) {
      errs.placas = "Las placas deben tener al menos 5 caracteres.";
    }

    if (!form.marca.trim()) {
      errs.marca = "La marca del fabricante es requerida (ej. Kenworth, Ford).";
    }

    if (!form.modelo.trim()) {
      errs.modelo = "El modelo o submarca es requerido (ej. F-450, T370).";
    }

    const anioNum = Number(form.anio);
    const anioActual = new Date().getFullYear();
    if (!anioNum || anioNum < 1980 || anioNum > anioActual + 2) {
      errs.anio = `El año debe ser un año vehicular válido (entre 1980 y ${anioActual + 1}).`;
    }

    const capNum = Number(form.capacidadKg);
    if (!capNum || capNum <= 0) {
      errs.capacidadKg = "La capacidad de carga debe ser mayor a 0 kg.";
    }

    const odoNum = Number(
      unidadEditar ? form.kmOdometroActual : form.kmOdometroInicial
    );
    if (isNaN(odoNum) || odoNum < 0) {
      errs.odometro = "El kilometraje no puede ser negativo.";
    }

    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    if (!validar()) {
      toast.warning("Por favor corrige los campos indicados antes de continuar.");
      return;
    }

    try {
      setGuardando(true);

      if (unidadEditar) {
        const payload = {
          flotillaId: form.flotillaId,
          placas: form.placas.trim(),
          tipoVehiculo: form.tipoVehiculo.trim(),
          marca: form.marca.trim(),
          modelo: form.modelo.trim(),
          anio: Number(form.anio),
          capacidadKg: Number(form.capacidadKg),
          kmOdometroActual: Number(form.kmOdometroActual ?? 0),
          estado: form.estado,
          activo: form.activo,
        };

        const res = await fetchApi(`/Unidad/${unidadEditar.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        toast.success(`Unidad ${form.placas} actualizada correctamente.`);
        onSuccess(res);
      } else {
        const payload = {
          flotillaId: form.flotillaId,
          placas: form.placas.trim(),
          tipoVehiculo: form.tipoVehiculo.trim(),
          marca: form.marca.trim(),
          modelo: form.modelo.trim(),
          anio: Number(form.anio),
          capacidadKg: Number(form.capacidadKg),
          kmOdometroInicial: Number(form.kmOdometroInicial ?? 0),
        };

        const res = await fetchApi("/Unidad", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        toast.success(`Unidad vehicular ${form.placas} registrada con éxito.`);
        onSuccess(res);
      }
      onClose();
    } catch (err: any) {
      console.error("Error al guardar unidad", err);
      toast.error(extraerMensajeErrorApi(err, "Ocurrió un error al guardar la unidad vehicular."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-unidad-form-titulo"
    >
      <div className="cc-modal max-w-2xl">
        <div className="cc-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-tr-navy flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-unidad-form-titulo" className="cc-modal-title">
                {unidadEditar
                  ? `Editar Unidad: ${unidadEditar.placas}`
                  : "Registrar Nueva Unidad Vehicular"}
              </h2>
              <p className="text-xs text-slate-500">
                Gestión de unidades y control de capacidad de carga para rutas logísticas
              </p>
            </div>
          </div>
          <button
            className="cc-btn-close"
            onClick={onClose}
            aria-label="Cerrar modal"
            disabled={guardando}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cc-form-grid p-4">
            <div className="cc-field">
              <label htmlFor="uni-placas">
                Placas de Circulación *
              </label>
              <input
                id="uni-placas"
                name="placas"
                type="text"
                maxLength={10}
                placeholder="Ej. UK-482-B"
                value={form.placas}
                onChange={handleChange}
                className={errores.placas ? "border-red-500 bg-red-50/30" : "font-mono font-bold tracking-wider"}
                autoFocus
              />
              {errores.placas && (
                <span className="text-[11px] text-red-600 mt-1 block">
                  {errores.placas}
                </span>
              )}
            </div>

            <div className="cc-field">
              <label htmlFor="uni-flotilla">
                Flotilla Asignada
              </label>
              <select
                id="uni-flotilla"
                name="flotillaId"
                value={form.flotillaId ?? ""}
                onChange={handleChange}
              >
                <option value="">-- Sin flotilla (Unidades generales) --</option>
                {flotillasDisponibles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="cc-field">
              <label htmlFor="uni-tipo">Tipo de Vehículo</label>
              <input
                id="uni-tipo"
                name="tipoVehiculo"
                type="text"
                placeholder="Ej. Camión 3.5 Ton, Pickup, Rabón, Van..."
                value={form.tipoVehiculo}
                onChange={handleChange}
              />
            </div>

            <div className="cc-field">
              <label htmlFor="uni-anio">Año / Modelo Vehicular *</label>
              <input
                id="uni-anio"
                name="anio"
                type="text"
                inputMode="numeric"
                value={form.anio}
                onKeyDown={(e) => bloquearTeclasNoNumericas(e, false)}
                onChange={handleChange}
                className={errores.anio ? "border-red-500 bg-red-50/30" : ""}
              />
              {errores.anio && (
                <span className="text-[11px] text-red-600 mt-1 block">
                  {errores.anio}
                </span>
              )}
            </div>

            <div className="cc-field">
              <label htmlFor="uni-marca">Marca del Fabricante *</label>
              <input
                id="uni-marca"
                name="marca"
                type="text"
                placeholder="Ej. Freightliner, Kenworth, Ford, Isuzu"
                value={form.marca}
                onChange={handleChange}
                className={errores.marca ? "border-red-500 bg-red-50/30" : ""}
              />
              {errores.marca && (
                <span className="text-[11px] text-red-600 mt-1 block">
                  {errores.marca}
                </span>
              )}
            </div>

            <div className="cc-field">
              <label htmlFor="uni-modelo">Submarca o Modelo *</label>
              <input
                id="uni-modelo"
                name="modelo"
                type="text"
                placeholder="Ej. M2 106, T370, F-450 Super Duty"
                value={form.modelo}
                onChange={handleChange}
                className={errores.modelo ? "border-red-500 bg-red-50/30" : ""}
              />
              {errores.modelo && (
                <span className="text-[11px] text-red-600 mt-1 block">
                  {errores.modelo}
                </span>
              )}
            </div>

            <div className="cc-field">
              <label htmlFor="uni-capacidad" className="flex items-center gap-1.5">
                <Weight className="w-3.5 h-3.5 text-slate-500" />
                <span>Capacidad de Carga Máxima (Kg) *</span>
              </label>
              <input
                id="uni-capacidad"
                name="capacidadKg"
                type="text"
                inputMode="decimal"
                placeholder="3500.00"
                value={form.capacidadKg}
                onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
                onChange={handleChange}
                className={errores.capacidadKg ? "border-red-500 bg-red-50/30 font-semibold" : "font-semibold"}
              />
              {errores.capacidadKg ? (
                <span className="text-[11px] text-red-600 mt-1 block">
                  {errores.capacidadKg}
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Utilizada para validar sobrecupo de paquetes en el armado de rutas.
                </span>
              )}
            </div>

            <div className="cc-field">
              <label htmlFor="uni-odometro" className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {unidadEditar ? "Odómetro Actual (Km)" : "Odómetro Inicial (Km)"}
                </span>
              </label>
              <input
                id="uni-odometro"
                name={unidadEditar ? "kmOdometroActual" : "kmOdometroInicial"}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={unidadEditar ? form.kmOdometroActual : form.kmOdometroInicial}
                onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
                onChange={handleChange}
                className={errores.odometro ? "border-red-500 bg-red-50/30 font-mono" : "font-mono"}
              />
              {errores.odometro && (
                <span className="text-[11px] text-red-600 mt-1 block">
                  {errores.odometro}
                </span>
              )}
            </div>

            {unidadEditar && (
              <>
                <div className="cc-field">
                  <label htmlFor="uni-estado">Estado Vehicular</label>
                  <select
                    id="uni-estado"
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                  >
                    {ESTADOS_UNIDAD.map((e) => (
                      <option key={e.valor} value={e.valor}>
                        {e.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cc-field cc-field--toggle" style={{ alignSelf: "end", marginBottom: "8px" }}>
                  <span className="cc-toggle-label">Estatus en Sistema</span>
                  <label className="cc-toggle" htmlFor="uni-activo">
                    <input
                      id="uni-activo"
                      name="activo"
                      type="checkbox"
                      checked={form.activo}
                      onChange={handleChange}
                    />
                    <span className="cc-toggle-track">
                      <span className="cc-toggle-thumb" />
                    </span>
                    <span
                      className={`cc-toggle-text ${form.activo ? "cc-toggle-text--on" : "cc-toggle-text--off"
                        }`}
                    >
                      {form.activo ? "Activo" : "Inactivo / Baja"}
                    </span>
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="cc-modal-actions px-4 pb-4">
            <button
              type="button"
              className="cc-btn-cancel"
              onClick={onClose}
              disabled={guardando}
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
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Guardar Unidad</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

