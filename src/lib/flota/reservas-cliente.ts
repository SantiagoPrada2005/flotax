import {
  calcularDiasInclusivos,
  formatearFechaCorta,
  obtenerNombreMesEditorial,
  sumarDiasISO,
} from './disponibilidad';
import { FLOTA_CANONICA, obtenerVehiculoPorId } from './mock-vehiculos';
import type { VehiculoItem } from './types';

export type EstadoReservaCliente =
  | 'EN_CURSO'
  | 'CONFIRMADA'
  | 'PENDIENTE'
  | 'COMPLETADA';

export type ModalidadEntregaReserva = 'PATIO_PRINCIPAL' | 'DOMICILIO_MEDELLIN';

export interface EspecificacionesBentoVehiculo {
  motorDetalle: string;
  motorSubtitulo: string;
  potenciaHp: string;
  rangoRpm: string;
  transmisionBadge: string;
  paqueteEstilo: string;
  carroceriaTag: string;
  notaGarantia: string;
}

export interface PuntoInspeccionR2 {
  id: string;
  zona: string;
  etiqueta: string;
  dictamen: string;
  estado: 'ORIGINAL' | 'VERIFICADO' | 'PROTEGIDO';
  coordX: string; // porcentaje CSS left
  coordY: string; // porcentaje CSS top
}

export interface RubroLiquidacionWaybill {
  id: string;
  etiqueta: string;
  etiquetaCorta: string;
  monto: number;
  porcentajeSobreTotal: number;
}

export interface ReservaClienteItem {
  codigo: string;
  vehiculoId: string;
  vehiculo: VehiculoItem;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
  diasAlquiler: number;
  totalAlquiler: number;
  montoReportado: number;
  estado: EstadoReservaCliente;
  modalidadEntrega: ModalidadEntregaReserva;
  sedeNombre: string;
  creadaEn: string;
  specsBento: EspecificacionesBentoVehiculo;
}

export type TipoHitoAgenda =
  | 'VERIFICACION_PATIO'
  | 'ENTREGA_R2'
  | 'ALQUILER_EN_CURSO'
  | 'DEVOLUCION_CIERRE';

export interface HitoAgendaReserva {
  id: string;
  codigoReserva: string;
  vehiculoId: string;
  fechaISO: string;
  rangoHora: string;
  titulo: string;
  subtitulo: string;
  tipo: TipoHitoAgenda;
  placa: string;
  esCancelable: boolean;
}

export type EstadoCeldaSuiza =
  | 'FUERA_DE_MES'
  | 'RESERVA_ACTIVA'
  | 'HITO_PROGRAMADO'
  | 'DIA_REGULAR';

export interface CeldaCalendarioSuizo {
  fechaISO: string;
  numeroDia: number;
  diaSemanaIndice: number; // 0 (Lun) .. 6 (Dom)
  esMesActual: boolean;
  esHoy: boolean;
  enReservaActiva: boolean;
  esInicioReservaActiva: boolean;
  esFinReservaActiva: boolean;
  tieneHito: boolean;
  cantidadHitos: number;
  estadoVisual: EstadoCeldaSuiza;
}

export interface CalendarioSuizoReservasMes {
  anio: number;
  mesIndexCero: number;
  nombreMes: string;
  nombreMesCapitalizado: string;
  celdas: CeldaCalendarioSuizo[];
}

