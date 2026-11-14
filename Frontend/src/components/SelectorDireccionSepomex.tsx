import { useEffect, useRef, useState } from "react";
import {
  MapPin,
  AlertCircle,
  Search,
  Edit3,
  ListFilter,
} from "lucide-react";
import { envioService } from "../services/envioService";
import { geocodingService } from "../services/geocodingService";
import { bloquearTeclasNoNumericas } from "../utils/inputValidation";
import type {
  CoberturaSugeridaResponse,
  ColoniaSepomexItem,
  DireccionEnvioInput,
} from "../pages/cruds/envios/types";

interface SelectorDireccionSepomexProps {
  idPrefix: string;
  titulo: string;
  subtitulo?: string;
  value: DireccionEnvioInput;
  onChange: (next: DireccionEnvioInput) => void;
  onCoberturaDetectada?: (cobertura: CoberturaSugeridaResponse | null) => void;
  disabled?: boolean;
}

export function SelectorDireccionSepomex({
  idPrefix,
  titulo,
  subtitulo,
  value,
  onChange,
  onCoberturaDetectada,
  disabled = false,
}: SelectorDireccionSepomexProps) {
  const [consultandoCp, setConsultandoCp] = useState(false);
  const [coloniasSepomex, setColoniasSepomex] = useState<ColoniaSepomexItem[]>([]);
  const [modoManual, setModoManual] = useState(false);
  const [avisoCp, setAvisoCp] = useState<string | null>(null);

  const requestSeqRef = useRef(0);
  const ultimoCpConsultadoRef = useRef<string>("");
  const valueRef = useRef(value);
  const geoAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Geocodificación automática
  useEffect(() => {
    const calle = (value.calle || "").trim();
    const numExt = (value.numeroExterior || "").trim();
    const colonia = (value.colonia || "").trim();
    const municipio = (value.municipio || "").trim();
    const estado = (value.estado || "").trim();
    const cp = (value.codigoPostal || "").replace(/\D/g, "");

    if (!calle || calle.length < 3) {
      return;
    }

    const handler = setTimeout(async () => {
      if (geoAbortRef.current) {
        geoAbortRef.current.abort();
      }
      const controller = new AbortController();
      geoAbortRef.current = controller;

      try {
        const resp = await geocodingService.geocodificarDireccion(
          {
            calle,
            numeroExterior: numExt,
            colonia,
            municipio,
            estado,
            codigoPostal: cp,
            coordenadasRespaldo:
              valueRef.current.latitud && valueRef.current.longitud
                ? {
                  lat: Number(valueRef.current.latitud),
                  lon: Number(valueRef.current.longitud),
                }
                : null,
          },
          controller.signal
        );

        if (controller.signal.aborted) return;

        if (resp) {
          const actual = valueRef.current;
          if (actual.latitud !== resp.latitud || actual.longitud !== resp.longitud) {
            onChange({
              ...actual,
              latitud: resp.latitud,
              longitud: resp.longitud,
            });
          }
        }
      } catch {
      }
    }, 650);

    return () => {
      clearTimeout(handler);
    };
  }, [
    value.calle,
    value.numeroExterior,
    value.colonia,
    value.municipio,
    value.estado,
    value.codigoPostal,
  ]);

  useEffect(() => {
    if (!value.codigoPostal && ultimoCpConsultadoRef.current !== "") {
      ultimoCpConsultadoRef.current = "";
      setColoniasSepomex([]);
      setModoManual(false);
      setAvisoCp(null);
    }
  }, [value.codigoPostal]);

  const consultarCatalogoPorCp = async (cpCincoDigitos: string) => {
    const seq = ++requestSeqRef.current;
    ultimoCpConsultadoRef.current = cpCincoDigitos;
    setConsultandoCp(true);
    setAvisoCp(null);

    try {
      const res = await envioService.consultarCodigoPostal(cpCincoDigitos);
      if (seq !== requestSeqRef.current) return;

      const listaColonias = res.colonias || [];
      setColoniasSepomex(listaColonias);
      setModoManual(listaColonias.length === 0);
      onCoberturaDetectada?.(res.coberturaSugerida ?? null);

      const actual = valueRef.current;
      const coloniaUnica = listaColonias.length === 1 ? listaColonias[0] : null;
      const coloniaPreviaValida =
        !coloniaUnica && actual.asentamientoId
          ? listaColonias.find((c) => c.id === actual.asentamientoId) ?? null
          : null;
      const coloniaSeleccionada = coloniaUnica ?? coloniaPreviaValida;

      onChange({
        ...actual,
        codigoPostal: res.codigoPostal,
        estadoId: res.estadoId,
        estado: res.estadoNombre,
        municipioId: res.municipioId,
        municipio: res.municipioNombre,
        localidadId: res.localidadSugeridaId ?? null,
        localidad: coloniaSeleccionada?.ciudad || res.ciudad || res.municipioNombre,
        latitud: res.latitudSugerida ?? null,
        longitud: res.longitudSugerida ?? null,
        asentamientoId: coloniaSeleccionada ? coloniaSeleccionada.id : null,
        colonia: coloniaSeleccionada ? coloniaSeleccionada.nombre : "",
      });
    } catch {
      if (seq !== requestSeqRef.current) return;

      setColoniasSepomex([]);
      setModoManual(true);
      setAvisoCp("El código postal no está disponible. Comuníquese con servicio al cliente.");
      onCoberturaDetectada?.(null);

      const actual = valueRef.current;
      onChange({
        ...actual,
        codigoPostal: cpCincoDigitos,
        asentamientoId: null,
        localidadId: null,
        estadoId: null,
        municipioId: null,
        latitud: null,
        longitud: null,
      });
    } finally {
      if (seq === requestSeqRef.current) {
        setConsultandoCp(false);
      }
    }
  };

  const handleCodigoPostalChange = (raw: string) => {
    const limpio = raw.replace(/\D/g, "").slice(0, 5);

    if (limpio.length < 5) {
      requestSeqRef.current++;
      ultimoCpConsultadoRef.current = "";
      setConsultandoCp(false);
      setColoniasSepomex([]);
      setModoManual(false);
      setAvisoCp(null);
      onCoberturaDetectada?.(null);

      onChange({
        ...value,
        codigoPostal: limpio,
        asentamientoId: null,
        localidadId: null,
        estadoId: null,
        municipioId: null,
        estado: "",
        municipio: "",
        localidad: "",
        colonia: "",
        latitud: null,
        longitud: null,
      });
      return;
    }

    onChange({
      ...value,
      codigoPostal: limpio,
    });

    if (limpio !== ultimoCpConsultadoRef.current) {
      void consultarCatalogoPorCp(limpio);
    }
  };

  const handleSeleccionColonia = (valorSelect: string) => {
    if (valorSelect === "__manual__") {
      setModoManual(true);
      onChange({
        ...value,
        asentamientoId: null,
        colonia: "",
      });
      return;
    }

    const idNum = Number(valorSelect);
    const encontrada = coloniasSepomex.find((c) => c.id === idNum);
    if (!encontrada) {
      onChange({
        ...value,
        asentamientoId: null,
        colonia: "",
      });
      return;
    }

    onChange({
      ...value,
      asentamientoId: encontrada.id,
      colonia: encontrada.nombre,
      localidad: encontrada.ciudad || value.localidad || value.municipio || "",
    });
  };

  const volverACatalogoSepomex = () => {
    if (coloniasSepomex.length === 0) return;
    setModoManual(false);
    const primera = coloniasSepomex.length === 1 ? coloniasSepomex[0] : null;
    onChange({
      ...value,
      asentamientoId: primera ? primera.id : null,
      colonia: primera ? primera.nombre : "",
    });
  };

  const cpCompleto = (value.codigoPostal || "").replace(/\D/g, "").length === 5;
  const bloqueadoPorCatalogo = cpCompleto && coloniasSepomex.length > 0 && !modoManual;

  return (
    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0B2D4A]">
            <MapPin className="w-4 h-4 text-[#D64545] shrink-0" />
            <span>{titulo}</span>
          </div>
          {subtitulo && (
            <p className="text-[11.5px] text-slate-500 mt-0.5">{subtitulo}</p>
          )}
        </div>
      </div>

      {avisoCp && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{avisoCp}</span>
        </div>
      )}

      <div className="cc-form-grid !mb-0">
        <div className="cc-field">
          <label htmlFor={`${idPrefix}-cp`}>Código Postal (5 dígitos) *</label>
          <div className="relative">
            <input
              id={`${idPrefix}-cp`}
              type="text"
              inputMode="numeric"
              disabled={disabled}
              value={value.codigoPostal ?? ""}
              onKeyDown={(e) => bloquearTeclasNoNumericas(e, false)}
              onChange={(e) => handleCodigoPostalChange(e.target.value)}
              placeholder="Ej. 80000, 06600, 44100"
              className="!pr-9 font-mono font-bold tracking-wider"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="cc-field">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`${idPrefix}-colonia`}>Colonia / Asentamiento *</label>
            {coloniasSepomex.length > 0 && modoManual && (
              <button
                type="button"
                onClick={volverACatalogoSepomex}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B2D4A] hover:underline cursor-pointer"
              >
                <ListFilter className="w-3 h-3" />
                <span>Usar lista de colonias</span>
              </button>
            )}
            {coloniasSepomex.length > 0 && !modoManual && (
              <button
                type="button"
                onClick={() => handleSeleccionColonia("__manual__")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#0B2D4A] cursor-pointer"
                title="Capturar otra colonia manualmente"
              >
                <Edit3 className="w-3 h-3" />
                <span>Otra</span>
              </button>
            )}
          </div>

          {coloniasSepomex.length > 0 && !modoManual ? (
            <select
              id={`${idPrefix}-colonia`}
              disabled={disabled || consultandoCp}
              value={value.asentamientoId ? String(value.asentamientoId) : ""}
              onChange={(e) => handleSeleccionColonia(e.target.value)}
            >
              <option value="">
                {coloniasSepomex.length === 1
                  ? "Selecciona la colonia..."
                  : `Selecciona colonia (${coloniasSepomex.length} disponibles)...`}
              </option>
              {coloniasSepomex.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.nombre} ({col.tipoAsentamiento})
                </option>
              ))}
              <option value="__manual__">Otra colonia (capturar manualmente)...</option>
            </select>
          ) : (
            <input
              id={`${idPrefix}-colonia`}
              type="text"
              disabled={disabled || (!cpCompleto && !modoManual)}
              value={value.colonia ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  asentamientoId: null,
                  colonia: e.target.value,
                })
              }
              placeholder={
                cpCompleto
                  ? "Nombre de la colonia o fraccionamiento"
                  : "Ingresa primero los 5 dígitos del C.P."
              }
            />
          )}
        </div>

        <div className="cc-field">
          <label htmlFor={`${idPrefix}-estado`}>Estado *</label>
          <input
            id={`${idPrefix}-estado`}
            type="text"
            disabled={disabled}
            readOnly={bloqueadoPorCatalogo}
            value={value.estado ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                estado: e.target.value,
              })
            }
            placeholder={bloqueadoPorCatalogo ? "" : "Autocompletado por C.P."}
            className={
              bloqueadoPorCatalogo
                ? "!bg-slate-100 !text-slate-700 font-semibold cursor-default"
                : ""
            }
          />
        </div>

        <div className="cc-field">
          <label htmlFor={`${idPrefix}-municipio`}>Municipio / Alcaldía *</label>
          <input
            id={`${idPrefix}-municipio`}
            type="text"
            disabled={disabled}
            readOnly={bloqueadoPorCatalogo}
            value={value.municipio ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                municipio: e.target.value,
              })
            }
            placeholder={bloqueadoPorCatalogo ? "" : "Autocompletado por C.P."}
            className={
              bloqueadoPorCatalogo
                ? "!bg-slate-100 !text-slate-700 font-semibold cursor-default"
                : ""
            }
          />
        </div>

        <div className="cc-field cc-field--wide">
          <label htmlFor={`${idPrefix}-calle`}>Calle / Avenida / Vialidad *</label>
          <input
            id={`${idPrefix}-calle`}
            type="text"
            maxLength={200}
            disabled={disabled}
            value={value.calle}
            onChange={(e) =>
              onChange({
                ...value,
                calle: e.target.value,
              })
            }
            placeholder="Ej. Av. Álvaro Obregón, Calz. Heroico Colegio Militar..."
          />
        </div>

        <div className="cc-field">
          <label htmlFor={`${idPrefix}-num-ext`}>Número Exterior (opcional / S/N)</label>
          <input
            id={`${idPrefix}-num-ext`}
            type="text"
            maxLength={30}
            disabled={disabled}
            value={value.numeroExterior}
            onChange={(e) =>
              onChange({
                ...value,
                numeroExterior: e.target.value,
              })
            }
            placeholder="Ej. 1420, S/N o dejar vacío"
          />
        </div>

        <div className="cc-field">
          <label htmlFor={`${idPrefix}-num-int`}>Número Interior / Bodega (opcional)</label>
          <input
            id={`${idPrefix}-num-int`}
            type="text"
            maxLength={30}
            disabled={disabled}
            value={value.numeroInterior ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                numeroInterior: e.target.value,
              })
            }
            placeholder="Ej. Local 4, Piso 2, Bodega B"
          />
        </div>

        <div className="cc-field">
          <label htmlFor={`${idPrefix}-entre-calles`}>Entre calles *</label>
          <input
            id={`${idPrefix}-entre-calles`}
            type="text"
            maxLength={200}
            required
            disabled={disabled}
            value={value.entreCalles ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                entreCalles: e.target.value,
              })
            }
            placeholder="Ej. Entre Juárez e Hidalgo"
          />
        </div>

        <div className="cc-field">
          <label htmlFor={`${idPrefix}-referencias`}>Referencias de entrega *</label>
          <input
            id={`${idPrefix}-referencias`}
            type="text"
            maxLength={350}
            required
            disabled={disabled}
            value={value.referencias ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                referencias: e.target.value,
              })
            }
            placeholder="Fachada blanca, portón gris, frente a parque..."
          />
        </div>
      </div>
    </div>
  );
}
