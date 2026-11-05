import type { AppDb } from '@/lib/db';
import {
  user,
  localesAlquiler,
  miembrosLocal,
  politicasLocal,
  vehiculos,
  documentosVehiculo,
  multimediaVehiculo,
  plantillasInspeccion,
  reservas,
  contratosAlquiler,
  inspeccionesPericiales,
  puntosInspeccionR2,
  mantenimientosVehiculo,
  cuentasFinancieras,
  sesionesCaja,
  movimientosCaja,
  depositosGarantia,
  type PoliticaLocalInsert,
  type VehiculoInsert,
  type DocumentoVehiculoInsert,
  type MultimediaVehiculoInsert,
  type PlantillaInspeccionInsert,
  type ReservaInsert,
  type ContratoAlquilerInsert,
  type InspeccionPericialInsert,
  type PuntoInspeccionR2Insert,
  type MantenimientoVehiculoInsert,
  type CuentaFinancieraInsert,
  type SesionCajaInsert,
  type MovimientoCajaInsert,
  type DepositoGarantiaInsert,
} from '@/db/schema';
import {
  calcularDiasInclusivos,
  sumarDiasISO,
} from '@/lib/flota/disponibilidad';
import { asegurarConfiguracionBaseLocal } from '@/lib/flota/locales-captacion';
import { eq } from 'drizzle-orm';

export const SEED_LOCAL_PATIO_NORTE_ID = 'local-patio-norte';
export const SEED_DUENO_USER_ID = 'usr-dueno-patio-norte';
export const SEED_SANTIAGO_USER_ID = '0jST3HpxfeawMCXTErSeGVU5PVJGNVQT';

/**
 * Ejecuta el seed idempotente de demostración en Cloudflare D1 (local, preview o producción).
 * Inserta sede principal, políticas comerciales, flota de 6 unidades con especificaciones Bento,
 * documentos legales, galería multimedia longitudinal R2 (fotos y videos con posterR2Key),
 * plantillas de inspección por categoría, reservas activas, contratos de alquiler,
 * inspecciones periciales R2, mantenimientos programados y caja operativa.
 */
