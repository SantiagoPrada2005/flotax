# User Flow: FlotaX — Navegación, Pantallas y Estados de Usuario

**Código:** DOC-UX-001  
**Proyecto:** FlotaX — Sistema de Alquiler de Vehículos  
**Ámbito:** Arquitectura de Interfaz, Mapa de Navegación y Flujos de Usuario  
**Fuente de Verdad:** Diagramas canónicos de User Flow (Onboarding, Personal, Operación, Roles y Matriz de Acceso)  

---

## 1. Visión General del Sistema y Convenciones

Los diagramas de flujo definen la estructura jerárquica de pantallas, componentes interactivos, bifurcaciones de negocio y ciclo de vida de la flota en FlotaX.

### Tipología Canónica de Nodos:
1. **Pantalla Principal (Verde Menta / Borde Verde):** Rutas y vistas canónicas primarias del sistema (ej. `bienvenida`, `menú por permisos`, `flota`, `entrega del vehículo`).
2. **Función o Pantalla (Gris Claro / Beige Neutro):** Subvistas, tabs, modales, formularios o pasos de soporte operativo (ej. `ver catálogo`, `datos básicos`, `correo y código otp`, `rechazar y notificar`).
3. **Punto de Decisión (Rombo / Condicional):** Bifurcaciones operativas del sistema (ej. `¿Confirmar reserva?`, `¿Requiere mantenimiento?`).

```mermaid
graph TD
    classDef mainScreen fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#065f46;
    classDef subScreen fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,color:#1f2937;
    classDef decision fill:#f3f4f6,stroke:#9ca3af,stroke-width:1.5px,color:#1f2937;

    A["Pantalla Principal"]:::mainScreen
    B["Función o Pantalla"]:::subScreen
    C{"¿Decisión?"}:::decision
```

---

## 2. User Flow: Onboarding

Define la puerta de entrada, modalidades de acceso inicial para nuevos usuarios, clientes recurrentes y visitantes casuales.

```mermaid
graph LR
    classDef mainScreen fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#065f46;
    classDef subScreen fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,color:#1f2937;

    inicio["inicio"]:::subScreen --> bienvenida["bienvenida"]:::subScreen

    %% Opción 1: Explorar como visitante
    bienvenida --> exp_vis["explorar como visitante"]:::mainScreen
    exp_vis --> exp_cat["ver catálogo"]:::subScreen

    %% Opción 2: Iniciar sesión
    bienvenida --> login["iniciar sesión"]:::mainScreen
    login --> log_otp["correo y código otp"]:::subScreen
    login --> log_cat["ir al catálogo"]:::subScreen

    %% Opción 3: Registrarse
    bienvenida --> reg["registrarse"]:::mainScreen
    reg --> reg_datos["datos básicos"]:::subScreen
    reg --> reg_ley["autorización de datos (Ley 1581)"]:::subScreen
    reg --> reg_otp["verificar con código"]:::subScreen
    reg --> reg_cat["ir al catálogo"]:::subScreen
```

> **Regla de Negocio de Onboarding:**  
> Si ya hay una sesión activa, la app salta la bienvenida y abre el catálogo directamente. La cédula y la licencia se piden la primera vez que el cliente alquila, no en el registro; en el registro únicamente se pide el nombre completo si esta persona no accede con Google.
>
> **Acceso Unificado y Resiliente con Google OAuth:**  
> El botón "Continuar con Google" unifica login y registro: si la cuenta no existe en la base de datos, se provisiona automáticamente (JIT) sin arrojar error al usuario ni obligarlo a reiniciar el flujo en la pestaña opuesta. Si el callback `/api/auth/callback/google` detecta cancelación o error, se redirige de forma segura a `/login` con mensajes en lenguaje humano y sin estados colgados o errores 500.

---

## 3. Flujo de Navegación del Cliente: Explorar y Analizar Vehículos

Flujo de descubrimiento, evaluación técnica y comparativa antes de pasar al embudo de alquiler.

