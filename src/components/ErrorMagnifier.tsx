import { AlertCircle } from 'lucide-react';

interface ErrorMagnifierProps {
  trueMath: number;
  fp16Result: number;
  quantizationError: number;
}

export default function ErrorMagnifier({ trueMath, fp16Result, quantizationError }: ErrorMagnifierProps) {
  const errorPercentage = trueMath !== 0 ? (quantizationError / Math.abs(trueMath)) * 100 : 0;
  const gaugeWidth = Math.min(errorPercentage * 10, 100);

  return (
    <div className="border border-slate-700 rounded-xl p-6 backdrop-blur-sm bg-slate-800/30">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-semibold text-white">Precision Analysis</h3>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">True Math Result</div>
            <div className="text-xl font-mono text-emerald-300">{trueMath.toExponential(10)}</div>
          </div>
          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">FP16 Hardware Result</div>
            <div className="text-xl font-mono text-sky-300">{fp16Result.toExponential(10)}</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-400">Quantization Error</span>
            <span className="text-sm font-mono text-rose-300">{quantizationError.toExponential(4)}</span>
          </div>
          <div className="h-3 bg-slate-900/50 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-rose-500 transition-all duration-500"
              style={{ width: `${gaugeWidth}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-slate-500">Minimal Loss</span>
            <span className="text-xs text-slate-500">Significant Loss</span>
          </div>
        </div>

        {errorPercentage > 0 && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="text-xs text-yellow-300">
              Relative Error: {errorPercentage.toFixed(6)}%
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500 leading-relaxed">
          This error occurs because FP16 uses only 10 bits for the fraction (mantissa), limiting precision to approximately 3-4 decimal digits. The rounding process in Stage 4 introduces additional quantization.
        </div>
      </div>
    </div>
  );
}