const SPECS_BENTO_POR_VEHICULO: Readonly<Record<string, EspecificacionesBentoVehiculo>> = {
  'veh-mercedes-eqb': {
    motorDetalle: 'AMG / Dual e-Motor 4MATIC',
    motorSubtitulo: 'Propulsión eléctrica síncrona',
    potenciaHp: '288 hp',
    rangoRpm: '520 Nm torque inst.',
    transmisionBadge: 'SPEEDSHIFT® e-Drive 4MATIC',
    paqueteEstilo: 'AMG Night Pack',
    carroceriaTag: 'SUV 7 Plazas',
    notaGarantia:
      'Cobertura perimetral FlotaX y acta fotográfica en Cloudflare R2 incluidas sin costo adicional durante tu reserva.',
  },
  'veh-bmw-m2-coupe': {
    motorDetalle: 'M TwinPower 3.0L Bi-Turbo',
    motorSubtitulo: 'Seis cilindros en línea forjado',
    potenciaHp: '460 hp',
    rangoRpm: '5,500–6,250 rpm',
    transmisionBadge: 'M Steptronic 8-speed',
    paqueteEstilo: 'M Carbon Pack',
    carroceriaTag: 'Coupe Body Style',
    notaGarantia:
      'Incluye seguro todo riesgo en ruta, telemetría preventiva de patio y depósito de garantía reembolsable al cierre.',
  },
  'veh-mazda-cx30': {
    motorDetalle: 'Skyactiv-G 2.5L AWD',
    motorSubtitulo: 'Inyección directa con G-Vectoring',
    potenciaHp: '186 hp',
    rangoRpm: '4,000–6,000 rpm',
    transmisionBadge: 'Skyactiv-Drive 6-speed',
    paqueteEstilo: 'Grand Touring Pack',
    carroceriaTag: 'SUV Crossover',
    notaGarantia:
      'Asistencia vial 24/7 en Antioquia, inspección de salida verificada en R2 y entrega sin filas en Patio Principal.',
  },
  'veh-quantum-sedan': {
    motorDetalle: 'Blade EV Long Range',
    motorSubtitulo: 'Batería estructural LFP',
    potenciaHp: '245 hp',
    rangoRpm: 'Carga 20–80% en 25 min',
    transmisionBadge: 'Direct-Drive EV 1-speed',
    paqueteEstilo: 'Premier Executive',
    carroceriaTag: 'Sedán Aerodinámico',
    notaGarantia:
      'Recarga bonificada en red aliada, peritaje digital en Cloudflare R2 y liberación inmediata de garantía.',
  },
  'veh-yamaha-mt03': {
    motorDetalle: 'Bicilíndrico 321cc DOHC',
    motorSubtitulo: 'Inyección electrónica refrigeración líquida',
    potenciaHp: '42 hp',
    rangoRpm: '9,000–10,750 rpm',
    transmisionBadge: '6 Marchas · ABS Dual',
    paqueteEstilo: 'Hyper Naked Pack',
    carroceriaTag: 'Chasís Diamante',
    notaGarantia:
      'Incluye dos cascos certificados DOT/ECE, soporte impermeable y peritaje fotográfico rápido en patio.',
  },
  'veh-volt-scooter': {
    motorDetalle: 'Dual Hub Brushless 2400W',
    motorSubtitulo: 'Doble tracción seleccionable',
    potenciaHp: '3.2 hp',
    rangoRpm: '65 km autonomía urbana',
    transmisionBadge: 'Control Sinusoidal 3-Modos',
    paqueteEstilo: 'Striker Urban Pro',
    carroceriaTag: 'Suspensión Hidráulica',
    notaGarantia:
      'Incluye cargador rápido, candado en U de acero cementado y cobertura de asistencia urbana FlotaX.',
  },
};

const DIAS_SEMANA_NOMBRES = [
  { corto: 'Lun', inglesCorto: 'Mon', largo: 'Lunes' },
  { corto: 'Mar', inglesCorto: 'Tue', largo: 'Martes' },
  { corto: 'Mié', inglesCorto: 'Wed', largo: 'Miércoles' },
  { corto: 'Jue', inglesCorto: 'Thu', largo: 'Jueves' },
  { corto: 'Vie', inglesCorto: 'Fri', largo: 'Viernes' },
  { corto: 'Sáb', inglesCorto: 'Sat', largo: 'Sábado' },
  { corto: 'Dom', inglesCorto: 'Sun', largo: 'Domingo' },
] as const;

const MESES_CAPITALIZADOS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

export function obtenerSpecsBentoPorVehiculo(
  vehiculoId: string
): EspecificacionesBentoVehiculo {
  return (
    SPECS_BENTO_POR_VEHICULO[vehiculoId] ?? {
      motorDetalle: 'AMG 4.0L V8 Biturbo',
      motorSubtitulo: 'Ensamblado y calibrado en patio',
      potenciaHp: '503 hp',
      rangoRpm: '5,500–6,250 rpm',
      transmisionBadge: 'SPEEDSHIFT® MCT 9-speed',
      paqueteEstilo: 'AMG Night Pack',
      carroceriaTag: 'Coupe Body Style',
      notaGarantia:
        'Cobertura perimetral FlotaX y acta fotográfica en Cloudflare R2 incluidas durante todo el periodo reservado.',
    }
  );
}

