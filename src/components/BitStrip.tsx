interface BitStripProps {
  bits: string;
  onBitToggle: (index: number) => void;
  label?: string;
}

export default function BitStrip({ bits, onBitToggle, label }: BitStripProps) {
  const bitArray = bits.split('');

  const getBitColor = (index: number): string => {
    if (index === 0) return 'bg-rose-500/20 border-rose-400 hover:bg-rose-500/30';
    if (index >= 1 && index <= 5) return 'bg-emerald-500/20 border-emerald-400 hover:bg-emerald-500/30';
    return 'bg-sky-500/20 border-sky-400 hover:bg-sky-500/30';
  };

  const getBitLabel = (index: number): string => {
    if (index === 0) return 'S';
    if (index >= 1 && index <= 5) return `E${index - 1}`;
    return `M${index - 6}`;
  };

  return (
    <div className="space-y-2">
      {label && <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</div>}
      <div className="flex gap-1">
        {bitArray.map((bit, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <button
              onClick={() => onBitToggle(index)}
              className={`w-8 h-10 flex items-center justify-center border rounded font-mono text-sm font-bold transition-all ${getBitColor(index)} ${bit === '1' ? 'text-white' : 'text-slate-500'}`}
            >
              {bit}
            </button>
            <span className="text-[10px] text-slate-500 font-mono">{getBitLabel(index)}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-slate-400 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-rose-500/20 border border-rose-400 rounded"></div>
          <span>Sign</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-emerald-500/20 border border-emerald-400 rounded"></div>
          <span>Exponent (5-bit)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-sky-500/20 border border-sky-400 rounded"></div>
          <span>Fraction (10-bit)</span>
        </div>
      </div>
    </div>
  );
}
