import { FP16Components } from '../types/fp16.types';

interface ComparisonViewProps {
  result: {
    bits: string;
    decimal: number;
    components: FP16Components;
  } | null;
}

export default function ComparisonView({ result }: ComparisonViewProps) {
  if (!result) {
    return null;
  }

  const { bits, decimal, components } = result;

  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-gradient-to-br from-blue-50/50 to-purple-50/50 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Result Analysis</h3>

      <div className="space-y-4">
        <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Binary Representation</div>
          <div className="font-mono text-lg text-gray-900 break-all">{bits}</div>
          <div className="mt-2 flex gap-4 text-xs font-medium">
            <span className="text-rose-600">S: {bits[0]}</span>
            <span className="text-emerald-600">E: {bits.slice(1, 6)}</span>
            <span className="text-sky-600">F: {bits.slice(6)}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Decimal Value</div>
          <div className="text-3xl font-mono font-bold text-gray-900">{decimal}</div>
          <div className="text-sm font-medium text-gray-500 mt-1">{decimal.toExponential(10)}</div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 mb-1">Sign Bit</div>
            <div className="text-lg font-mono font-bold text-rose-600">{components.sign}</div>
            <div className="text-xs font-medium text-gray-400">{components.sign ? 'Negative' : 'Positive'}</div>
          </div>
          <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 mb-1">Exponent</div>
            <div className="text-lg font-mono font-bold text-emerald-600">{components.biasedExponent}</div>
            <div className="text-xs font-medium text-gray-400">Bias: -15 = {components.actualExponent}</div>
          </div>
          <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 mb-1">Mantissa</div>
            <div className="text-lg font-mono font-bold text-sky-600">{components.implicitBit}.{components.fraction.toString(2).padStart(10, '0')}</div>
            <div className="text-xs font-medium text-gray-400">Implicit: {components.implicitBit}</div>
          </div>
        </div>

        {components.isSubnormal && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm text-yellow-800 font-semibold">Subnormal Number Detected</div>
            <div className="text-xs text-gray-600 mt-1">
              Exponent is 0, using denormalized representation with implicit bit = 0
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