```mermaid
graph LR
    classDef mainScreen fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#065f46;
    classDef subScreen fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,color:#1f2937;

    catalogo["catálogo"]:::mainScreen --> f_buscar["buscar"]:::subScreen
    catalogo --> f_filtrar["filtrar"]:::subScreen
    catalogo --> f_ordenar["ordenar"]:::subScreen
    catalogo --> f_vista["lista o mosaico"]:::subScreen

    f_buscar --> ficha["ficha del vehículo"]:::mainScreen
    f_filtrar --> ficha
    f_ordenar --> ficha
    f_vista --> ficha

    ficha --> vf_fotos["fotos"]:::subScreen
    ficha --> vf_tecnica["ficha técnica"]:::subScreen
    ficha --> vf_cal["estado y calendario"]:::subScreen
    ficha --> vf_tarifa["tarifa y requisitos"]:::subScreen
    ficha --> vf_comparar["comparar vehículos"]:::subScreen
    ficha --> alq_cta["alquilar"]:::mainScreen
```

### Especificación Funcional:
- **Catálogo (`/catalogo`):** Búsqueda por texto (marca, modelo, placa, tipo), filtrado con sincronización en URL, ordenamiento dinámico y alternancia de cuadrícula/lista.
- **Ficha del Vehículo (`/vehiculos/:id`):** Galería fotográfica en Cloudflare R2, ficha técnica, disponibilidad en tiempo real, desglose de tarifas y botón de acción (CTA) directo a alquilar.

---

## 4. Flujo Detallado: Alquilar un Vehículo (Embudo del Cliente)

Embudo transaccional paso a paso que cubre desde la selección de fechas hasta la solicitud preliminar del cliente.

```mermaid
flowchart TD
    classDef mainScreen fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#065f46;
    classDef subScreen fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,color:#1f2937;
    classDef decision fill:#f3f4f6,stroke:#9ca3af,stroke-width:1.5px,color:#1f2937;

    n_ficha["Ficha del vehículo"]:::mainScreen --> n_fechas["Elegir fechas de alquiler"]:::mainScreen
    n_fechas --- n_disp["valida disponibilidad"]:::subScreen

    n_fechas --> n_check_auth{"¿Tiene sesión iniciada?"}:::decision

    n_check_auth -- No --> n_auth["Iniciar sesión o registrarse"]:::mainScreen
    n_check_auth -- Sí --> n_resumen["Resumen y costo total"]:::mainScreen
    n_auth --> n_resumen

    n_resumen --> n_terminos["Aceptar términos y datos"]:::mainScreen
    n_terminos --- n_ley["Ley 1581: autorización de datos"]:::subScreen

    n_terminos --> n_pago["Pagar o reportar abono"]:::mainScreen

    n_pago --> n_enviada["Solicitud enviada"]:::mainScreen
    n_enviada --- n_estado_pend["estado: pendiente"]:::subScreen
```

---

## 5. User Flow: Operación de una Reserva (Personal o Administración)

Ciclo de vida operativo completo gestionado por el personal de patio y administración desde que entra una solicitud hasta el cierre final de la reserva.

```mermaid
flowchart TD
    classDef mainScreen fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#065f46;
    classDef subScreen fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,color:#1f2937;
    classDef decision fill:#f3f4f6,stroke:#9ca3af,stroke-width:1.5px,color:#1f2937;

    solicitud["Solicitud pendiente"]:::mainScreen
    sol_nota["llega desde el módulo del cliente"]:::subScreen
    solicitud -.- sol_nota

    revisar["Revisar solicitud"]:::mainScreen
    rev_nota["disponibilidad y documentos del vehículo"]:::subScreen
    revisar -.- rev_nota

    confirmar_decision{"¿Confirmar reserva?"}:::decision

    rechazar["Rechazar y notificar"]:::subScreen
    rech_nota["notifica al cliente"]:::subScreen
    rechazar -.- rech_nota

    confirmada["Reserva confirmada"]:::mainScreen
    conf_nota["notifica al cliente"]:::subScreen
    confirmada -.- conf_nota

    entrega["Entrega del vehículo"]:::mainScreen
    ent_nota["estado del vehículo: en alquiler"]:::subScreen
    entrega -.- ent_nota

    devolucion["Devolución del vehículo"]:::mainScreen
    dev_nota["revisa estado y kilometraje"]:::subScreen
    devolucion -.- dev_nota

    mantenimiento_decision{"¿Requiere mantenimiento?"}:::decision

    mantenimiento["Enviar a mantenimiento"]:::mainScreen

    cierre["Saldo y cierre del contrato"]:::mainScreen

    cerrada["Reserva cerrada"]:::mainScreen
    cer_nota["estado del vehículo: disponible"]:::subScreen
    cerrada -.- cer_nota

    %% Transiciones del ciclo
    solicitud --> revisar
    revisar --> confirmar_decision
    confirmar_decision -- no --> rechazar
    confirmar_decision -- sí --> confirmada
    confirmada --> entrega
    entrega --> devolucion
    devolucion --> mantenimiento_decision
    mantenimiento_decision -- sí --> mantenimiento
    mantenimiento_decision -- no --> cierre
    mantenimiento --> cierre
    cierre --> cerrada
```

