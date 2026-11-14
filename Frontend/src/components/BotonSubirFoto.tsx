import { Upload } from "lucide-react";
import { useToast } from "./Toast";

interface BotonSubirFotoProps {
  id?: string;
  texto?: string;
}

export function BotonSubirFoto({ id, texto = "Subir foto" }: BotonSubirFotoProps) {
  const { toast } = useToast();

  return (
    <button
      id={id}
      type="button"
      onClick={() =>
        toast.info("La carga de fotografías estará disponible próximamente.", "Próximamente")
      }
      className="w-full inline-flex items-center justify-center gap-2 px-3 py-[9px] rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-[#0B2D4A] text-[#0B2D4A] text-sm font-semibold transition-colors cursor-pointer"
    >
      <Upload className="w-4 h-4" />
      <span>{texto}</span>
    </button>
  );
}

