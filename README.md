# 🚛 Transportes Rojas — Portal Interno y Logística

Sistema integral de gestión logística, documentación de guías, asignación y optimización de rutas terrestres, verificación de entrega mediante PIN criptográfico y portal de autoservicio para clientes y colaboradores.

---

## ⚡ Inicio Rápido

Para desplegar y correr este proyecto en tu máquina local con Docker, consulta la guía completa:

👉 **[GUÍA COMPLETA DE DESPLIEGUE, DOCKER Y BASE DE DATOS](docs/guias/GUIA_DESPLIEGUE_Y_DOCKER.md)**

### Pasos esenciales:
1. **Levantar base de datos en Docker:**
   ```bash
   docker compose up -d
   ```
2. **Ejecutar scripts SQL en orden:**
   - `database/BASE DE DATOS TRANSPORTES.txt`
   - `database/importar_catalogos_inegi_sepomex.sql`
   - `database/insertar_datos_completos_bd.sql`
3. **Iniciar Backend (.NET 10 / ASP.NET Core):**
   ```bash
   cd Backend
   # Copiar archivo de configuración local
   cp appsettings.Development.json.example appsettings.Development.json
   dotnet restore
   dotnet run
   ```
4. **Iniciar Frontend (React + Vite + TypeScript):**
   ```bash
   cd Frontend
   npm install
   npm run dev
   ```

---

## 📁 Estructura del Repositorio

```text
TransportesRojas-1/
├── Backend/                 # Web API ASP.NET Core (.NET 10) y EF Core
├── Frontend/                # SPA React 19 + TypeScript + Vite + Tailwind
├── database/                # Scripts SQL (DDL, catálogos, seeds y limpieza)
│   ├── BASE DE DATOS TRANSPORTES.txt
│   ├── importar_catalogos_inegi_sepomex.sql
│   ├── insertar_datos_completos_bd.sql
│   ├── insertar_empleados_por_puesto.sql
│   ├── datos_prueba_cambios_casos_uso.sql
│   ├── eliminar_datos_insertados.sql
│   ├── importar_catalogos.py
│   └── encabezados.xlsx
├── docs/                    # Documentación, especificaciones y guías
│   ├── guias/               # Guías de despliegue, BD, catálogos y metodologías QA
│   └── planes/              # Auditoría de casos de uso, permisos, rutas y pruebas
├── pruebas/                 # Suites de pruebas automatizadas (xUnit y Playwright)
├── docker-compose.yml       # Orquestador del contenedor PostgreSQL
├── global.json              # Versión fija de .NET SDK
└── README.md                # Portada e inicio rápido
```

---

## 🛠️ Tecnologías Principales
- **Backend:** .NET 10 / ASP.NET Core Web API, Entity Framework Core, Npgsql, FluentValidation, JWT Bearer.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React.
- **Base de Datos:** PostgreSQL 17 / 16 en contenedor Docker, extensión `pgcrypto`.
- **Rutas y Mapas:** OpenStreetMap, OSRM (Open Source Routing Machine) y cálculo algorítmico vial Dijkstra.