### Estados y Puntos de Control Operativo:
1. **Solicitud pendiente:** Notificación entrante desde el portal del cliente con abono o solicitud radicada.
2. **Revisar solicitud:** Validación pericial de documentos del conductor, antecedentes y disponibilidad del vehículo.
3. **Decisión de Confirmación:**
   - **Rechazar y notificar:** Se cancela la solicitud y se devuelve notificación justificada al cliente.
   - **Reserva confirmada:** Generación de contrato preliminar y notificación formal al cliente.
4. **Entrega del vehículo:** Acta de entrega con inspección fotográfica pericial en Cloudflare R2. El vehículo pasa a estado `en alquiler`.
5. **Devolución del vehículo:** Peritaje de retorno, registro de kilometraje, combustible y novedades físicas.
6. **Decisión de Mantenimiento:**
   - Si presenta averías o requiere service, se deriva a `Enviar a mantenimiento` (estado temporal `en mantenimiento`).
   - Si está en condiciones óptimas, avanza a liquidación.
7. **Saldo y cierre del contrato:** Liquidación de depósitos en garantía, cobro de saldos o penalidades pendientes.
8. **Reserva cerrada:** Contrato finiquitado y el vehículo retorna inmediatamente a estado `disponible` en catálogo.

---

## 6. User Flow: Personal (Empleados y Dueño)

Arquitectura de módulos y funciones accesibles desde el entorno administrativo y operativo (`/admin`).

```mermaid
graph LR
    classDef mainScreen fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#065f46;
    classDef subScreen fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,color:#1f2937;

    acceso_personal["acceso personal"]:::subScreen --> iniciar_sesion["iniciar sesión"]:::subScreen
    iniciar_sesion --> menu_permisos["menú por permisos"]:::mainScreen

    %% 1. Reservas y contratos
    menu_permisos --> mod_reservas["reservas y contratos"]:::mainScreen
    mod_reservas --> res_solicitudes["solicitudes y calendario"]:::subScreen
    mod_reservas --> res_contratos["contratos"]:::subScreen
    mod_reservas --> res_entrega["entrega y devolución"]:::subScreen

    %% 2. Clientes
    menu_permisos --> mod_clientes["clientes"]:::mainScreen
    mod_clientes --> cli_lista["lista y documentos"]:::subScreen
    mod_clientes --> cli_historial["historial de alquileres"]:::subScreen

    %% 3. Flota
    menu_permisos --> mod_flota["flota"]:::mainScreen
    mod_flota --> flo_vehiculos["vehículos"]:::subScreen
    mod_flota --> flo_mantenimiento["estado y mantenimiento"]:::subScreen
    mod_flota --> flo_alertas["documentos y alertas"]:::subScreen

    %% 4. Pagos y gastos
    menu_permisos --> mod_pagos["pagos y gastos"]:::mainScreen
    mod_pagos --> pag_abonos["pagos y abonos"]:::subScreen
    mod_pagos --> pag_gastos["gastos por vehículo"]:::subScreen

    %% 5. Reportes
    menu_permisos --> mod_reportes["reportes"]:::mainScreen
    mod_reportes --> rep_ingresos["ingresos y ocupación"]:::subScreen
    mod_reportes --> rep_exportar["exportar"]:::subScreen

    %% 6. Administración
    menu_permisos --> mod_admin["administración"]:::mainScreen
    mod_admin --> adm_roles["usuarios y roles"]:::subScreen
    mod_admin --> adm_tarifas["tarifas y configuración"]:::subScreen
    mod_admin --> adm_auditoria["auditoría"]:::subScreen
```

