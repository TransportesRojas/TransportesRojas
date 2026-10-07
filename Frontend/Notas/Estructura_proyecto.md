# 📁 Estructura del Frontend y Flujo de Datos

Para mantener el proyecto ordenado y evitar código duplicado o desordenado, organizamos el código por tipo de archivo.

## 🔄 ¿Cómo viajan los datos? (En 5 pasos sencillos)

Imagina que la aplicación es un restaurante:

- `types/` (El contrato): Define cómo deben verse los datos (la forma del platillo).
- `services/` (El mesero): Va a la cocina (el backend en C#), pide la información por HTTP y la trae.
- `hooks/` (El ayudante de cocina): Recibe los datos del mesero, revisa si hubo error y avisa si aún se está cocinando (`isLoading`).
- `pages/` (La mesa servida): Junta todo lo necesario para esa vista y decide qué mostrar en pantalla.
- `components/` (Los cubiertos y platos): Las piezas visuales reutilizables donde se acomoda la información.

```text
Backend (C#)
     ⬇️ (Petición HTTP)
  services/   👉 Trae los datos de la API
     ⬇️
   hooks/     👉 Controla el estado (cargando, error, éxito)
     ⬇️
   pages/     👉 Ensambla la pantalla completa
     ⬇️
 components/  👉 Muestra la información visualmente
```

## 📂 ¿Qué debe ir en cada carpeta?

### `src/assets/` — Cosas visuales fijas

- Qué va aquí: Imágenes (`.png`, `.jpg`), íconos en `.svg`, fuentes personalizadas o estilos globales.
- Ejemplo: El logo de la empresa, el favicon, banners.
- ❌ No poner: Componentes o lógica de código.

### `src/types/` — Los contratos de datos

- Qué va aquí: Interfaces y tipos de TypeScript. Es el espejo de los DTOs y modelos que devuelve el backend en C#.
- Ejemplo: `UserDto.ts`, `ProductDto.ts`.
- 💡 Regla: Si C# manda `{ id: 1, nombre: "Laptop", precio: 15000 }`, aquí defines cómo se llaman esas variables para que el editor te avise si cometes un error al escribirlas.

### `src/services/` — Los mensajeros con C#

- Qué va aquí: El cliente de Axios/Fetch y las funciones que hacen llamadas a los endpoints (`GET`, `POST`, `PUT`, `DELETE`).
- Ejemplo: `apiClient.ts` (con la URL del backend y el token JWT), `productService.ts`.
- ❌ No poner: Estados de React (`useState`), alertas o diseño visual. Solo peticiones HTTP.

### `src/hooks/` — El cerebro y la lógica repetitiva

- Qué va aquí: Custom hooks (funciones que empiezan con `use...`). Manejan la memoria y el ciclo de vida de los datos.
- Ejemplo: `useProducts.ts` (llama al servicio y guarda los datos en memoria mientras avisa si está cargando), `useDebounce.ts`.
- 💡 Regla: Si una pantalla necesita saber si los datos "están cargando", "dieron error" o "ya llegaron", esa lógica va aquí.

### `src/components/` — Piezas de Lego visuales

- Qué va aquí: Botones, modales, barras de navegación o tablas reutilizables.
  - `ui/`: Componentes genéricos sin reglas de negocio (`Button.tsx`, `Input.tsx`, `Modal.tsx`).
  - `layout/`: Estructura general fija (`Navbar.tsx`, `Sidebar.tsx`, `Footer.tsx`).
- 💡 Regla: Un componente idealmente no sabe de dónde vienen los datos, solo recibe información por props y la pinta bonito.

### `src/pages/` — Las pantallas completas del sistema

- Qué va aquí: Cada pantalla que tiene su propia URL en el navegador.
- Ejemplo: `LoginPage.tsx` (`/login`), `ProductsPage.tsx` (`/productos`), `NotFoundPage.tsx` (error 404).
- 💡 Regla: Su trabajo es únicamente ensamblar. Llama a un hook para traer los datos y coloca los components necesarios dentro de la vista.

### `src/routes/` — El mapa del sitio

- Qué va aquí: La configuración de `react-router-dom` (`AppRoutes.tsx`).
- Ejemplo: Define qué página se muestra cuando alguien entra a `/`, `/login` o `/productos`.

### `src/contexts/` — Información global que todos necesitan

- Qué va aquí: Datos que no pertenecen a una sola pantalla, sino a toda la app al mismo tiempo.
- Ejemplo: `AuthContext.tsx` (saber en cualquier momento quién está conectado y cuál es su token), `ThemeContext.tsx` (modo oscuro/claro).

### `src/utils/` — Herramientas y funciones auxiliares

- Qué va aquí: Funciones puras de JavaScript/TypeScript que no usan React.
- Ejemplo: `formatCurrency(15000)` para que muestre `$15,000.00 MXN`, formateadores de fechas o validadores de correo/CURP.

## 🚫 Reglas de oro para no romper la estructura

- No llames a `axios` o `fetch` dentro de un componente: Primero crea la función en `services/`, luego úsala en un hook o en la página.
- Separa la lógica del diseño: Si tu componente tiene más de 30 líneas de cálculos y funciones matemáticas antes del `return`, muévelas a un hook o a un util.
- Todo lo que venga de C# debe estar tipado: Antes de usar una respuesta de la API, crea su interfaz correspondiente en `types/`.