export function obtenerPuntosInspeccionPorVehiculo(
  vehiculo: VehiculoItem
): PuntoInspeccionR2[] {
  return [
    {
      id: 'r2-carroceria',
      zona: 'Carrocería y Pintura Superior',
      etiqueta: 'Pintura Original Sin Rayones',
      dictamen: `Verificado en Cloudflare R2 · 0 abolladuras · Sellado cerámico en ${vehiculo.marca}`,
      estado: 'ORIGINAL',
      coordX: '52%',
      coordY: '24%',
    },
    {
      id: 'r2-rodaje',
      zona: 'Tren Delantero y Rines',
      etiqueta: 'Rines y Frenos al 94%',
      dictamen: `Presión calibrada (36 PSI) · Pastillas verificadas en patio antes de salida`,
      estado: 'VERIFICADO',
      coordX: '34%',
      coordY: '66%',
    },
    {
      id: 'r2-telemetria',
      zona: 'Odómetro y Batería / Tanque',
      etiqueta: `Salida: ${vehiculo.kilometraje.toLocaleString('es-CO')} km · 100%`,
      dictamen: `Entrega con carga/combustible al 100% y telemetría perimetral activa`,
      estado: 'PROTEGIDO',
      coordX: '64%',
      coordY: '58%',
    },
  ];
}

export function obtenerRubrosWaybillReserva(
  reserva: ReservaClienteItem
): RubroLiquidacionWaybill[] {
  const subtotalTarifa = reserva.diasAlquiler * reserva.vehiculo.precioDia;
  const coberturaR2 = Math.max(0, reserva.totalAlquiler - subtotalTarifa);
  const saldoPatio = Math.max(0, reserva.totalAlquiler - reserva.montoReportado);
  const baseCalculo = Math.max(1, reserva.totalAlquiler);

  return [
    {
      id: 'total-contrato',
      etiqueta: `Total Contrato (${reserva.diasAlquiler} días)`,
      etiquetaCorta: 'Total',
      monto: reserva.totalAlquiler,
      porcentajeSobreTotal: 100,
    },
    {
      id: 'tarifa-base',
      etiqueta: 'Tarifa Base de Alquiler',
      etiquetaCorta: 'Tarifa',
      monto: subtotalTarifa,
      porcentajeSobreTotal: Math.round((subtotalTarifa / baseCalculo) * 100),
    },
    {
      id: 'cobertura-r2',
      etiqueta: 'Cobertura e Inspección R2',
      etiquetaCorta: 'Peritaje R2',
      monto: coberturaR2,
      porcentajeSobreTotal: Math.round((coberturaR2 / baseCalculo) * 100),
    },
    {
      id: 'abono-verificado',
      etiqueta: 'Abono Reportado',
      etiquetaCorta: 'Abonado',
      monto: reserva.montoReportado,
      porcentajeSobreTotal: Math.round(
        (reserva.montoReportado / baseCalculo) * 100
      ),
    },
    {
      id: 'deposito-garantia',
      etiqueta: `Garantía Reembolsable (${
        saldoPatio > 0 ? 'Saldo pendiente' : 'Paz y salvo'
      })`,
      etiquetaCorta: 'Garantía',
      monto: reserva.vehiculo.depositoGarantia,
      porcentajeSobreTotal: 100,
    },
  ];
}

export function obtenerInfoDiaFechaISO(fechaISO: string): {
  numeroDia: number;
  diaSemanaCorto: string;
  diaSemanaLargo: string;
  mesNombre: string;
  anio: number;
} {
  const [y = 2026, m = 10, d = 1] = fechaISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const idx = (dt.getUTCDay() + 6) % 7;
  const infoDia = DIAS_SEMANA_NOMBRES[idx] ?? DIAS_SEMANA_NOMBRES[0];
  const mesNombre = MESES_CAPITALIZADOS[(m - 1) % 12] ?? 'Octubre';

  return {
    numeroDia: d,
    diaSemanaCorto: infoDia.corto,
    diaSemanaLargo: infoDia.largo,
    mesNombre,
    anio: y,
  };
}

/**
 * Construye las reservas canónicas iniciales del cliente relativas a `hoyISO`.
 */
