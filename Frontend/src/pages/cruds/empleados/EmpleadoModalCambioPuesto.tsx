import { useState, useEffect } from "react";
import { X, Loader2, Briefcase } from "lucide-react";
import type { Empleado } from "./types";
import { fetchApi } from "../../../services/api";
import { useToast } from "../../../components/Toast";
import { extraerMensajeErrorApi } from "../../../utils/errorMessages";

interface EmpleadoModalCambioPuestoProps {
  abierto: boolean;
  empleado: Empleado | null;
  onClose: () => void;
  onPuestoCambiado: () => void;
}

export function EmpleadoModalCambioPuesto({
  abierto,
  empleado,
  onClose,
  onPuestoCambiado,
}: EmpleadoModalCambioPuestoProps) {
  const { toast } = useToast();
  const [puestos, setPuestos] = useState<any[]>([]);
  const [nuevoPuestoId, setNuevoPuestoId] = useState<number | "">("");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) {
      fetchApi("/Puesto").then((data) => setPuestos(data || []));
      setNuevoPuestoId("");
      setMotivo("");
    }
  }, [abierto]);

  if (!abierto || !empleado) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    if (!nuevoPuestoId) {
      toast.warning("Seleccione el nuevo puesto del empleado.");
      return;
    }
    setGuardando(true);
    try {
      await fetchApi(`/Empleado/${empleado.id}/cambiar-puesto`, {
        method: "POST",
        body: JSON.stringify({
          nuevoPuestoId: Number(nuevoPuestoId),
          motivo: motivo.trim() || undefined,
        }),
      });
      toast.success(
        `Cambio de puesto registrado para ${empleado.nombre} ${empleado.apellidoPaterno}.`
      );
      onPuestoCambiado();
      onClose();
    } catch (error: any) {
      console.error("Error al cambiar puesto", error);
      toast.error(extraerMensajeErrorApi(error, "Error al registrar el cambio de puesto."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cambio-puesto-titulo"
    >
      <div className="cc-modal max-w-lg">
        <div className="cc-modal-header">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-tr-navy" />
            <h2 id="modal-cambio-puesto-titulo" className="cc-modal-title">
              Cambio de Puesto Laboral
            </h2>
          </div>
          <button
            className="cc-btn-close"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        <form className="cc-form" onSubmit={handleSubmit}>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
            <div>
              <span className="font-bold text-slate-900">Empleado:</span>{" "}
              {empleado.nombre} {empleado.apellidoPaterno} {empleado.apellidoMaterno}
            </div>
            <div>
              <span className="font-bold text-slate-900">Puesto actual:</span>{" "}
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                {empleado.puestoNombre || "Sin puesto asignado"}
              </span>
            </div>
          </div>

          <div className="cc-field mt-3">
            <label htmlFor="select-nuevo-puesto">Nuevo Puesto *</label>
            <select
              id="select-nuevo-puesto"
              required
              value={nuevoPuestoId}
              onChange={(e) => setNuevoPuestoId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-tr-navy outline-none"
            >
              <option value="">-- Seleccionar nuevo puesto --</option>
              {puestos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="cc-field">
            <label htmlFor="txt-motivo-cambio">Motivo o justificación del cambio</label>
            <textarea
              id="txt-motivo-cambio"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Promoción a supervisor de ruta / Reasignación departamental..."
              className="w-full rounded-md border border-gray-300 p-2 text-xs text-slate-800 focus:border-tr-navy outline-none resize-none"
            />
          </div>

          <div className="cc-modal-actions mt-4">
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
                  <Loader2 size={15} className="cc-spin" /> Procesando...
                </>
              ) : (
                "Confirmar Cambio de Puesto"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
