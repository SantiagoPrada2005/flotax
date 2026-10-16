import type { VehiculoItem } from '@/lib/flota/types';

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/**
 * Genera el esquema Schema.org JSON-LD para la entidad de negocio AutoRental / Organization.
 */
export function buildAutoRentalSchema(siteUrl: string) {
  const normalizedSiteUrl = siteUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoRental',
    '@id': `${normalizedSiteUrl}/#autorental`,
    name: 'FlotaX',
    alternateName: 'FlotaX Movix — Alquiler de Flotas',
    url: normalizedSiteUrl,
    logo: `${normalizedSiteUrl}/apple-touch-icon.png`,
    image: `${normalizedSiteUrl}/images/landing/hero-vehicle.webp`,
    description:
      'Plataforma integral y móvil de alquiler y control operativo de flotas de vehículos en tiempo real. Entrega en 3 minutos sin trámites.',
    currenciesAccepted: 'COP',
    paymentAccepted: 'Tarjeta de Crédito, PSE, Depósito Digital',
    priceRange: '$$',
    areaServed: {
      '@type': 'Country',
      name: 'Colombia',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Medellín',
      addressRegion: 'Antioquia',
      addressCountry: 'CO',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${normalizedSiteUrl}/catalogo?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Genera el esquema Schema.org JSON-LD para un vehículo individual (Car + Product con Offer).
 */
export function buildVehicleProductSchema(vehiculo: VehiculoItem, siteUrl: string) {
  const normalizedSiteUrl = siteUrl.replace(/\/$/, '');
  const imageAbsUrl = vehiculo.imagenUrl.startsWith('http')
    ? vehiculo.imagenUrl
    : `${normalizedSiteUrl}${vehiculo.imagenUrl}`;

  const vehicleType =
    vehiculo.categoria === 'MOTO'
      ? 'Motorcycle'
      : vehiculo.categoria === 'PATINETA'
        ? 'Product'
        : 'Car';

  const inStock = vehiculo.estado === 'DISPONIBLE';

  return {
    '@context': 'https://schema.org',
    '@type': [vehicleType, 'Product'],
    '@id': `${normalizedSiteUrl}/vehiculos/${vehiculo.id}/#item`,
    name: `${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.anio})`,
    description: vehiculo.descripcion,
    image: imageAbsUrl,
    brand: {
      '@type': 'Brand',
      name: vehiculo.marca,
    },
    model: vehiculo.modelo,
    vehicleModelDate: String(vehiculo.anio),
    vehicleTransmission: vehiculo.transmision,
    fuelType: vehiculo.combustible,
    seatingCapacity: vehiculo.capacidadPasajeros,
    offers: {
      '@type': 'Offer',
      price: vehiculo.precioDia,
      priceCurrency: 'COP',
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${normalizedSiteUrl}/vehiculos/${vehiculo.id}`,
      priceValidUntil: '2027-12-31',
      itemCondition: 'https://schema.org/UsedCondition',
      seller: {
        '@type': 'AutoRental',
        name: 'FlotaX',
        url: normalizedSiteUrl,
      },
    },
    aggregateRating: vehiculo.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: vehiculo.rating,
          reviewCount: 28,
          bestRating: '5',
          worstRating: '1',
        }
      : undefined,
  };
}

/**
 * Genera la jerarquía de migas de pan Schema.org BreadcrumbList.
 */
export function buildBreadcrumbSchema(items: BreadcrumbItem[], siteUrl: string) {
  const normalizedSiteUrl = siteUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path.startsWith('http')
        ? item.path
        : `${normalizedSiteUrl}${item.path}`,
    })),
  };
}