export function obtenerReservasSemillaCliente(hoyISO: string): ReservaClienteItem[] {
  const vehiculoPrincipal =
    obtenerVehiculoPorId('veh-mercedes-eqb') ?? FLOTA_CANONICA[0]!;
  const vehiculoSecundario =
    obtenerVehiculoPorId('veh-bmw-m2-coupe') ?? FLOTA_CANONICA[1] ?? vehiculoPrincipal;

  const inicio1 = sumarDiasISO(hoyISO, -1);
  const fin1 = sumarDiasISO(hoyISO, 3);
  const dias1 = calcularDiasInclusivos(inicio1, fin1);
  const subtotal1 = dias1 * vehiculoPrincipal.precioDia;
  const total1 = subtotal1 + Math.round(subtotal1 * 0.08);

  const inicio2 = sumarDiasISO(hoyISO, 8);
  const fin2 = sumarDiasISO(hoyISO, 11);
  const dias2 = calcularDiasInclusivos(inicio2, fin2);
  const subtotal2 = dias2 * vehiculoSecundario.precioDia;
  const total2 = subtotal2 + Math.round(subtotal2 * 0.08);

  return [
    {
      codigo: 'FLX-849210',
      vehiculoId: vehiculoPrincipal.id,
      vehiculo: vehiculoPrincipal,
      fechaInicio: inicio1,
      fechaFin: fin1,
      diasAlquiler: dias1,
      totalAlquiler: total1,
      montoReportado: total1,
      estado: 'EN_CURSO',
      modalidadEntrega: 'PATIO_PRINCIPAL',
      sedeNombre: 'Patio Norte Medellín',
      creadaEn: `${inicio1}T08:30:00.000Z`,
      specsBento: obtenerSpecsBentoPorVehiculo(vehiculoPrincipal.id),
    },
    {
      codigo: 'FLX-512094',
      vehiculoId: vehiculoSecundario.id,
      vehiculo: vehiculoSecundario,
      fechaInicio: inicio2,
      fechaFin: fin2,
      diasAlquiler: dias2,
      totalAlquiler: total2,
      montoReportado: Math.round(total2 * 0.3),
      estado: 'CONFIRMADA',
      modalidadEntrega: 'DOMICILIO_MEDELLIN',
      sedeNombre: 'Sede El Poblado',
      creadaEn: `${hoyISO}T10:15:00.000Z`,
      specsBento: obtenerSpecsBentoPorVehiculo(vehiculoSecundario.id),
    },
  ];
}

function esObjetoRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Hidrata de forma segura las solicitudes guardadas por `RentalWizardFlow`
 * en `localStorage.getItem('flotax_reservas_cliente')` y las fusiona con las semillas.
 */
export function hidratarReservasCliente(
  rawStorageJson: string | null,
  codigosOcultosJson: string | null,
  hoyISO: string
): ReservaClienteItem[] {
  const ocultos = new Set<string>();
  if (codigosOcultosJson) {
    try {
      const parsedOcultos: unknown = JSON.parse(codigosOcultosJson);
      if (Array.isArray(parsedOcultos)) {
        for (const item of parsedOcultos) {
          if (typeof item === 'string') {
            ocultos.add(item);
          }
        }
      }
    } catch {
      // Ignorar JSON corrupto
    }
  }

  const desdeStorage: ReservaClienteItem[] = [];

  if (rawStorageJson) {
    try {
      const parsed: unknown = JSON.parse(rawStorageJson);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (!esObjetoRecord(entry)) continue;
          const codigo =
            typeof entry.codigo === 'string' && entry.codigo.trim()
              ? entry.codigo
              : null;
          const vehiculoId =
            typeof entry.vehiculoId === 'string' ? entry.vehiculoId : null;
          const fechaInicio =
            typeof entry.fechaInicio === 'string' ? entry.fechaInicio : null;
          const fechaFin =
            typeof entry.fechaFin === 'string' ? entry.fechaFin : null;

          if (!codigo || !vehiculoId || !fechaInicio || !fechaFin) continue;
          if (ocultos.has(codigo)) continue;

          const vehiculo =
            obtenerVehiculoPorId(vehiculoId) ?? FLOTA_CANONICA[0];
          if (!vehiculo) continue;

          const diasAlquiler =
            typeof entry.diasAlquiler === 'number' && entry.diasAlquiler > 0
              ? entry.diasAlquiler
              : calcularDiasInclusivos(fechaInicio, fechaFin);

          const totalAlquiler =
            typeof entry.totalAlquiler === 'number' && entry.totalAlquiler > 0
              ? entry.totalAlquiler
              : diasAlquiler * vehiculo.precioDia;

          const montoReportado =
            typeof entry.montoReportado === 'number' && entry.montoReportado > 0
              ? entry.montoReportado
              : Math.round(totalAlquiler * 0.3);

          const estadoRaw = entry.estado;
          const estado: EstadoReservaCliente =
            estadoRaw === 'EN_CURSO' ||
            estadoRaw === 'CONFIRMADA' ||
            estadoRaw === 'COMPLETADA'
              ? estadoRaw
              : 'PENDIENTE';

          desdeStorage.push({
            codigo,
            vehiculoId: vehiculo.id,
            vehiculo,
            fechaInicio,
            fechaFin,
            diasAlquiler,
            totalAlquiler,
            montoReportado,
            estado,
            modalidadEntrega: 'PATIO_PRINCIPAL',
            sedeNombre: 'Patio Norte Medellín',
            creadaEn:
              typeof entry.creadaEn === 'string'
                ? entry.creadaEn
                : `${hoyISO}T12:00:00.000Z`,
            specsBento: obtenerSpecsBentoPorVehiculo(vehiculo.id),
          });
        }
      }
    } catch {
      // Ignorar errores de parseo en cliente
    }
  }

  const semillas = obtenerReservasSemillaCliente(hoyISO).filter(
    (s) => !ocultos.has(s.codigo)
  );

  const mapaPorCodigo = new Map<string, ReservaClienteItem>();
  for (const item of desdeStorage) {
    mapaPorCodigo.set(item.codigo, item);
  }
  for (const item of semillas) {
    if (!mapaPorCodigo.has(item.codigo)) {
      mapaPorCodigo.set(item.codigo, item);
    }
  }

  return Array.from(mapaPorCodigo.values());
}

