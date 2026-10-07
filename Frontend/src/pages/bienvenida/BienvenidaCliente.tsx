import { useState, type FormEvent } from "react";
import { Plus, LogOut, Search, AlertCircle, Package, Truck, Headset, RotateCcw } from "lucide-react";
import logoCircular from "../../assets/logocircular.webp";
import "./bienvenida-cliente.css";
const COLOR_ROJO = "#D64545";
const COLOR_VERDE = "#16A34A";
const TIEMPO_BUSQUEDA = 1400;
interface EventoEnvio {
  lugar: string;
  detalle: string;
  estado: "done" | "active" | "pending";
}
interface ResultadoRastreo {
  guia: string;
  estatusGeneral: string;
  estatusTipo: "ruta" | "entregado";
  eventos: EventoEnvio[];
  entregaEstimada: string;
}
const ENVIOS_MOCK: Record<string, ResultadoRastreo> = {
  "TR-88213845": {
    guia: "TR-88213845",
    estatusGeneral: "En ruta",
    estatusTipo: "ruta",
    eventos: [
      { lugar: "Sucursal Culiacán", detalle: "Recolectado", estado: "done" },
      { lugar: "Centro de distribución Guadalajara", detalle: "Completado", estado: "done" },
      { lugar: "En ruta hacia CDMX", detalle: "En camino", estado: "active" },
      { lugar: "Entrega, Coyoacán", detalle: "Pendiente", estado: "pending" },
    ],
    entregaEstimada: "Hoy, 6:40 pm",
  },
  "TR-55109234": {
    guia: "TR-55109234",
    estatusGeneral: "Entregado",
    estatusTipo: "entregado",
    eventos: [
      { lugar: "Sucursal Culiacán", detalle: "Recolectado", estado: "done" },
      { lugar: "Centro de distribución Monterrey", detalle: "Completado", estado: "done" },
      { lugar: "En ruta hacia San Pedro", detalle: "Completado", estado: "done" },
      { lugar: "Entregado en destino", detalle: "Recibido por: María López", estado: "done" },
    ],
    entregaEstimada: "Entregado el 25 Sep, 2:15 pm",
  },
  "TR-77432100": {
    guia: "TR-77432100",
    estatusGeneral: "En ruta",
    estatusTipo: "ruta",
    eventos: [
      { lugar: "Sucursal Mazatlán", detalle: "Recolectado", estado: "done" },
      { lugar: "Centro de distribución Culiacán", detalle: "En proceso", estado: "active" },
      { lugar: "En ruta hacia Hermosillo", detalle: "Pendiente", estado: "pending" },
    ],
    entregaEstimada: "Mañana, 11:00 am",
  },
};
/* unused interface BienvenidaClienteProps removed */

import { useNavigate } from "react-router-dom";

