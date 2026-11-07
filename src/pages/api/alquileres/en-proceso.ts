import type { APIRoute } from 'astro';
import {
  MOCK_ALQUILERES_EN_PROCESO,
  type AlquilerEnProcesoItem,
  type AlquilerEnProcesoResponse,
} from '@/components/dashboard/AlquilerEnProcesoCard';

// Estado simulado en memoria del servidor de desarrollo
let simuladorAlquileres: AlquilerEnProcesoItem[] = [...MOCK_ALQUILERES_EN_PROCESO];

export const GET: APIRoute = async ({ url }) => {
  // Parámetro manual para forzar vaciar o reiniciar si se desea por URL
  const accion = url.searchParams.get('accion');
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
        codigo: `FLX-${randomId}10`,
        marca: 'Chevrolet',
        modelo: 'Tracker Turbo RS',
        placa: `TRK-${randomId}`,
        clienteNombre: 'Santiago Valencia',
        estado: 'EN_CURSO',
        estadoEtiqueta: 'En proceso',
      },
    ];
  }

  const body: AlquilerEnProcesoResponse = {
    ok: true,
    alquileres: simuladorAlquileres,
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
    const data = (await request.json()) as { accion?: string };
    if (data.accion === 'vaciar') {
      simuladorAlquileres = [];
    } else if (data.accion === 'reiniciar') {
      simuladorAlquileres = [...MOCK_ALQUILERES_EN_PROCESO];
    } else if (data.accion === 'agregar') {
      const randomId = Math.floor(Math.random() * 899 + 100);
      simuladorAlquileres = [
        ...simuladorAlquileres,
        {
          id: `mock-alq-${Date.now()}`,
          codigo: `FLX-${randomId}10`,
          marca: 'Chevrolet',
          modelo: 'Tracker Turbo RS',
          placa: `TRK-${randomId}`,
          clienteNombre: 'Santiago Valencia',
          estado: 'EN_CURSO',
          estadoEtiqueta: 'En proceso',
        },
      ];
    }
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
