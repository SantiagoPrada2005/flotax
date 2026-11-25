### Descripción: En la ficha técnica de cada vehículo, dentro de Flota de vehículos, agregar una sección de documentos.

<img width="1890" height="871" alt="image" src="https://github.com/user-attachments/assets/0fc5ad54-3631-4405-941e-05f34396d660" />

**Licencia de tránsito**: espacio para subir dos fotos, una de la parte delantera y otra de la trasera, con opción de ver, reemplazar y eliminar cada una. Al tocar una foto, se abre en un visor a pantalla completa con zoom, para poder leer bien los datos del documento. El visor permite pasar de la delantera a la trasera sin cerrarlo, se cierra con un botón visible o con la tecla Esc, y en celular admite zoom con dos dedos. La miniatura en la ficha solo sirve como acceso.

**SOAT y tecnomecánica:** formulario manual (sin imágenes) para cada documento, con número o referencia, fecha de expedición y fecha de vencimiento. Ambos vencen cada año, así que al registrar uno nuevo se sugiere el vencimiento un año después de la expedición. Cada documento tiene una fecha de pago calculada por el sistema: en el SOAT es el mismo día del vencimiento, y en la tecnomecánica son 2 días antes del vencimiento.

### Estados del recordatorio:

- **Vigente:** el documento está al día.
-  **Próximo a vencer:** desde 20 días antes de la fecha de pago, mostrando esa fecha.
- **Cuenta regresiva:** de 7 a 1 días para la fecha de pago, mostrando los días que faltan.
- **"Hoy es la fecha de pago":** el día de la fecha de pago. En la tecnomecánica este mensaje se mantiene hasta el vencimiento.
- **"Sin realizar":** al cumplirse el límite de tiempo (pasado el vencimiento) sin haber registrado el documento nuevo, se muestra "Sin realizar tecnomecánica" o "Sin SOAT vigente", según el caso.
- **Sin registrar:** el vehículo no tiene el documento cargado.

Advertencias y notificaciones: el estado de cada documento se muestra en la ficha cada vez que se abre. El administrador de la flota (que es el mismo operador) recibe una notificación en la campana cuando el documento entra en "próximo a vencer", durante la cuenta regresiva y el día de "Hoy es la fecha de pago". Los vehículos en estado "Sin realizar" o "Sin registrar" aparecen con advertencia visible en la flota y en la ficha, y no pueden reservarse ni entregarse hasta regularizar los documentos.

**Frontend:** sección nueva en la ficha técnica con indicadores de color por estado, formulario de fechas y subida de fotos con miniatura y visor ampliado.

**Backend:** guardar las fotos y los datos de cada documento por vehículo, con acceso restringido a las fotos porque contienen datos personales del propietario; calcular la fecha de pago y el estado a partir de la fecha de vencimiento, generar las notificaciones diarias y rechazar la reserva o entrega de un vehículo en estado "Sin realizar" o "Sin registrar".