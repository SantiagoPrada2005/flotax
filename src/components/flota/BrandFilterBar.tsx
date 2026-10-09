import { useState, type ReactNode } from 'react';

export interface BrandFilterBarProps {
  onSelectBrand?: ((brand: string) => void) | undefined;
  activeBrand?: string | undefined;
}

interface BrandItem {
  id: string;
  label: string;
  logo: (isActive: boolean) => ReactNode;
}

const BRANDS: BrandItem[] = [
  {
    id: 'ALL',
    label: 'All Car',
    logo: (active) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-[#111827]'}`}>
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
  },
  {
    id: 'BMW',
    label: 'Bmw',
    logo: () => (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 2A10 10 0 0 0 2 12h10V2z" fill="#0066B1" />
        <path d="M12 12v10a10 10 0 0 0 10-10H12z" fill="#0066B1" />
        <path d="M12 2v10H22A10 10 0 0 0 12 2z" fill="#FFFFFF" />
        <path d="M2 12a10 10 0 0 0 10 10V12H2z" fill="#FFFFFF" />
        <circle cx="12" cy="12" r="10" fill="none" stroke="#111827" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: 'Mercedes-Benz',
    label: 'Mercedes',
    logo: () => (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#111827]" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 2.5 L12 12 L4.2 16.5 L12 12 L19.8 16.5 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'Mazda',
    label: 'Mazda',
    logo: () => (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#111827]" fill="none" stroke="currentColor" strokeWidth="1.6">
        <ellipse cx="12" cy="12" rx="10" ry="7.5" />
        <path d="M4 12c3-4 6-4 8 0c2-4 5-4 8 0" />
      </svg>
    ),
  },
  {
    id: 'Yamaha',
    label: 'Motos',
    logo: () => (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#111827]" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" strokeWidth="1.4" />
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="4.2" y1="7.5" x2="19.8" y2="16.5" />
        <line x1="4.2" y1="16.5" x2="19.8" y2="7.5" />
      </svg>
    ),
  },
  {
    id: 'Volt Striker',
    label: 'Volt',
    logo: () => (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#111827]" fill="currentColor">
        <path d="M13 2L4 14h7l-2 8 11-12h-7l2-8z" />
      </svg>
    ),
  },
];

export default function BrandFilterBar({
  onSelectBrand,
  activeBrand = 'ALL',
}: BrandFilterBarProps) {
  const [selected, setSelected] = useState(activeBrand);

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(6); } catch {}
    }
  };

  const handleSelect = (brandId: string) => {
    triggerHaptic();
    setSelected(brandId);
    if (onSelectBrand) {
      onSelectBrand(brandId);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-0.5">
        <h3 className="font-display text-sm font-bold tracking-tight text-[#111827]">
          Brand
        </h3>
        <button
          type="button"
          onClick={() => handleSelect('ALL')}
          className="text-xs font-semibold text-[#71717A] hover:text-[#111827] transition cursor-pointer"
        >
          See All
        </button>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        {BRANDS.map((b) => {
          const isActive = selected === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => handleSelect(b.id)}
              className={`ios-press-bounce flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#18181B] text-white shadow-sm'
                  : 'bg-white border border-[#E4E4E7] text-[#18181B] hover:border-[#A1A1AA] hover:bg-[#FAFAFA]'
              }`}
            >
              <div className="flex h-4.5 w-4.5 items-center justify-center shrink-0">
                {b.logo(isActive)}
              </div>
              <span className="leading-none">{b.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
