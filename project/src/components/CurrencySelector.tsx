import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { CURRENCIES, type CurrencyCode } from '@/lib/types';
import { useCurrency } from '@/contexts/CurrencyContext';

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-semibold text-navy-800 transition-colors hover:border-sky-400 hover:bg-sky-50"
      >
        <span className="text-sky-600">{CURRENCIES[currency].symbol}</span>
        <span>{CURRENCIES[currency].code}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-52 animate-scale-in overflow-hidden rounded-xl border border-navy-100 bg-white shadow-xl shadow-navy-900/10">
          {Object.entries(CURRENCIES).map(([code, info]) => (
            <button
              key={code}
              onClick={() => {
                setCurrency(code as CurrencyCode);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-sky-50 ${
                currency === code ? 'bg-sky-50 font-semibold text-sky-700' : 'text-navy-700'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="w-8 text-center font-bold text-sky-600">{info.symbol}</span>
                <span>{info.name}</span>
              </span>
              {currency === code && <Check className="h-4 w-4 text-sky-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
