import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Package,
  User,
  ShieldCheck,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
  Scale,
  Plus,
  Search,
  Sparkles,
  Store,
} from "lucide-react";
import { getSession } from "../../../utils/auth";
import { envioService, extraerMensajeErrorApi } from "../../../services/envioService";
import { useToast } from "../../../components/Toast";
import {
  bloquearTeclasNoNumericas,
  limpiarDecimalPositivo,
  limpiarSoloDigitos,
} from "../../../utils/inputValidation";
import { SelectorDireccionSepomex } from "../../../components/SelectorDireccionSepomex";
import { BuscadorSucursal } from "../../../components/BuscadorSucursal";
import {
  type ClienteCatalogoItem,
  type CrearEnvioPayload,
  type CrearEnvioResponse,
  type DireccionEnvioInput,
  type SucursalOperativaItem,
  DIRECCION_ENVIO_VACIA,
  formatearFechaCorta,
  formatearFechaHora,
  formatearNombreCliente,
  obtenerMetaEstadoEnvio,
  validarDireccionEnvio,
} from "./types";

interface EnvioModalCrearProps {
  abierto: boolean;
  sucursalesIniciales?: SucursalOperativaItem[];
  onClose: () => void;
  onCreated: (respuesta: CrearEnvioResponse) => void;
}