> **Principio de Visibilidad Dinámica:**  
> El menú muestra solo los módulos para los que el usuario tiene permiso. Con una sola persona (el propietario) se ven todos. Quién accede a cada pantalla está normado por la matriz de acceso.

---

## 7. User Flow: Crecimiento del Equipo y Roles

Modelo de adopción progresiva y escalamiento de responsabilidades en la organización de alquiler.

```mermaid
flowchart LR
    classDef roleCard fill:#f9fafb,stroke:#059669,stroke-width:1.5px,color:#111827;

    P1["**Una persona**<br>───────────────<br><b>propietario</b><br><br>Una sola cuenta con acceso a todos los módulos. Puede atender clientes, manejar la flota, registrar pagos y ver reportes."]:::roleCard
    --> P2["**Dos personas**<br>───────────────<br><b>propietario y administrador</b><br><br>El administrador hace casi todo. No cambia el plan ni los datos del negocio, no crea otros administradores y la auditoría es solo de lectura."]:::roleCard
    --> P3["**Tres o más personas**<br>───────────────<br><b>asesor, encargado de flota y contador</b><br><br>Cada rol ve solo sus módulos. El propietario y el administrador siguen viendo todo. Un mismo usuario puede tener más de un rol."]:::roleCard
```

### Detalle de Etapas de Crecimiento:

| Etapa | Configuración | Responsabilidades y Alcance |
| :--- | :--- | :--- |
| **1. Una persona** | **Propietario** (`DUENO`) | Una sola cuenta con acceso absoluto a todos los módulos. Atiende clientes en patio, gestiona la flota, registra cobros/gastos y examina reportes. |
| **2. Dos personas** | **Propietario + Administrador** (`ADMIN`) | El administrador asume la operación regular diaria. Restricciones del administrador: no modifica la suscripción/plan ni datos fiscales maestros del negocio, no puede crear otros administradores y el módulo de auditoría es estrictamente de solo lectura. |
| **3. Tres o más personas** | **Asesor + Encargado de Flota + Contador** (`OPERATIVO`, `AUDITOR_FINANCIERO`) | Segregación de funciones por principio de mínimo privilegio (PoLP):<br>• **Asesor:** Atiende reservas, contratos y clientes.<br>• **Encargado de Flota:** Coordina entregas, devoluciones, mantenimiento y documentos técnicos de vehículos.<br>• **Contador:** Supervisa pagos, abonos, gastos y reportes contables.<br>*Nota:* Un mismo usuario puede tener más de un rol simultáneo. |

---

## 8. User Flow: Acceso por Módulo y Rol (Matriz RBAC Operativa)

Matriz de gobierno de accesos que dictamina la visibilidad y capacidad de acción en cada pantalla:

| Módulo | Pantalla | Propietario | Administrador | Asesor | Encargado de Flota | Contador |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Reservas y contratos** | Solicitudes y calendario | ✓ | ✓ | ✓ | L | L |
| | Contratos | ✓ | ✓ | ✓ | — | L |
| | Entrega y devolución | ✓ | ✓ | ✓ | ✓ | — |
| **Clientes** | Lista y documentos | ✓ | ✓ | ✓ | — | L |
| | Historial de alquileres | ✓ | ✓ | ✓ | — | L |
| **Flota** | Vehículos | ✓ | ✓ | L | ✓ | — |
| | Estado y mantenimiento | ✓ | ✓ | L | ✓ | L |
| | Documentos y alertas | ✓ | ✓ | L | ✓ | L |
| **Pagos y gastos** | Pagos y abonos | ✓ | ✓ | R | — | ✓ |
| | Gastos por vehículo | ✓ | ✓ | — | L | ✓ |
| **Reportes** | Ingresos y ocupación | ✓ | ✓ | — | L | ✓ |
| | Exportar | ✓ | ✓ | — | — | ✓ |
| **Administración** | Usuarios y roles | ✓ | R | — | — | — |
| | Tarifas y configuración | ✓ | R | — | — | — |
| | Auditoría | ✓ | L | — | — | — |

