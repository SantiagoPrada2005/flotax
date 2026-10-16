import { useState, useTransition } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import type { VehiculoItem, CategoriaVehiculo, EstadoVehiculo } from '@/lib/flota/types';

export interface VehicleFormIslandProps {
  vehiculoInicial?: VehiculoItem | undefined;
}

const PRESET_IMAGENES = [
  {
    nombre: 'SUV Blanca (Mercedes EQB)',
    url: '/images/vehiculos/white-suv.webp',
    categoria: 'SUV',
  },
  {
    nombre: 'Coupe Deportivo Oscuro (BMW M2)',
    url: '/images/vehiculos/dark-coupe.webp',
    categoria: 'SEDAN',
  },
  {
    nombre: 'SUV Roja Soul (Mazda CX-30)',
    url: '/images/vehiculos/mazda-cx30.webp',
    categoria: 'SUV',
  },
  {
    nombre: 'Sedán Eléctrico Gris (Quantum Premier)',
    url: '/images/vehiculos/sedan-premier.webp',
    categoria: 'SEDAN',
  },
  {
    nombre: 'Motocicleta Urbana (Yamaha MT-03)',
    url: '/images/vehiculos/yamaha-mt03.webp',
    categoria: 'MOTO',
  },
  {
    nombre: 'Monopatín Eléctrico Pro (Volt Striker)',
    url: '/images/vehiculos/scooter-pro.webp',
    categoria: 'PATINETA',
  },
];

const CATEGORIAS_CONFIG: Record<
  CategoriaVehiculo,
  { label: string; etiquetaDefault: string; transmisiones: string[]; combustibles: string[] }
> = {
  SEDAN: {
    label: 'Sedán',
    etiquetaDefault: 'Sedán Ejecutivo',
    transmisiones: ['Automática', 'Manual', 'Eléctrica'],
    combustibles: ['Gasolina', 'Eléctrico', 'Híbrido', 'Diésel'],
  },
  SUV: {
    label: 'SUV / Camioneta',
    etiquetaDefault: 'SUV Familiar',
    transmisiones: ['Automática', 'Manual', 'Eléctrica'],
    combustibles: ['Gasolina', 'Eléctrico', 'Híbrido', 'Diésel'],
  },
  MOTO: {
    label: 'Motocicleta',
    etiquetaDefault: 'Motocicleta Urbana',
    transmisiones: ['Manual', 'Automática', 'Eléctrica'],
    combustibles: ['Gasolina', 'Eléctrico'],
  },
  PATINETA: {
    label: 'Monopatín / Patineta',
    etiquetaDefault: 'Monopatín Eléctrico',
    transmisiones: ['Eléctrica', 'Automática'],
    combustibles: ['Eléctrico'],
  },
  UTILITARIO: {
    label: 'Utilitario / Van',
    etiquetaDefault: 'Utilitario de Carga',
    transmisiones: ['Manual', 'Automática'],
    combustibles: ['Diésel', 'Gasolina', 'Eléctrico'],
  },
};

