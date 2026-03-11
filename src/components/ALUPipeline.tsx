import { ChevronRight } from 'lucide-react';
import { ALUStage } from '../types/fp16.types';

interface ALUPipelineProps {
  stages: ALUStage[];
  isAnimating?: boolean;
}

export default function ALUPipeline({ stages, isAnimating = false }: ALUPipelineProps) {
  if (stages.length === 0) {
    return (
      <div className="border border-slate-700 rounded-xl p-8 backdrop-blur-sm bg-slate-800/30 text-center">
        <p className="text-slate-400">Execute an operation to see the ALU pipeline in action</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => (
        <div
          key={index}
          className={`border border-slate-700 rounded-xl p-6 backdrop-blur-sm bg-slate-800/30 transition-all duration-500 ${
            isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
          style={{ transitionDelay: `${index * 150}ms` }}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500 flex items-center justify-center text-indigo-300 font-bold">
              {index + 1}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">{stage.name}</h3>
              <p className="text-slate-400 text-sm mb-4">{stage.description}</p>

              <div className="space-y-2">
                {stage.details.map((detail, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <ChevronRight className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300 font-mono text-xs leading-relaxed">{detail}</span>
                  </div>
                ))}
              </div>

              {stage.values && Object.keys(stage.values).length > 0 && (
                <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Key Values</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(stage.values).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-slate-400 text-xs">{key}:</span>
                        <span className="text-indigo-300 font-mono text-xs">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
