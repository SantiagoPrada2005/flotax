import { useState, useRef } from 'react';
import type { VehiculoWizardData } from './types';

export interface Step6FotografiaProps {
  data: VehiculoWizardData;
  errors: Record<string, string>;
  onChange: (updates: Partial<VehiculoWizardData>) => void;
}

export default function Step6Fotografia({
  data,
  errors,
  onChange,
}: Step6FotografiaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [nombreArchivoLocal, setNombreArchivoLocal] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setNombreArchivoLocal(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onChange({ imagenUrl: result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleEliminarFoto = () => {
    setNombreArchivoLocal(null);
    onChange({ imagenUrl: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Encabezado Hero */}
      <div className="space-y-2">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
          Paso 06 · Registro Fotográfico
        </span>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] leading-[1.12]">
          Muéstranos tu vehículo
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] font-medium max-w-[50ch]">
          Sube una fotografía de alta calidad de la unidad para el catálogo de flota y la inspección pericial.
        </p>
      </div>

      {/* Contenedor Inmersivo de Pantalla Completa (1 Entrada) */}
      <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        {/* Input Oculto de Archivos */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileProcess(file);
          }}
        />

        {/* Zona Superior: Dropzone de Carga */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-[24px] border-2 border-dashed p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${isDragging
              ? 'border-[#111827] bg-[#EDEDED] scale-[0.99]'
              : 'border-[#9CA3AF]/50 bg-[#EDEDED]/30 hover:border-[#111827] hover:bg-[#EDEDED]/60'
            }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EDEDED] font-mono text-2xl font-bold text-[#111827] border border-[#9CA3AF]/40 shadow-xs">
            ↑
          </div>

          <div>
            <p className="font-display font-bold text-base sm:text-lg text-[#111827]">
              {nombreArchivoLocal
                ? `Archivo cargado: ${nombreArchivoLocal}`
                : 'Arrastra una fotografía aquí o haz clic para examinar'}
            </p>
            <p className="text-xs text-[#4B5563] mt-1">
              Formatos recomendados: JPG, PNG, WEBP (hasta 10 MB)
            </p>
          </div>

          <button
            type="button"
            className="ios-press-bounce mt-1 rounded-full bg-[#111827] hover:bg-[#1F2937] px-6 py-2.5 font-display text-xs font-bold text-white shadow-xs transition cursor-pointer"
          >
            {data.imagenUrl ? 'Cambiar fotografía' : 'Seleccionar del dispositivo'}
          </button>
        </div>

        {errors.imagenUrl && (
          <p className="text-xs font-bold text-rose-600 animate-fade-in text-center sm:text-left">
            {errors.imagenUrl}
          </p>
        )}

        {/* Vista Previa Protagonista */}
        {data.imagenUrl && (
          <div className="space-y-3 border-t border-[#EDEDED] pt-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]">
                Vista Previa de la Ficha
              </span>
              <button
                type="button"
                onClick={handleEliminarFoto}
                className="font-mono text-xs font-bold text-rose-600 hover:text-rose-800 transition cursor-pointer"
              >
                ✕ Quitar fotografía
              </button>
            </div>

            <div className="relative overflow-hidden rounded-[24px] border border-[#9CA3AF]/40 bg-[#EDEDED]/40 h-64 sm:h-80 flex items-center justify-center shadow-xs">
              <img
                src={data.imagenUrl}
                alt={`${data.marca} ${data.modelo}`}
                className="h-full w-full object-cover transition-all"
              />
              <div className="absolute bottom-3 left-3 bg-[#111827]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white font-mono text-xs font-bold border border-white/20">
                {data.marca || 'Vehículo'} {data.modelo} · {data.placa || 'Patio'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