### Convenciones de Permisos:
- **`✓` Acceso completo:** Crear, leer, modificar y ejecutar acciones transaccionales.
- **`L` Solo lectura:** Consulta de información e informes sin capacidad de mutación de datos.
- **`R` Acceso limitado:** Acceso acotado a submódulos específicos o sin permisos de elevación/administración.
- **`—` Sin acceso:** El módulo o pantalla se oculta en el menú lateral y la ruta devuelve denegación de acceso (`403 Forbidden`).

---

## 9. Mapeo Canónico de Rutas de Implementación (Astro & RBAC)

| Módulo / Pantalla Canónica | Ruta Astro (`src/pages/...`) | Componentes de Dominio Clave | Nivel de Acceso Mínimo |
| :--- | :--- | :--- | :--- |
| **Inicio & Bienvenida** | `src/pages/index.astro` | `HeroBienvenida`, `CategoriasGlance` | Público / Visitante |
| **Catálogo** | `src/pages/catalogo/index.astro` | `CatalogoFiltros`, `VehiculoGrid`, `VistaToggle` | Público / Visitante |
| **Ficha del Vehículo** | `src/pages/vehiculos/[id].astro` | `GaleriaFotos`, `FichaTecnica`, `CalendarioDisponibilidad` | Público / Visitante |
| **Embudo: Fechas y Resumen** | `src/pages/alquilar/[id].astro` | `DateRangeSelector`, `ResumenCostos`, `TerminosLey1581` | Cliente Autenticado |
| **Mis Reservas (Cliente)** | `src/pages/reservas/index.astro` | `ReservasActivasList`, `HistorialReservasTable` | Cliente Autenticado |
| **Perfil del Cliente** | `src/pages/perfil/index.astro` | `DatosPersonalesForm`, `LicenciaUpload` | Cliente Autenticado |
| **Acceso Personal** | `src/pages/admin/login.astro` | `AdminLoginForm` | Público (Staff) |
| **Panel / Menú por Permisos** | `src/pages/admin/index.astro` | `AdminModuleNav`, `DashboardMetrics` | Personal (`tienePermiso`) |
| **Reservas: Solicitudes y Calendario** | `src/pages/admin/reservas/index.astro` | `SolicitudesTable`, `ReservasCalendario` | Asesor / Encargado (L) / Contador (L) |
| **Reservas: Contratos** | `src/pages/admin/contratos/index.astro` | `ContratosList`, `ContratoViewer` | Asesor / Contador (L) |
| **Reservas: Entrega y Devolución** | `src/pages/admin/operaciones/index.astro` | `CheckInCheckOutForm`, `InspeccionPericialR2` | Asesor / Encargado de Flota |
| **Clientes: Lista y Documentos** | `src/pages/admin/clientes/index.astro` | `ClientesTable`, `DocumentosValidador` | Asesor / Contador (L) |
| **Flota: Vehículos y Mantenimiento** | `src/pages/admin/flota/index.astro` | `FlotaGrid`, `MantenimientoForm`, `AlertasVencimiento` | Encargado de Flota / Asesor (L) |
| **Pagos y Gastos** | `src/pages/admin/caja/index.astro` | `AbonosTable`, `GastosVehiculoForm` | Contador / Asesor (R) |
| **Reportes y Exportación** | `src/pages/admin/reportes/index.astro` | `IngresosOcupacionChart`, `ExportarCSVButton` | Contador / Encargado (L) |
| **Administración: Config y Auditoría** | `src/pages/admin/configuracion/index.astro` | `UsuariosRolesManager`, `TarifasConfig`, `AuditoriaTable` | Propietario / Administrador (R/L) |
| **Inducción Operativa de Patio** | `src/pages/admin/onboarding.astro` | `OnboardingStepsWizard`, `CamaraPermissionGate` | Personal con `onboardingCompletado = false` |

---

## 10. User Flow: Paradigma de Portal Persistente (Switch Explícito y Creación de Patio)

