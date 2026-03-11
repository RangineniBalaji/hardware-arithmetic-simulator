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
    ? 'border-blue-200 bg-white shadow-sm ring-1 ring-blue-50'
    : 'border-purple-200 bg-white shadow-sm ring-1 ring-purple-50';

  return (
    <div className={`rounded-xl p-6 transition-all ${colorClasses}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{label}</h3>
        <div className="flex gap-2">
          {comp.isSubnormal && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs font-semibold rounded-full shadow-sm">Subnormal</span>}
          {comp.isZero && <span className="px-2 py-1 bg-gray-100 text-gray-800 border border-gray-200 text-xs font-semibold rounded-full shadow-sm">Zero</span>}
          {comp.isInfinity && <span className="px-2 py-1 bg-red-100 text-red-800 border border-red-200 text-xs font-semibold rounded-full shadow-sm">Infinity</span>}
          {comp.isNaN && <span className="px-2 py-1 bg-red-100 text-red-800 border border-red-200 text-xs font-semibold rounded-full shadow-sm">NaN</span>}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2 block">Decimal Value</label>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 text-2xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
            placeholder="Enter a number"
          />
        </div>

        <BitStrip bits={fp16.getBits()} onBitToggle={handleBitToggle} label="16-Bit Representation" />

        <div className="grid grid-cols-3 gap-3 mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
          <div>
            <div className="text-xs text-gray-500 font-medium mb-1">Sign</div>
            <div className="text-sm font-mono font-semibold text-rose-600">{comp.sign ? '-' : '+'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium mb-1">Exponent</div>
            <div className="text-sm font-mono font-semibold text-emerald-600">{comp.biasedExponent} <span className="text-gray-400 text-xs font-normal">(2^{comp.actualExponent})</span></div>
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium mb-1">Fraction</div>
            <div className="text-sm font-mono font-semibold text-sky-600">{comp.fraction}/1024</div>
          </div>
        </div>
      </div>
    </div>
  );
}