export async function ejecutarSeedDemostracionD1(
  db: AppDb,
  hoyISO: string = new Date().toISOString().slice(0, 10)
): Promise<{ ok: boolean; insertados: Record<string, number> }> {
  const ahora = new Date();

  // 1. Usuarios semilla (Dueño y Clientes de demostración)
  const usuariosSemilla: (typeof user.$inferInsert)[] = [
    {
      id: SEED_DUENO_USER_ID,
      name: 'Santiago Operador Principal',
      email: 'operaciones@flotax.innovaweb.pro',
      emailVerified: true,
      telefono: '+57 300 910 2030',
      tipoDocumento: 'CC',
      numeroDocumento: '1037600100',
      esSuperAdmin: true,
      localOrigenId: SEED_LOCAL_PATIO_NORTE_ID,
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
    },
    {
      id: SEED_SANTIAGO_USER_ID,
      name: 'Santiago Prada Moreno',
      email: 'santiagopradamoreno@gmail.com',
      emailVerified: true,
      telefono: '+57 300 450 8890',
      tipoDocumento: 'CC',
      numeroDocumento: '1037600100',
      esSuperAdmin: true,
      localOrigenId: SEED_LOCAL_PATIO_NORTE_ID,
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
    },
    {
      id: 'usr-mateo-restrepo',
      name: 'Mateo Restrepo Vélez',
      email: 'mateo.restrepo@empresa.co',
      emailVerified: true,
      telefono: '+57 300 418 9204',
      tipoDocumento: 'CC',
      numeroDocumento: '1.037.648.912',
      esSuperAdmin: false,
      localOrigenId: SEED_LOCAL_PATIO_NORTE_ID,
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
    },
    {
      id: 'usr-valeria-gomez',
      name: 'Valeria Gómez Arango',
      email: 'valeria.gomez@estudio.co',
      emailVerified: true,
      telefono: '+57 314 820 5519',
      tipoDocumento: 'CC',
      numeroDocumento: '1.152.409.381',
      esSuperAdmin: false,
      localOrigenId: SEED_LOCAL_PATIO_NORTE_ID,
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
    },
    {
      id: 'usr-sebastian-correa',
      name: 'Sebastián Correa Londoño',
      email: 's.correa@inversiones.co',
      emailVerified: true,
      telefono: '+57 310 694 1180',
      tipoDocumento: 'CC',
      numeroDocumento: '71.384.209',
      esSuperAdmin: false,
      localOrigenId: SEED_LOCAL_PATIO_NORTE_ID,
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
    },
  ];

  for (const usr of usuariosSemilla) {
    await db.insert(user).values(usr).onConflictDoNothing();
  }

  // 2. Locales de alquiler y membresía del dueño
  const localesSemilla: (typeof localesAlquiler.$inferInsert)[] = [
    {
      id: SEED_LOCAL_PATIO_NORTE_ID,
      nombre: 'Patio Norte Medellín',
      slug: 'patio-norte',
      ciudad: 'Medellín',
      direccion: 'Cra. 43A #18 Sur-135, El Poblado, Medellín',
      telefono: '+57 300 910 2030',
      duenoId: SEED_DUENO_USER_ID,
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
    {
      id: 'local-medellin-principal',
      nombre: 'Sede Principal El Poblado',
      slug: 'medellin-principal',
      ciudad: 'Medellín',
      direccion: 'Av. El Poblado #10-45, Medellín',
      telefono: '+57 300 910 2030',
      duenoId: SEED_DUENO_USER_ID,
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
  ];

  for (const loc of localesSemilla) {
    await db.insert(localesAlquiler).values(loc).onConflictDoNothing();
  }

  await db
    .insert(miembrosLocal)
    .values([
      {
        id: 'mbr-dueno-patio-norte',
        localId: SEED_LOCAL_PATIO_NORTE_ID,
        usuarioId: SEED_DUENO_USER_ID,
        rol: 'DUENO',
        activo: true,
        onboardingCompletado: true,
        creadoEn: ahora,
      },
      {
        id: 'mbr-santiago-patio-norte',
        localId: SEED_LOCAL_PATIO_NORTE_ID,
        usuarioId: SEED_SANTIAGO_USER_ID,
        rol: 'DUENO',
        activo: true,
        onboardingCompletado: true,
        creadoEn: ahora,
      },
    ])
    .onConflictDoNothing();

  // 3. Políticas operativas y contractuales del local
  const politicaSemilla: PoliticaLocalInsert = {
    id: 'pol-patio-norte',
    localId: SEED_LOCAL_PATIO_NORTE_ID,
    abonoMinimoPct: 30,
    coberturaPericialPct: 8,
    recargoMoraDiariaPct: 200,
    recargoAdminFotomultaPct: 30,
    cargoLavadoEstandar: 45000,
    limiteKmDiario: null,
    cargoKmAdicional: 0,
    nitArrendador: '901.482.109-4 · FlotaX Mobility S.A.S.',
    representanteLegal: 'Santiago Operador Principal',
    municipioContractual: 'Medellín, Antioquia',
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
  await db.insert(politicasLocal).values(politicaSemilla).onConflictDoNothing();

  // 4. Flota canónica de 6 vehículos
  const vehiculosSemilla: VehiculoInsert[] = [
    {
      id: 'veh-mercedes-eqb',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      marca: 'Mercedes-Benz',
      modelo: 'EQB 350 4MATIC Luxury',
      anio: 2024,
      categoria: 'SUV',
      categoriaEtiqueta: 'SUV Eléctrica',
      placa: 'FLX-801',
      color: 'Blanco Polar Metalizado',
      numeroMotor: 'EM-780350-4M',
      numeroChasis: 'W1N2437921A084921',
      valorComercial: 265_000_000,
      unidadMedidaUso: 'KM',
      estado: 'DISPONIBLE',
      precioDia: 280000,
      depositoGarantia: 750000,
      transmision: 'Automática',
      combustible: 'Eléctrico',
      capacidadPasajeros: 7,
      autonomiaKm: 420,
      kilometraje: 9400,
      imagenUrl: '/images/vehiculos/white-suv.webp',
      destacado: true,
      descripcion:
        'SUV eléctrica familiar de 7 plazas con tracción integral 4MATIC, techo panorámico y asistente de conducción inteligente MBUX.',
      aceleracion: '3.8 s',
      velocidadMaxima: '210 km/h',
      rating: 4.8,
      autonomiaOdo: '420 km',
      specsBento: {
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
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
    {
      id: 'veh-bmw-m2-coupe',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      marca: 'BMW',
      modelo: 'M2 Competition Coupe',
      anio: 2024,
      categoria: 'SEDAN',
      categoriaEtiqueta: 'Coupe Deportivo',
      placa: 'BMW-240',
      color: 'Gris Brooklyn M',
      numeroMotor: 'S58B30T0-9921',
      numeroChasis: 'WBS12DM0908B24019',
      valorComercial: 340_000_000,
      unidadMedidaUso: 'KM',
      estado: 'DISPONIBLE',
      precioDia: 260000,
      depositoGarantia: 900000,
      transmision: 'Automática',
      combustible: 'Gasolina',
      capacidadPasajeros: 4,
      autonomiaKm: null,
      kilometraje: 14200,
      imagenUrl: '/images/vehiculos/dark-coupe.webp',
      destacado: true,
      descripcion:
        'Coupe deportivo de alto rendimiento con motor M TwinPower Turbo de 460 CV, diferencial M activo y chasís adaptativo.',
      aceleracion: '4.2 s',
      velocidadMaxima: '250 km/h',
      rating: 4.9,
      autonomiaOdo: '14.200 km',
      specsBento: {
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
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
    {
      id: 'veh-mazda-cx30',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      marca: 'Mazda',
      modelo: 'CX-30 Grand Touring Soul',
      anio: 2024,
      categoria: 'SUV',
      categoriaEtiqueta: 'SUV Urbana',
      placa: 'MOV-304',
      color: 'Rojo Soul Crystal',
      numeroMotor: 'PY-3049182',
      numeroChasis: '3MVDMBDL6RM304918',
      valorComercial: 142_000_000,
      unidadMedidaUso: 'KM',
      estado: 'DISPONIBLE',
      precioDia: 195000,
      depositoGarantia: 500000,
      transmision: 'Automática',
      combustible: 'Gasolina',
      capacidadPasajeros: 5,
      autonomiaKm: null,
      kilometraje: 21500,
      imagenUrl: '/images/vehiculos/mazda-cx30.webp',
      destacado: true,
      descripcion:
        'Diseño Kodo en Rojo Soul Crystal con sistema de sonido envolvente Bose, tracción i-Activ AWD y máximo confort ejecutivo.',
      aceleracion: '7.8 s',
      velocidadMaxima: '198 km/h',
      rating: 4.9,
      autonomiaOdo: '21.500 km',
      specsBento: {
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
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
    {
      id: 'veh-quantum-sedan',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      marca: 'Quantum',
      modelo: 'Premier EV Long Range',
      anio: 2024,
      categoria: 'SEDAN',
      categoriaEtiqueta: 'Sedán Eléctrico',
      placa: 'QNT-090',
      color: 'Plata Titanio',
      numeroMotor: 'BLD-EV-09021',
      numeroChasis: 'LGXCE6CB0R0090211',
      valorComercial: 158_000_000,
      unidadMedidaUso: 'KM',
      estado: 'DISPONIBLE',
      precioDia: 160000,
      depositoGarantia: 450000,
      transmision: 'Automática',
      combustible: 'Eléctrico',
      capacidadPasajeros: 5,
      autonomiaKm: 520,
      kilometraje: 11000,
      imagenUrl: '/images/vehiculos/sedan-premier.webp',
      destacado: false,
      descripcion:
        'Sedán aerodinámico de cero emisiones con batería blade de 520 km de autonomía y carga ultrarrápida del 20% al 80% en 25 minutos.',
      aceleracion: '6.5 s',
      velocidadMaxima: '190 km/h',
      rating: 4.7,
      autonomiaOdo: '520 km',
      specsBento: {
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
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
    {
      id: 'veh-yamaha-mt03',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      marca: 'Yamaha',
      modelo: 'MT-03 ABS Hyper Naked',
      anio: 2024,
      categoria: 'MOTO',
      categoriaEtiqueta: 'Motocicleta Urbana',
      placa: 'YMH-99A',
      color: 'Gris Storm Cyan',
      numeroMotor: 'H402E-099124',
      numeroChasis: 'MH3RH12Y0RK099124',
      valorComercial: 32_500_000,
      unidadMedidaUso: 'KM',
      estado: 'DISPONIBLE',
      precioDia: 95000,
      depositoGarantia: 300000,
      transmision: 'Manual',
      combustible: 'Gasolina',
      capacidadPasajeros: 2,
      autonomiaKm: null,
      kilometraje: 8600,
      imagenUrl: '/images/vehiculos/yamaha-mt03.webp',
      destacado: true,
      descripcion:
        'Bicilíndrica ligera de 321cc con postura erguida, iluminación full LED y frenos ABS de doble canal para máxima agilidad en el tráfico.',
      aceleracion: '5.1 s',
      velocidadMaxima: '175 km/h',
      rating: 4.8,
      autonomiaOdo: '8.600 km',
      specsBento: {
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
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
    {
      id: 'veh-volt-scooter',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      marca: 'Volt Striker',
      modelo: 'Striker X Dual Motor',
      anio: 2024,
      categoria: 'PATINETA',
      categoriaEtiqueta: 'Monopatín Eléctrico',
      placa: 'VLT-012',
      color: 'Negro Mate Anodizado',
      numeroMotor: 'VLT-2400W-012',
      numeroChasis: 'VLTSTRX202400012',
      valorComercial: 7_800_000,
      unidadMedidaUso: 'KM',
      estado: 'DISPONIBLE',
      precioDia: 42000,
      depositoGarantia: 150000,
      transmision: 'Eléctrica',
      combustible: 'Eléctrico',
      capacidadPasajeros: 1,
      autonomiaKm: 65,
      kilometraje: 520,
      imagenUrl: '/images/vehiculos/scooter-pro.webp',
      destacado: false,
      descripcion:
        'Micromovilidad de doble motor de alta gama con suspensión hidráulica delantera/trasera y frenos de disco ventilados.',
      aceleracion: '3.2 s',
      velocidadMaxima: '45 km/h',
      rating: 4.6,
      autonomiaOdo: '65 km',
      specsBento: {
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
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
  ];

  for (const veh of vehiculosSemilla) {
    await db.insert(vehiculos).values(veh).onConflictDoNothing();
  }

  // 5. Documentos legales vigentes por vehículo
  const vencimientoAnual = sumarDiasISO(hoyISO, 280);
  const documentosSemilla: DocumentoVehiculoInsert[] = vehiculosSemilla.flatMap((v) => [
    {
      id: `doc-soat-${v.id}`,
      vehiculoId: v.id,
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      tipoDocumento: 'SOAT',
      numeroReferencia: `SOAT-2026-${v.placa}`,
      entidadEmisora: 'Seguros Sura Colombia',
      fechaExpedicion: sumarDiasISO(hoyISO, -85),
      fechaVencimiento: vencimientoAnual,
      vigente: true,
      archivoR2Key: `locales/${SEED_LOCAL_PATIO_NORTE_ID}/vehiculos/${v.id}/documentos/SOAT-2026.pdf`,
      observaciones: 'Póliza SOAT verificada en RUNT',
      verificadoPorId: SEED_DUENO_USER_ID,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
    {
      id: `doc-poliza-${v.id}`,
      vehiculoId: v.id,
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      tipoDocumento: 'POLIZA_TODO_RIESGO',
      numeroReferencia: `PTR-880-${v.placa}`,
      entidadEmisora: 'Allianz Seguros Flotas',
      fechaExpedicion: sumarDiasISO(hoyISO, -85),
      fechaVencimiento: vencimientoAnual,
      vigente: true,
      archivoR2Key: `locales/${SEED_LOCAL_PATIO_NORTE_ID}/vehiculos/${v.id}/documentos/POLIZA-2026.pdf`,
      observaciones: 'Póliza todo riesgo corporativa vigente',
      verificadoPorId: SEED_DUENO_USER_ID,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
  ]);

  for (const doc of documentosSemilla) {
    await db.insert(documentosVehiculo).values(doc).onConflictDoNothing();
  }

  // 6. Plantillas de inspección pericial por categoría
  const plantillasSemilla: PlantillaInspeccionInsert[] = [
    {
      id: 'plt-suv-v1',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      categoriaVehiculo: 'SUV',
      nombre: 'Protocolo Pericial SUV & 4MATIC R2',
      version: 1,
      unidadMedidaUso: 'KM',
      itemsDefinicion: [
        {
          codigo: 'r2-carroceria',
          nombre: 'Carrocería y Pintura Superior',
          categoriaSeccion: 'EXTERIOR',
          tipoRespuesta: 'ESTADO',
          obligatorio: true,
          exigeFotoEnNovedad: true,
        },
        {
          codigo: 'r2-rodaje',
          nombre: 'Tren Delantero y Rines',
          categoriaSeccion: 'RODAJE',
          tipoRespuesta: 'ESTADO',
          obligatorio: true,
          exigeFotoEnNovedad: true,
        },
        {
          codigo: 'r2-telemetria',
          nombre: 'Odómetro y Batería / Tanque',
          categoriaSeccion: 'CABINA_TELEMETRIA',
          tipoRespuesta: 'NIVEL',
          obligatorio: true,
          exigeFotoEnNovedad: true,
        },
      ],
      activo: true,
      creadoEn: ahora,
    },
    {
      id: 'plt-sedan-v1',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      categoriaVehiculo: 'SEDAN',
      nombre: 'Protocolo Pericial Coupe & Sedán Ejecutivo R2',
      version: 1,
      unidadMedidaUso: 'KM',
      itemsDefinicion: [
        {
          codigo: 'r2-carroceria',
          nombre: 'Carrocería y Spoilers',
          categoriaSeccion: 'EXTERIOR',
          tipoRespuesta: 'ESTADO',
          obligatorio: true,
          exigeFotoEnNovedad: true,
        },
        {
          codigo: 'r2-rodaje',
          nombre: 'Rines Deportivos y Frenos',
          categoriaSeccion: 'RODAJE',
          tipoRespuesta: 'ESTADO',
          obligatorio: true,
          exigeFotoEnNovedad: true,
        },
        {
          codigo: 'r2-telemetria',
          nombre: 'Cluster Digital y Nivel Carga/Combustible',
          categoriaSeccion: 'CABINA_TELEMETRIA',
          tipoRespuesta: 'NIVEL',
          obligatorio: true,
          exigeFotoEnNovedad: true,
        },
      ],
      activo: true,
      creadoEn: ahora,
    },
  ];

  for (const plt of plantillasSemilla) {
    await db.insert(plantillasInspeccion).values(plt).onConflictDoNothing();
  }

  // 7. Reservas canónicas de demostración (Separadas de Contratos)
  const inicio1 = sumarDiasISO(hoyISO, -1);
  const fin1 = sumarDiasISO(hoyISO, 3);
  const dias1 = calcularDiasInclusivos(inicio1, fin1);
  const subtotal1 = dias1 * 280000;
  const cobertura1 = Math.round(subtotal1 * 0.08);
  const total1 = subtotal1 + cobertura1;

  const inicio2 = sumarDiasISO(hoyISO, 1);
  const fin2 = sumarDiasISO(hoyISO, 4);
  const dias2 = calcularDiasInclusivos(inicio2, fin2);
  const subtotal2 = dias2 * 195000;
  const cobertura2 = Math.round(subtotal2 * 0.08);
  const total2 = subtotal2 + cobertura2;

  const inicio3 = sumarDiasISO(hoyISO, 8);
  const fin3 = sumarDiasISO(hoyISO, 11);
  const dias3 = calcularDiasInclusivos(inicio3, fin3);
  const subtotal3 = dias3 * 260000;
  const cobertura3 = Math.round(subtotal3 * 0.08);
  const total3 = subtotal3 + cobertura3;

  const reservasSemilla: ReservaInsert[] = [
    {
      id: 'res-flx-849210',
      codigo: 'FLX-849210',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      vehiculoId: 'veh-mercedes-eqb',
      clienteId: 'usr-mateo-restrepo',
      fechaInicio: inicio1,
      fechaFin: fin1,
      diasAlquiler: dias1,
      estado: 'EN_CURSO',
      modalidadEntrega: 'PATIO_PRINCIPAL',
      direccionEntrega: null,
      sedeNombre: 'Patio Norte Medellín',
      precioDiaCotizado: 280000,
      subtotalTarifaCotizado: subtotal1,
      coberturaPericialCotizada: cobertura1,
      totalCotizado: total1,
      modalidadPagoInicial: 'TOTAL_100',
      metodoAbonoInicial: 'TRANSFERENCIA_PSE',
      montoAbonoReportado: total1,
      referenciaAbonoInicial: 'TR-BC-849210',
      contactoNombre: 'Mateo Restrepo Vélez',
      contactoTipoDocumento: 'CC',
      contactoNumeroDocumento: '1.037.648.912',
      contactoCategoriaLicencia: 'B1',
      contactoTelefono: '+57 300 418 9204',
      contactoCorreo: 'mateo.restrepo@empresa.co',
      ley1581Aceptada: true,
      motivoRechazo: null,
      creadoPorId: SEED_DUENO_USER_ID,
      confirmadoPorId: SEED_DUENO_USER_ID,
      creadoEn: new Date(`${inicio1}T08:30:00.000Z`),
      actualizadoEn: ahora,
    },
    {
      id: 'res-flx-309418',
      codigo: 'FLX-309418',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      vehiculoId: 'veh-mazda-cx30',
      clienteId: 'usr-valeria-gomez',
      fechaInicio: inicio2,
      fechaFin: fin2,
      diasAlquiler: dias2,
      estado: 'PENDIENTE',
      modalidadEntrega: 'PATIO_PRINCIPAL',
      direccionEntrega: null,
      sedeNombre: 'Patio Norte Medellín',
      precioDiaCotizado: 195000,
      subtotalTarifaCotizado: subtotal2,
      coberturaPericialCotizada: cobertura2,
      totalCotizado: total2,
      modalidadPagoInicial: 'ABONO_30',
      metodoAbonoInicial: 'NEQUI_BREB',
      montoAbonoReportado: Math.round(total2 * 0.3),
      referenciaAbonoInicial: 'NQ-309418',
      contactoNombre: 'Valeria Gómez Arango',
      contactoTipoDocumento: 'CC',
      contactoNumeroDocumento: '1.152.409.381',
      contactoCategoriaLicencia: 'B1',
      contactoTelefono: '+57 314 820 5519',
      contactoCorreo: 'valeria.gomez@estudio.co',
      ley1581Aceptada: true,
      motivoRechazo: null,
      creadoPorId: 'usr-valeria-gomez',
      confirmadoPorId: null,
      creadoEn: new Date(`${hoyISO}T09:15:00.000Z`),
      actualizadoEn: ahora,
    },
    {
      id: 'res-flx-512094',
      codigo: 'FLX-512094',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      vehiculoId: 'veh-bmw-m2-coupe',
      clienteId: 'usr-sebastian-correa',
      fechaInicio: inicio3,
      fechaFin: fin3,
      diasAlquiler: dias3,
      estado: 'CONFIRMADA',
      modalidadEntrega: 'DOMICILIO_MEDELLIN',
      direccionEntrega: 'Cra. 35 #7-50, Provenza, El Poblado',
      sedeNombre: 'Sede El Poblado',
      precioDiaCotizado: 260000,
      subtotalTarifaCotizado: subtotal3,
      coberturaPericialCotizada: cobertura3,
      totalCotizado: total3,
      modalidadPagoInicial: 'ABONO_30',
      metodoAbonoInicial: 'TARJETA',
      montoAbonoReportado: Math.round(total3 * 0.3),
      referenciaAbonoInicial: 'BA-TX-512094',
      contactoNombre: 'Sebastián Correa Londoño',
      contactoTipoDocumento: 'CC',
      contactoNumeroDocumento: '71.384.209',
      contactoCategoriaLicencia: 'B2',
      contactoTelefono: '+57 310 694 1180',
      contactoCorreo: 's.correa@inversiones.co',
      ley1581Aceptada: true,
      motivoRechazo: null,
      creadoPorId: SEED_DUENO_USER_ID,
      confirmadoPorId: SEED_DUENO_USER_ID,
      creadoEn: new Date(`${hoyISO}T10:15:00.000Z`),
      actualizadoEn: ahora,
    },
  ];

  for (const res of reservasSemilla) {
    await db.insert(reservas).values(res).onConflictDoNothing();
  }

  // 8. Contratos de alquiler (1:1 con reservas en curso)
  const contratosSemilla: ContratoAlquilerInsert[] = [
    {
      id: 'ctr-flx-849210',
      numeroContrato: 'FLX-849210',
      reservaId: 'res-flx-849210',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      vehiculoId: 'veh-mercedes-eqb',
      clienteId: 'usr-mateo-restrepo',
      arrendatarioNombre: 'Mateo Restrepo Vélez',
      arrendatarioTipoDocumento: 'CC',
      arrendatarioNumeroDocumento: '1.037.648.912',
      arrendatarioCiudadExpedicion: 'Medellín',
      arrendatarioLicenciaNumero: '1037648912',
      arrendatarioLicenciaCategoria: 'B1',
      arrendatarioDomicilio: 'Calle 10B #36-20, El Poblado, Medellín',
      arrendatarioTelefono: '+57 300 418 9204',
      arrendatarioCorreo: 'mateo.restrepo@empresa.co',
      ley1581Aceptada: true,
      trasladoFotomultasAceptado: true,
      pagareBlancoFirmado: true,
      fechaHoraEntregaReal: new Date(`${inicio1}T09:10:00.000Z`),
      fechaHoraDevolucionPactada: new Date(`${fin1}T17:00:00.000Z`),
      fechaHoraDevolucionReal: null,
      medidorUsoEntrega: 9400,
      medidorUsoRetorno: null,
      nivelEnergiaEntregaPct: 100,
      nivelEnergiaRetornoPct: null,
      canonDiarioPactado: 280000,
      subtotalCanon: subtotal1,
      coberturaPericial: cobertura1,
      cargosMora: 0,
      cargosNovedadesDanos: 0,
      cargosCombustibleLavado: 0,
      totalLiquidado: total1,
      totalPagado: total1,
      saldoPendiente: 0,
      estadoPago: 'PAGADO',
      estadoContrato: 'VIGENTE',
      firmaArrendadorR2Key: `locales/${SEED_LOCAL_PATIO_NORTE_ID}/vehiculos/veh-mercedes-eqb/reservas/FLX-849210/contrato/firma-arrendador.webp`,
      firmaArrendatarioR2Key: `locales/${SEED_LOCAL_PATIO_NORTE_ID}/vehiculos/veh-mercedes-eqb/reservas/FLX-849210/contrato/firma-cliente.webp`,
      contratoPdfR2Key: `locales/${SEED_LOCAL_PATIO_NORTE_ID}/vehiculos/veh-mercedes-eqb/reservas/FLX-849210/contrato/FLX-849210.pdf`,
      creadoEn: new Date(`${inicio1}T09:00:00.000Z`),
      actualizadoEn: ahora,
    },
  ];

  for (const ctr of contratosSemilla) {
    await db.insert(contratosAlquiler).values(ctr).onConflictDoNothing();
  }

  // 9. Acta de Inspección Pericial de Entrega
  const inspeccionSalidaSemilla: InspeccionPericialInsert = {
    id: 'insp-salida-flx-849210',
    localId: SEED_LOCAL_PATIO_NORTE_ID,
    reservaId: 'res-flx-849210',
    contratoId: 'ctr-flx-849210',
    vehiculoId: 'veh-mercedes-eqb',
    plantillaId: 'plt-suv-v1',
    plantillaVersion: 1,
    tipoActo: 'ENTREGA',
    inspectorId: SEED_DUENO_USER_ID,
    medidorUso: 9400,
    nivelEnergiaPct: 100,
    estadoGeneral: 'IMPECABLE',
    respuestasChecklist: [
      {
        codigo: 'r2-carroceria',
        nombre: 'Carrocería y Pintura Superior',
        estado: 'BIEN',
        observacion: 'Sellado cerámico verificado sin rayones',
        multimediaIds: ['med-entrega-carroceria-flx849210'],
      },
      {
        codigo: 'r2-rodaje',
        nombre: 'Tren Delantero y Rines',
        estado: 'BIEN',
        observacion: 'Presión calibrada a 36 PSI',
        multimediaIds: ['med-entrega-video360-flx849210'],
      },
      {
        codigo: 'r2-telemetria',
        nombre: 'Odómetro y Batería / Tanque',
        estado: 'BIEN',
        valorTextoONumero: '9.400 km · 100%',
        multimediaIds: ['med-entrega-odometro-flx849210'],
      },
    ],
    observaciones:
      'Unidad verificada en Patio Norte con pintura cerámica original y carga al 100%.',
    firmaClienteR2Key: `locales/${SEED_LOCAL_PATIO_NORTE_ID}/vehiculos/veh-mercedes-eqb/reservas/FLX-849210/actas/firma-cliente.webp`,
    firmaResponsableR2Key: `locales/${SEED_LOCAL_PATIO_NORTE_ID}/vehiculos/veh-mercedes-eqb/reservas/FLX-849210/actas/firma-inspector.webp`,
    actaPdfR2Key: `locales/${SEED_LOCAL_PATIO_NORTE_ID}/vehiculos/veh-mercedes-eqb/reservas/FLX-849210/actas/acta-entrega.pdf`,
    iniciadaEn: new Date(`${inicio1}T08:50:00.000Z`),
    finalizadaEn: new Date(`${inicio1}T08:58:00.000Z`),
    creadoEn: new Date(`${inicio1}T08:58:00.000Z`),
  };

  await db
    .insert(inspeccionesPericiales)
    .values(inspeccionSalidaSemilla)
    .onConflictDoNothing();

  // 10. Historial Multimedia Longitudinal R2 (Fotos Estudio + Evidencia de Entrega e Inspección + Video Walkaround con poster_r2_key)
  const multimediaSemilla: MultimediaVehiculoInsert[] = [
    ...vehiculosSemilla.map((veh, idx): MultimediaVehiculoInsert => ({
      id: `med-estudio-principal-${veh.id}`,
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      vehiculoId: veh.id,
      reservaId: null,
      contratoId: null,
      inspeccionId: null,
      mantenimientoId: null,
      tipoMedio: 'IMAGEN',
      etapaOperativa: 'CATALOGO_ESTUDIO',
      zonaEvidencia: 'ANGULO_ESTUDIO_360',
      anguloEstudio: 'ESTUDIO_3_4',
      esPortadaCatalogo: true,
      ordenVisual: idx + 1,
      r2Key: veh.imagenUrl,
      posterR2Key: null,
      mimeType: 'image/webp',
      tamanoBytes: 184320,
      anchoPx: 1600,
      altoPx: 1000,
      duracionSegundos: null,
      sha256Hash: `sha256-estudio-${veh.id}`,
      medidorUsoMomento: veh.kilometraje,
      observacion: `Fotografía oficial de estudio para catálogo (${veh.marca} ${veh.modelo})`,
      subidoPorId: SEED_DUENO_USER_ID,
      capturadoEn: ahora,
      creadoEn: ahora,
    })),
    {
      id: 'med-entrega-carroceria-flx849210',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      vehiculoId: 'veh-mercedes-eqb',
      reservaId: 'res-flx-849210',
      contratoId: 'ctr-flx-849210',
      inspeccionId: 'insp-salida-flx-849210',
      mantenimientoId: null,
      tipoMedio: 'IMAGEN',
      etapaOperativa: 'ENTREGA_SALIDA',
      zonaEvidencia: 'EXTERIOR_FRONTAL',
      anguloEstudio: null,
      esPortadaCatalogo: false,
      ordenVisual: 1,
      r2Key: `locales/${SEED_LOCAL_PATIO_NORTE_ID}/vehiculos/veh-mercedes-eqb/reservas/FLX-849210/ENTREGA_SALIDA/EXTERIOR_FRONTAL/frontal-salida.webp`,
      posterR2Key: null,
      mimeType: 'image/webp',
      tamanoBytes: 215040,
      anchoPx: 1920,
      altoPx: 1080,
      duracionSegundos: null,
      sha256Hash: 'sha256-entrega-carroceria-849210',
      medidorUsoMomento: 9400,
      observacion: 'Pintura Original Sin Rayones · Sellado cerámico verificado en salida',
      subidoPorId: SEED_DUENO_USER_ID,
      capturadoEn: new Date(`${inicio1}T08:55:00.000Z`),
      creadoEn: new Date(`${inicio1}T08:55:00.000Z`),
    },
    {
      id: 'med-entrega-odometro-flx849210',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      vehiculoId: 'veh-mercedes-eqb',
      reservaId: 'res-flx-849210',
      contratoId: 'ctr-flx-849210',
      inspeccionId: 'insp-salida-flx-849210',
      mantenimientoId: null,
      tipoMedio: 'IMAGEN',
      etapaOperativa: 'ENTREGA_SALIDA',
      zonaEvidencia: 'PANTALLA_TABLERO_ODOMETRO',
      anguloEstudio: null,
      esPortadaCatalogo: false,
      ordenVisual: 2,
      r2Key: `locales/${SEED_LOCAL_PATIO_NORTE_ID}/vehiculos/veh-mercedes-eqb/reservas/FLX-849210/ENTREGA_SALIDA/PANTALLA_TABLERO_ODOMETRO/cluster-salida.webp`,
      posterR2Key: null,
      mimeType: 'image/webp',
      tamanoBytes: 178400,
      anchoPx: 1920,
      altoPx: 1080,
      duracionSegundos: null,
      sha256Hash: 'sha256-entrega-odometro-849210',
      medidorUsoMomento: 9400,
      observacion: 'Cluster MBUX en salida: 9.400 km y batería al 100% (420 km de autonomía)',
      subidoPorId: SEED_DUENO_USER_ID,
      capturadoEn: new Date(`${inicio1}T08:56:00.000Z`),
      creadoEn: new Date(`${inicio1}T08:56:00.000Z`),
    },
    {
      id: 'med-entrega-video360-flx849210',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      vehiculoId: 'veh-mercedes-eqb',
      reservaId: 'res-flx-849210',
      contratoId: 'ctr-flx-849210',
      inspeccionId: 'insp-salida-flx-849210',
      mantenimientoId: null,
      tipoMedio: 'VIDEO',
      etapaOperativa: 'ENTREGA_SALIDA',
      zonaEvidencia: 'VIDEO_RECORRIDO_360',
      anguloEstudio: null,
      esPortadaCatalogo: false,
      ordenVisual: 3,
      r2Key: `locales/${SEED_LOCAL_PATIO_NORTE_ID}/vehiculos/veh-mercedes-eqb/reservas/FLX-849210/ENTREGA_SALIDA/VIDEO_RECORRIDO_360/recorrido-360.mp4`,
      posterR2Key: '/images/vehiculos/white-suv.webp',
      mimeType: 'video/mp4',
      tamanoBytes: 8_420_000,
      anchoPx: 1920,
      altoPx: 1080,
      duracionSegundos: 24.5,
      sha256Hash: 'sha256-video360-salida-849210',
      medidorUsoMomento: 9400,
      observacion: 'Video perimetral 360° en patio con miniatura instantánea posterR2Key',
      subidoPorId: SEED_DUENO_USER_ID,
      capturadoEn: new Date(`${inicio1}T08:58:00.000Z`),
      creadoEn: new Date(`${inicio1}T08:58:00.000Z`),
    },
  ];

  for (const med of multimediaSemilla) {
    await db.insert(multimediaVehiculo).values(med).onConflictDoNothing();
  }

  // 11. Puntos de inspección R2 vinculados al historial multimedia
  const puntosR2Semilla: PuntoInspeccionR2Insert[] = [
    {
      id: 'pt-r2-carroceria-849210',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      inspeccionId: 'insp-salida-flx-849210',
      reservaId: 'res-flx-849210',
      vehiculoId: 'veh-mercedes-eqb',
      zona: 'Carrocería y Pintura Superior',
      etiqueta: 'Pintura Original Sin Rayones',
      dictamen: 'Verificado en Cloudflare R2 · 0 abolladuras · Sellado cerámico en Mercedes-Benz',
      estado: 'ORIGINAL',
      gravedad: null,
      coordX: '52%',
      coordY: '24%',
      multimediaEntregaId: 'med-entrega-carroceria-flx849210',
      multimediaRetornoId: null,
      costoEstimado: 0,
      generaCargoCliente: false,
      reparado: false,
      creadoEn: new Date(`${inicio1}T08:55:00.000Z`),
      actualizadoEn: new Date(`${inicio1}T08:55:00.000Z`),
    },
    {
      id: 'pt-r2-rodaje-849210',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      inspeccionId: 'insp-salida-flx-849210',
      reservaId: 'res-flx-849210',
      vehiculoId: 'veh-mercedes-eqb',
      zona: 'Tren Delantero y Rines',
      etiqueta: 'Rines y Frenos al 94%',
      dictamen: 'Presión calibrada (36 PSI) · Pastillas verificadas en patio antes de salida',
      estado: 'VERIFICADO',
      gravedad: null,
      coordX: '34%',
      coordY: '66%',
      multimediaEntregaId: 'med-entrega-video360-flx849210',
      multimediaRetornoId: null,
      costoEstimado: 0,
      generaCargoCliente: false,
      reparado: false,
      creadoEn: new Date(`${inicio1}T08:56:00.000Z`),
      actualizadoEn: new Date(`${inicio1}T08:56:00.000Z`),
    },
    {
      id: 'pt-r2-telemetria-849210',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      inspeccionId: 'insp-salida-flx-849210',
      reservaId: 'res-flx-849210',
      vehiculoId: 'veh-mercedes-eqb',
      zona: 'Odómetro y Batería / Tanque',
      etiqueta: 'Salida: 9.400 km · 100%',
      dictamen: 'Entrega con carga/combustible al 100% y telemetría perimetral activa',
      estado: 'PROTEGIDO',
      gravedad: null,
      coordX: '64%',
      coordY: '58%',
      multimediaEntregaId: 'med-entrega-odometro-flx849210',
      multimediaRetornoId: null,
      costoEstimado: 0,
      generaCargoCliente: false,
      reparado: false,
      creadoEn: new Date(`${inicio1}T08:57:00.000Z`),
      actualizadoEn: new Date(`${inicio1}T08:57:00.000Z`),
    },
  ];

  for (const pt of puntosR2Semilla) {
    await db.insert(puntosInspeccionR2).values(pt).onConflictDoNothing();
  }

  // 12. Orden de Mantenimiento preventiva de demostración
  const mantenimientoSemilla: MantenimientoVehiculoInsert = {
    id: 'mnt-preventivo-cx30',
    localId: SEED_LOCAL_PATIO_NORTE_ID,
    vehiculoId: 'veh-mazda-cx30',
    reservaOrigenId: null,
    tipo: 'PREVENTIVO',
    estado: 'PROGRAMADO',
    etiqueta: 'Inspección y alistamiento técnico',
    descripcion: 'Alineación balanceo y revisión preventiva de los 22.000 km',
    tallerProveedor: 'Casa Británica / Mazda Servicio Autorizado',
    fechaInicio: sumarDiasISO(hoyISO, 14),
    fechaFin: sumarDiasISO(hoyISO, 15),
    kilometrajeRegistro: 21500,
    costoTotal: 380000,
    movimientoCajaId: null,
    creadoPorId: SEED_DUENO_USER_ID,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
  await db
    .insert(mantenimientosVehiculo)
    .values(mantenimientoSemilla)
    .onConflictDoNothing();

  // 13. Cuentas financieras, sesión de caja activa, movimientos y depósitos de garantía
  const cuentasSemilla: CuentaFinancieraInsert[] = [
    {
      id: 'cta-caja-principal',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      nombre: 'Caja Principal Patio (Efectivo)',
      tipo: 'CAJA_EFECTIVO',
      saldoInicial: 1_200_000,
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
    {
      id: 'cta-bancolombia-ope',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      nombre: 'Bancolombia Operativo #4829',
      tipo: 'BANCO',
      saldoInicial: 14_500_000,
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
    {
      id: 'cta-nequi-recaudos',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      nombre: 'Nequi / Daviplata Recaudos Patio',
      tipo: 'BILLETERA_DIGITAL',
      saldoInicial: 2_850_000,
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
  ];

  for (const cta of cuentasSemilla) {
    await db.insert(cuentasFinancieras).values(cta).onConflictDoNothing();
  }

  const sesionActivaSemilla: SesionCajaInsert = {
    id: 'ses-turno-patio-norte-01',
    localId: SEED_LOCAL_PATIO_NORTE_ID,
    cuentaId: 'cta-caja-principal',
    usuarioAperturaId: SEED_DUENO_USER_ID,
    fechaApertura: ahora,
    saldoInicialContado: 1_200_000,
    estado: 'ABIERTA',
    observaciones: 'Apertura de turno operativo Patio Norte verificada.',
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
  await db.insert(sesionesCaja).values(sesionActivaSemilla).onConflictDoNothing();

  const movimientosSemilla: MovimientoCajaInsert[] = [
    {
      id: 'mov-flx-849210-pago',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      tipo: 'INGRESO',
      categoria: 'PAGO_ALQUILER',
      concepto: 'Liquidación total contrato FLX-849210 · Mercedes-Benz EQB 350',
      monto: total1,
      metodoPago: 'transferencia',
      cuentaId: 'cta-bancolombia-ope',
      contratoId: 'FLX-849210',
      clienteId: 'usr-mateo-restrepo',
      clienteNombre: 'Mateo Restrepo Vélez',
      vehiculoId: 'veh-mercedes-eqb',
      referencia: 'TR-BC-849210',
      estado: 'CONFIRMADO',
      creadoPorId: SEED_DUENO_USER_ID,
      fechaMovimiento: new Date(`${inicio1}T09:00:00.000Z`),
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
    {
      id: 'mov-flx-512094-anticipo',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      tipo: 'INGRESO',
      categoria: 'ABONO_CONTRATO',
      concepto: 'Abono inicial 30% reserva FLX-512094 · BMW M2 Competition',
      monto: Math.round(total3 * 0.3),
      metodoPago: 'tarjeta',
      cuentaId: 'cta-bancolombia-ope',
      contratoId: 'FLX-512094',
      clienteId: 'usr-sebastian-correa',
      clienteNombre: 'Sebastián Correa Londoño',
      vehiculoId: 'veh-bmw-m2-coupe',
      referencia: 'BA-TX-512094',
      estado: 'CONFIRMADO',
      creadoPorId: SEED_DUENO_USER_ID,
      fechaMovimiento: ahora,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
  ];

  for (const mov of movimientosSemilla) {
    await db.insert(movimientosCaja).values(mov).onConflictDoNothing();
  }

  const depositosSemilla: DepositoGarantiaInsert[] = [
    {
      id: 'gar-flx-849210',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      contratoId: 'FLX-849210',
      clienteId: 'usr-mateo-restrepo',
      clienteNombre: 'Mateo Restrepo Vélez',
      vehiculoId: 'veh-mercedes-eqb',
      montoEsperado: 750_000,
      montoRecibido: 750_000,
      montoRetenido: 0,
      montoDevuelto: 0,
      saldoComprometido: 750_000,
      estado: 'RECIBIDO_CUSTODIA',
      cuentaId: 'cta-bancolombia-ope',
      metodoPago: 'transferencia',
      referenciaRecepcion: 'TR-GAR-849210',
      fechaRecepcion: new Date(`${inicio1}T09:05:00.000Z`),
      fechaDevolucionPrevista: new Date(`${fin1}T18:00:00.000Z`),
      observaciones: 'Custodia activa con acta de salida R2 firmada',
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
    {
      id: 'gar-flx-309418',
      localId: SEED_LOCAL_PATIO_NORTE_ID,
      contratoId: 'FLX-309418',
      clienteId: 'usr-valeria-gomez',
      clienteNombre: 'Valeria Gómez Arango',
      vehiculoId: 'veh-mazda-cx30',
      montoEsperado: 500_000,
      montoRecibido: 0,
      montoRetenido: 0,
      montoDevuelto: 0,
      saldoComprometido: 0,
      estado: 'PENDIENTE_RECIBIR',
      cuentaId: null,
      metodoPago: null,
      referenciaRecepcion: null,
      fechaRecepcion: null,
      fechaDevolucionPrevista: new Date(`${fin2}T18:00:00.000Z`),
      observaciones: 'Se recauda al momento del check-in en Patio Norte',
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
  ];

  for (const dep of depositosSemilla) {
    await db.insert(depositosGarantia).values(dep).onConflictDoNothing();
  }

  // 14. Sincronización y configuración base para todos los locales del entorno
  try {
    const todosLocales = await db.select().from(localesAlquiler);
    for (const loc of todosLocales) {
      await asegurarConfiguracionBaseLocal(db, loc.id);

      // Si el local no tiene vehículos registrados, asociarle una réplica de la flota demostrativa
      const vehsLocal = await db
        .select({ id: vehiculos.id })
        .from(vehiculos)
        .where(eq(vehiculos.localId, loc.id))
        .limit(1);

      if (vehsLocal.length === 0) {
        const idSufijo = loc.id.slice(0, 8);
        const placaSufijo =
          loc.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '99';
        for (const v of vehiculosSemilla) {
          await db
            .insert(vehiculos)
            .values({
              ...v,
              id: `${v.id}-${idSufijo}`,
              localId: loc.id,
              placa: `${v.placa.slice(0, 4)}${placaSufijo}`,
              creadoEn: ahora,
              actualizadoEn: ahora,
            })
            .onConflictDoNothing();
        }
      }
    }
  } catch {
    // Tolerante si no hay permisos sobre locales adicionales
  }

  return {
    ok: true,
    insertados: {
      usuarios: usuariosSemilla.length,
      locales: localesSemilla.length,
      vehiculos: vehiculosSemilla.length,
      documentosVehiculo: documentosSemilla.length,
      multimediaVehiculo: multimediaSemilla.length,
      plantillasInspeccion: plantillasSemilla.length,
      reservas: reservasSemilla.length,
      contratosAlquiler: contratosSemilla.length,
      inspeccionesPericiales: 1,
      puntosInspeccionR2: puntosR2Semilla.length,
      mantenimientosVehiculo: 1,
      cuentasFinancieras: cuentasSemilla.length,
      movimientosCaja: movimientosSemilla.length,
      depositosGarantia: depositosSemilla.length,
    },
  };
}