export default function BienvenidaCliente() {
  const navigate = useNavigate();
  const [guiaBusqueda, setGuiaBusqueda] = useState("");
  const [resultado, setResultado] = useState<ResultadoRastreo | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [haBuscado, setHaBuscado] = useState(false);

  const userJson = localStorage.getItem("user");
  const user = userJson ? JSON.parse(userJson) : null;
  const nombreCliente = user?.nombreCompleto || "Cliente";

  const onCerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login-clientes");
  };

  const iniciales = nombreCliente
    .split(" ")
    .filter(Boolean)
    .map((p: string) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function buscarGuia(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setResultado(null);

    const guia = guiaBusqueda.trim().toUpperCase();
    if (!guia) {
      setError("Ingresa un número de guía para rastrear.");
      return;
    }

    setBuscando(true);
    setHaBuscado(true);

    await new Promise((r) => setTimeout(r, TIEMPO_BUSQUEDA));

    const encontrado = ENVIOS_MOCK[guia] ?? null;
    if (!encontrado) {
      setError(
        `No encontramos envíos con la guía "${guia}". Verifica el número e intenta de nuevo.`
      );
    } else {
      setResultado(encontrado);
    }

    setBuscando(false);
  }

  return (
    <div className="bc-page">
      <FondoDecorativo />
      <nav className="bc-navbar">
        <div className="bc-nav-brand">
          <img
            src={logoCircular}
            alt="Transportes Rojas"
            className="bc-logo-circular"
            draggable={false}
          />
          <span>Transportes Rojas</span>
        </div>
        <ul className="bc-nav-links">
          <li><a href="#servicios">Servicios</a></li>
          <li><a href="#como-funciona">Cómo funciona</a></li>
          <li><a href="#nosotros">Nosotros</a></li>
        </ul>
        <div className="bc-nav-user">
          <button
            type="button"
            className="bc-btn-nuevo-envio"
            title="Crear nuevo envío"
            onClick={() => alert("Próximamente: Funcionalidad para crear un nuevo envío.")}
          >
            <Plus size={16} strokeWidth={2.5} />
            Nuevo envío
          </button>
          <div className="bc-nav-avatar">{iniciales}</div>
          <span className="bc-nav-username">{nombreCliente}</span>
          <button
            type="button"
            className="bc-btn-logout"
            onClick={onCerrarSesion}
            title="Cerrar sesión"
          >
            <LogOut size={16} strokeWidth={2} />
            Salir
          </button>
        </div>
      </nav>
      <main className="bc-content">
        <div className="bc-hero">
          <h1>
            Cada envío,{" "}
            <span>rastreado hasta la puerta</span>
          </h1>
          <p>
            Entregas de última milla en todo México, con ubicación en vivo y
            confirmación segura para quien recibe.
          </p>
        </div>
        <div className="bc-main-grid">
          <div className="bc-card" id="rastreo">
            <h2 className="bc-card-title">
              <Search size={22} strokeWidth={2} />
              Número de guía
            </h2>
            <p className="bc-track-header">
              Ingresa tu número de guía para consultar el estado de tu envío.
            </p>
            <form className="bc-track-form" onSubmit={buscarGuia} noValidate>
              <input
                id="input-guia"
                className="bc-track-input"
                type="text"
                placeholder="TR-88213845"
                value={guiaBusqueda}
                onChange={(e) => setGuiaBusqueda(e.target.value)}
                autoComplete="off"
                disabled={buscando}
              />
              <button
                id="btn-rastrear"
                className="bc-btn-track"
                type="submit"
                disabled={buscando}
              >
                {buscando ? (
                  <>
                    <span className="bc-spinner" aria-hidden="true" />
                    Buscando…
                  </>
                ) : (
                  "Rastrear"
                )}
              </button>
            </form>
            {error && (
              <div className="bc-track-error">
                <AlertCircle size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}
            {resultado && <PanelResultado resultado={resultado} />}
            {!haBuscado && !resultado && !error && (
              <div className="bc-empty">
                <Package size={48} strokeWidth={1.5} />
                <p>
                  Escribe un número de guía para comenzar a rastrear tu envío.
                </p>
              </div>
            )}
          </div>
          <div className="bc-card bc-hero-panel">
            <p className="bc-hero-tagline">
              Bienvenido,
              <br />
              <em>{nombreCliente}</em>
            </p>
            <p className="bc-hero-desc">
              Desde aquí puedes consultar el estado de tus envíos en tiempo
              real. Solo necesitas tu número de guía para ver toda la
              información de tu paquete: ubicación actual, historial de
              movimientos y hora estimada de entrega.
            </p>
            <p className="bc-hero-desc" style={{ marginBottom: 0 }}>
              <strong style={{ color: "var(--bc-text-strong)" }}>
                Guías de ejemplo para probar:
              </strong>
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "10px 0 0",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {Object.keys(ENVIOS_MOCK).map((guia) => (
                <li key={guia}>
                  <button
                    type="button"
                    onClick={() => setGuiaBusqueda(guia)}
                    style={{
                      background: "rgba(214,69,69,0.08)",
                      border: "1px solid rgba(214,69,69,0.2)",
                      borderRadius: 8,
                      padding: "8px 14px",
                      color: "#ff9b9b",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      fontFamily: "monospace",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      width: "100%",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(214,69,69,0.15)";
                      e.currentTarget.style.borderColor = "rgba(214,69,69,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(214,69,69,0.08)";
                      e.currentTarget.style.borderColor = "rgba(214,69,69,0.2)";
                    }}
                  >
                    {guia}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
      <section className="bc-stats-bar" aria-label="Estadísticas de servicio">
        <div className="bc-stats-inner">
          <div className="bc-stat">
            <span className="bc-stat-number">32</span>
            <span className="bc-stat-label">estados con cobertura</span>
          </div>
          <div className="bc-stat-divider" />
          <div className="bc-stat">
            <span className="bc-stat-number">96%</span>
            <span className="bc-stat-label">entregas a tiempo</span>
          </div>
          <div className="bc-stat-divider" />
          <div className="bc-stat">
            <span className="bc-stat-number">100%</span>
            <span className="bc-stat-label">con código de seguridad</span>
          </div>
        </div>
      </section>
      <section className="bc-section" id="servicios">
        <div className="bc-section-inner">
          <h2 className="bc-section-title">Lo que hacemos</h2>
          <div className="bc-services-grid">
            <div className="bc-service-card">
              <div className="bc-service-icon">
                <Truck size={28} strokeWidth={1.8} />
              </div>
              <h3 className="bc-service-name">Envíos nacionales</h3>
              <p className="bc-service-desc">
                Recepción, traslado y entrega domicilio a domicilio en todo México.
              </p>
            </div>
            <div className="bc-service-card bc-service-card--accent">
              <div className="bc-service-icon">
                <Headset size={28} strokeWidth={1.8} />
              </div>
              <h3 className="bc-service-name">Atención al cliente</h3>
              <p className="bc-service-desc">
                Soporte por call center para estatus, reprogramaciones y quejas.
              </p>
            </div>
            <div className="bc-service-card">
              <div className="bc-service-icon">
                <RotateCcw size={28} strokeWidth={1.8} />
              </div>
              <h3 className="bc-service-name">Devoluciones</h3>
              <p className="bc-service-desc">
                Retorno y evaluación de mercancía no entregada o rechazada.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="bc-section bc-section--light" id="como-funciona">
        <div className="bc-section-inner">
          <h2 className="bc-section-title bc-section-title--dark">Cómo funciona</h2>
          <div className="bc-steps-grid">
            {[
              { num: 1, titulo: "Registras el envío", desc: "Documenta el paquete y agenda una cita en sucursal." },
              { num: 2, titulo: "Se planea la ruta", desc: "El sistema optimiza tiempo, distancia y combustible." },
              { num: 3, titulo: "Sigues la entrega", desc: "Ubicación en vivo del chofer hasta la puerta del destinatario." },
              { num: 4, titulo: "Confirmas la recepción", desc: "Código de seguridad y evidencia fotográfica cierran el envío." },
            ].map((paso) => (
              <div key={paso.num} className="bc-step-card">
                <span className="bc-step-num">{paso.num}</span>
                <h3 className="bc-step-title">{paso.titulo}</h3>
                <p className="bc-step-desc">{paso.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer className="bc-footer-full">
        <div className="bc-footer-inner">
          <div className="bc-footer-col bc-footer-brand">
            <div className="bc-footer-logo">
              <img src={logoCircular} alt="" className="bc-logo-circular bc-logo-circular--sm" draggable={false} />
              <span>Transportes Rojas</span>
            </div>
            <p className="bc-footer-tagline">Última milla, a nivel nacional. Conéctamos.</p>
          </div>
          <div className="bc-footer-col">
            <h4 className="bc-footer-heading">Servicios</h4>
            <ul className="bc-footer-list">
              <li><a href="#">Envíos nacionales</a></li>
              <li><a href="#">Recolecciones</a></li>
              <li><a href="#">Devoluciones</a></li>
            </ul>
          </div>
          <div className="bc-footer-col">
            <h4 className="bc-footer-heading">Empresa</h4>
            <ul className="bc-footer-list">
              <li><a href="#">Nosotros</a></li>
              <li><a href="#">Sucursales</a></li>
              <li><a href="#">Trabaja con nosotros</a></li>
            </ul>
          </div>
          <div className="bc-footer-col">
            <h4 className="bc-footer-heading">Contacto</h4>
            <ul className="bc-footer-list">
              <li>01 800 000 0000</li>
              <li><a href="mailto:soporte@transportesrojas.mx">soporte@transportesrojas.mx</a></li>
            </ul>
          </div>
        </div>
        <div className="bc-footer-bottom">
          © {new Date().getFullYear()} Transportes Rojas · Culiacán, Sinaloa
        </div>
      </footer>
    </div>
  );
}
function PanelResultado({ resultado }: { resultado: ResultadoRastreo }) {
  return (
    <div className="bc-track-result">
      <div className="bc-track-result-header">
        <span className="bc-track-guia">{resultado.guia}</span>
        <span
          className={`bc-track-status-pill ${
            resultado.estatusTipo === "entregado"
              ? "bc-pill--entregado"
              : "bc-pill--ruta"
          }`}
        >
          {resultado.estatusTipo === "ruta" && <IconoPuntoVivo />}
          {resultado.estatusGeneral}
        </span>
      </div>
      <ul className="bc-timeline">
        {resultado.eventos.map((evento, i) => (
          <li key={i} className="bc-timeline-item">
            <span
              className={`bc-timeline-dot bc-dot--${evento.estado}`}
              aria-label={evento.estado}
            />
            <div className="bc-timeline-content">
              <p className="bc-timeline-place">{evento.lugar}</p>
              <span className="bc-timeline-detail">{evento.detalle}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="bc-track-eta">
        <span className="bc-track-eta-label">Entrega estimada</span>
        <span className="bc-track-eta-value">{resultado.entregaEstimada}</span>
      </div>
    </div>
  );
}
function FondoDecorativo() {
  return (
    <div className="bc-bg-deco" aria-hidden="true">
      <svg viewBox="0 0 1400 900" preserveAspectRatio="xMidYMid slice">
        <path
          d="M 60 820 C 320 700, 500 520, 720 460 S 1120 260, 1340 100"
          fill="none"
          stroke={COLOR_ROJO}
          strokeWidth="2.5"
          strokeDasharray="6 12"
          opacity="0.45"
        />
        <circle cx="60" cy="820" r="7" fill={COLOR_VERDE} opacity="0.75" />
        <g transform="translate(1340 100)" opacity="0.6">
          <path
            d="M0 -18 C-8 -18 -14 -12 -14 -4 C-14 6 0 20 0 20 C0 20 14 6 14 -4 C14 -12 8 -18 0 -18 Z"
            fill={COLOR_ROJO}
          />
          <circle cx="0" cy="-5" r="4" fill="#fff" />
        </g>
        <circle cx="720" cy="460" r="7" fill={COLOR_ROJO}>
          <animate
            attributeName="r"
            values="7;12;7"
            dur="2.4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="1;0.4;1"
            dur="2.4s"
            repeatCount="indefinite"
          />
        </circle>
        <g opacity="0.2" fill="#fff">
          <path d="M300 640 l18 -6 -4 18 z" />
          <path d="M980 320 l18 -6 -4 18 z" />
          <path d="M1100 550 l12 -4 -3 12 z" />
        </g>
      </svg>
    </div>
  );
}
function IconoPuntoVivo() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "currentColor",
        animation: "bc-pulse 1.5s ease infinite",
      }}
      aria-hidden="true"
    />
  );
}
