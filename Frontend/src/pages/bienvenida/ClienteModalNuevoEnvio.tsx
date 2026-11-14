import { useEffect, useMemo, useState } from "react";
import {
  X,
  Package,
  Store,
  User,
  ShieldCheck,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
  Scale,
  Plus,
  FileText,
  Box,
  Archive,
  Phone,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { envioService, extraerMensajeErrorApi } from "../../services/envioService";
import { useToast } from "../../components/Toast";
import { SelectorDireccionSepomex } from "../../components/SelectorDireccionSepomex";
import {
  bloquearTeclasNoNumericas,
  limpiarDecimalPositivo,
  limpiarSoloDigitos,
} from "../../utils/inputValidation";
import {
  type CrearEnvioPayload,
  type CrearEnvioResponse,
  type DireccionEnvioInput,
  type SucursalOperativaItem,
  DIRECCION_ENVIO_VACIA,
  formatearFechaCorta,
  formatearFechaHora,
  obtenerMetaEstadoEnvio,
  validarDireccionEnvio,
} from "../cruds/envios/types";
import "../cruds/estilos/cruds.css";

interface ClienteModalNuevoEnvioProps {
  abierto: boolean;
  nombreCliente: string;
  emailCliente?: string;
  onClose: () => void;
  onCreated: (respuesta: CrearEnvioResponse) => void;
}

export interface RangoTamanoPaquete {
  id: string;
  nombre: string;
  subtitulo: string;
  pesoKg: string;
  pesoTexto: string;
  largoCm: string;
  anchoCm: string;
  altoCm: string;
  dimensionesTexto: string;
  ejemplos: string;
}

export const RANGOS_TAMANO_PAQUETE: RangoTamanoPaquete[] = [
  {
    id: "sobre",
    nombre: "Sobre / Documentos",
    subtitulo: "Extra Chico (XS)",
    pesoKg: "0.50",
    pesoTexto: "Hasta 1 kg",
    largoCm: "30",
    anchoCm: "22",
    altoCm: "2",
    dimensionesTexto: "30 × 22 × 2 cm",
    ejemplos: "Documentos, contratos, sobres o pasaportes",
  },
  {
    id: "chico",
    nombre: "Paquete Chico",
    subtitulo: "Chico (S)",
    pesoKg: "2.00",
    pesoTexto: "Hasta 3 kg",
    largoCm: "25",
    anchoCm: "20",
    altoCm: "15",
    dimensionesTexto: "25 × 20 × 15 cm",
    ejemplos: "Libros, calzado, celulares o cosméticos",
  },
  {
    id: "mediano",
    nombre: "Paquete Mediano",
    subtitulo: "Mediano (M)",
    pesoKg: "6.00",
    pesoTexto: "Hasta 8 kg",
    largoCm: "40",
    anchoCm: "30",
    altoCm: "25",
    dimensionesTexto: "40 × 30 × 25 cm",
    ejemplos: "Ropa, electrónicos, regalos o paquetes estándar",
  },
  {
    id: "grande",
    nombre: "Paquete Grande",
    subtitulo: "Grande (L)",
    pesoKg: "15.00",
    pesoTexto: "Hasta 20 kg",
    largoCm: "60",
    anchoCm: "45",
    altoCm: "40",
    dimensionesTexto: "60 × 45 × 40 cm",
    ejemplos: "Electrodomésticos, refacciones o cajas voluminosas",
  },
];

// Coordenadas de respaldo por sucursal
const COORDENADAS_SUCURSAL_FALLBACK: Record<number, { lat: number; lon: number }> = {
  1: { lat: 24.80491, lon: -107.39401 },
  2: { lat: 24.78245, lon: -107.42815 },
  3: { lat: 23.21652, lon: -106.41632 },
  4: { lat: 25.79046, lon: -108.99305 },
};

function calcularDistanciaHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (val: number) => (val * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function ClienteModalNuevoEnvio(props: ClienteModalNuevoEnvioProps) {
  if (!props.abierto) return null;
  return <ContenidoModalNuevoEnvioCliente {...props} />;
}

function ContenidoModalNuevoEnvioCliente({
  nombreCliente,
  emailCliente,
  onClose,
  onCreated,
}: ClienteModalNuevoEnvioProps) {
  const { toast } = useToast();

  const [sucursales, setSucursales] = useState<SucursalOperativaItem[]>([]);
  const [cargandoSucursales, setCargandoSucursales] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [sucursalRecepcionId, setSucursalRecepcionId] = useState<string>("");
  const [pestanaSucursales, setPestanaSucursales] = useState<"cercanas" | "otras">("cercanas");

  const [sucursalCercanaId, setSucursalCercanaId] = useState<number | null>(null);
  const [distanciasPorSucursal, setDistanciasPorSucursal] = useState<Record<number, number>>({});

  const [destinatarioNombre, setDestinatarioNombre] = useState("");
  const [destinatarioTelefono, setDestinatarioTelefono] = useState("");
  const [destinatarioEmail, setDestinatarioEmail] = useState("");
  const [direccionDestino, setDireccionDestino] = useState<DireccionEnvioInput>({
    ...DIRECCION_ENVIO_VACIA,
  });

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const [rangoTamanoId, setRangoTamanoId] = useState<string>("chico");
  const [pesoKg, setPesoKg] = useState(RANGOS_TAMANO_PAQUETE[1].pesoKg);
  const [largoCm, setLargoCm] = useState(RANGOS_TAMANO_PAQUETE[1].largoCm);
  const [anchoCm, setAnchoCm] = useState(RANGOS_TAMANO_PAQUETE[1].anchoCm);
  const [altoCm, setAltoCm] = useState(RANGOS_TAMANO_PAQUETE[1].altoCm);
  const [valorDeclarado, setValorDeclarado] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const handleSeleccionarRango = (rango: RangoTamanoPaquete) => {
    setRangoTamanoId(rango.id);
    setPesoKg(rango.pesoKg);
    setLargoCm(rango.largoCm);
    setAnchoCm(rango.anchoCm);
    setAltoCm(rango.altoCm);
  };

  const [comprobante, setComprobante] = useState<CrearEnvioResponse | null>(null);
  const [copiadoGuia, setCopiadoGuia] = useState(false);

  // Sucursal más cercana por geolocalización
  const aplicarSucursalMasCercana = (
    userLat: number,
    userLon: number,
    lista: SucursalOperativaItem[]
  ) => {
    if (!lista || lista.length === 0) return;

    const mapaDistancias: Record<number, number> = {};
    let menorDistancia = Number.MAX_VALUE;
    let sucursalMasCercana: SucursalOperativaItem | null = null;

    for (const suc of lista) {
      const lat =
        suc.latitud !== null && suc.latitud !== undefined
          ? Number(suc.latitud)
          : COORDENADAS_SUCURSAL_FALLBACK[suc.id]?.lat;
      const lon =
        suc.longitud !== null && suc.longitud !== undefined
          ? Number(suc.longitud)
          : COORDENADAS_SUCURSAL_FALLBACK[suc.id]?.lon;

      if (lat !== undefined && lon !== undefined) {
        const dist = calcularDistanciaHaversineKm(userLat, userLon, lat, lon);
        mapaDistancias[suc.id] = dist;
        if (dist < menorDistancia) {
          menorDistancia = dist;
          sucursalMasCercana = suc;
        }
      }
    }

    setDistanciasPorSucursal(mapaDistancias);

    if (sucursalMasCercana) {
      setSucursalCercanaId(sucursalMasCercana.id);
      setSucursalRecepcionId(String(sucursalMasCercana.id));
    }
  };

  const solicitarUbicacionYCalcularCercana = (lista: SucursalOperativaItem[]) => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;
        aplicarSucursalMasCercana(userLat, userLon, lista);
      },
      () => { },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  useEffect(() => {
    let cancelado = false;

    envioService
      .obtenerSucursalesOperativas()
      .then((lista) => {
        if (cancelado) return;
        const activas = lista || [];
        setSucursales(activas);
        if (activas.length > 0) {
          setSucursalRecepcionId((prev) => (prev ? prev : String(activas[0].id)));
        }
        solicitarUbicacionYCalcularCercana(activas);
      })
      .catch((err) => {
        if (!cancelado) {
          toast.error(
            extraerMensajeErrorApi(err, "No se pudieron cargar las sucursales disponibles.")
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoSucursales(false);
      });

    return () => {
      cancelado = true;
    };
  }, [toast]);

  const sucursalesOrdenadas = useMemo(() => {
    if (Object.keys(distanciasPorSucursal).length === 0) {
      return sucursales;
    }
    return [...sucursales].sort((a, b) => {
      const distA = distanciasPorSucursal[a.id] ?? Number.MAX_VALUE;
      const distB = distanciasPorSucursal[b.id] ?? Number.MAX_VALUE;
      return distA - distB;
    });
  }, [sucursales, distanciasPorSucursal]);

  const sucursalesPrincipales = useMemo(
    () => sucursalesOrdenadas.slice(0, 4),
    [sucursalesOrdenadas]
  );

  const sucursalesOtras = useMemo(
    () => sucursalesOrdenadas.slice(4, 7),
    [sucursalesOrdenadas]
  );

  const sucursalSeleccionadaObj = useMemo(
    () => sucursales.find((s) => String(s.id) === sucursalRecepcionId) || null,
    [sucursales, sucursalRecepcionId]
  );

  const pesoVolumetricoKg = useMemo(() => {
    const l = Number(largoCm);
    const a = Number(anchoCm);
    const h = Number(altoCm);
    if (
      !Number.isFinite(l) ||
      !Number.isFinite(a) ||
      !Number.isFinite(h) ||
      l <= 0 ||
      a <= 0 ||
      h <= 0
    ) {
      return 0;
    }
    return (l * a * h) / 5000;
  }, [largoCm, anchoCm, altoCm]);

  const reiniciarParaOtroEnvio = () => {
    setPestanaSucursales("cercanas");
    setSucursalRecepcionId(
      sucursalCercanaId
        ? String(sucursalCercanaId)
        : sucursalesOrdenadas.length > 0
          ? String(sucursalesOrdenadas[0].id)
          : ""
    );
    setDestinatarioNombre("");
    setDestinatarioTelefono("");
    setDestinatarioEmail("");
    setDireccionDestino({ ...DIRECCION_ENVIO_VACIA });
    setRangoTamanoId("chico");
    setPesoKg(RANGOS_TAMANO_PAQUETE[1].pesoKg);
    setLargoCm(RANGOS_TAMANO_PAQUETE[1].largoCm);
    setAnchoCm(RANGOS_TAMANO_PAQUETE[1].anchoCm);
    setAltoCm(RANGOS_TAMANO_PAQUETE[1].altoCm);
    setValorDeclarado("");
    setDescripcion("");
    setComprobante(null);
    setCopiadoGuia(false);
  };

  const copiarAlPortapapeles = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoGuia(true);
      setTimeout(() => setCopiadoGuia(false), 2000);
      toast.info(`Guía ${texto} copiada al portapapeles.`);
    } catch {
      toast.error("No fue posible copiar automáticamente al portapapeles.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    if (sucursales.length > 0 && !sucursalRecepcionId) {
      toast.error("Selecciona la sucursal donde entregarás tu paquete.");
      return;
    }

    if (!destinatarioNombre.trim()) {
      toast.error("Ingresa el nombre completo de la persona que recibirá el paquete.");
      return;
    }

    const telDigitos = destinatarioTelefono.replace(/\D/g, "");
    if (telDigitos.length !== 10) {
      toast.error("El teléfono del destinatario debe tener exactamente 10 dígitos.");
      return;
    }

    const errorDestino = validarDireccionEnvio(direccionDestino, "entrega (destino)");
    if (errorDestino) {
      toast.error(errorDestino);
      return;
    }

    const pesoNum = Number(pesoKg);
    const largoNum = Number(largoCm);
    const anchoNum = Number(anchoCm);
    const altoNum = Number(altoCm);

    if (!Number.isFinite(pesoNum) || pesoNum <= 0) {
      toast.error("El peso aproximado del paquete debe ser mayor a 0 kg.");
      return;
    }
    if (
      !Number.isFinite(largoNum) ||
      largoNum <= 0 ||
      !Number.isFinite(anchoNum) ||
      anchoNum <= 0 ||
      !Number.isFinite(altoNum) ||
      altoNum <= 0
    ) {
      toast.error("Las dimensiones (largo, ancho y alto) deben ser mayores a 0 cm.");
      return;
    }

    if (!descripcion.trim()) {
      toast.error("Describe brevemente el contenido de tu paquete.");
      return;
    }

    const valorNum = valorDeclarado.trim() ? Number(valorDeclarado) : null;
    if (valorNum !== null && (!Number.isFinite(valorNum) || valorNum < 0)) {
      toast.error("El valor declarado no puede ser negativo.");
      return;
    }

    const payload: CrearEnvioPayload = {
      destinatarioNombre: destinatarioNombre.trim(),
      destinatarioTelefono: telDigitos,
      destinatarioEmail: destinatarioEmail.trim() || null,
      requiereRecoleccion: false,
      sucursalRecepcionId: sucursalRecepcionId ? Number(sucursalRecepcionId) : null,
      sucursalDestinoId: null,
      direccionOrigen: null,
      fechaHoraRecoleccionSolicitada: null,
      observacionesRecoleccion: null,
      direccionDestino,
      pesoKg: pesoNum,
      largoCm: largoNum,
      anchoCm: anchoNum,
      altoCm: altoNum,
      descripcion: descripcion.trim(),
      valorDeclarado: valorNum,
    };

    try {
      setGuardando(true);
      const respuesta = await envioService.crear(payload);
      setComprobante(respuesta);
      onCreated(respuesta);
      toast.success(`Tu envío fue registrado con la guía ${respuesta.guia}.`);
    } catch (err) {
      toast.error(extraerMensajeErrorApi(err, "No fue posible registrar tu envío."));
    } finally {
      setGuardando(false);
    }
  };

  const metaEstadoCreado = comprobante
    ? obtenerMetaEstadoEnvio(comprobante.envio.estado)
    : null;

  return (
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cliente-nuevo-envio-titulo"
    >
      <div className="cc-modal !max-w-4xl">
        <div className="cc-modal-header">
          <h2 id="modal-cliente-nuevo-envio-titulo" className="cc-modal-title">
            {comprobante ? "Comprobante de tu Nuevo Envío" : "Realizar Nuevo Envío"}
          </h2>
          <button
            type="button"
            className="cc-btn-close"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Vista de comprobante */}
        {comprobante ? (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#16A34A] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-extrabold text-emerald-950">
                  ¡Tu envío quedó registrado exitosamente!
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed m-0">
                  Presenta tu paquete en la sucursal seleccionada con este{" "}
                  <strong>Número de Guía</strong>. El <strong>PIN de Seguridad</strong> se generará
                  automáticamente cuando el paquete pase a estado de reparto hacia su destino.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#0B2D4A]" />
                    <span>Número de Guía Oficial</span>
                  </span>
                  <div
                    id="cliente-comprobante-guia"
                    className="mt-2 font-mono text-2xl font-black tracking-wider text-[#0B2D4A]"
                  >
                    {comprobante.guia}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                  {metaEstadoCreado && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${metaEstadoCreado.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${metaEstadoCreado.dotClass}`} />
                      {metaEstadoCreado.etiqueta}
                    </span>
                  )}
                  <button
                    type="button"
                    id="btn-cliente-copiar-guia"
                    onClick={() => copiarAlPortapapeles(comprobante.guia)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#0B2D4A] text-[#0B2D4A] hover:text-white border border-slate-300 hover:border-[#0B2D4A] text-xs font-bold transition-colors cursor-pointer"
                  >
                    {copiadoGuia ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>Copiada</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar guía</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0B2D4A] text-white border border-[#0B2D4A] flex flex-col justify-between gap-3 shadow-md">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>PIN de Seguridad de Entrega</span>
                  </span>
                  <div className="mt-2 text-sm font-bold text-white leading-snug">
                    Se generará cuando el envío pase a estado de reparto
                  </div>
                </div>
                <div className="pt-2 border-t border-white/15">
                  <span className="text-[11px] text-blue-100">
                    El destinatario recibirá el PIN cuando el paquete salga a ruta de entrega
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-[10.5px] font-bold uppercase text-slate-400">Remitente</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  {comprobante.envio.remitenteNombre}
                </div>
                <div className="text-slate-500">Entrega en sucursal</div>
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase text-slate-400">Destinatario</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  {comprobante.envio.destinatarioNombre}
                </div>
                <div className="font-mono text-slate-500">
                  {comprobante.envio.destinatarioTelefono}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase text-slate-400">
                  Sucursal de Entrega → Destino
                </div>
                <div className="font-bold text-[#0B2D4A] mt-0.5">
                  {comprobante.envio.sucursalRecepcionNombre || "Sucursal"} →{" "}
                  {comprobante.envio.sucursalDestinoNombre || "Cobertura nacional"}
                </div>
                <div className="text-slate-500">
                  {comprobante.envio.destinoCiudadResumen || "Destino nacional"}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase text-slate-400">
                  Paquete y Entrega Est.
                </div>
                <div className="font-bold text-slate-800 mt-0.5">
                  {Number(comprobante.envio.pesoKg).toFixed(2)} kg (
                  {comprobante.envio.largoCm}×{comprobante.envio.anchoCm}×
                  {comprobante.envio.altoCm} cm)
                </div>
                <div className="text-slate-500">
                  Est: {formatearFechaCorta(comprobante.envio.fechaEntregaEstimada)} (
                  {formatearFechaHora(comprobante.envio.fechaCreacion)})
                </div>
              </div>
            </div>

            <div className="cc-modal-actions">
              <button
                type="button"
                className="cc-btn-cancel inline-flex items-center gap-1.5"
                onClick={reiniciarParaOtroEnvio}
              >
                <Plus size={15} />
                <span>Realizar otro envío</span>
              </button>
              <button
                type="button"
                id="btn-cliente-finalizar-envio"
                className="cc-btn-save"
                onClick={onClose}
              >
                <Check size={16} />
                <span>Finalizar y ver en Mis Envíos</span>
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de nuevo envío */
          <form className="cc-form space-y-6" onSubmit={handleSubmit}>
            <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#0B2D4A]">
                <User className="w-4 h-4 text-[#D64545]" />
                <span>Remitente titular: {nombreCliente}</span>
              </div>
              {emailCliente && <span className="text-slate-500">{emailCliente}</span>}
            </div>

            {cargandoSucursales && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs font-semibold text-[#0B2D4A]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Consultando sucursales operativas disponibles...</span>
              </div>
            )}

            {/* Sucursal de entrega */}
            <section className="space-y-3.5">
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#0B2D4A] text-white text-xs font-extrabold inline-flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0B2D4A] m-0">
                    Sucursal donde entregarás tu paquete
                  </h3>
                </div>

                {sucursalesOrdenadas.length > 4 && (
                  <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      id="tab-sucursales-cercanas"
                      onClick={() => setPestanaSucursales("cercanas")}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${pestanaSucursales === "cercanas"
                          ? "bg-white text-[#0B2D4A] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                      4 Más cercanas
                    </button>
                    <button
                      type="button"
                      id="tab-sucursales-otras"
                      onClick={() => setPestanaSucursales("otras")}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 ${pestanaSucursales === "otras"
                          ? "bg-white text-[#0B2D4A] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                      <span>Otras (siguientes 3)</span>
                      {sucursalesOtras.some((s) => String(s.id) === sucursalRecepcionId) && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {sucursales.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11.5px] font-bold text-slate-600">
                    <span>
                      {pestanaSucursales === "cercanas"
                        ? "Sucursales más cercanas a tu ubicación:"
                        : "Otras sucursales operativas disponibles (siguientes 3):"}
                    </span>
                    {sucursalSeleccionadaObj && (
                      <span className="text-[#0B2D4A] font-extrabold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{sucursalSeleccionadaObj.nombreCorto || sucursalSeleccionadaObj.nombre}</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(pestanaSucursales === "cercanas" ? sucursalesPrincipales : sucursalesOtras).map((suc) => {
                      const seleccionada = String(suc.id) === sucursalRecepcionId;
                      const esLaMasCercana = suc.id === sucursalCercanaId;
                      const distancia = distanciasPorSucursal[suc.id];

                      return (
                        <button
                          key={suc.id}
                          type="button"
                          id={`btn-cliente-sucursal-${suc.id}`}
                          onClick={() => setSucursalRecepcionId(String(suc.id))}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative min-h-[110px] ${seleccionada
                              ? "bg-blue-50/80 border-[#0B2D4A] ring-2 ring-[#0B2D4A]/20 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`p-2 rounded-xl shrink-0 transition-colors ${seleccionada
                                    ? "bg-[#0B2D4A] text-white"
                                    : "bg-slate-100 text-slate-600"
                                  }`}
                              >
                                <Store className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold text-[#0B2D4A] truncate">
                                  {suc.nombreCorto || suc.nombre}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium truncate">
                                  {[suc.municipio, suc.estado].filter(Boolean).join(", ")}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {esLaMasCercana && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase tracking-wider">
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  <span>Más cercana</span>
                                </span>
                              )}
                              {distancia !== undefined && Number.isFinite(distancia) && (
                                <span className="text-[10.5px] font-bold text-slate-600 bg-white/90 px-1.5 py-0.5 rounded border border-slate-200">
                                  📍{" "}
                                  {distancia < 1
                                    ? `${Math.round(distancia * 1000)} m`
                                    : `~${distancia.toFixed(1)} km`}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-600 space-y-0.5 pt-1.5 border-t border-slate-100">
                            {suc.calle && (
                              <div className="truncate text-slate-700">
                                <span className="font-semibold">Calle:</span> {suc.calle}
                                {suc.codigoPostal ? ` (C.P. ${suc.codigoPostal})` : ""}
                              </div>
                            )}
                            {suc.telefono && (
                              <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10.5px]">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{suc.telefono}</span>
                              </div>
                            )}
                          </div>

                          {seleccionada && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-[#0B2D4A] pt-1.5 border-t border-[#0B2D4A]/15">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Sucursal seleccionada para recepción</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {sucursalesOrdenadas.length > 4 && (
                    <div className="pt-1 flex items-center justify-end">
                      {pestanaSucursales === "cercanas" ? (
                        <button
                          type="button"
                          id="btn-ver-otras-sucursales"
                          onClick={() => setPestanaSucursales("otras")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0B2D4A] text-slate-700 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-200 hover:border-[#0B2D4A]"
                        >
                          <Store className="w-3.5 h-3.5" />
                          <span>Otras (ver siguientes {sucursalesOtras.length} más cercanas) →</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          id="btn-volver-sucursales-cercanas"
                          onClick={() => setPestanaSucursales("cercanas")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0B2D4A] text-slate-700 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-200 hover:border-[#0B2D4A]"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>← Volver a las 4 más cercanas</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <input
                type="hidden"
                id="cliente-env-sucursal-recepcion"
                name="sucursalRecepcionId"
                value={sucursalRecepcionId}
                required
              />
            </section>

            {/* Destinatario y domicilio */}
            <section className="space-y-3.5">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200">
                <span className="w-6 h-6 rounded-full bg-[#0B2D4A] text-white text-xs font-extrabold inline-flex items-center justify-center">
                  2
                </span>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0B2D4A] m-0">
                  Destinatario y Domicilio de Entrega
                </h3>
              </div>

              <div className="cc-form-grid !mb-0">
                <div className="cc-field">
                  <label htmlFor="cliente-env-dest-nombre">
                    Nombre completo de quien recibe *
                  </label>
                  <input
                    id="cliente-env-dest-nombre"
                    type="text"
                    required
                    maxLength={150}
                    value={destinatarioNombre}
                    onChange={(e) => setDestinatarioNombre(e.target.value)}
                    placeholder="Nombre y apellidos del destinatario"
                  />
                </div>

                <div className="cc-field">
                  <label htmlFor="cliente-env-dest-telefono">
                    Teléfono celular (10 dígitos) *
                  </label>
                  <input
                    id="cliente-env-dest-telefono"
                    type="tel"
                    inputMode="numeric"
                    required
                    value={destinatarioTelefono}
                    onKeyDown={(e) => bloquearTeclasNoNumericas(e, false)}
                    onChange={(e) =>
                      setDestinatarioTelefono(limpiarSoloDigitos(e.target.value, 10))
                    }
                    placeholder="Ej. 6671234567"
                    className="font-mono"
                  />
                </div>

                <div className="cc-field cc-field--wide">
                  <label htmlFor="cliente-env-dest-email">
                    Correo electrónico del destinatario (opcional)
                  </label>
                  <input
                    id="cliente-env-dest-email"
                    type="email"
                    maxLength={150}
                    value={destinatarioEmail}
                    onChange={(e) => setDestinatarioEmail(e.target.value)}
                    placeholder="destinatario@correo.com"
                  />
                </div>
              </div>

              <SelectorDireccionSepomex
                idPrefix="cliente-destino"
                titulo="Dirección de Entrega (Destino)"
                subtitulo="Escribe el Código Postal de 5 dígitos para cargar automáticamente Estado, Municipio y Colonias."
                value={direccionDestino}
                onChange={setDireccionDestino}
                disabled={guardando}
              />
            </section>

            {/* Dimensiones y contenido */}
            <section className="space-y-3.5">
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#0B2D4A] text-white text-xs font-extrabold inline-flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0B2D4A] m-0">
                    Características del Paquete
                  </h3>
                </div>
                {pesoVolumetricoKg > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                    <Scale className="w-3.5 h-3.5 text-[#0B2D4A]" />
                    <span>Peso volumétrico ref.: {pesoVolumetricoKg.toFixed(2)} kg</span>
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700">
                  Selecciona el tamaño y peso de tu envío *
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {RANGOS_TAMANO_PAQUETE.map((rango) => {
                    const seleccionado = rangoTamanoId === rango.id;
                    const Icono =
                      rango.id === "sobre"
                        ? FileText
                        : rango.id === "chico"
                          ? Package
                          : rango.id === "mediano"
                            ? Box
                            : Archive;

                    return (
                      <button
                        key={rango.id}
                        type="button"
                        onClick={() => handleSeleccionarRango(rango)}
                        className={`group relative p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${seleccionado
                          ? "bg-blue-50/80 border-[#0B2D4A] ring-2 ring-[#0B2D4A]/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={`p-2 rounded-xl shrink-0 transition-colors ${seleccionado
                              ? "bg-[#0B2D4A] text-white"
                              : "bg-slate-100 text-slate-600 group-hover:bg-slate-200/70"
                              }`}
                          >
                            <Icono className="w-4 h-4" />
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${seleccionado
                              ? "bg-[#0B2D4A] text-white border-[#0B2D4A]"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                          >
                            {rango.subtitulo}
                          </span>
                        </div>

                        <div>
                          <div className="text-xs font-extrabold text-[#0B2D4A]">
                            {rango.nombre}
                          </div>
                          <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                            {rango.pesoTexto}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {rango.dimensionesTexto}
                          </div>
                          <p className="text-[10.5px] text-slate-400 mt-1 leading-snug m-0 italic">
                            {rango.ejemplos}
                          </p>
                        </div>

                        {seleccionado && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-[#0B2D4A] pt-1.5 border-t border-[#0B2D4A]/15">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Seleccionado</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="cc-form-grid !mb-0">
                <div className="cc-field">
                  <label htmlFor="cliente-env-valor">
                    Valor declarado estimado ($ MXN)
                  </label>
                  <input
                    id="cliente-env-valor"
                    type="text"
                    inputMode="decimal"
                    value={valorDeclarado}
                    onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
                    onChange={(e) => setValorDeclarado(limpiarDecimalPositivo(e.target.value, 2))}
                    placeholder="Ej. 1500 (Opcional)"
                    className="font-mono"
                  />
                  <span className="text-[10.5px] text-slate-400 mt-0.5 block">
                    Para fines de seguro de traslado en caso de siniestro.
                  </span>
                </div>

                <div className="cc-field cc-field--wide">
                  <label htmlFor="cliente-env-descripcion">
                    Descripción del contenido del paquete *
                  </label>
                  <input
                    id="cliente-env-descripcion"
                    type="text"
                    required
                    maxLength={500}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej. Documentos corporativos, ropa, refacciones automotrices..."
                  />
                </div>
              </div>
            </section>

            <div className="cc-modal-actions">
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
                id="btn-cliente-guardar-envio"
                className="cc-btn-save"
                disabled={guardando}
              >
                {guardando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generando guía...</span>
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    <span>Generar Guía de Envío</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
