import { FP16Components, ALUStage, FP16Result, Operation } from '../types/fp16.types';

export class FP16 {
  private bits: number;

  constructor(value: number | string) {
    if (typeof value === 'string') {
      this.bits = parseInt(value, 2);
    } else {
      this.bits = this.floatToFP16(value);
    }
  }

  static fromBits(bits: string): FP16 {
    return new FP16(bits);
  }

  getBits(): string {
    return this.bits.toString(2).padStart(16, '0');
  }

  getComponents(): FP16Components {
    const bits = this.getBits();
    const sign = parseInt(bits[0], 2);
    const exponent = parseInt(bits.slice(1, 6), 2);
    const fraction = parseInt(bits.slice(6), 2);

    const isSubnormal = exponent === 0 && fraction !== 0;
    const isZero = exponent === 0 && fraction === 0;
    const isInfinity = exponent === 31 && fraction === 0;
    const isNaN = exponent === 31 && fraction !== 0;

    const implicitBit = exponent === 0 ? 0 : 1;
    const biasedExponent = exponent;
    const actualExponent = exponent === 0 ? -14 : exponent - 15;

    return {
      sign,
      exponent,
      fraction,
      biasedExponent,
      actualExponent,
      implicitBit,
      isSubnormal,
      isZero,
      isInfinity,
      isNaN,
    };
  }

  toFloat(): number {
    const comp = this.getComponents();

    if (comp.isNaN) return NaN;
    if (comp.isInfinity) return comp.sign ? -Infinity : Infinity;
    if (comp.isZero) return comp.sign ? -0 : 0;

    const fractionValue = comp.fraction / 1024;
    const mantissa = comp.implicitBit + fractionValue;
    const value = mantissa * Math.pow(2, comp.actualExponent);

    return comp.sign ? -value : value;
  }

  private floatToFP16(value: number): number {
    if (isNaN(value)) return 0x7e00;
    if (value === Infinity) return 0x7c00;
    if (value === -Infinity) return 0xfc00;
    if (value === 0) return 0;

    const sign = value < 0 ? 1 : 0;
    const absValue = Math.abs(value);

    let exponent = Math.floor(Math.log2(absValue));
    let mantissa = absValue / Math.pow(2, exponent);

    if (exponent < -14) {
      mantissa = absValue / Math.pow(2, -14);
      exponent = 0;
    } else if (exponent > 15) {
      return sign ? 0xfc00 : 0x7c00;
    } else {
      exponent += 15;
      mantissa = mantissa - 1;
    }

    const fraction = Math.round(mantissa * 1024) & 0x3ff;

    return (sign << 15) | (exponent << 10) | fraction;
  }

