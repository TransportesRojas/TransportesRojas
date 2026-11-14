import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import "../estilos/cruds.css";
import { fetchApi } from "../../../services/api";
import { useToast } from "../../../components/Toast";
import { extraerMensajeErrorApi } from "../../../utils/errorMessages";
import { hasPermissionOrRole } from "../../../utils/auth";
import {
  limpiarNombreSinNumeros,
  limpiarSoloDigitos,
  validarNombresPersona,
} from "../../../utils/inputValidation";
import {
  type Cliente,
  type FormData,
  type SortDir,
  type SortCol,
  type Filters,
  FORM_VACIO,
  FILTERS_VACIO,
  OPCIONES_PAGINA,
} from "./types";
import { ClienteModalForm } from "./ClienteModalForm";
import { ClienteModalDelete } from "./ClienteModalDelete";
import RegistroClientes from "../../auth/Clientes/Registrar/Registro_Clientes.tsx";
import {
  TablaGenerica,
  type ColumnDef,
  type FilterDef,
  type ActionDef,
} from "../../../components/TablaGenerica";

function exportarExcel(datos: Cliente[]) {
  const cols = [
    "ID",
    "Nombre",
    "Ap. Paterno",
    "Ap. Materno",
    "Teléfono",
    "Email",
    "Usuario ID",
    "Activo",
  ];
  const rows = datos.map((c) => [
    c.id,
    c.nombre,
    c.apellidoPaterno,
    c.apellidoMaterno,
    c.telefono,
    c.email,
    c.usuarioId ?? "",
    c.activo ? "Sí" : "No",
  ]);
  const csv = [cols, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clientes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CrudClientes() {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [, setLoading] = useState(false);

  const cargarClientes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi("/Cliente");
      setClientes(data);
    } catch (error) {
      console.error("Error al cargar clientes", error);
      toast.error("Error al cargar la lista de clientes.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<Filters>(FILTERS_VACIO);
  const [busquedaGlobal, setBusquedaGlobal] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState<Cliente | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const filtered = clientes.filter((c) => {
    if (busquedaGlobal.trim()) {
      const q = busquedaGlobal.toLowerCase();
      const matchGlobal = [
        c.id,
        c.nombre,
        c.apellidoPaterno,
        c.apellidoMaterno,
        c.telefono,
        c.email,
        c.usuarioId,
      ].some((val) => String(val ?? "").toLowerCase().includes(q));
      if (!matchGlobal) return false;
    }

    if (filters.activo === "si" && !c.activo) return false;
    if (filters.activo === "no" && c.activo) return false;

    const match = (v: string | number | null, f: string) =>
      !f ||
      String(v ?? "")
        .toLowerCase()
        .includes(f.toLowerCase());

    return (
      match(c.id, filters.id) &&
      match(c.nombre, filters.nombre) &&
      match(c.apellidoPaterno, filters.apellidoPaterno) &&
      match(c.apellidoMaterno, filters.apellidoMaterno) &&
      match(c.telefono, filters.telefono) &&
      match(c.email, filters.email) &&
      match(c.usuarioId, filters.usuarioId)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortCol) {
      const av = a[sortCol],
        bv = b[sortCol];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    }
    if (a.activo !== b.activo) {
      return a.activo ? -1 : 1;
    }
    return a.id - b.id;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice(page * pageSize, page * pageSize + pageSize);

  useEffect(() => {
    const algunModalAbierto = modalAbierto || creandoCliente || Boolean(confirmando);
    if (!algunModalAbierto) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [modalAbierto, creandoCliente, confirmando]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalAbierto(false);
        setConfirmando(null);
        setConfirmInput("");
        setCreandoCliente(false);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const cambiarPageSize = useCallback((v: number) => {
    setPageSize(v);
    setPage(0);
  }, []);

  const onFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFilters((prev) => ({ ...prev, [name]: value }));
      setPage(0);
    },
    [],
  );

  const handleSort = useCallback(
    (col: string) => {
      const c = col as keyof Cliente;
      setSortDir((prev) =>
        sortCol === c ? (prev === "asc" ? "desc" : "asc") : "asc",
      );
      setSortCol(c);
      setPage(0);
    },
    [sortCol],
  );

  const abrirAgregar = useCallback(() => {
    setCreandoCliente(true);
  }, []);

  const abrirEditar = useCallback((c: Cliente) => {
    setEditando(c);
    setForm({
      usuarioId: c.usuarioId,
      nombre: c.nombre,
      apellidoPaterno: c.apellidoPaterno,
      apellidoMaterno: c.apellidoMaterno,
      telefono: c.telefono,
      email: c.email,
      activo: c.activo,
      motivoEdicion: c.motivoEdicion ?? "",
    });
    setModalAbierto(true);
  }, []);

  const guardar = useCallback(async () => {
    if (guardando) return;
    const errorNombres = validarNombresPersona(form);
    if (errorNombres) {
      toast.warning(errorNombres);
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        ...form,
        nombre: form.nombre.trim(),
        apellidoPaterno: form.apellidoPaterno.trim(),
        apellidoMaterno: form.apellidoMaterno?.trim() || null,
        email: form.email.trim(),
      };
      if (editando) {
        const actualizado = await fetchApi(`/Cliente/${editando.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setClientes((prev) =>
          prev.map((c) => (c.id === editando.id ? actualizado : c)),
        );
        toast.success(`Cliente "${form.nombre} ${form.apellidoPaterno}" actualizado.`);
      } else {
        const nuevo = await fetchApi("/Cliente", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setClientes((prev) => [...prev, nuevo]);
        toast.success(`Cliente "${form.nombre} ${form.apellidoPaterno}" registrado.`);
      }
      setModalAbierto(false);
    } catch (error: any) {
      console.error("Error al guardar cliente", error);
      toast.error(extraerMensajeErrorApi(error, "Error al procesar el cliente."));
    } finally {
      setGuardando(false);
    }
  }, [editando, form, guardando, toast]);

  const abrirConfirmar = useCallback((c: Cliente) => {
    setConfirmInput("");
    setConfirmando(c);
  }, []);

  const eliminar = useCallback(async () => {
    if (!confirmando || eliminando) return;
    setEliminando(true);
    try {
      await fetchApi(`/Cliente/${confirmando.id}`, { method: "DELETE" });
      setClientes((prev) =>
        prev.map((c) => (c.id === confirmando.id ? { ...c, activo: false } : c)),
      );
      toast.info(`Cliente "${confirmando.nombre} ${confirmando.apellidoPaterno}" dado de baja.`);
      setConfirmando(null);
    } catch (error: any) {
      console.error("Error al eliminar cliente", error);
      toast.error(extraerMensajeErrorApi(error, "Error al dar de baja al cliente."));
    } finally {
      setEliminando(false);
    }
  }, [confirmando, eliminando, toast]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "telefono"
            ? limpiarSoloDigitos(value, 10)
            : ["nombre", "apellidoPaterno", "apellidoMaterno"].includes(name)
              ? limpiarNombreSinNumeros(value)
              : name === "usuarioId"
                ? value === ""
                  ? null
                  : Number(limpiarSoloDigitos(value))
                : value,
    }));
  };

  const columns: ColumnDef<Cliente>[] = [
    { key: "nombre", label: "Nombre" },
    { key: "apellidoPaterno", label: "Ap. Paterno" },
    { key: "apellidoMaterno", label: "Ap. Materno" },
    { key: "telefono", label: "Teléfono" },
    { key: "email", label: "Email" },
    {
      key: "activo",
      label: "Estado",
      render: (c) => (
        <span
          className={`cc-badge-status ${c.activo ? "cc-badge-status--on" : "cc-badge-status--off"}`}
        >
          {c.activo ? "Activo" : "Inactivo"}
        </span>
      ),
    },
  ];

  const filterDefs: FilterDef[] = [
    {
      key: "activo",
      label: "Estado",
      type: "select",
      options: [
        { value: "si", label: "Activos" },
        { value: "", label: "Todos" },
        { value: "no", label: "Inactivos" },
      ],
    },
  ];

  const rolesEdicion = ["Personal administrativo", "Jefe"];
  const puedeCrear = hasPermissionOrRole("cliente.registrar", rolesEdicion);
  const puedeEditar = hasPermissionOrRole("cliente.editar", rolesEdicion);
  const puedeEliminar = hasPermissionOrRole("cliente.desactivar", rolesEdicion);

  const actions: ActionDef<Cliente>[] = [
    ...(puedeEditar
      ? [
        {
          label: "Editar",
          icon: <Pencil size={14} />,
          className: "cc-dropdown-item--edit",
          onClick: abrirEditar,
        },
      ]
      : []),
    ...(puedeEliminar
      ? [
        {
          label: "Dar de baja",
          icon: <Trash2 size={14} />,
          className: "cc-dropdown-item--delete",
          onClick: abrirConfirmar,
        },
      ]
      : []),
  ];

  return (
    <div className="cc-page">
      <div className="cc-header">
        <div className="cc-title-group">
          <h1 className="cc-title">Clientes</h1>
        </div>
        {puedeCrear && (
          <button
            id="btn-agregar-cliente"
            className="cc-btn-add"
            onClick={abrirAgregar}
          >
            <Plus size={17} strokeWidth={2.5} />
            <span>Nuevo cliente</span>
          </button>
        )}
      </div>

      <TablaGenerica<Cliente>
        data={paginated}
        columns={columns}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        filters={filters as unknown as Record<string, string>}
        filterDefs={filterDefs}
        onFilterChange={onFilterChange}
        actions={actions}
        idAccessor={(c) => c.id}
        busquedaGlobal={busquedaGlobal}
        onBusquedaGlobalChange={(val) => {
          setBusquedaGlobal(val);
          setPage(0);
        }}
        onLimpiarFiltros={() => {
          setFilters({ ...FILTERS_VACIO, activo: "" });
          setBusquedaGlobal("");
          setPage(0);
        }}
        placeholderGlobal="Buscar clientes por nombre, apellidos, teléfono, correo..."
      />

      <div className="cc-footer-bar">
        <button
          id="btn-exportar-excel"
          className="cc-btn-excel"
          onClick={() => exportarExcel(sorted)}
          title="Exportar a Excel"
        >
          <FileSpreadsheet size={16} />
          <span>Excel</span>
        </button>
        <div className="cc-pagesize-wrap">
          <label htmlFor="sel-pagesize" className="cc-pagesize-label">
            Mostrar
          </label>
          <select
            id="sel-pagesize"
            className="cc-pagesize-select"
            value={pageSize}
            onChange={(e) => cambiarPageSize(Number(e.target.value))}
          >
            {OPCIONES_PAGINA.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="cc-pagesize-label">por página</span>
        </div>
        <div className="cc-pagination">
          <button
            id="btn-pagina-anterior"
            className="cc-btn-page"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Página anterior"
          >
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              id={`btn-pagina-${i + 1}`}
              className={`cc-btn-page${page === i ? " cc-btn-page--active" : ""}`}
              onClick={() => setPage(i)}
              aria-current={page === i ? "page" : undefined}
            >
              {i + 1}
            </button>
          ))}
          <button
            id="btn-pagina-siguiente"
            className="cc-btn-page"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            aria-label="Página siguiente"
          >
            <ChevronRight size={15} />
          </button>
          <span className="cc-pagination-info">
            {sorted.length === 0
              ? "0-0"
              : `${page * pageSize + 1}-${Math.min((page + 1) * pageSize, sorted.length)}`}{" "}
            de {sorted.length}
          </span>
        </div>
      </div>

      <ClienteModalForm
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={(e) => {
          e.preventDefault();
          guardar();
        }}
        onChange={onChange}
        form={form}
        editando={editando}
        guardando={guardando}
      />

      <ClienteModalDelete
        confirmando={confirmando}
        onClose={() => {
          setConfirmando(null);
          setConfirmInput("");
        }}
        onConfirm={eliminar}
        confirmInput={confirmInput}
        setConfirmInput={setConfirmInput}
        eliminando={eliminando}
      />

      {creandoCliente &&
        createPortal(
          <div
            className="cc-backdrop"
            role="dialog"
            aria-modal="true"
            style={{
              zIndex: 1100,
              overflowY: "auto",
              padding: "2rem 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                maxWidth: "580px",
                width: "100%",
                margin: "auto",
                maxHeight: "92vh",
                overflowY: "auto",
                borderRadius: "1.5rem",
              }}
            >
              <RegistroClientes
                dentroDeCrud={true}
                onVolver={() => setCreandoCliente(false)}
                onClienteCreado={(nuevo) => {
                  const nombreCompleto = `${nuevo?.nombre || ""} ${nuevo?.apellidoPaterno || ""}`.trim();
                  toast.success(
                    nombreCompleto
                      ? `Cliente "${nombreCompleto}" registrado. Se envió el correo para su activación.`
                      : "Cliente registrado. Se envió el correo para su activación."
                  );
                  setCreandoCliente(false);
                  cargarClientes();
                }}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