export function EnvioModalCrear({
  abierto,
  sucursalesIniciales = [],
  onClose,
  onCreated,
}: EnvioModalCrearProps) {
  const { toast } = useToast();

  const [clientes, setClientes] = useState<ClienteCatalogoItem[]>([]);
  const [sucursales, setSucursales] = useState<SucursalOperativaItem[]>(sucursalesIniciales);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const session = getSession();
  const sucursalUsuarioId = session.user?.sucursalId;
  const sucursalUsuarioNombre = session.user?.sucursal;

  const sucursalAsignada = useMemo(() => {
    if (!sucursales || sucursales.length === 0) return null;
    if (sucursalUsuarioId) {
      const match = sucursales.find((s) => s.id === sucursalUsuarioId);
      if (match) return match;
    }
    if (sucursalUsuarioNombre) {
      const norm = sucursalUsuarioNombre.trim().toLowerCase();
      const match = sucursales.find(
        (s) =>
          (s.nombre && s.nombre.trim().toLowerCase() === norm) ||
          (s.nombreCorto && s.nombreCorto.trim().toLowerCase() === norm) ||
          (s.nombre && s.nombre.toLowerCase().includes(norm)) ||
          (s.nombreCorto && norm.includes(s.nombreCorto.toLowerCase()))
      );
      if (match) return match;
    }
    return null;
  }, [sucursales, sucursalUsuarioId, sucursalUsuarioNombre]);

  useEffect(() => {
    if (sucursalAsignada) {
      setSucursalRecepcionId(String(sucursalAsignada.id));
    }
  }, [sucursalAsignada]);

  const [busquedaRemitente, setBusquedaRemitente] = useState("");
  const [debouncedBusquedaRemitente, setDebouncedBusquedaRemitente] = useState("");
  const [buscandoRemitente, setBuscandoRemitente] = useState(false);
  const [desplegarListaRemitente, setDesplegarListaRemitente] = useState(false);
  const refSelectorRemitente = useRef<HTMLDivElement>(null);
  const [remitenteId, setRemitenteId] = useState<string>("");
  const [sucursalRecepcionId, setSucursalRecepcionId] = useState<string>("");

  const [destinatarioNombre, setDestinatarioNombre] = useState("");
  const [destinatarioTelefono, setDestinatarioTelefono] = useState("");
  const [destinatarioEmail, setDestinatarioEmail] = useState("");
  const [direccionDestino, setDireccionDestino] = useState<DireccionEnvioInput>({
    ...DIRECCION_ENVIO_VACIA,
  });

  const [pesoKg, setPesoKg] = useState("1.00");
  const [largoCm, setLargoCm] = useState("30");
  const [anchoCm, setAnchoCm] = useState("20");
  const [altoCm, setAltoCm] = useState("15");
  const [valorDeclarado, setValorDeclarado] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [comprobante, setComprobante] = useState<CrearEnvioResponse | null>(null);
  const [copiadoGuia, setCopiadoGuia] = useState(false);

  const reiniciarFormulario = () => {
    setBusquedaRemitente("");
    setDebouncedBusquedaRemitente("");
    setBuscandoRemitente(false);
    setDesplegarListaRemitente(false);
    setRemitenteId("");
    setSucursalRecepcionId(sucursalAsignada ? String(sucursalAsignada.id) : "");

    setDestinatarioNombre("");
    setDestinatarioTelefono("");
    setDestinatarioEmail("");
    setDireccionDestino({ ...DIRECCION_ENVIO_VACIA });

    setPesoKg("1.00");
    setLargoCm("30");
    setAnchoCm("20");
    setAltoCm("15");
    setValorDeclarado("");
    setDescripcion("");

    setComprobante(null);
    setCopiadoGuia(false);
  };

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

    reiniciarFormulario();

    let cancelado = false;
    setCargandoCatalogos(true);

    Promise.all([
      envioService.obtenerClientesActivos(),
      sucursalesIniciales.length > 0
        ? Promise.resolve(sucursalesIniciales)
        : envioService.obtenerSucursalesOperativas(),
    ])
      .then(([listaClientes, listaSucursales]) => {
        if (cancelado) return;
        const ordenados = [...listaClientes].sort((a, b) =>
          formatearNombreCliente(a).localeCompare(formatearNombreCliente(b), "es-MX")
        );
        setClientes(ordenados);
        setSucursales(listaSucursales || []);
        const sucMatch = (listaSucursales || []).find(
          (s) =>
            (sucursalUsuarioId && s.id === sucursalUsuarioId) ||
            (sucursalUsuarioNombre &&
              ((s.nombre && s.nombre.toLowerCase().includes(sucursalUsuarioNombre.toLowerCase())) ||
                (s.nombreCorto && sucursalUsuarioNombre.toLowerCase().includes(s.nombreCorto.toLowerCase()))))
        );
        if (sucMatch) {
          setSucursalRecepcionId(String(sucMatch.id));
        } else if (listaSucursales && listaSucursales.length === 1) {
          setSucursalRecepcionId(String(listaSucursales[0].id));
        }
      })
      .catch((err) => {
        if (!cancelado) {
          toast.error(
            extraerMensajeErrorApi(err, "No se pudieron cargar los catálogos para documentar.")
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoCatalogos(false);
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // Búsqueda diferida de remitente
  useEffect(() => {
    if (!busquedaRemitente.trim()) {
      setDebouncedBusquedaRemitente("");
      setBuscandoRemitente(false);
      return;
    }
    setBuscandoRemitente(true);
    const handler = setTimeout(() => {
      setDebouncedBusquedaRemitente(busquedaRemitente);
      setBuscandoRemitente(false);
    }, 350);
    return () => clearTimeout(handler);
  }, [busquedaRemitente]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        refSelectorRemitente.current &&
        !refSelectorRemitente.current.contains(e.target as Node)
      ) {
        setDesplegarListaRemitente(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clientesFiltradosRemitente = useMemo(() => {
    const q = debouncedBusquedaRemitente.trim().toLowerCase();
    if (q.length < 2) return [];
    return clientes.filter((c) => {
      const texto = `${formatearNombreCliente(c)} ${c.telefono ?? ""} ${c.email ?? ""}`.toLowerCase();
      return texto.includes(q);
    });
  }, [clientes, debouncedBusquedaRemitente]);

  const remitenteSeleccionado = useMemo(
    () => clientes.find((c) => String(c.id) === remitenteId) ?? null,
    [clientes, remitenteId]
  );

  const pesoVolumetricoKg = useMemo(() => {
    const l = Number(largoCm);
    const a = Number(anchoCm);
    const h = Number(altoCm);
    if (!Number.isFinite(l) || !Number.isFinite(a) || !Number.isFinite(h) || l <= 0 || a <= 0 || h <= 0) {
      return 0;
    }
    return (l * a * h) / 5000;
  }, [largoCm, anchoCm, altoCm]);

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

    if (!remitenteId || Number(remitenteId) <= 0) {
      toast.error("Selecciona el cliente remitente del envío.");
      return;
    }

    if (sucursales.length > 0 && !sucursalRecepcionId) {
      toast.error("Selecciona la sucursal donde se recibirá el paquete.");
      return;
    }

    if (!destinatarioNombre.trim()) {
      toast.error("Ingresa el nombre completo del destinatario.");
      return;
    }

    const telDigitos = destinatarioTelefono.replace(/\D/g, "");
    if (telDigitos.length !== 10) {
      toast.error("El teléfono del destinatario debe contener exactamente 10 dígitos numéricos.");
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
      toast.error("El peso del paquete debe ser mayor a 0 kg.");
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
      toast.error("Escribe la descripción del contenido del paquete.");
      return;
    }

    const valorNum = valorDeclarado.trim() ? Number(valorDeclarado) : null;
    if (valorNum !== null && (!Number.isFinite(valorNum) || valorNum < 0)) {
      toast.error("El valor declarado no puede ser negativo.");
      return;
    }

    const payload: CrearEnvioPayload = {
      remitenteId: Number(remitenteId),
      destinatarioClienteId: null,
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
      toast.success(`Envío documentado con guía ${respuesta.guia}.`);
    } catch (err) {
      toast.error(extraerMensajeErrorApi(err, "No fue posible registrar el envío."));
    } finally {
      setGuardando(false);
    }
  };

  if (!abierto) return null;

  const metaEstadoCreado = comprobante
    ? obtenerMetaEstadoEnvio(comprobante.envio.estado)
    : null;

  return createPortal(
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-crear-envio-titulo"
    >
      <div className="cc-modal !max-w-4xl">
        <div className="cc-modal-header">
          <h2 id="modal-crear-envio-titulo" className="cc-modal-title">
            {comprobante ? "Comprobante de Envío Documentado" : "Documentar Nuevo Envío"}
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

        {/* Comprobante de envío */}
        {comprobante ? (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#16A34A] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-extrabold text-emerald-950">
                  La guía fue generada y registrada exitosamente en plataforma
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Proporciona al cliente el <strong>Número de Guía</strong> para rastreo. El{" "}
                  <strong>PIN de Seguridad</strong> se generará automáticamente cuando el envío
                  pase a estado de reparto.
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
                    id="comprobante-guia-valor"
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
                    id="btn-copiar-guia-creada"
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
                <div className="font-mono text-slate-500">
                  {comprobante.envio.remitenteTelefono || "—"}
                </div>
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
                  Ruta Operativa
                </div>
                <div className="font-bold text-[#0B2D4A] mt-0.5">
                  {comprobante.envio.sucursalRecepcionNombre || "Recolección"} →{" "}
                  {comprobante.envio.sucursalDestinoNombre || "Cobertura"}
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
                onClick={reiniciarFormulario}
              >
                <Plus size={15} />
                <span>Documentar otro envío</span>
              </button>
              <button
                type="button"
                id="btn-finalizar-comprobante-envio"
                className="cc-btn-save"
                onClick={onClose}
              >
                <Check size={16} />
                <span>Finalizar y volver al listado</span>
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de alta de envío */
          <form className="cc-form space-y-6" onSubmit={handleSubmit}>
            {cargandoCatalogos && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs font-semibold text-[#0B2D4A]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cargando cartera de clientes y sucursales operativas...</span>
              </div>
            )}

            {/* Remitente y sucursal de origen */}
            <section className="space-y-3.5">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200">
                <span className="w-6 h-6 rounded-full bg-[#0B2D4A] text-white text-xs font-extrabold inline-flex items-center justify-center">
                  1
                </span>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0B2D4A] m-0">
                  Cliente Remitente y Sucursal de Recepción
                </h3>
              </div>

              <div className="cc-field cc-field--wide !mb-2" ref={refSelectorRemitente}>
                <label htmlFor="env-buscar-remitente">Cliente Remitente *</label>

                {!remitenteSeleccionado ? (
                  <div className="relative">
                    <input
                      id="env-buscar-remitente"
                      type="text"
                      autoComplete="off"
                      value={busquedaRemitente}
                      onChange={(e) => {
                        setBusquedaRemitente(e.target.value);
                        setDesplegarListaRemitente(true);
                      }}
                      onFocus={() => {
                        if (busquedaRemitente.trim().length >= 2) {
                          setDesplegarListaRemitente(true);
                        }
                      }}
                      placeholder="Escribe el nombre, teléfono o correo del cliente para buscar..."
                      className="!pr-10 !h-11 !text-sm"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-400">
                      {buscandoRemitente ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#0B2D4A]" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </div>

                    {desplegarListaRemitente && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-72 flex flex-col">
                        {busquedaRemitente.trim().length < 2 ? (
                          <div className="p-3.5 text-xs text-slate-500 flex items-center gap-2 bg-slate-50/70">
                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>
                              Ingresa al menos <strong>2 caracteres</strong> para comenzar a buscar clientes...
                            </span>
                          </div>
                        ) : buscandoRemitente ? (
                          <div className="p-4 text-xs text-slate-600 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#0B2D4A]" />
                            <span>Buscando en cartera de clientes...</span>
                          </div>
                        ) : clientesFiltradosRemitente.length === 0 ? (
                          <div className="p-4 text-xs text-slate-500 text-center">
                            No se encontraron clientes activos que coincidan con "<strong>{debouncedBusquedaRemitente}</strong>".
                          </div>
                        ) : (
                          <>
                            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                              <span>Coincidencias encontradas</span>
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0B2D4A] font-extrabold text-[10px]">
                                {clientesFiltradosRemitente.length}
                              </span>
                            </div>
                            <ul className="divide-y divide-slate-100 overflow-y-auto m-0 p-0 list-none max-h-56">
                              {clientesFiltradosRemitente.map((c) => {
                                const nombreCompleto = formatearNombreCliente(c);
                                return (
                                  <li key={c.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRemitenteId(String(c.id));
                                        setBusquedaRemitente(nombreCompleto);
                                        setDesplegarListaRemitente(false);
                                      }}
                                      className="w-full text-left p-3 hover:bg-blue-50/70 transition-colors flex items-center justify-between gap-3 cursor-pointer border-none bg-transparent"
                                    >
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-slate-800 truncate">
                                          {nombreCompleto}
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                          {c.telefono && <span>📞 {c.telefono}</span>}
                                          {c.email && <span className="truncate">✉️ {c.email}</span>}
                                        </div>
                                      </div>
                                      <span className="text-[11px] font-bold text-[#0B2D4A] shrink-0 px-2.5 py-1 rounded-lg bg-blue-50">
                                        Seleccionar
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 to-slate-50 border border-blue-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#0B2D4A] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-[#0B2D4A] flex items-center gap-2">
                          <span>{formatearNombreCliente(remitenteSeleccionado)}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Seleccionado
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          {remitenteSeleccionado.telefono && (
                            <span>Tel: <strong>{remitenteSeleccionado.telefono}</strong></span>
                          )}
                          {remitenteSeleccionado.email && (
                            <span>Correo: <strong>{remitenteSeleccionado.email}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRemitenteId("");
                        setBusquedaRemitente("");
                        setDebouncedBusquedaRemitente("");
                        setDesplegarListaRemitente(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-200 text-xs font-bold transition-colors cursor-pointer"
                      title="Cambiar cliente remitente"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cambiar</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="cc-form-grid !mb-0">
                <div className="cc-field cc-field--wide">
                  <label htmlFor="env-sucursal-recepcion">Sucursal de Recepción *</label>
                  {sucursalAsignada ? (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-300 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-[#0B2D4A] text-white shrink-0">
                          <Store className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-[#0B2D4A] truncate">
                            {sucursalAsignada.nombreCorto || sucursalAsignada.nombre}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium truncate">
                            {[sucursalAsignada.calle, sucursalAsignada.municipio, sucursalAsignada.estado]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        </div>
                      </div>
                      <input
                        type="hidden"
                        id="env-sucursal-recepcion"
                        name="sucursalRecepcionId"
                        value={sucursalRecepcionId}
                      />
                    </div>
                  ) : (
                    <BuscadorSucursal
                      id="env-sucursal-recepcion"
                      sucursales={sucursales}
                      sucursalSeleccionadaId={
                        sucursalRecepcionId ? Number(sucursalRecepcionId) : null
                      }
                      onSeleccionar={(id) =>
                        setSucursalRecepcionId(id ? String(id) : "")
                      }
                      permitirSinAsignar={false}
                      placeholder="Buscar y seleccionar la sucursal de recepción..."
                    />
                  )}
                </div>
              </div>
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
                <div className="cc-field cc-field--wide">
                  <label htmlFor="env-destinatario-nombre">
                    Nombre completo de quien recibe *
                  </label>
                  <input
                    id="env-destinatario-nombre"
                    type="text"
                    required
                    maxLength={150}
                    value={destinatarioNombre}
                    onChange={(e) => setDestinatarioNombre(e.target.value)}
                    placeholder="Nombre y apellidos o razón social de recepción"
                  />
                </div>

                <div className="cc-field">
                  <label htmlFor="env-destinatario-telefono">
                    Teléfono celular (10 dígitos) *
                  </label>
                  <input
                    id="env-destinatario-telefono"
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

                <div className="cc-field">
                  <label htmlFor="env-destinatario-email">
                    Correo electrónico del destinatario (opcional)
                  </label>
                  <input
                    id="env-destinatario-email"
                    type="email"
                    maxLength={120}
                    value={destinatarioEmail}
                    onChange={(e) => setDestinatarioEmail(e.target.value)}
                    placeholder="destinatario@correo.com"
                  />
                </div>
              </div>

              <SelectorDireccionSepomex
                idPrefix="env-destino"
                titulo="Dirección de Destino (Entrega)"
                subtitulo="Ingresa el C.P. de 5 dígitos para autocompletar Estado, Municipio y Colonia."
                value={direccionDestino}
                onChange={setDireccionDestino}
                disabled={guardando}
              />
            </section>

            {/* Dimensiones y contenido */}
            <section className="space-y-3.5">
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#0B2D4A] text-white text-xs font-extrabold inline-flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0B2D4A] m-0">
                    Dimensiones y Contenido del Paquete
                  </h3>
                </div>

                {pesoVolumetricoKg > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700">
                    <Scale className="w-3.5 h-3.5 text-[#0B2D4A]" />
                    <span>Peso volumétrico ref.: {pesoVolumetricoKg.toFixed(2)} kg</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="cc-field">
                  <label htmlFor="env-peso">Peso real (kg) *</label>
                  <input
                    id="env-peso"
                    type="text"
                    inputMode="decimal"
                    required
                    value={pesoKg}
                    onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
                    onChange={(e) => setPesoKg(limpiarDecimalPositivo(e.target.value, 2))}
                    placeholder="Ej. 2.50"
                  />
                </div>

                <div className="cc-field">
                  <label htmlFor="env-largo">Largo (cm) *</label>
                  <input
                    id="env-largo"
                    type="text"
                    inputMode="decimal"
                    required
                    value={largoCm}
                    onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
                    onChange={(e) => setLargoCm(limpiarDecimalPositivo(e.target.value, 2))}
                    placeholder="30"
                  />
                </div>

                <div className="cc-field">
                  <label htmlFor="env-ancho">Ancho (cm) *</label>
                  <input
                    id="env-ancho"
                    type="text"
                    inputMode="decimal"
                    required
                    value={anchoCm}
                    onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
                    onChange={(e) => setAnchoCm(limpiarDecimalPositivo(e.target.value, 2))}
                    placeholder="20"
                  />
                </div>

                <div className="cc-field">
                  <label htmlFor="env-alto">Alto (cm) *</label>
                  <input
                    id="env-alto"
                    type="text"
                    inputMode="decimal"
                    required
                    value={altoCm}
                    onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
                    onChange={(e) => setAltoCm(limpiarDecimalPositivo(e.target.value, 2))}
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="cc-form-grid !mb-0">
                <div className="cc-field">
                  <label htmlFor="env-descripcion">Descripción del contenido *</label>
                  <input
                    id="env-descripcion"
                    type="text"
                    required
                    maxLength={500}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej. Caja sellada con refacciones, papelería corporativa..."
                  />
                </div>

                <div className="cc-field">
                  <label htmlFor="env-valor-declarado">Valor declarado MXN (opcional)</label>
                  <input
                    id="env-valor-declarado"
                    type="text"
                    inputMode="decimal"
                    value={valorDeclarado}
                    onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
                    onChange={(e) => setValorDeclarado(limpiarDecimalPositivo(e.target.value, 2))}
                    placeholder="Ej. 1500.00"
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
                id="btn-guardar-nuevo-envio"
                className="cc-btn-save"
                disabled={guardando}
              >
                {guardando ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Generando guía...</span>
                  </>
                ) : (
                  <>
                    <Package size={16} />
                    <span>Generar Guía</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
