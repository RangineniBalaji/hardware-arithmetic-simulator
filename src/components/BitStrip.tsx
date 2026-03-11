interface BitStripProps {
  bits: string;
  onBitToggle: (index: number) => void;
  label?: string;
}

export default function BitStrip({ bits, onBitToggle, label }: BitStripProps) {
  const bitArray = bits.split('');

  const getBitColor = (index: number): string => {
    if (index === 0) return 'bg-rose-50 border-rose-200 hover:bg-rose-100';
    if (index >= 1 && index <= 5) return 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100';
    return 'bg-sky-50 border-sky-200 hover:bg-sky-100';
  };

  const getBitLabel = (index: number): string => {
    if (index === 0) return 'S';
    if (index >= 1 && index <= 5) return `E${index - 1}`;
    return `M${index - 6}`;
  };

  return (
    <div className="space-y-2">
      {label && <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</div>}
      <div className="flex flex-wrap gap-1">
        {bitArray.map((bit, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <button
              onClick={() => onBitToggle(index)}
              className={`w-8 h-10 flex items-center justify-center border rounded font-mono text-sm transition-all ${getBitColor(index)} ${bit === '1' ? 'text-gray-900 font-bold shadow-sm ring-1 ring-black/5' : 'text-gray-400 font-medium'}`}
            >
              {bit}
            </button>
            <span className="text-[10px] text-gray-500 font-mono font-medium">{getBitLabel(index)}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs font-medium text-gray-500 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-rose-100 border border-rose-300 rounded shadow-sm"></div>
          <span>Sign</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded shadow-sm"></div>
          <span>Exponent (5-bit)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-sky-100 border border-sky-300 rounded shadow-sm"></div>
          <span>Fraction (10-bit)</span>
        </div>
      </div>
    </div>
  );
}
