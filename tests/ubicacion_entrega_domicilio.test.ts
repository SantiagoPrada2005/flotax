import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { KVNamespace } from '@cloudflare/workers-types';
import {
  buscarDireccionesMapbox,
  calcularDistanciaKmHaversine,
  construirEnlacesNavegacion,
  construirPoligonoCirculoGeoJson,
  evaluarCoberturaDomicilio,
  geocodificarInversaMapbox,
  PATIO_COORDENADAS_DEFECTO,
  POLITICA_DOMICILIO_DEFECTO,
  resolverRefererMapbox,
  resolverTokenMapboxPublico,
  resolverTokenMapboxServidor,
  sonCoordenadasValidas,
  verificarYConsumirCuotaDiariaMapbox,
  type PoliticaDomicilioLocal,
} from '../src/lib/ubicacion/index.ts';
import {
  crearReservaConValidaciones,
  ErrorCicloAlquiler,
} from '../src/lib/flota/ciclo-alquiler.ts';
import type { AppDb } from '../src/lib/db.ts';
import {
  documentosVehiculo,
  localesAlquiler,
  politicasLocal,
  reservas,
  vehiculos,
} from '../src/db/schema/index.ts';

function crearMockKv(inicial: Record<string, string> = {}): KVNamespace {
  const store = new Map<string, string>(Object.entries(inicial));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
}

function crearMockQuery(datos: unknown[], joinedData?: unknown[]) {
  const resolvable = {
    limit: (n?: number) => Promise.resolve(n != null ? datos.slice(0, n) : datos),
    orderBy: () => resolvable,
    where: () => resolvable,
    leftJoin: () => crearMockQuery(joinedData ?? datos),
    then: (resolve: (v: unknown) => unknown) => resolve(datos),
  };
  return resolvable;
}

