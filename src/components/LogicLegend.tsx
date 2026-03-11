import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface LegendItem {
  term: string;
  definition: string;
  details: string;
}

const legendItems: LegendItem[] = [
  {
    term: 'IEEE 754 Half-Precision',
    definition: 'A 16-bit floating-point format',
    details: '1 sign bit, 5 exponent bits (bias=15), 10 fraction bits. Range: ±65504, precision: ~3-4 decimal digits.'
  },
  {
    term: 'Biased Exponent',
    definition: 'Stored exponent value with bias',
    details: 'The stored exponent uses a bias of 15. Actual exponent = stored - 15. This allows representation of both positive and negative exponents using only positive integers.'
  },
  {
    term: 'Implicit Bit',
    definition: 'Hidden leading 1 in normalized numbers',
    details: 'In normalized FP16, the mantissa is always 1.fraction. The leading 1 is implicit (not stored) to save a bit. For subnormals (exponent=0), the implicit bit is 0.'
  },
  {
    term: 'Subnormal Numbers',
    definition: 'Denormalized values near zero',
    details: 'When exponent=0 and fraction≠0, the number is subnormal. These extend the range near zero with reduced precision. Format: (-1)^S × 2^(-14) × 0.fraction'
  },
  {
    term: 'GRS Bits',
    definition: 'Guard, Round, Sticky bits for rounding',
    details: 'Extra bits used in rounding: Guard (1st bit after fraction), Round (2nd bit), Sticky (OR of remaining bits). Used in "Round to Nearest, Ties to Even" algorithm.'
  },
  {
    term: 'Round to Nearest, Ties to Even',
    definition: 'IEEE 754 default rounding mode',
    details: 'Round to the nearest representable value. When exactly halfway (tie), round to the value with an even LSB. This minimizes bias over many operations.'
  },
  {
    term: 'Quantization Error',
    definition: 'Precision loss from rounding',
    details: 'The difference between true mathematical result and the rounded FP16 representation. Inevitable due to finite precision.'
  },
  {
    term: 'Mantissa Alignment',
    definition: 'Exponent matching for addition',
    details: 'Before adding, operands must have the same exponent. The smaller exponent is shifted right to match the larger, potentially losing precision in lower bits.'
  },
];

export default function LogicLegend() {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="border border-slate-700 rounded-xl p-6 backdrop-blur-sm bg-slate-800/30 sticky top-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-white">Logic Legend</h3>
      </div>

      <div className="space-y-2">
        {legendItems.map((item, index) => (
          <div key={index} className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900/30">
            <button
              onClick={() => toggleItem(index)}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-700/20 transition-colors"
            >
              <div className="text-left">
                <div className="text-sm font-semibold text-indigo-300">{item.term}</div>
                <div className="text-xs text-slate-400">{item.definition}</div>
              </div>
              {expandedItems.has(index) ? (
                <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
              )}
            </button>
            {expandedItems.has(index) && (
              <div className="px-3 pb-3 text-xs text-slate-300 leading-relaxed border-t border-slate-700 pt-3">
                {item.details}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
        <div className="text-xs font-semibold text-indigo-300 mb-2">Hardware Insight</div>
        <div className="text-xs text-slate-300 leading-relaxed">
          Real FP16 ALUs perform operations on integer representations. The "scale-first" approach multiplies values by 2^10, operates on integers, then normalizes back. This is why precision is limited!
        </div>
      </div>
    </div>
  );
}