export default function VehicleFormIsland({ vehiculoInicial }: VehicleFormIslandProps) {
  const esEdicion = Boolean(vehiculoInicial?.id);

  // Estados del Formulario
  const [marca, setMarca] = useState(vehiculoInicial?.marca ?? '');
  const [modelo, setModelo] = useState(vehiculoInicial?.modelo ?? '');
  const [anio, setAnio] = useState(vehiculoInicial?.anio ?? 2024);
  const [categoria, setCategoria] = useState<CategoriaVehiculo>(
    vehiculoInicial?.categoria ?? 'SUV'
  );
  const [categoriaEtiqueta, setCategoriaEtiqueta] = useState(
    vehiculoInicial?.categoriaEtiqueta ?? 'SUV Familiar'
  );
  const [placa, setPlaca] = useState(vehiculoInicial?.placa ?? '');
  const [estado, setEstado] = useState<EstadoVehiculo>(
    vehiculoInicial?.estado ?? 'DISPONIBLE'
  );
  const [precioDia, setPrecioDia] = useState<number | ''>(
    vehiculoInicial?.precioDia ?? 180000
  );
  const [depositoGarantia, setDepositoGarantia] = useState<number | ''>(
    vehiculoInicial?.depositoGarantia ?? 500000
  );
  const [transmision, setTransmision] = useState<'Automática' | 'Manual' | 'Eléctrica'>(
    vehiculoInicial?.transmision ?? 'Automática'
  );
  const [combustible, setCombustible] = useState<
    'Gasolina' | 'Diésel' | 'Eléctrico' | 'Híbrido'
  >(vehiculoInicial?.combustible ?? 'Gasolina');
  const [capacidadPasajeros, setCapacidadPasajeros] = useState(
    vehiculoInicial?.capacidadPasajeros ?? 5
  );
  const [autonomiaKm, setAutonomiaKm] = useState<number | ''>(
    vehiculoInicial?.autonomiaKm ?? ''
  );
  const [kilometraje, setKilometraje] = useState<number | ''>(
    vehiculoInicial?.kilometraje ?? 0
  );
  const [imagenUrl, setImagenUrl] = useState(
    vehiculoInicial?.imagenUrl ?? PRESET_IMAGENES[0]!.url
  );
  const [destacado, setDestacado] = useState(vehiculoInicial?.destacado ?? false);
  const [descripcion, setDescripcion] = useState(
    vehiculoInicial?.descripcion ?? ''
  );
  const [aceleracion, setAceleracion] = useState(
    vehiculoInicial?.aceleracion ?? '6.5 s'
  );
  const [velocidadMaxima, setVelocidadMaxima] = useState(
    vehiculoInicial?.velocidadMaxima ?? '190 km/h'
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCategoriaChange = (nuevaCat: CategoriaVehiculo) => {
    setCategoria(nuevaCat);
    const config = CATEGORIAS_CONFIG[nuevaCat];
    if (config) {
      setCategoriaEtiqueta(config.etiquetaDefault);
      if (nuevaCat === 'PATINETA') {
        setCombustible('Eléctrico');
        setTransmision('Eléctrica');
        setCapacidadPasajeros(1);
      } else if (nuevaCat === 'MOTO') {
        setCapacidadPasajeros(2);
      }
    }
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!marca.trim()) {
      setErrorMsg('La marca del vehículo es obligatoria.');
      return;
    }
    if (!modelo.trim()) {
      setErrorMsg('El modelo del vehículo es obligatorio.');
      return;
    }
    if (!placa.trim() || placa.trim().length < 3) {
      setErrorMsg('La placa o matrícula es obligatoria (mínimo 3 caracteres).');
      return;
    }
    if (precioDia === '' || Number(precioDia) <= 0) {
      setErrorMsg('Debe especificar una tarifa diaria válida mayor a 0 COP.');
      return;
    }
    if (depositoGarantia === '' || Number(depositoGarantia) < 0) {
      setErrorMsg('Debe especificar un depósito de garantía válido.');
      return;
    }
    if (!imagenUrl.trim()) {
      setErrorMsg('Debe seleccionar o indicar una URL de imagen para el vehículo.');
      return;
    }
    if (!descripcion.trim()) {
      setErrorMsg('La descripción pericial y técnica de la unidad es obligatoria.');
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          id: esEdicion ? vehiculoInicial?.id : undefined,
          marca: marca.trim(),
          modelo: modelo.trim(),
          anio: Number(anio),
          categoria,
          categoriaEtiqueta: categoriaEtiqueta.trim() || CATEGORIAS_CONFIG[categoria].etiquetaDefault,
          placa: placa.trim().toUpperCase(),
          estado,
          precioDia: Number(precioDia),
          depositoGarantia: Number(depositoGarantia),
          transmision,
          combustible,
          capacidadPasajeros: Number(capacidadPasajeros),
          autonomiaKm: autonomiaKm !== '' ? Number(autonomiaKm) : undefined,
          kilometraje: kilometraje !== '' ? Number(kilometraje) : 0,
          imagenUrl: imagenUrl.trim(),
          destacado,
          descripcion: descripcion.trim(),
          aceleracion: aceleracion.trim() || '6.5 s',
          velocidadMaxima: velocidadMaxima.trim() || '190 km/h',
          rating: vehiculoInicial?.rating ?? 4.8,
          autonomiaOdo:
            autonomiaKm !== '' && Number(autonomiaKm) > 0
              ? `${autonomiaKm} km`
              : `${(kilometraje || 0).toLocaleString('es-CO')} km`,
        };

        const { error, data } = await actions.flota.guardarVehiculo(payload);

        if (error || !data?.ok) {
          setErrorMsg(error?.message || 'Error al guardar los datos del vehículo.');
          return;
        }

        // Redirección suave a la lista de flota
        await navigate('/admin/flota');
      } catch (err) {
        setErrorMsg('Error de conexión con el servidor. Intente de nuevo.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Alerta de Error */}
      {errorMsg && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-600 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-start gap-2.5 shadow-xs"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 text-rose-600 mt-0.5">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-bold text-rose-900">Revise los campos del formulario</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* 1. Vista Previa Visual del Vehículo con Estudio y Sombra */}
      <div className="rounded-3xl bg-white p-5 border border-[#9CA3AF]/30 shadow-sm text-center relative overflow-hidden">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
          Vista Previa en Catálogo
        </span>

        <div className="mt-2 relative flex flex-col items-center justify-center py-2 min-h-[160px]">
          {imagenUrl ? (
            <>
              <img
                src={imagenUrl}
                alt="Vista previa unidad"
                className="max-h-36 sm:max-h-40 w-full object-contain mx-auto transition-transform hover:scale-105 duration-300"
                decoding="async"
              />
              <div className="h-3 w-3/5 mx-auto -mt-2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(17,24,39,0.25)_0%,_transparent_75%)]"></div>
            </>
          ) : (
            <div className="flex h-32 w-full items-center justify-center rounded-2xl bg-[#EDEDED] text-xs text-[#4B5563]">
              Seleccione una imagen abajo
            </div>
          )}
        </div>

        <div className="mt-2">
          <span className="font-mono text-xs font-black tracking-wider text-[#111827] bg-[#EDEDED] px-2.5 py-0.5 rounded border border-[#9CA3AF]/30">
            {placa || 'PLACA-000'}
          </span>
          <h2 className="font-display text-lg font-black text-[#111827] mt-1">
            {marca || 'Marca'} {modelo || 'Modelo'}
          </h2>
          <p className="text-xs text-[#4B5563]">
            {categoriaEtiqueta} • {anio} • {combustible}
          </p>
        </div>
      </div>

      {/* 2. Selector de Imagen: Galería Preset o URL Personalizada */}
      <div className="rounded-3xl bg-white p-5 border border-[#9CA3AF]/30 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-[#111827]">
            Fotografía de la Unidad
          </h3>
          <span className="text-[11px] text-[#4B5563]">Presets de Patio</span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {PRESET_IMAGENES.map((preset) => {
            const isSelected = imagenUrl === preset.url;
            return (
              <button
                key={preset.url}
                type="button"
                onClick={() => setImagenUrl(preset.url)}
                className={`relative flex flex-col items-center justify-center rounded-2xl p-1.5 border transition-all ${
                  isSelected
                    ? 'border-[#111827] bg-[#111827]/5 shadow-sm ring-2 ring-[#111827]'
                    : 'border-[#9CA3AF]/30 bg-[#EDEDED]/40 hover:border-[#4B5563]'
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.nombre}
                  className="h-12 w-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <span className="text-[9px] font-semibold text-[#4B5563] truncate w-full text-center mt-1">
                  {preset.categoria}
                </span>
              </button>
            );
          })}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1">
            URL Directa o Bucket Cloudflare R2
          </label>
          <input
            type="text"
            value={imagenUrl}
            onChange={(e) => setImagenUrl(e.target.value)}
            placeholder="https://... o /images/vehiculos/..."
            className="w-full rounded-xl bg-[#EDEDED]/50 px-3.5 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* 3. Datos Principales de Identificación */}
      <div className="rounded-3xl bg-white p-5 border border-[#9CA3AF]/30 shadow-xs space-y-4">
        <h3 className="font-display font-bold text-sm text-[#111827] border-b border-[#EDEDED] pb-2">
          Identificación y Clasificación
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Marca <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Ej: Mercedes-Benz, BMW, Toyota"
              required
              className="w-full rounded-xl bg-[#EDEDED]/50 px-3.5 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Modelo y Versión <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Ej: EQB 350 4MATIC Luxury"
              required
              className="w-full rounded-xl bg-[#EDEDED]/50 px-3.5 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Placa / Matrícula <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="FLX-801"
              required
              className="w-full font-mono uppercase rounded-xl bg-[#EDEDED]/50 px-3.5 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Año <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              min="1990"
              max="2035"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="w-full rounded-xl bg-[#EDEDED]/50 px-3.5 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Categoría <span className="text-rose-600">*</span>
            </label>
            <select
              value={categoria}
              onChange={(e) => handleCategoriaChange(e.target.value as CategoriaVehiculo)}
              className="w-full rounded-xl bg-[#EDEDED]/50 px-3.5 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
            >
              <option value="SEDAN">Sedán</option>
              <option value="SUV">SUV / Camioneta</option>
              <option value="MOTO">Motocicleta</option>
              <option value="PATINETA">Monopatín Eléctrico</option>
              <option value="UTILITARIO">Utilitario</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1">
            Etiqueta Comercial
          </label>
          <input
            type="text"
            value={categoriaEtiqueta}
            onChange={(e) => setCategoriaEtiqueta(e.target.value)}
            placeholder="Ej: SUV Eléctrica, Coupe Deportivo"
            className="w-full rounded-xl bg-[#EDEDED]/50 px-3.5 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* 4. Tarifas, Depósito y Finanzas */}
      <div className="rounded-3xl bg-white p-5 border border-[#9CA3AF]/30 shadow-xs space-y-4">
        <h3 className="font-display font-bold text-sm text-[#111827] border-b border-[#EDEDED] pb-2">
          Tarifas y Garantía de Alquiler
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Precio de Alquiler por Día (COP) <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-[#4B5563]">
                $
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={precioDia}
                onChange={(e) =>
                  setPrecioDia(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="280000"
                required
                className="w-full rounded-xl bg-[#EDEDED]/50 pl-7 pr-3.5 py-2.5 text-base font-bold text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#4B5563]">Tarifa base de 24 horas</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Depósito de Garantía / Fianza (COP) <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-[#4B5563]">
                $
              </span>
              <input
                type="number"
                min="0"
                step="5000"
                value={depositoGarantia}
                onChange={(e) =>
                  setDepositoGarantia(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="750000"
                required
                className="w-full rounded-xl bg-[#EDEDED]/50 pl-7 pr-3.5 py-2.5 text-base font-bold text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#4B5563]">Reembolsable al cierre de inspección</p>
          </div>
        </div>
      </div>

      {/* 5. Especificaciones Técnicas */}
      <div className="rounded-3xl bg-white p-5 border border-[#9CA3AF]/30 shadow-xs space-y-4">
        <h3 className="font-display font-bold text-sm text-[#111827] border-b border-[#EDEDED] pb-2">
          Especificaciones Técnicas
        </h3>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Transmisión
            </label>
            <select
              value={transmision}
              onChange={(e) =>
                setTransmision(e.target.value as 'Automática' | 'Manual' | 'Eléctrica')
              }
              className="w-full rounded-xl bg-[#EDEDED]/50 px-3 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
            >
              <option value="Automática">Automática</option>
              <option value="Manual">Manual</option>
              <option value="Eléctrica">Eléctrica</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Combustible
            </label>
            <select
              value={combustible}
              onChange={(e) =>
                setCombustible(
                  e.target.value as 'Gasolina' | 'Diésel' | 'Eléctrico' | 'Híbrido'
                )
              }
              className="w-full rounded-xl bg-[#EDEDED]/50 px-3 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
            >
              <option value="Gasolina">Gasolina</option>
              <option value="Eléctrico">Eléctrico</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Diésel">Diésel</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Pasajeros
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={capacidadPasajeros}
              onChange={(e) => setCapacidadPasajeros(Number(e.target.value))}
              className="w-full rounded-xl bg-[#EDEDED]/50 px-3 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Kilometraje (km)
            </label>
            <input
              type="number"
              min="0"
              value={kilometraje}
              onChange={(e) =>
                setKilometraje(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-full rounded-xl bg-[#EDEDED]/50 px-3 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Autonomía (km, opcional)
            </label>
            <input
              type="number"
              min="0"
              value={autonomiaKm}
              onChange={(e) =>
                setAutonomiaKm(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="Ej: 420"
              className="w-full rounded-xl bg-[#EDEDED]/50 px-3 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Aceleración (0-100)
            </label>
            <input
              type="text"
              value={aceleracion}
              onChange={(e) => setAceleracion(e.target.value)}
              placeholder="Ej: 3.8 s"
              className="w-full rounded-xl bg-[#EDEDED]/50 px-3 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Velocidad Máxima
            </label>
            <input
              type="text"
              value={velocidadMaxima}
              onChange={(e) => setVelocidadMaxima(e.target.value)}
              placeholder="Ej: 210 km/h"
              className="w-full rounded-xl bg-[#EDEDED]/50 px-3 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 6. Estado Operativo y Descripción */}
      <div className="rounded-3xl bg-white p-5 border border-[#9CA3AF]/30 shadow-xs space-y-4">
        <h3 className="font-display font-bold text-sm text-[#111827] border-b border-[#EDEDED] pb-2">
          Estado Operativo y Reseña
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Estado de la Unidad
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoVehiculo)}
              className="w-full rounded-xl bg-[#EDEDED]/50 px-3.5 py-2.5 text-base font-bold text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
            >
              <option value="DISPONIBLE">🟢 Disponible para alquiler</option>
              <option value="RESERVADO">🔵 En Alquiler / Reservado</option>
              <option value="MANTENIMIENTO">🟠 En Mantenimiento</option>
              <option value="FUERA_SERVICIO">🔴 Fuera de Servicio</option>
            </select>
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={destacado}
                onChange={(e) => setDestacado(e.target.checked)}
                className="h-5 w-5 rounded border-[#9CA3AF] text-[#111827] focus:ring-[#111827]"
              />
              <div>
                <span className="text-xs font-bold text-[#111827]">
                  Destacar en portada del catálogo
                </span>
                <p className="text-[11px] text-[#4B5563]">
                  Aparecerá en la sección principal 'Popular Cars'.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1">
            Descripción Pericial y Comercial <span className="text-rose-600">*</span>
          </label>
          <textarea
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Detalles sobre equipamiento, estado de carrocería, características especiales..."
            required
            className="w-full rounded-xl bg-[#EDEDED]/50 px-3.5 py-2.5 text-base text-[#111827] border border-[#9CA3AF]/30 focus:border-[#4B5563] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <a
          href="/admin/flota"
          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-[#EDEDED] px-5 py-2.5 text-xs font-semibold text-[#4B5563] hover:text-[#111827] hover:bg-[#9CA3AF]/30 transition"
        >
          Cancelar
        </a>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#111827] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#1F2937] transition active:scale-95 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Guardando unidad...</span>
            </>
          ) : (
            <span>{esEdicion ? 'Guardar Cambios' : 'Publicar Vehículo en Alquiler'}</span>
          )}
        </button>
      </div>
    </form>
  );
}
