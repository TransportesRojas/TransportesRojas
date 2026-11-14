import { useEffect, useState } from "react";
import {
  PauseCircle,
  X,
  Loader2,
  UserCheck,
  UserX,
} from "lucide-react";
import type { Empleado } from "./types";
import { fetchApi } from "../../../services/api";
import { useToast } from "../../../components/Toast";
import { extraerMensajeErrorApi } from "../../../utils/errorMessages";

export type ModoGestionAcceso = "suspender" | "desactivar" | "reactivar";

interface EmpleadoModalGestionAccesoProps {
  abierto: boolean;
  modo: ModoGestionAcceso;
  empleado: Empleado | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmpleadoModalGestionAcceso({
  abierto,
  modo,
  empleado,
  onClose,
  onSuccess,
}: EmpleadoModalGestionAccesoProps) {
  const { toast } = useToast();
  const [motivo, setMotivo] = useState("");
  const [confirmInput, setConfirmInput] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setMotivo("");
    setConfirmInput("");
    setGuardando(false);
  }, [abierto, modo, empleado?.id]);

  if (!abierto || !empleado) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    if (modo !== "reactivar" && !motivo.trim()) {
      toast.warning("Por favor, especifica el motivo.");
      return;
    }

    if (modo === "desactivar" && confirmInput.trim().toLowerCase() !== "confirmar") {
      toast.warning("Escribe la palabra 'confirmar' para proceder con la baja definitiva.");
      return;
    }

    setGuardando(true);
    try {
      if (modo === "suspender") {
        const res = await fetchApi(`/Empleado/${empleado.id}/suspender`, {
          method: "POST",
          body: JSON.stringify({
            motivo: motivo.trim(),
            notificarSupervisor: true,
          }),
        });

        if (res?.tieneRutasPendientes) {
          toast.warning(
            `Acceso suspendido. Alerta: El chofer tiene ${res.rutasPendientesCount} ruta(s) pendiente(s). Se notificó al supervisor.`,
            "Rutas pendientes"
          );
        } else {
          toast.info(res?.mensaje || "Acceso del empleado suspendido temporalmente.");
        }
      } else if (modo === "desactivar") {
        const res = await fetchApi(`/Empleado/${empleado.id}/desactivar`, {
          method: "POST",
          body: JSON.stringify({
            motivo: motivo.trim(),
          }),
        });
        toast.info(res?.mensaje || "Empleado dado de baja definitiva.");
      } else if (modo === "reactivar") {
        const res = await fetchApi(`/Empleado/${empleado.id}/reactivar`, {
          method: "POST",
          body: JSON.stringify({
            motivo: motivo.trim() || "Reactivación de acceso e incorporación laboral",
          }),
        });
        toast.success(res?.mensaje || "Acceso del empleado reactivado exitosamente.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(extraerMensajeErrorApi(err, "Error al procesar la solicitud de acceso."));
    } finally {
      setGuardando(false);
    }
  };

  const configModo = {
    suspender: {
      titulo: "Suspender Acceso Temporalmente",
      subtitulo:
        "Bloquea temporalmente el inicio de sesión del empleado (ej. incapacidad médica, investigación interna o ausencia temporal).",
      icono: <PauseCircle size={32} className="text-amber-500" />,
      colorIcono: "bg-amber-50 border-amber-200",
      btnTexto: "Confirmar Suspensión Temporal",
      btnClase: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    desactivar: {
      titulo: "Dar de Baja Definitiva de Acceso",
      subtitulo:
        "Revoca permanentemente las credenciales y el acceso al sistema. No podrá reactivarse salvo autorización de Recursos Humanos.",
      icono: <UserX size={32} className="text-red-500" />,
      colorIcono: "bg-red-50 border-red-200",
      btnTexto: "Dar de Baja Definitiva",
      btnClase: "bg-red-600 hover:bg-red-700 text-white",
    },
    reactivar: {
      titulo: "Reactivar Acceso de Empleado",
      subtitulo:
        "Restaura el acceso del empleado tras una suspensión temporal previa.",
      icono: <UserCheck size={32} className="text-emerald-500" />,
      colorIcono: "bg-emerald-50 border-emerald-200",
      btnTexto: "Reactivar Acceso",
      btnClase: "bg-[#16A34A] hover:bg-emerald-700 text-white",
    },
  }[modo];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-[Poppins,sans-serif]"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-left animate-in fade-in duration-200">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${configModo.colorIcono}`}
            >
              {configModo.icono}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-tight">
                {configModo.titulo}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Empleado: <strong>{empleado.nombre} {empleado.apellidoPaterno}</strong> (ID #{empleado.id})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
          {configModo.subtitulo}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Motivo {modo === "reactivar" ? "(opcional)" : "(requerido)"}
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required={modo !== "reactivar"}
              placeholder={
                modo === "suspender"
                  ? "Ej. Incapacidad temporal por 15 días / Procedimiento administrativo..."
                  : modo === "desactivar"
                  ? "Ej. Rescisión de relación laboral / Renuncia voluntaria..."
                  : "Ej. Conclusión de incapacidad / Reincorporación a labores..."
              }
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2D4A] resize-none"
            />
          </div>

          {modo === "desactivar" && (
            <div className="space-y-1 bg-red-50/50 p-3 rounded-xl border border-red-200">
              <label className="text-[11px] font-bold text-red-900 block">
                Escribe <strong className="text-red-600">confirmar</strong> para verificar la baja definitiva:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="confirmar"
                className="w-full px-3 py-2 rounded-lg border border-red-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                guardando ||
                (modo === "desactivar" && confirmInput.trim().toLowerCase() !== "confirmar")
              }
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${configModo.btnClase}`}
            >
              {guardando ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <span>{configModo.btnTexto}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

