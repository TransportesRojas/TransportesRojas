import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Gauge, Truck, Check, Loader2 } from "lucide-react";
import { fetchApi } from "../../../services/api";
import { useToast } from "../../../components/Toast";
import { extraerMensajeErrorApi } from "../../../utils/errorMessages";
import {
  bloquearTeclasNoNumericas,
  limpiarDecimalPositivo,
} from "../../../utils/inputValidation";

interface UnidadItem {
  id: number;
  placas: string;
  marca?: string | null;
  modelo?: string | null;
  tipoVehiculo?: string | null;
  capacidadKg?: number;
  kmOdometroActual: number;
  activo?: boolean;
}

interface EnvioModalCierreOdometroDiaProps {
  abierto: boolean;
  unidadIdPrefijado?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EnvioModalCierreOdometroDia({
  abierto,
  unidadIdPrefijado,
  onClose,
  onSuccess,
}: EnvioModalCierreOdometroDiaProps) {
  const { toast } = useToast();
  const [unidades, setUnidades] = useState<UnidadItem[]>([]);
  const [cargandoUnidades, setCargandoUnidades] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [unidadId, setUnidadId] = useState("");
  const [kmFinal, setKmFinal] = useState("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    if (!abierto) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    setUnidadId("");
    setKmFinal("");
    setObservaciones("");
    setCargandoUnidades(true);

    if (unidadIdPrefijado && unidadIdPrefijado > 0) {
      fetchApi(`/Unidad/${unidadIdPrefijado}`)
        .then((u: UnidadItem | null) => {
          const lista = u ? [u] : [];
          setUnidades(lista);
          if (u) {
            setUnidadId(String(u.id));
          }
        })
        .catch((err) => {
          console.error("Error al cargar unidad para cierre de odómetro", err);
          toast.error("No se pudo cargar la información de la unidad vehicular.");
        })
        .finally(() => {
          setCargandoUnidades(false);
        });
      return;
    }

    fetchApi("/Unidad?take=200")
      .then((data: UnidadItem[]) => {
        const activas = (data || []).filter((u) => u.activo !== false);
        setUnidades(activas);
        if (activas.length === 1) {
          setUnidadId(String(activas[0].id));
        }
      })
      .catch((err) => {
        console.error("Error al cargar unidades para cierre de odómetro", err);
        toast.error("No se pudo cargar la lista de unidades vehiculares.");
      })
      .finally(() => {
        setCargandoUnidades(false);
      });
  }, [abierto, unidadIdPrefijado, toast]);

  const unidadSeleccionada = useMemo(
    () => unidades.find((u) => String(u.id) === unidadId) ?? null,
    [unidades, unidadId]
  );

  const kmActualNum = unidadSeleccionada ? Number(unidadSeleccionada.kmOdometroActual) || 0 : 0;
  const kmFinalNum = kmFinal.trim() ? Number(kmFinal) : 0;
  const kmRecorridosHoy = kmFinalNum > kmActualNum ? kmFinalNum - kmActualNum : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando || !unidadSeleccionada) return;

    if (!kmFinal.trim() || Number.isNaN(kmFinalNum) || kmFinalNum <= 0) {
      toast.error("Ingresa un kilometraje final válido para el odómetro.");
      return;
    }

    if (kmFinalNum < kmActualNum) {
      toast.error(
        `El odómetro final (${kmFinalNum.toFixed(2)} km) no puede ser menor al actual registrado (${kmActualNum.toFixed(2)} km).`
      );
      return;
    }

    try {
      setGuardando(true);
      await fetchApi(`/Unidad/${unidadSeleccionada.id}/cierre-dia`, {
        method: "POST",
        body: JSON.stringify({
          kmOdometroFinal: kmFinalNum,
          observaciones: observaciones.trim() || null,
        }),
      });

      toast.success(
        `Cierre de día registrado. Unidad ${unidadSeleccionada.placas} actualizada a ${kmFinalNum.toFixed(2)} km (+${kmRecorridosHoy.toFixed(2)} km hoy).`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error en cierre de odómetro", err);
      toast.error(
        extraerMensajeErrorApi(err, "No se pudo registrar el cierre de odómetro de la unidad.")
      );
    } finally {
      setGuardando(false);
    }
  };

  if (!abierto) return null;

  return createPortal(
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cierre-odometro-titulo"
    >
      <div className="cc-modal !max-w-xl">
        <div className="cc-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B2D4A] text-white flex items-center justify-center font-bold">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-cierre-odometro-titulo" className="cc-modal-title">
                Cierre de Jornada: Odómetro del Día
              </h2>
              <p className="text-[11px] text-slate-500 m-0">
                Registro del kilometraje final de la unidad al término del día de trabajo
              </p>
            </div>
          </div>
          <button
            type="button"
            className="cc-btn-close"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        <form className="cc-form space-y-4" onSubmit={handleSubmit}>
          {cargandoUnidades && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 text-xs text-[#0B2D4A] font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Cargando catálogo de unidades activas...</span>
            </div>
          )}

          <div className="cc-field cc-field--wide">
            <label htmlFor="cierre-unidad">Unidad Vehicular *</label>
            <select
              id="cierre-unidad"
              required
              value={unidadId}
              onChange={(e) => {
                setUnidadId(e.target.value);
                setKmFinal("");
              }}
            >
              <option value="">Selecciona la unidad que concluyó jornada...</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.placas} {u.marca ? `· ${u.marca}` : ""} {u.modelo ? u.modelo : ""} (Odómetro actual: {Number(u.kmOdometroActual).toFixed(2)} km)
                </option>
              ))}
            </select>
          </div>

          {unidadSeleccionada && (
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/90 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-[#0B2D4A] flex items-center gap-1.5">
                  <Truck className="w-4 h-4" />
                  <span>{unidadSeleccionada.placas} {unidadSeleccionada.marca || ""} {unidadSeleccionada.modelo || ""}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                  En servicio
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-blue-100">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Odómetro Inicial / Actual</div>
                  <div className="text-base font-black text-[#0B2D4A] mt-0.5">
                    {kmActualNum.toFixed(2)} km
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-blue-100">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Recorrido del Día</div>
                  <div className="text-base font-black text-emerald-700 mt-0.5">
                    {kmRecorridosHoy > 0 ? `+${kmRecorridosHoy.toFixed(2)} km` : "—"}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="cc-field cc-field--wide">
            <label htmlFor="cierre-km-final">
              Kilometraje final en odómetro al cerrar el día (km) *
            </label>
            <input
              id="cierre-km-final"
              type="text"
              inputMode="decimal"
              required
              value={kmFinal}
              onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
              onChange={(e) => setKmFinal(limpiarDecimalPositivo(e.target.value, 2))}
              placeholder={`Debe ser mayor o igual a ${kmActualNum.toFixed(2)}`}
              disabled={!unidadSeleccionada}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Lectura física registrada en el tablero del vehículo al terminar el día.
            </p>
          </div>

          <div className="cc-field cc-field--wide">
            <label htmlFor="cierre-observaciones">Observaciones o notas de la jornada (opcional)</label>
            <input
              id="cierre-observaciones"
              type="text"
              maxLength={300}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej. Sin novedades mecánicas, tanque lleno al finalizar..."
            />
          </div>

          <div className="cc-modal-actions pt-2">
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
              className="cc-btn-save inline-flex items-center gap-1.5"
              disabled={guardando || !unidadSeleccionada}
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando cierre...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Registrar cierre del día</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