  static add(a: FP16, b: FP16): FP16Result {
    const stages: ALUStage[] = [];
    const compA = a.getComponents();
    const compB = b.getComponents();

    stages.push({
      name: 'Stage 1: Unpack',
      description: 'Extract sign, exponent, and mantissa from both operands',
      details: [
        `Operand A: Sign=${compA.sign}, Exp=${compA.biasedExponent}, Frac=${compA.fraction.toString(2).padStart(10, '0')}`,
        `Operand B: Sign=${compB.sign}, Exp=${compB.biasedExponent}, Frac=${compB.fraction.toString(2).padStart(10, '0')}`,
        `Implicit bits: A=${compA.implicitBit}, B=${compB.implicitBit}`,
        `Full mantissas: A=${compA.implicitBit}.${compA.fraction.toString(2).padStart(10, '0')}, B=${compB.implicitBit}.${compB.fraction.toString(2).padStart(10, '0')}`,
      ],
      values: {
        'A_mantissa': (compA.implicitBit * 1024 + compA.fraction),
        'B_mantissa': (compB.implicitBit * 1024 + compB.fraction),
      }
    });

    const trueMathResult = a.toFloat() + b.toFloat();

    const expDiff = Math.abs(compA.actualExponent - compB.actualExponent);
    let largerExp, smallerMantissa, largerMantissa, largerSign, smallerSign;

    if (compA.actualExponent >= compB.actualExponent) {
      largerExp = compA.actualExponent;
      largerMantissa = compA.implicitBit * 1024 + compA.fraction;
      smallerMantissa = compB.implicitBit * 1024 + compB.fraction;
      largerSign = compA.sign;
      smallerSign = compB.sign;
    } else {
      largerExp = compB.actualExponent;
      largerMantissa = compB.implicitBit * 1024 + compB.fraction;
      smallerMantissa = compA.implicitBit * 1024 + compA.fraction;
      largerSign = compB.sign;
      smallerSign = compA.sign;
    }

    stages.push({
      name: 'Stage 2: Align',
      description: 'Shift smaller mantissa to align exponents',
      details: [
        `Exponent difference: ${expDiff}`,
        `Larger exponent: ${largerExp} (2^${largerExp})`,
        `Shifting smaller mantissa right by ${expDiff} bits`,
        `Before shift: ${smallerMantissa.toString(2).padStart(11, '0')}`,
        `After shift: ${(smallerMantissa >> expDiff).toString(2).padStart(11, '0')}`,
      ],
      values: {
        'exp_diff': expDiff,
        'aligned_mantissa': smallerMantissa >> expDiff,
      }
    });

    const alignedSmaller = smallerMantissa >> expDiff;
    let resultMantissa: number;
    let resultSign: number;

    if (largerSign === smallerSign) {
      resultMantissa = largerMantissa + alignedSmaller;
      resultSign = largerSign;
    } else {
      if (largerMantissa >= alignedSmaller) {
        resultMantissa = largerMantissa - alignedSmaller;
        resultSign = largerSign;
      } else {
        resultMantissa = alignedSmaller - largerMantissa;
        resultSign = smallerSign;
      }
    }

    let resultExp = largerExp;
    let normalizeShift = 0;

    if (resultMantissa >= 2048) {
      normalizeShift = -1;
      resultMantissa = resultMantissa >> 1;
      resultExp++;
    } else if (resultMantissa < 1024 && resultMantissa > 0) {
      while (resultMantissa < 1024 && resultExp > -14) {
        resultMantissa = resultMantissa << 1;
        resultExp--;
        normalizeShift++;
      }
    }

    stages.push({
      name: 'Stage 3: Normalize',
      description: 'Adjust mantissa and exponent to standard form',
      details: [
        `Raw result mantissa: ${resultMantissa.toString(2)}`,
        `Normalization shift: ${normalizeShift > 0 ? 'Left' : normalizeShift < 0 ? 'Right' : 'None'} by ${Math.abs(normalizeShift)} bits`,
        `Normalized mantissa: ${resultMantissa.toString(2).padStart(11, '0')}`,
        `Result exponent: ${resultExp} (biased: ${resultExp + 15})`,
      ],
      values: {
        'normalized_mantissa': resultMantissa,
        'result_exp': resultExp,
      }
    });

    const guardBit = (resultMantissa >> 0) & 1;
    const roundBit = 0;
    const stickyBit = 0;

    let finalFraction = resultMantissa & 0x3ff;
    const lsb = (resultMantissa >> 10) & 1;

    if (roundBit && (stickyBit || lsb)) {
      finalFraction++;
      if (finalFraction >= 1024) {
        finalFraction = 0;
        resultExp++;
      }
    }

    stages.push({
      name: 'Stage 4: Round',
      description: 'Apply Round to Nearest, Ties to Even',
      details: [
        `Guard bit (G): ${guardBit}`,
        `Round bit (R): ${roundBit}`,
        `Sticky bit (S): ${stickyBit}`,
        `LSB of result: ${lsb}`,
        `Rounding decision: ${roundBit && (stickyBit || lsb) ? 'Round up' : 'Round down'}`,
        `Final fraction: ${finalFraction.toString(2).padStart(10, '0')}`,
      ],
      values: {
        'guard': guardBit,
        'round': roundBit,
        'sticky': stickyBit,
      }
    });

    if (resultExp > 15) {
      const infinityBits = resultSign ? 0xfc00 : 0x7c00;
      const result = FP16.fromBits(infinityBits.toString(2).padStart(16, '0'));
      return {
        bits: result.getBits(),
        decimal: result.toFloat(),
        components: result.getComponents(),
        stages,
        trueMathResult,
        quantizationError: Math.abs(result.toFloat() - trueMathResult),
        guardBit,
        roundBit,
        stickyBit,
      };
    }

    const biasedExp = resultExp < -14 ? 0 : resultExp + 15;
    const resultBits = (resultSign << 15) | (biasedExp << 10) | finalFraction;
    const result = FP16.fromBits(resultBits.toString(2).padStart(16, '0'));

    return {
      bits: result.getBits(),
      decimal: result.toFloat(),
      components: result.getComponents(),
      stages,
      trueMathResult,
      quantizationError: Math.abs(result.toFloat() - trueMathResult),
      guardBit,
      roundBit,
      stickyBit,
    };
  }

