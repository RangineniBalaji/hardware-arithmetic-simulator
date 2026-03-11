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
    <div className="border border-slate-700 rounded-xl p-6 backdrop-blur-sm bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
      <h3 className="text-lg font-semibold text-white mb-4">Result Analysis</h3>

      <div className="space-y-4">
        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Binary Representation</div>
          <div className="font-mono text-lg text-white break-all">{bits}</div>
          <div className="mt-2 flex gap-4 text-xs">
            <span className="text-rose-300">S: {bits[0]}</span>
            <span className="text-emerald-300">E: {bits.slice(1, 6)}</span>
            <span className="text-sky-300">F: {bits.slice(6)}</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Decimal Value</div>
          <div className="text-3xl font-mono text-white">{decimal}</div>
          <div className="text-sm text-slate-400 mt-1">{decimal.toExponential(10)}</div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-500 mb-1">Sign Bit</div>
            <div className="text-lg font-mono text-rose-300">{components.sign}</div>
            <div className="text-xs text-slate-400">{components.sign ? 'Negative' : 'Positive'}</div>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-500 mb-1">Exponent</div>
            <div className="text-lg font-mono text-emerald-300">{components.biasedExponent}</div>
            <div className="text-xs text-slate-400">Bias: -15 = {components.actualExponent}</div>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-500 mb-1">Mantissa</div>
            <div className="text-lg font-mono text-sky-300">{components.implicitBit}.{components.fraction.toString(2).padStart(10, '0')}</div>
            <div className="text-xs text-slate-400">Implicit: {components.implicitBit}</div>
          </div>
        </div>

        {components.isSubnormal && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="text-xs text-yellow-300 font-medium">Subnormal Number Detected</div>
            <div className="text-xs text-slate-400 mt-1">
              Exponent is 0, using denormalized representation with implicit bit = 0
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
