export interface FP16Components {
  sign: number;
  exponent: number;
  fraction: number;
  biasedExponent: number;
  actualExponent: number;
  implicitBit: number;
  isSubnormal: boolean;
  isZero: boolean;
  isInfinity: boolean;
  isNaN: boolean;
}

export interface ALUStage {
  name: string;
  description: string;
  details: string[];
  binaryData?: string;
  values?: Record<string, number | string>;
}

export interface FP16Result {
  bits: string;
  decimal: number;
  components: FP16Components;
  stages: ALUStage[];
  trueMathResult: number;
  quantizationError: number;
  guardBit?: number;
  roundBit?: number;
  stickyBit?: number;
}

export type Operation = 'add' | 'multiply';
