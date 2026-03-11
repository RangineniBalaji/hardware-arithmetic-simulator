import React, { useState } from 'react';
import { ChevronRight, Maximize2, X } from 'lucide-react';
import { ALUStage } from '../types/fp16.types';

interface ALUPipelineProps {
  stages: ALUStage[];
  isAnimating?: boolean;
}

export default function ALUPipeline({ stages, isAnimating = false }: ALUPipelineProps) {
  const [selectedStage, setSelectedStage] = useState<ALUStage | null>(null);

  if (stages.length === 0) {
    return (
      <div className="border border-gray-200 rounded-xl p-8 bg-white shadow-sm text-center">
        <p className="text-gray-500 font-medium">Execute an operation to see the ALU pipeline in action</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 p-4">
        {stages.map((stage, index) => (
          <div
            key={index}
            className={`border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all duration-500 cursor-pointer ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
              }`}
            style={{ transitionDelay: `${index * 150}ms` }}
            onClick={() => setSelectedStage(stage)}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold shadow-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">{stage.name}</h3>
                  <button className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="View Detailed Step Details">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-gray-600 text-sm mb-3">{stage.description}</p>

                <div className="space-y-1.5 opacity-80 pointer-events-none">
                  {stage.details.map((detail, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600 font-mono text-xs leading-relaxed break-words whitespace-normal">{detail}</span>
                    </div>
                  ))}
                </div>

                {stage.values && Object.keys(stage.values).length > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Key Values</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(stage.values).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center bg-white px-2 py-1 rounded border border-gray-100">
                          <span className="text-gray-600 text-xs font-medium">{key}:</span>
                          <span className="text-blue-700 font-mono text-xs">{value}</span>
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

      {selectedStage && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto overflow-x-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/80">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedStage.name}</h2>
                <p className="text-sm font-medium text-blue-600 mt-1">{selectedStage.description}</p>
              </div>
              <button
                onClick={() => setSelectedStage(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Hardware Execution Log</h4>
              <div className="bg-gray-900 rounded-xl p-5 font-mono text-sm text-green-400 shadow-inner overflow-x-auto space-y-3">
                {selectedStage.details.map((detail, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-gray-600 select-none">{String(i + 1).padStart(2, '0')}</span>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>

              {selectedStage.educationalExplanations && selectedStage.educationalExplanations.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Why is this happening?
                  </h4>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 space-y-3">
                    {selectedStage.educationalExplanations.map((explanation, i) => (
                      <div key={i} className="flex items-start gap-3">

                        {/* number */}
                        <span className="text-blue-600 font-semibold text-sm w-5">
                          {i + 1}.
                        </span>

                        {/* explanation */}
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line break-words">
                          {explanation}
                        </p>

                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedStage.values && Object.keys(selectedStage.values).length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Register Dump</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedStage.values).map(([key, value]) => (
                      <div key={key} className="flex flex-col bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                        <span className="text-gray-500 text-xs font-bold mb-1 uppercase">{key.replace(/_/g, ' ')}</span>
                        <span className="text-blue-700 font-mono text-sm font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
