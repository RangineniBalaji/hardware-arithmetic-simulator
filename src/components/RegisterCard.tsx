import { useState, useEffect } from 'react';
import BitStrip from './BitStrip';
import { FP16 } from '../lib/fp16';

interface RegisterCardProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color: 'indigo' | 'purple';
}

export default function RegisterCard({ label, value, onChange, color }: RegisterCardProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [fp16, setFp16] = useState(new FP16(value));

  useEffect(() => {
    setInputValue(value.toString());
    setFp16(new FP16(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const newFp16 = new FP16(num);
      setFp16(newFp16);
      onChange(newFp16.toFloat());
    }
  };

  const handleBitToggle = (index: number) => {
    const bits = fp16.getBits().split('');
    bits[index] = bits[index] === '0' ? '1' : '0';
    const newBits = bits.join('');
    const newFp16 = FP16.fromBits(newBits);
    setFp16(newFp16);
    const newValue = newFp16.toFloat();
    onChange(newValue);
    setInputValue(newValue.toString());
  };

  const comp = fp16.getComponents();
  const colorClasses = color === 'indigo'
    ? 'border-indigo-500/30 bg-indigo-500/5'
    : 'border-purple-500/30 bg-purple-500/5';

  return (
    <div className={`border ${colorClasses} rounded-xl p-6 backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{label}</h3>
        <div className="flex gap-2">
          {comp.isSubnormal && <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">Subnormal</span>}
          {comp.isZero && <span className="px-2 py-1 bg-slate-500/20 text-slate-300 text-xs rounded-full">Zero</span>}
          {comp.isInfinity && <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">Infinity</span>}
          {comp.isNaN && <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">NaN</span>}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Decimal Value</label>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white text-2xl font-mono focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="Enter a number"
          />
        </div>

        <BitStrip bits={fp16.getBits()} onBitToggle={handleBitToggle} label="16-Bit Representation" />

        <div className="grid grid-cols-3 gap-3 mt-4 p-4 bg-slate-800/30 rounded-lg">
          <div>
            <div className="text-xs text-slate-500 mb-1">Sign</div>
            <div className="text-sm font-mono text-rose-300">{comp.sign ? '-' : '+'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Exponent</div>
            <div className="text-sm font-mono text-emerald-300">{comp.biasedExponent} (2^{comp.actualExponent})</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Fraction</div>
            <div className="text-sm font-mono text-sky-300">{comp.fraction}/1024</div>
          </div>
        </div>
      </div>
    </div>
  );
}
