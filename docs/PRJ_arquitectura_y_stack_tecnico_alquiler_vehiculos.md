# **PROYECTO: Arquitectura Técnica, Stack y Estándares de Ingeniería — Sistema de Alquiler de Vehículos**

# **Ficha Técnica del Documento**

| Campo | Detalle |
| :---- | :---- |
| **Código** | PRJ-ALQ-002 |
| **Título** | Arquitectura Técnica, Stack Serverless y Estándares de Ingeniería |
| **Estado** | En Definición / Arquitectura Base |
| **Ámbito** | Tecnología & Software / Arquitectura Edge-First & Cloudflare |
| **Equipo / Responsables** | Santiago Prada, Julián, Javier |
| **Fecha de Creación** | 2026-09-30 |
| **Proyecto Relacionado** | PRJ\_requerimientos\_funcionales\_sistema\_alquiler\_vehiculos |
| **Índice Padre** | \_index (02\_wiki/proyectos/) |
| **Etiquetas** | `#arquitectura` `#cloudflare` `#astro` `#react19` `#drizzle-orm` `#d1` `#r2` `#pnpm` `#mobile-ergonomics` `#calidad` |

# **1\. Filosofía Arquitectónica y Principios Rectores**

El diseño técnico del sistema de alquiler de vehículos se rige bajo la premisa de cero sobreingeniería, máxima robustez y tipado de extremo a extremo, adaptado a las necesidades operativas de 3 a 4 administradores que gestionan flota en escritorio y campo móvil:

1. **Monolito Serverless Unificado:** Todo el sistema (vistas públicas/catálogo, panel administrativo, mutaciones de negocio y almacenamiento de archivos) se consolida en un único repositorio y despliegue sobre **Cloudflare Pages / Workers**. Se eliminan monorepos complejos y pipelines duplicados de CI/CD.  
2. **Eliminación de la Capa API Redundante (Astro Nativo vs Hono):** Aprovechando que Astro 7+ cuenta con **Astro Actions (`astro:actions`)** y **Server Endpoints**, no se monta un servidor Hono dentro de la aplicación web. Astro Actions provee funciones RPC tipadas de servidor a cliente con validación Zod nativa, reduciendo drásticamente el código boilerplate.  
3. **Persistencia Perimetral ACID y Zero Egress:** Base de datos relacional nativa sobre **Cloudflare D1** (SQLite distribuido) gestionada mediante **Drizzle ORM**. El almacenamiento de contratos firmados, fotografías periciales y videos de check-in/out se realiza en **Cloudflare R2**, garantizando cero costos por transferencia de datos salientes (zero egress).  
4. **Gobierno Estricto de Calidad:** Adopción obligatoria de TypeScript en modo estricto (`astro/tsconfigs/strictest`), gestor de paquetes `pnpm` exclusivo, ergonomía táctil móvil (regla de los 16px en WebKit) y verificación obligatoria mediante `pnpm check` (0 errores, 0 warnings).

# **2\. Especificación del Stack Tecnológico Mínimo y Robusto**

