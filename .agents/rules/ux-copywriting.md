# Rule: UX Copywriting & Human-Centric Communication in FlotaX

**Código:** RUL-FLX-006  
**Proyecto:** FlotaX — Sistema de Alquiler y Gestión de Flota de Vehículos  
**Ámbito:** Redacción de interfaz, microcopy, botones, mensajes de error y validaciones.

---

## 1. El Usuario es un Operador de Flota o Cliente, NO un Ingeniero de Software

La interfaz de usuario **nunca** debe exponer términos internos de infraestructura o base de datos:
- ❌ Prohibido: *"Error al ejecutar worker D1"*, *"Binding de Cloudflare ausente"*, *"Syncing SQLite cache"*.
- ✅ Requerido: *"No se pudo conectar con el servidor. Revisa tu conexión"*, *"Sesión expirada. Inicia sesión nuevamente"*.

---

## 2. Términos Clave del Negocio (Dominio FlotaX)

- **Vehículos:** Modelo, placa, categoría (Auto, Moto, Patineta / Scooter, Utilitario), nivel de combustible o batería, kilometraje, transmisión (Manual / Automática).
- **Reservas & Alquileres:** Fecha de inicio, fecha de devolución, duración, titular, depósito de garantía, estado (Confirmada, En Curso, Completada, Cancelada).
- **Inspección de Entrega/Recepción:** Estado exterior, neumáticos, interior, nivel de tanque, fotografías de respaldo, firma digital.
- **Cobros:** Tarifa diaria, cargos adicionales, seguro, método de pago.

---

## 3. Principios de Redacción

1. **Voz Activa en Acciones:**
   - Botones claros y concisos: `"Iniciar sesión"`, `"Continuar con Google"`, `"Registrar vehículo"`, `"Confirmar reserva"`, `"Iniciar inspección"`.
2. **Mensajes de Validación Amigables:**
   - En lugar de *"Campo inválido"*, especificar: *"Ingresa un correo electrónico válido"*, *"El código OTP debe tener 6 dígitos"*.
3. **Claridad y Sobriedad:**
   - Español neutro, profesional, rápido y sin adornos innecesarios.
