import type { APIRoute } from 'astro';
import {
  DEFAULT_TIEMPOS_ALQUILER_PROCESO,
  MOCK_ALQUILERES_EN_PROCESO,
  resolverYOrdenarAlquileres,
  type AlquilerEnProcesoItem,
  type AlquilerEnProcesoResponse,
} from '@/components/dashboard/AlquilerEnProcesoCard';

// Estado simulado en memoria del servidor mientras se conecta la consulta de D1 con Santiago (backend)
let simuladorAlquileres: AlquilerEnProcesoItem[] = [...MOCK_ALQUILERES_EN_PROCESO];

function aplicarAccionSimulador(accion: string | null | undefined) {
  if (accion === 'vaciar') {
    simuladorAlquileres = [];
  } else if (accion === 'reiniciar') {
    simuladorAlquileres = [...MOCK_ALQUILERES_EN_PROCESO];
  } else if (accion === 'agregar') {
    const randomId = Math.floor(Math.random() * 899 + 100);
    simuladorAlquileres = [
      ...simuladorAlquileres,
      {
        id: `mock-alq-${Date.now()}`,
        clienteNombre: 'Santiago Valencia',
        clienteDocumento: `1.036.${randomId}.412`,
        placa: `QNT-${randomId}`,
        imagenUrl: '/images/vehiculos/sedan-premier.webp',
        estado: 'EN_PROCESO',
        esperandoRespuestaDesde: new Date().toISOString(),
      },
    ];
  }
}

export const GET: APIRoute = async ({ url }) => {
  aplicarAccionSimulador(url.searchParams.get('accion'));

  const alquileresVisibles = resolverYOrdenarAlquileres(
    simuladorAlquileres,
    DEFAULT_TIEMPOS_ALQUILER_PROCESO
  );

  const body: AlquilerEnProcesoResponse = {
    ok: true,
    alquileres: alquileresVisibles,
    tiemposConfig: DEFAULT_TIEMPOS_ALQUILER_PROCESO,
    actualizadoEn: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const raw: unknown = await request.json();
    const accion =
      typeof raw === 'object' &&
      raw !== null &&
      'accion' in raw &&
      typeof raw.accion === 'string'
        ? raw.accion
        : undefined;

    aplicarAccionSimulador(accion);

    return new Response(
      JSON.stringify({ ok: true, cantidad: simuladorAlquileres.length }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  }
};