Define la alternancia entre la experiencia de cliente consumidor y la cabina operativa de patio sin fragmentación de cuentas ni credenciales duplicadas, permitiendo además que cualquier cliente ofrezca sus vehículos en alquiler.

```mermaid
flowchart TD
    classDef mainScreen fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#065f46;
    classDef subScreen fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,color:#1f2937;
    classDef decision fill:#f3f4f6,stroke:#9ca3af,stroke-width:1.5px,color:#1f2937;

    avatar_cli["Perfil del Cliente (/perfil)"]:::subScreen --> chk_staff{"¿Tiene patio o<br>membresía activa?"}:::decision

    %% Camino A: No tiene patio -> Oportunidad de Anfitrión
    chk_staff -- No --> cta_host["Tarjeta: 'Alquila vehículos a otros usuarios'"]:::mainScreen
    cta_host --> btn_start["CTA: Comenzar a alquilar"]:::subScreen
    btn_start --> screen_onb_create["Onboarding: Crear Patio (/admin/onboarding?modo=crear)"]:::mainScreen
    screen_onb_create --> step_biz["1. Datos del Patio (Nombre, Ciudad, Teléfono)"]:::subScreen
    step_biz --> step_switch_guide["2. Comprensión de los 2 Entornos"]:::subScreen
    step_switch_guide --> step_cam_biz["3. Autorización de Cámara para Peritajes R2"]:::subScreen
    step_cam_biz --> act_create_patio["Acción: crearPatioOperativo (Rol: DUEÑO)"]:::subScreen
    act_create_patio --> screen_admin["Cabina Operativa (/admin)"]:::mainScreen

    %% Camino B: Ya tiene patio -> Switch Directo
    chk_staff -- Sí --> opt_switch["💼 Switch: Modo Operador Activo"]:::mainScreen
    opt_switch --> chk_onb{"¿onboardingCompletado?"}:::decision
    chk_onb -- No --> screen_onb_ind["Inducción de Colaborador (/admin/onboarding)"]:::mainScreen
    screen_onb_ind --> act_finish["Acción: finalizarOnboardingOperativo"]:::subScreen
    act_finish --> screen_admin
    chk_onb -- Sí --> screen_admin

    %% Conmutación Multi-Sede
    screen_admin --> topbar_sede["📍 Selector de Sede en TopBar"]:::subScreen
    topbar_sede --> chk_sedes{"¿Múltiples sedes activas?"}:::decision
    chk_sedes -- 1 sede --> info_fija["Texto informativo estático"]:::subScreen
    chk_sedes -- 2 o más sedes --> sheet_sedes["Bottom Sheet: Elegir Sede de Trabajo"]:::mainScreen
    sheet_sedes --> act_switch_sede["Acción: conmutarLocalActivo"]:::subScreen
    act_switch_sede --> reload_sede["Recarga reactiva con inventario de la nueva sede"]:::subScreen

    %% Retorno a Cliente
    screen_admin --> opt_exit["🚗 Salir a Modo Personal (Alquilar)"]:::mainScreen
    opt_exit --> act_to_client["Acción: cambiarModoPortal(CLIENTE)"]:::subScreen
    act_to_client --> screen_cat["Catálogo de Alquiler (/catalogo)"]:::mainScreen
```

### Reglas de Negocio del Paradigma de Portal:
1. **Autonomía y Rol DUEÑO:** Cualquier cliente puede crear libremente un nuevo patio de alquiler, convirtiéndose automáticamente en `DUENO` con soberanía total sobre su flota, tarifas y personal.
2. **Segregación de Roles por Invitación:** Los roles operativos sobre patios existentes (`ADMIN`, `OPERATIVO`, `AUDITOR_FINANCIERO`) requieren una invitación transaccional emitida por el dueño.
3. **Identidad Canónica Única:** Una sola cuenta (`user.id`) aloja tanto el historial personal como las atribuciones de patio.
4. **Persistencia Transparente:** La sede y el portal elegidos persisten en cookies HTTP-only seguras (`movix_local_activo` y `movix_portal_modo`).
5. **Prevención de Conflicto de Interés:** El personal o dueño que alquile como cliente está sujeto a las mismas validaciones de riesgo y tarifas regulares; queda prohibido el auto-peritaje de entrega/devolución.