| Capa / Rol | Tecnología Elegida | Justificación y Ventaja Técnica |
| :---- | :---- | :---- |
| **Plataforma de Ejecución** | Cloudflare Pages / Workers | Ejecución sobre V8 Isolates con cold starts \< 5 ms, red global Anycast y alta disponibilidad sin mantenimiento de servidores. |
| **Framework Fullstack** | Astro 7+ (con motor Vite) | Compilador en Rust ultrarrápido, SSR perimetral con adaptador `@astrojs/cloudflare`, Server Islands y soporte nativo de sesiones. |
| **Motor de Reactividad** | React 19 (`@astrojs/react`) | Islas interactivas con `useActionState()`, `useOptimistic()`, `ref` como prop nativa y helper `withState()` para enlazar Astro Actions sin librerías de formularios externas. |
| **Capa de Datos y ORM** | Drizzle ORM \+ Drizzle Kit | Bundle minúsculo (\~7.4 KB), sin binarios nativos, consultas SQL tipadas puras y migraciones automáticas hacia Cloudflare D1. |
| **Base de Datos Principal** | Cloudflare D1 | Base de datos relacional serverless (SQLite en el edge) con transacciones ACID para reservas, contratos, caja y flota. |
| **Almacenamiento Multimedia** | Cloudflare R2 | Almacenamiento de objetos compatible con S3 sin tarifas de egress para fotos perimetrales, videos y contratos en PDF/imagen. |
| **Validación y Contratos** | Zod | Validación rigurosa en tiempo de ejecución de inputs de formularios y payloads en Astro Actions. |
| **Estilos y Sistema Visual** | Tailwind CSS v4 \+ Lucide React | Compilación instantánea con motor Vite (`@tailwindcss/vite`), variables CSS para diseño por tokens (`tokens.css`) y set de iconos SVG livianos. Detallado en [ADR-ALQ-003](file:///Users/santiago/proyectos/movix/docs/ADR_arquitectura_estilos_tailwind_v4_vite.md) y regla [.agents/rules/tailwind-v4-styling-governance.md](file:///Users/santiago/proyectos/movix/.agents/rules/tailwind-v4-styling-governance.md). |
| **Estado de URL** | nuqs | Sincronización reactiva y bidireccional de filtros de catálogo, fechas de calendario y paginación directamente en la URL. |
| **Datagrids Complejos** | @tanstack/react-table | Datagrid headless reservado exclusivamente para la tabla operativa de cartera y control financiero. |

# **3\. Estructura de Directorios del Proyecto (Monolito Serverless)**

El proyecto adopta una estructura modular clara basada en arquitectura orientada a características (*Screaming Architecture*):alquiler-vehiculos/

├── src/

│   ├── actions/                  \# Astro Actions (RPC server-side tipado con Zod)

│   │   ├── index.ts              \# Exportación centralizada de acciones

│   │   ├── flota.ts              \# Registro de autos, motos, patinetas y estados

│   │   ├── clientes.ts           \# CRUD clientes, licencia y visita domiciliaria

│   │   ├── contratos.ts          \# Apertura, tarifas (\>7 días) y modificaciones

│   │   ├── inspecciones.ts       \# Registro check-in/out y presigned URLs de R2

│   │   └── caja.ts               \# Abonos (efectivo, transferencia, especie) y gastos

│   ├── components/

│   │   ├── ui/                   \# Tier 1: Primitivas agnósticas (Button, Input, Card, Modal)

│   │   └── react/                \# Tier 2: Islas interactivas React 19

│   │       ├── CalendarioFlota.tsx       \# Calendario interactivo con código de colores

│   │       ├── FormularioInspeccion.tsx  \# Captura pericial móvil con cámara y carga a R2

│   │       ├── CalculadoraAlquiler.tsx   \# Cálculo reactivo de tarifas y descuentos

│   │       └── TablaCartera.tsx          \# Datagrid de saldos y abonos con nuqs

│   ├── db/

│   │   ├── index.ts              \# Cliente Drizzle inicializado con env.DB

│   │   └── schema/               \# Definición modular de esquemas Drizzle

│   │       ├── flota.ts

│   │       ├── clientes.ts

│   │       ├── contratos.ts

│   │       ├── inspecciones.ts

│   │       ├── caja.ts

│   │       └── index.ts          \# Barrel export de tablas y relaciones

│   ├── layouts/

│   │   └── LayoutAdmin.astro     \# Shell administrativo responsivo (Sidebar/BottomNav)

│   ├── lib/

│   │   ├── time/

│   │   │   └── client-time.ts    \# Resolución de zona horaria local (America/Bogota)

│   │   └── storage/

│   │       └── r2-client.ts      \# Generador de subidas directas a Cloudflare R2

│   ├── middleware.ts             \# Control perimetral de sesiones y autenticación

│   ├── styles/

│   │   └── tokens.css            \# Tier 0: Tokens de diseño (colores, radios, fuentes)

│   └── pages/                    \# Tier 4: Rutas y orquestadores lean (\<150 LOC)

│       ├── login.astro           \# Acceso administrativo

│       ├── index.astro           \# Tablero principal y catálogo rápido

│       ├── flota/                \# Gestión de unidades y mantenimiento

│       ├── clientes/             \# Fichas y validación de seguridad

│       ├── contratos/            \# Gestión contractual y extensiones

│       └── api/

│           └── r2-upload-url.ts  \# Endpoint para generación de URLs presignadas

├── astro.config.mjs              \# Configuración Astro \+ adaptador @astrojs/cloudflare

├── drizzle.config.ts             \# Configuración de migraciones Drizzle Kit para D1

├── wrangler.jsonc                \# Bindings Cloudflare (D1: BD, R2: BUCKET\_MULTIMEDIA)

└── package.json                  \# Gestor pnpm exclusivo

# **4\. Esquema Relacional de Base de Datos en Cloudflare D1 (Drizzle ORM)**

Se definen 10 entidades nucleares fuertemente tipadas en SQLite/Drizzle (\$inferSelect, \$inferInsert):

1. **`usuarios_admin`:** Identificación, nombre, correo, password\_hash, rol (administrador), activo, marcas temporales.  
2. **`propietarios_terceros`:** ID, nombre completo, documento, teléfono, porcentaje\_comision, comision\_fija, notas.  
3. **`vehiculos`:** ID, tipo (`automovil`, `motocicleta`, `patineta`), placa, modelo, anio, tarifa\_base\_diaria, estado\_operativo (`disponible`, `mantenimiento`, `fuera_de_servicio`), es\_tercero (booleano), propietario\_id (FK opcional), observaciones.  
4. **`clientes`:** ID, nombre\_completo, tipo\_documento (`cedula`, `pasaporte`, `otro`), numero\_documento (único), telefono, direccion, estado\_licencia (`vigente`, `no_vigente`), visita\_domiciliaria\_realizada (booleano), notas\_seguridad.  
5. **`contratos`:** ID, cliente\_id (FK), vehiculo\_id (FK), fecha\_inicio, fecha\_fin\_pactada, fecha\_devolucion\_real, tarifa\_diaria\_aplicada, descuento\_semanal\_aplicado, costo\_total\_calculado, saldo\_pendiente, estado\_contrato (`activo`, `finalizado`, `anulado`), contrato\_firmado\_url (enlace a R2).  
6. **`inspecciones`:** ID, contrato\_id (FK), tipo\_inspeccion (`check_in`, `check_out`), odometro\_km, nivel\_combustible, video\_soporte\_url (enlace a R2), observaciones\_danos, creado\_por\_admin\_id (FK).  
7. **`inspeccion_fotos`:** ID, inspeccion\_id (FK), costado (`frontal`, `trasero`, `lateral_izq`, `lateral_der`, `habitaculo`, `danio_especifico`), foto\_url (enlace a R2).  
8. **`reservas`:** ID, cliente\_id (FK), vehiculo\_id (FK), fecha\_inicio, fecha\_fin, estado\_reserva (`activa`, `vencida`, `convertida`, `cancelada`), notas.  
9. **`abonos_pagos`:** ID, contrato\_id (FK), fecha\_pago, monto, metodo\_pago (`efectivo`, `transferencia`, `especie`), comprobante\_url (R2 opcional), notas.  
10. **`gastos_vehiculo`:** ID, vehiculo\_id (FK), categoria (`combustible`, `mantenimiento`, `seguros_impuestos`, `reparaciones`), valor, fecha, descripcion, comprobante\_url.

# **5\. Pipeline Multimedia con Cloudflare R2 (Check-in / Check-out Móvil)**

Para evitar la sobrecarga de la base de datos D1 y los tiempos de subida en el servidor Astro:

1. **Solicitud de URL Presignada:** El componente React de inspección móvil invoca la acción `actions.inspecciones.generarUrlSubidaR2({ tipo: 'foto' | 'video', nombreArchivo })`.  
2. **Subida Directa a R2:** El navegador del móvil sube la foto o el video testimonial directamente a Cloudflare R2 utilizando `PUT` con el `Content-Type` correspondiente.  
3. **Persistencia de Referencia:** Una vez completada la subida al bucket, se ejecuta `actions.inspecciones.registrarCheckIn({ ...datos, fotosUrls, videoUrl })`, almacenando únicamente la URL pública o la clave del objeto en Cloudflare D1.

# **6\. Normas de Ingeniería y Reglas Técnicas Obligatorias**

Adoptadas directamente de las reglas operativas del ecosistema:

1. **Gestor de Paquetes Exclusivo (`pnpm`):** Prohibido el uso de `npm`, `npx` o `yarn`. Toda instalación o script corre bajo `pnpm` (`pnpm install`, `pnpm add`, `pnpm run build`).  
2. **Gestión de Fechas y Zona Horaria (`America/Bogota`):** Debido a que Cloudflare Workers corre en UTC, está strictly prohibido usar `new Date().toISOString().slice(0, 10)` sin ajustar la zona horaria. Se utiliza el helper centralizado `src/lib/time/client-time.ts` con zona horaria predeterminada `America/Bogota` (UTC-5) para evitar que después de las 7:00 PM las reservas se guarden con la fecha del día siguiente.  
3. **Ergonomía Móvil y Regla de los 16px en WebKit:** Para prevenir el zoom automático irreversible de iOS Safari al enfocar campos de texto:  
   * Todo `<input>`, `<textarea>` y `<select>` en pantallas móviles (`max-width: 768px`) debe tener `font-size: 16px !important`.  
   * Viewport configurado con `interactive-widget=resizes-content`.  
   * Touch targets interactivos de mínimo `44x44px` en campo móvil.  
4. **Arquitectura de Islas de React (Anti-DOM Imperativo):** Prohibido el uso de `document.createElement()` o scripts manuales de manipulación de DOM. Todo estado dinámico, modal o interactivo se encapsula en componentes React (`.tsx`) con limpieza en `useEffect` y soporte de `AbortController`.  
5. **Cero Fuga Técnica (Zero Technical Leakage):** La interfaz de usuario debe comunicarse en lenguaje de negocio claro para los administradores. Queda prohibido exponer términos internos como "D1", "R2", "Worker", "SQLite" o "Binding" en mensajes de error o etiquetas visuales.  
6. **Verificación Continua de Calidad:** Cada funcionalidad debe verificar `pnpm check` (`astro check`) con **0 errores, 0 warnings y 0 hints** antes de ser considerada terminada.