/**
 * Busca una reserva específica por su código (`FLX-...`) tanto en las reservas
 * almacenadas en cliente como en las semillas canónicas.
 */
export function obtenerReservaClientePorCodigo(
  codigo: string,
  rawStorageJson: string | null,
  hoyISO: string
): ReservaClienteItem | null {
  const normalizado = codigo.trim().toUpperCase();
  const todas = hidratarReservasCliente(rawStorageJson, null, hoyISO);
  return (
    todas.find((r) => r.codigo.toUpperCase() === normalizado) ??
    todas[0] ??
    null
  );
}

/**
 * Genera todos los hitos operativos de agenda para una reserva o conjunto de reservas.
 */
export function generarHitosDeReservas(
  reservas: readonly ReservaClienteItem[]
): HitoAgendaReserva[] {
  const hitos: HitoAgendaReserva[] = [];

  for (const res of reservas) {
    const { vehiculo } = res;

    if (res.estado === 'PENDIENTE') {
      hitos.push({
        id: `${res.codigo}-verif`,
        codigoReserva: res.codigo,
        vehiculoId: vehiculo.id,
        fechaISO: res.fechaInicio,
        rangoHora: '08:00 AM - 08:45 AM',
        titulo: `VALIDACIÓN DE SOLICITUD · ${res.codigo}`,
        subtitulo: `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa}) · Verificación de licencia y abono`,
        tipo: 'VERIFICACION_PATIO',
        placa: vehiculo.placa,
        esCancelable: true,
      });
    }

    hitos.push({
      id: `${res.codigo}-entrega`,
      codigoReserva: res.codigo,
      vehiculoId: vehiculo.id,
      fechaISO: res.fechaInicio,
      rangoHora: '09:00 AM - 09:40 AM',
      titulo: `ENTREGA E INSPECCIÓN R2 · ${vehiculo.marca.toUpperCase()}`,
      subtitulo: `Acta fotográfica pericial en ${res.sedeNombre} · Placa ${vehiculo.placa}`,
      tipo: 'ENTREGA_R2',
      placa: vehiculo.placa,
      esCancelable: res.estado === 'PENDIENTE',
    });

    const totalDias = calcularDiasInclusivos(res.fechaInicio, res.fechaFin);
    for (let offset = 0; offset < totalDias; offset++) {
      const fechaCursor = sumarDiasISO(res.fechaInicio, offset);
      const esPrimerDia = fechaCursor === res.fechaInicio;
      const esUltimoDia = fechaCursor === res.fechaFin;

      if (!esPrimerDia && !esUltimoDia) {
        hitos.push({
          id: `${res.codigo}-dia-${offset}`,
          codigoReserva: res.codigo,
          vehiculoId: vehiculo.id,
          fechaISO: fechaCursor,
          rangoHora: '10:00 AM - 06:00 PM',
          titulo: `COBERTURA ACTIVA · ${vehiculo.marca.toUpperCase()} ${vehiculo.placa}`,
          subtitulo: `Día ${offset + 1} de ${totalDias} · Asistencia en ruta y telemetría habilitadas`,
          tipo: 'ALQUILER_EN_CURSO',
          placa: vehiculo.placa,
          esCancelable: false,
        });
      }
    }

    hitos.push({
      id: `${res.codigo}-devolucion`,
      codigoReserva: res.codigo,
      vehiculoId: vehiculo.id,
      fechaISO: res.fechaFin,
      rangoHora: '05:30 PM - 06:15 PM',
      titulo: `DEVOLUCIÓN Y LIBERACIÓN DE GARANTÍA`,
      subtitulo: `Cierre de contrato ${res.codigo} · Retorno de ${vehiculo.marca} (${vehiculo.placa})`,
      tipo: 'DEVOLUCION_CIERRE',
      placa: vehiculo.placa,
      esCancelable: false,
    });
  }

  return hitos.sort((a, b) => {
    if (a.fechaISO !== b.fechaISO) {
      return a.fechaISO.localeCompare(b.fechaISO);
    }
    return a.rangoHora.localeCompare(b.rangoHora);
  });
}