describe('Dominio Ubicación, Cobertura y Mapbox - FlotaX', () => {
  it('1. Calcula distancia Haversine precisa y valida coordenadas WGS84 reales', () => {
    const laureles = { lat: 6.2442, lng: -75.5916 };
    const distancia = calcularDistanciaKmHaversine(PATIO_COORDENADAS_DEFECTO, laureles);

    assert.ok(distancia > 3.5 && distancia < 6.0, `Distancia inesperada: ${distancia} km`);
    assert.equal(sonCoordenadasValidas(6.2088, -75.5697), true);
    assert.equal(sonCoordenadasValidas(0, 0), false);
    assert.equal(sonCoordenadasValidas(95, -75.5), false);
    assert.equal(sonCoordenadasValidas(Number.NaN, -75.5), false);
  });

  it('2. Evalúa cobertura de domicilio y calcula recargo por distancia según política del local', () => {
    const politicaConRecargo: PoliticaDomicilioLocal = {
      domicilioHabilitado: true,
      radioCoberturaKm: 15,
      kmIncluidosDomicilio: 3,
      tarifaDomicilioBase: 20_000,
      tarifaDomicilioPorKm: 4_000,
      zonaCoberturaEtiqueta: 'Medellín y Valle de Aburrá',
    };

    // 1. Dentro de los km incluidos (Provenza ~0.3 km del patio)
    const cerca = evaluarCoberturaDomicilio(
      { lat: 6.2089, lng: -75.5668 },
      PATIO_COORDENADAS_DEFECTO,
      politicaConRecargo
    );
    assert.equal(cerca.dentroCobertura, true);
    assert.equal(cerca.recargoDomicilio, 20_000);

    // 2. Dentro de cobertura superando los 3 km incluidos (Laureles ~4.62 km -> ceil(1.62) = 2 km extra)
    const medio = evaluarCoberturaDomicilio(
      { lat: 6.2442, lng: -75.5916 },
      PATIO_COORDENADAS_DEFECTO,
      politicaConRecargo
    );
    assert.equal(medio.dentroCobertura, true);
    assert.equal(medio.recargoDomicilio, 20_000 + Math.ceil(medio.distanciaKm - 3) * 4_000);

    // 3. Fuera de cobertura (Rionegro ~23 km)
    const lejos = evaluarCoberturaDomicilio(
      { lat: 6.1532, lng: -75.3741 },
      PATIO_COORDENADAS_DEFECTO,
      politicaConRecargo
    );
    assert.equal(lejos.dentroCobertura, false);
    assert.equal(lejos.recargoDomicilio, 0);
    assert.match(lejos.mensaje, /supera nuestra zona de cobertura/i);

    // 4. Sede con domicilio deshabilitado
    const deshabilitado = evaluarCoberturaDomicilio(
      { lat: 6.2089, lng: -75.5668 },
      PATIO_COORDENADAS_DEFECTO,
      { ...POLITICA_DOMICILIO_DEFECTO, domicilioHabilitado: false }
    );
    assert.equal(deshabilitado.dentroCobertura, false);
  });

  it('3. Genera enlaces de navegación gratuitos (Google Maps y Waze) y polígono GeoJSON cerrado', () => {
    const enlaces = construirEnlacesNavegacion({ lat: 6.2088, lng: -75.5697 });
    assert.ok(enlaces.googleMapsUrl.includes('google.com/maps/dir/'));
    assert.ok(enlaces.googleMapsUrl.includes('6.208800'));
    assert.ok(enlaces.wazeUrl.includes('waze.com/ul?ll='));
    assert.ok(enlaces.wazeUrl.includes('navigate=yes'));

    const poligono = construirPoligonoCirculoGeoJson(PATIO_COORDENADAS_DEFECTO, 15, 32);
    const anillo = poligono.geometry.coordinates[0]!;
    assert.equal(anillo.length, 33);
    assert.ok(Math.abs(anillo[0]![0] - anillo[32]![0]) < 0.0001);
    assert.ok(Math.abs(anillo[0]![1] - anillo[32]![1]) < 0.0001);
  });

  it('4. Protege tokens de Mapbox: nunca expone sk.* al cliente y respeta tope diario en KV', async () => {
    assert.equal(
      resolverTokenMapboxPublico({ MAPBOX_PUBLIC_TOKEN: 'sk.secreto-no-exponer' }),
      null
    );
    assert.equal(
      resolverTokenMapboxPublico({ MAPBOX_PUBLIC_TOKEN: 'pk.publico-restringido' }),
      'pk.publico-restringido'
    );
    assert.equal(
      resolverTokenMapboxServidor({
        MAPBOX_SECRET_TOKEN: 'sk.servidor',
        MAPBOX_PUBLIC_TOKEN: 'pk.cliente',
      }),
      'sk.servidor'
    );

    const kv = crearMockKv();
    const c1 = await verificarYConsumirCuotaDiariaMapbox(kv, 2, '2026-11-18');
    const c2 = await verificarYConsumirCuotaDiariaMapbox(kv, 2, '2026-11-18');
    const c3 = await verificarYConsumirCuotaDiariaMapbox(kv, 2, '2026-11-18');

    assert.equal(c1.permitido, true);
    assert.equal(c2.permitido, true);
    assert.equal(c3.permitido, false);
    assert.equal(c3.usadasHoy, 2);
  });

  it('5. buscarDireccionesMapbox y geocodificarInversaMapbox evalúan cobertura, envían Referer y degradan sin token/cuota', async () => {
    let llamadasFetch = 0;
    let refererEnviado: string | undefined;
    let urlConsultada = '';
    const mockFetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      llamadasFetch += 1;
      urlConsultada = String(url);
      const hdrs = init?.headers as Record<string, string> | undefined;
      refererEnviado = hdrs?.['Referer'];
      return new Response(
        JSON.stringify({
          features: [
            {
              id: 'feat-provenza',
              geometry: { coordinates: [-75.5668, 6.2089] },
              properties: {
                name: 'Carrera 35 #7-50',
                full_address: 'Carrera 35 #7-50, El Poblado, Medellín',
                place_formatted: 'El Poblado, Medellín, Antioquia',
                coordinates: { latitude: 6.2089, longitude: -75.5668 },
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const refererLocal = resolverRefererMapbox(
      new Request('http://localhost:4321/_actions/ubicacion.buscarDirecciones')
    );
    assert.equal(refererLocal, 'http://localhost:4321/');
    assert.equal(
      resolverRefererMapbox(
        new Request('http://192.168.18.176:4321/_actions/x'),
        'https://flotax.innovaweb.pro'
      ),
      'https://flotax.innovaweb.pro/'
    );

    const kv = crearMockKv();
    const resBusqueda = await buscarDireccionesMapbox({
      consulta: 'Cra 35 Provenza',
      patio: PATIO_COORDENADAS_DEFECTO,
      politica: POLITICA_DOMICILIO_DEFECTO,
      token: 'pk.test-token',
      referer: refererLocal,
      kv,
      limiteDiario: 1,
      fetchImpl: mockFetch,
    });

    assert.equal(resBusqueda.ok, true);
    assert.equal(resBusqueda.sugerencias.length, 1);
    assert.equal(resBusqueda.sugerencias[0]?.dentroCobertura, true);
    assert.equal(llamadasFetch, 1);
    assert.equal(refererEnviado, 'http://localhost:4321/');
    assert.equal(urlConsultada.includes('poi'), false);

    // Segunda llamada excede tope diario = 1 y NO dispara fetch hacia Mapbox
    const resBloqueada = await buscarDireccionesMapbox({
      consulta: 'Laureles Medellin',
      patio: PATIO_COORDENADAS_DEFECTO,
      politica: POLITICA_DOMICILIO_DEFECTO,
      token: 'pk.test-token',
      kv,
      limiteDiario: 1,
      fetchImpl: mockFetch,
    });
    assert.equal(resBloqueada.ok, false);
    assert.equal(resBloqueada.proveedorActivo, 'cuota_excedida');
    assert.equal(llamadasFetch, 1);

    // Geocodificación inversa sin token igual evalúa cobertura exacta
    const resInversa = await geocodificarInversaMapbox({
      latitud: 6.2442,
      longitud: -75.5916,
      patio: PATIO_COORDENADAS_DEFECTO,
      politica: POLITICA_DOMICILIO_DEFECTO,
      token: null,
    });
    assert.equal(resInversa.ok, true);
    assert.equal(resInversa.origenDireccion, 'coordenadas_fallback');
    assert.equal(resInversa.cobertura.dentroCobertura, true);
  });

  it('6. crearReservaConValidaciones: solo guarda coords en domicilio, rechaza fuera de cobertura y suma recargo al total', async () => {
    const localId = 'local-patio-norte';
    const vehiculoId = 'veh-cx30';
    let filaInsertada: Record<string, unknown> | null = null;

    const vehiculoMock = {
      id: vehiculoId,
      localId,
      marca: 'Mazda',
      modelo: 'CX-30',
      anio: 2025,
      categoria: 'SUV',
      categoriaEtiqueta: 'SUV Familiar',
      placa: 'FLX-901',
      estado: 'DISPONIBLE',
      precioDia: 200_000,
      depositoGarantia: 500_000,
      transmision: 'Automática',
      combustible: 'Gasolina',
      capacidadPasajeros: 5,
      kilometraje: 12_000,
      imagenUrl: '/images/vehiculos/mazda-cx30.webp',
      descripcion: 'SUV',
      activo: true,
    };

    const politicaMock = {
      id: 'pol-1',
      localId,
      abonoMinimoPct: 30,
      coberturaPericialPct: 10,
      domicilioHabilitado: true,
      radioCoberturaKm: 15,
      kmIncluidosDomicilio: 2,
      tarifaDomicilioBase: 15_000,
      tarifaDomicilioPorKm: 3_000,
      zonaCoberturaEtiqueta: 'Medellín',
    };

    const localMock = {
      id: localId,
      latitud: 6.2088,
      longitud: -75.5697,
    };

    const mockDb = {
      session: { active: true },
      select: () => ({
        from: (tabla: unknown) => {
          if (tabla === vehiculos) return crearMockQuery([vehiculoMock]);
          if (tabla === politicasLocal) return crearMockQuery([politicaMock]);
          if (tabla === localesAlquiler) return crearMockQuery([localMock]);
          if (tabla === documentosVehiculo) {
            return crearMockQuery([
              {
                id: 'doc-soat-cx30',
                vehiculoId,
                tipoDocumento: 'SOAT',
                fechaVencimiento: '2027-12-31',
                vigente: true,
              },
              {
                id: 'doc-rtm-cx30',
                vehiculoId,
                tipoDocumento: 'TECNICO_MECANICA',
                fechaVencimiento: '2027-12-31',
                vigente: true,
              },
            ]);
          }
          if (tabla === reservas) {
            return filaInsertada
              ? crearMockQuery([filaInsertada], [{ reserva: filaInsertada, vehiculo: vehiculoMock }])
              : crearMockQuery([]);
          }
          return crearMockQuery([]);
        },
      }),
      insert: (tabla: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (tabla === reservas) {
            filaInsertada = vals;
          }
          return {
            onConflictDoNothing: () => Promise.resolve(),
            then: (resolve: (v: unknown) => unknown) => resolve(undefined),
          };
        },
      }),
      update: () => ({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      }),
      batch: async (ops: unknown[]) => ops,
    } as unknown as AppDb;

    // A) Retiro en Patio Principal ignora cualquier dirección/coords enviadas por el cliente
    const resPatio = await crearReservaConValidaciones(
      mockDb,
      {
        vehiculoId,
        localId,
        fechaInicio: '2026-12-01',
        fechaFin: '2026-12-03',
        modalidadEntrega: 'PATIO_PRINCIPAL',
        direccionEntrega: 'Dirección que no debe persistirse',
        entregaLatitud: 6.2442,
        entregaLongitud: -75.5916,
        contactoNombre: 'Cliente Patio',
        contactoTelefono: '3001112233',
        contactoCorreo: 'patio@ejemplo.com',
        ley1581Aceptada: true,
      },
      { origen: 'CLIENTE_WEB', localId }
    );

    assert.equal(resPatio.reserva.modalidadEntrega, 'PATIO_PRINCIPAL');
    assert.equal(resPatio.reserva.direccionEntrega, null);
    assert.equal(resPatio.reserva.entregaLatitud, null);
    assert.equal(resPatio.reserva.entregaLongitud, null);
    assert.equal(resPatio.reserva.recargoEntregaDomicilio, 0);
    // 3 días * 200.000 = 600.000 + 10% cobertura (60.000) = 660.000
    assert.equal(resPatio.reserva.totalAlquiler, 660_000);

    // B) Domicilio fuera de cobertura (Rionegro) rechazado por servidor
    filaInsertada = null;
    await assert.rejects(
      () =>
        crearReservaConValidaciones(
          mockDb,
          {
            vehiculoId,
            localId,
            fechaInicio: '2026-12-05',
            fechaFin: '2026-12-07',
            modalidadEntrega: 'DOMICILIO_MEDELLIN',
            direccionEntrega: 'Aeropuerto José María Córdova, Rionegro',
            entregaLatitud: 6.1645,
            entregaLongitud: -75.4231,
            contactoNombre: 'Cliente Lejos',
            contactoTelefono: '3001112233',
            contactoCorreo: 'lejos@ejemplo.com',
            ley1581Aceptada: true,
          },
          { origen: 'CLIENTE_WEB', localId }
        ),
      (err: unknown) => {
        assert.ok(err instanceof ErrorCicloAlquiler);
        assert.equal(err.code, 'BAD_REQUEST');
        assert.match(err.message, /zona de cobertura/i);
        return true;
      }
    );

    // C) Domicilio dentro de cobertura persiste coords, dirección y suma recargo exacto
    filaInsertada = null;
    const resDomicilio = await crearReservaConValidaciones(
      mockDb,
      {
        vehiculoId,
        localId,
        fechaInicio: '2026-12-10',
        fechaFin: '2026-12-12',
        modalidadEntrega: 'DOMICILIO_MEDELLIN',
        direccionEntrega: 'Circular 73B #39B-20, Laureles, Medellín',
        entregaLatitud: 6.2442,
        entregaLongitud: -75.5916,
        entregaReferencia: 'Torre 1 Apto 402',
        contactoNombre: 'Cliente Laureles',
        contactoTelefono: '3004445566',
        contactoCorreo: 'laureles@ejemplo.com',
        ley1581Aceptada: true,
      },
      { origen: 'CLIENTE_WEB', localId }
    );

    assert.equal(resDomicilio.reserva.modalidadEntrega, 'DOMICILIO_MEDELLIN');
    assert.equal(
      resDomicilio.reserva.direccionEntrega,
      'Circular 73B #39B-20, Laureles, Medellín'
    );
    assert.equal(resDomicilio.reserva.entregaLatitud, 6.2442);
    assert.equal(resDomicilio.reserva.entregaLongitud, -75.5916);
    assert.equal(resDomicilio.reserva.entregaReferencia, 'Torre 1 Apto 402');
    assert.ok((resDomicilio.reserva.distanciaEntregaKm ?? 0) > 3.5);
    assert.ok((resDomicilio.reserva.recargoEntregaDomicilio ?? 0) > 15_000);
    assert.equal(
      resDomicilio.reserva.totalAlquiler,
      660_000 + (resDomicilio.reserva.recargoEntregaDomicilio ?? 0)
    );
  });
});
