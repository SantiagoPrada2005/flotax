# Gestión de disponibilidad de vehículos entre sedes
**Encargado: Santiago PRADA**

## Contexto y retroalimentación del cliente

A partir del feedback recibido por parte de la primera empresa que trabaja con nosotros, identificamos una particularidad importante en la administración de su flota: **los vehículos (carros y motos) pueden tener disponibilidad compartida entre diferentes sedes**, dependiendo de la distancia y la posibilidad de trasladarlos.

### 1. Disponibilidad compartida entre sedes

Actualmente, la empresa maneja una flota compartida entre sus sedes de Zarzal y Tuluá.

Por ejemplo:
- Si en Zarzal necesitan un vehículo que se encuentra físicamente en Tuluá, pueden trasladarlo para atender la solicitud.
- Lo mismo sucede en sentido contrario.
- Esta dinámica aplica tanto para carros como para motos.

Esto significa que la disponibilidad de un vehículo no debe depender exclusivamente de la sede donde se encuentra registrado o ubicado inicialmente, sino de la disponibilidad general de la flota y de su posibilidad de traslado.

### 2. Restricciones según la distancia entre sedes

La disponibilidad compartida también depende de la distancia geográfica entre las sedes.

Por ejemplo, si la empresa llega a tener establecimientos en Medellín y Tuluá:
- **Carros:** podrían trasladarse e intercambiarse entre ambas sedes.
- **Motos:** no necesariamente podrían trasladarse debido a las limitaciones de distancia y logística.

Por lo tanto, no todos los tipos de vehículos deben manejar las mismas reglas de intercambio entre sedes.

### 3. Comportamiento esperado del sistema

La empresa busca evitar perder clientes por falta de disponibilidad en una sede cuando realmente cuenta con vehículos disponibles en otra ubicación.

Actualmente, la flota se administra de manera que los vehículos pueden estar disponibles para cualquiera de las dos sedes, dependiendo de dónde se concrete el alquiler.

Por esta razón, necesitamos evaluar e implementar una lógica que permita:

- Consultar la disponibilidad de vehículos entre diferentes sedes.
- Identificar qué vehículos pueden compartirse según su categoría y las condiciones de traslado.
- Evitar que un mismo vehículo aparezca disponible para dos alquileres simultáneos.
- Mantener correctamente sincronizadas las fechas, reservas y calendarios.
- Diferenciar la ubicación física del vehículo de las sedes en las que puede ofrecerse para alquiler.