/**
 * Construye la matriz de 7 columnas del Calendario Editorial Suizo.
 */
export function construirCalendarioSuizoReservas(
  anio: number,
  mesIndexCero: number,
  reservaActiva: ReservaClienteItem | null,
  todasLasReservas: readonly ReservaClienteItem[],
  hoyISO: string
): CalendarioSuizoReservasMes {
  const hitos = generarHitosDeReservas(todasLasReservas);
  const conteoHitosPorFecha = new Map<string, number>();
  for (const h of hitos) {
    conteoHitosPorFecha.set(h.fechaISO, (conteoHitosPorFecha.get(h.fechaISO) ?? 0) + 1);
  }

  const primerDiaMesUTC = new Date(Date.UTC(anio, mesIndexCero, 1, 12, 0, 0));
  const totalDiasMes = new Date(
    Date.UTC(anio, mesIndexCero + 1, 0, 12, 0, 0)
  ).getUTCDate();
  const offsetLunes = (primerDiaMesUTC.getUTCDay() + 6) % 7;

  const totalCeldasOcupadas = offsetLunes + totalDiasMes;
  const celdasRestantesFin = (7 - (totalCeldasOcupadas % 7)) % 7;
  const totalCeldasMatriz = totalCeldasOcupadas + celdasRestantesFin;

  const celdas: CeldaCalendarioSuizo[] = [];

  for (let i = 0; i < totalCeldasMatriz; i++) {
    const desplazamientoDia = i - offsetLunes + 1;
    const dt = new Date(Date.UTC(anio, mesIndexCero, desplazamientoDia, 12, 0, 0));
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth();
    const d = dt.getUTCDate();
    const fechaISO = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const diaSemanaIndice = (dt.getUTCDay() + 6) % 7;
    const esMesActual = m === mesIndexCero && y === anio;
    const esHoy = fechaISO === hoyISO;

    const enReservaActiva = Boolean(
      reservaActiva &&
        fechaISO >= reservaActiva.fechaInicio &&
        fechaISO <= reservaActiva.fechaFin
    );
    const esInicioReservaActiva = Boolean(
      reservaActiva && fechaISO === reservaActiva.fechaInicio
    );
    const esFinReservaActiva = Boolean(
      reservaActiva && fechaISO === reservaActiva.fechaFin
    );

    const cantidadHitos = conteoHitosPorFecha.get(fechaISO) ?? 0;
    const tieneHito = cantidadHitos > 0;

    let estadoVisual: EstadoCeldaSuiza = 'DIA_REGULAR';
    if (!esMesActual) {
      estadoVisual = 'FUERA_DE_MES';
    } else if (enReservaActiva) {
      estadoVisual = 'RESERVA_ACTIVA';
    } else if (tieneHito) {
      estadoVisual = 'HITO_PROGRAMADO';
    }

    celdas.push({
      fechaISO,
      numeroDia: d,
      diaSemanaIndice,
      esMesActual,
      esHoy,
      enReservaActiva,
      esInicioReservaActiva,
      esFinReservaActiva,
      tieneHito,
      cantidadHitos,
      estadoVisual,
    });
  }

  return {
    anio,
    mesIndexCero,
    nombreMes: obtenerNombreMesEditorial(mesIndexCero),
    nombreMesCapitalizado: MESES_CAPITALIZADOS[mesIndexCero % 12] ?? 'Octubre',
    celdas,
  };
}

export function formatearRangoReservaHumano(
  fechaInicio: string,
  fechaFin: string
): string {
  return `${formatearFechaCorta(fechaInicio)} – ${formatearFechaCorta(fechaFin)}`;
}