  static multiply(a: FP16, b: FP16): FP16Result {
    const stages: ALUStage[] = [];
    const compA = a.getComponents();
    const compB = b.getComponents();

    stages.push({
      name: 'Stage 1: Unpack',
      description: 'Extract sign, exponent, and mantissa from both operands',
      details: [
        `Operand A: Sign=${compA.sign}, Exp=${compA.biasedExponent}, Frac=${compA.fraction.toString(2).padStart(10, '0')}`,
        `Operand B: Sign=${compB.sign}, Exp=${compB.biasedExponent}, Frac=${compB.fraction.toString(2).padStart(10, '0')}`,
        `Implicit bits: A=${compA.implicitBit}, B=${compB.implicitBit}`,
        `Full mantissas: A=${compA.implicitBit}.${compA.fraction.toString(2).padStart(10, '0')}, B=${compB.implicitBit}.${compB.fraction.toString(2).padStart(10, '0')}`,
      ],
      values: {
        'A_mantissa': (compA.implicitBit * 1024 + compA.fraction),
        'B_mantissa': (compB.implicitBit * 1024 + compB.fraction),
      }
    });

    const trueMathResult = a.toFloat() * b.toFloat();

    const mantissaA = compA.implicitBit * 1024 + compA.fraction;
    const mantissaB = compB.implicitBit * 1024 + compB.fraction;
    const product = mantissaA * mantissaB;

    stages.push({
      name: 'Stage 2: Multiply',
      description: 'Multiply mantissas as 11-bit integers',
      details: [
        `Mantissa A (11-bit): ${mantissaA} = ${mantissaA.toString(2).padStart(11, '0')}`,
        `Mantissa B (11-bit): ${mantissaB} = ${mantissaB.toString(2).padStart(11, '0')}`,
        `Product (22-bit): ${product} = ${product.toString(2).padStart(22, '0')}`,
        `Result sign: ${compA.sign ^ compB.sign} (XOR of input signs)`,
        `Raw exponent sum: ${compA.actualExponent} + ${compB.actualExponent} = ${compA.actualExponent + compB.actualExponent}`,
      ],
      values: {
        'product': product,
        'product_bits': 22,
      }
    });

    const resultSign = compA.sign ^ compB.sign;
    let resultExp = compA.actualExponent + compB.actualExponent;
    let resultMantissa = product;

    let normalizeShift = 0;
    if (resultMantissa >= 2097152) {
      const leadingZeros = Math.floor(Math.log2(resultMantissa)) - 20;
      normalizeShift = -leadingZeros;
      resultMantissa = resultMantissa >> leadingZeros;
      resultExp += leadingZeros;
    } else if (resultMantissa >= 1048576) {
      normalizeShift = -1;
      resultMantissa = resultMantissa >> 1;
      resultExp++;
    }

    resultMantissa = resultMantissa >> 10;

    stages.push({
      name: 'Stage 3: Normalize',
      description: 'Adjust 22-bit product to 11-bit normalized form',
      details: [
        `Initial product: ${product.toString(2).padStart(22, '0')}`,
        `Normalization shift: ${normalizeShift > 0 ? 'Left' : normalizeShift < 0 ? 'Right' : 'None'} by ${Math.abs(normalizeShift)} bits`,
        `After shift: ${resultMantissa.toString(2).padStart(11, '0')}`,
        `Exponent adjustment: ${resultExp} (biased: ${resultExp + 15})`,
        `Removing implicit bit to get 10-bit fraction`,
      ],
      values: {
        'normalized_mantissa': resultMantissa,
        'result_exp': resultExp,
      }
    });

    const guardBit = (product >> 9) & 1;
    const roundBit = (product >> 8) & 1;
    const stickyBit = (product & 0xff) !== 0 ? 1 : 0;

    let finalFraction = resultMantissa & 0x3ff;
    const lsb = (resultMantissa >> 10) & 1;

    if (roundBit && (stickyBit || lsb)) {
      finalFraction++;
      if (finalFraction >= 1024) {
        finalFraction = 0;
        resultExp++;
      }
    }

    stages.push({
      name: 'Stage 4: Round',
      description: 'Apply GRS rounding (Round to Nearest, Ties to Even)',
      details: [
        `Guard bit (G): ${guardBit} (bit 9 of product)`,
        `Round bit (R): ${roundBit} (bit 8 of product)`,
        `Sticky bit (S): ${stickyBit} (OR of bits 0-7)`,
        `LSB of result: ${lsb}`,
        `Rounding rule: Round up if R=1 AND (S=1 OR LSB=1)`,
        `Decision: ${roundBit && (stickyBit || lsb) ? 'ROUND UP' : 'ROUND DOWN'}`,
        `Final fraction: ${finalFraction.toString(2).padStart(10, '0')}`,
      ],
      values: {
        'guard': guardBit,
        'round': roundBit,
        'sticky': stickyBit,
      }
    });

    if (resultExp > 15) {
      const infinityBits = resultSign ? 0xfc00 : 0x7c00;
      const result = FP16.fromBits(infinityBits.toString(2).padStart(16, '0'));
      return {
        bits: result.getBits(),
        decimal: result.toFloat(),
        components: result.getComponents(),
        stages,
        trueMathResult,
        quantizationError: Math.abs(result.toFloat() - trueMathResult),
        guardBit,
        roundBit,
        stickyBit,
      };
    }

    const biasedExp = resultExp < -14 ? 0 : resultExp + 15;
    const resultBits = (resultSign << 15) | (biasedExp << 10) | finalFraction;
    const result = FP16.fromBits(resultBits.toString(2).padStart(16, '0'));

    return {
      bits: result.getBits(),
      decimal: result.toFloat(),
      components: result.getComponents(),
      stages,
      trueMathResult,
      quantizationError: Math.abs(result.toFloat() - trueMathResult),
      guardBit,
      roundBit,
      stickyBit,
    };
  }
}
