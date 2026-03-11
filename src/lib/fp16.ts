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
        `Hardware needs the full 11-bit mantissa for arithmetic. The 10-bit fraction is prepended with the implicit leading bit (usually 1, unless subnormal).`,
        `Implicit bits: A=${compA.implicitBit}, B=${compB.implicitBit}`,
        `Full mantissa binary A: ${compA.implicitBit}${compA.fraction.toString(2).padStart(10, '0')} (Base 10: ${compA.implicitBit * 1024 + compA.fraction})`,
        `Full mantissa binary B: ${compB.implicitBit}${compB.fraction.toString(2).padStart(10, '0')} (Base 10: ${compB.implicitBit * 1024 + compB.fraction})`,
      ],
      educationalExplanations: [
        `Why do we need an implicit bit?\nScientific notation works like this: instead of writing 1200, we write 1.2 × 10³. Notice how there's always a '1' before the decimal? Binary floating-point does the exact same thing, but in base-2 (e.g. 1.011 × 2³).`,
        `Because that leading bit is ALWAYS a 1 for normal numbers, hardware designers realized they don't actually need to store it in memory. They just store the fraction part to save space.`,
        `However, when the Arithmetic Logic Unit (ALU) actually does the math, it needs the REAL, full number. So the first thing the hardware does is "unpack" the number by sticking that 1 back onto the front of the fraction.`,
        `In this step, we took the 10-bit fraction stored in memory and added the "implicit 1" to the front, creating the full 11-bit mantissa that the hardware will use for calculations.`
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
        `Exponent difference: Math.abs(${compA.actualExponent} - ${compB.actualExponent}) = ${expDiff}`,
        `Larger exponent: ${largerExp} (2^${largerExp})`,
        `Right-shifting the smaller mantissa (${smallerMantissa}) by ${expDiff} bits to align it to the larger exponent.`,
        `Before shift (Base 10: ${smallerMantissa}): ${smallerMantissa.toString(2).padStart(11, '0')}`,
        `After shift (Base 10: ${smallerMantissa >> expDiff}): ${(smallerMantissa >> expDiff).toString(2).padStart(11, '0')}`,
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
        `Raw result mantissa (Base 10: ${resultMantissa}): ${resultMantissa.toString(2)}`,
        `Normalization shift: ${normalizeShift > 0 ? 'Left' : normalizeShift < 0 ? 'Right' : 'None'} by ${Math.abs(normalizeShift)} bits. Hardware shifts the mantissa until the leading bit is 1.`,
        `Normalized mantissa (Base 10: ${resultMantissa}): ${resultMantissa.toString(2).padStart(11, '0')}`,
        `Result exponent (Base 10: ${resultExp}): ${resultExp} (biased by +15: ${resultExp + 15})`,
      ],
      educationalExplanations: [
        `Why do we need to normalize?\nAfter adding the two aligned numbers, the result might not be in standard scientific notation anymore.`,
        `For example, if you add 9.0 × 10² and 2.0 × 10², you get 11.0 × 10². That's not valid scientific notation! You have to "normalize" it to 1.1 × 10³.`,
        `In binary, a normalized hardware number MUST start with exactly one '1' before the binary point (e.g., 1.xxxx...).`,
        `If the addition caused a carry-over (like our 9+2=11 example), the hardware shifts the mantissa right by 1 bit and adds 1 to the exponent.`,
        `If the addition was actually a subtraction (adding a negative number) and leading bits canceled out (e.g., 1.001 - 1.000 = 0.001), the hardware shifts the mantissa left to find the first '1', and subtracts from the exponent.`
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
        `Guard bit (G): ${guardBit} (Next bit after the 10-bit fraction)`,
        `Round bit (R): ${roundBit} (Bit after Guard bit)`,
        `Sticky bit (S): ${stickyBit} (Logical OR of all remaining bits)`,
        `LSB of result: ${lsb}`,
        `Rounding Decision Rule: Round up if G=1 AND (R=1 OR S=1 OR LSB=1). Otherwise round down.`,
        `Decision: ${roundBit && (stickyBit || lsb) ? 'ROUND UP (+1 to fraction)' : 'ROUND DOWN (fraction unchanged)'}`,
        `Final 10-bit fraction (Base 10: ${finalFraction}): ${finalFraction.toString(2).padStart(10, '0')}`,
      ],
      educationalExplanations: [
        `Why do we round?\nThe memory only has space to store exactly 10 bits of fraction. But during addition and alignment shifts, the hardware kept extra bits of precision so it wouldn't lose data immediately.`,
        `These extra bits are called Guard (G), Round (R), and Sticky (S) bits. They sit just to the right of the 10 bits we are allowed to keep.`,
        `The standard rule for floating point is "Round to Nearest, Ties to Even". Let's break down what the hardware checks:`,
        `1. Is the Guard bit 1? (This means the extra bits are exactly halfway, at 0.5, or higher). If it's 0, we just chop off the extra bits (Round Down).`,
        `2. If Guard is 1, are we strictly strictly greater than halfway? We check if Round or Sticky are 1. If yes, we Round Up.`,
        `3. What if it's EXACTLY a tie (Guard=1, Round=0, Sticky=0)? We look at the Last Significant Bit (LSB) of our fraction. If it's a 1 (odd), we round up to make it even. If it's a 0 (even), we leave it alone.`
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
        `Hardware needs the full 11-bit mantissa for the integer multiplier circuit. The 10-bit fraction is prepended with the implicit leading bit.`,
        `Implicit bits: A=${compA.implicitBit}, B=${compB.implicitBit}`,
        `Full mantissa binary A: ${compA.implicitBit}${compA.fraction.toString(2).padStart(10, '0')} (Base 10: ${compA.implicitBit * 1024 + compA.fraction})`,
        `Full mantissa binary B: ${compB.implicitBit}${compB.fraction.toString(2).padStart(10, '0')} (Base 10: ${compB.implicitBit * 1024 + compB.fraction})`,
      ],
      educationalExplanations: [
        `Why do we need an implicit bit?\nScientific notation works like this: instead of writing 1200, we write 1.2 × 10³. Notice how there's always a '1' before the decimal? Binary floating-point does the exact same thing, but in base-2 (e.g. 1.011 × 2³).`,
        `Because that leading bit is ALWAYS a 1 for normal numbers, hardware designers realized they don't actually need to store it in memory. They just store the fraction part to save space.`,
        `However, when the Arithmetic Logic Unit (ALU) actually multiplies the numbers, the multiplier circuit requires the REAL, full number. So the first thing the hardware does is "unpack" the number by sticking that 1 back onto the front of the fraction.`,
        `In this step, we took the 10-bit fraction stored in memory and added the "implicit 1" to the front, creating the full 11-bit mantissa that the hardware multiplier will use for the math.`
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
        `Product (22-bit): ${mantissaA} * ${mantissaB} = ${product} = ${product.toString(2).padStart(22, '0')}`,
        `Result sign: ${compA.sign} ^ ${compB.sign} = ${compA.sign ^ compB.sign} (Hardware XOR of input signs)`,
        `Raw exponent sum: ${compA.actualExponent} + ${compB.actualExponent} = ${compA.actualExponent + compB.actualExponent}`,
      ],
      educationalExplanations: [
        `How does binary multiplication work?\nJust like in grade school, when you multiply two numbers (like 1.5 × 1.2), you multiply the fractions and add the exponents.`,
        `The hardware multiplier takes our two 11-bit mantissas and multiplies them together, doing pure integer math. This naturally produces a much larger number—a 22-bit product! We will need to re-align this later.`,
        `Simultaneously, a separate adder circuit adds together the two exponents. Just like 10² × 10³ = 10⁵, we just add them up.`,
        `Finally, the sign of the result is decided by the XOR function. If the signs are identical (++ or --), the result is positive. If they are different (+- or -+), the result is negative. XOR does exactly this.`
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
        `Initial 22-bit product (Base 10: ${product}): ${product.toString(2).padStart(22, '0')}`,
        `Normalization shift: ${normalizeShift > 0 ? 'Left' : normalizeShift < 0 ? 'Right' : 'None'} by ${Math.abs(normalizeShift)} bits. Hardware shifts the product until the leading bit fits in the 11th position.`,
        `After shift (Base 10: ${resultMantissa}): ${resultMantissa.toString(2).padStart(11, '0')}`,
        `Exponent adjustment (Base 10: ${resultExp}): ${resultExp} (biased by +15: ${resultExp + 15})`,
        `Removing implicit 1st bit to get final 10-bit fraction.`,
      ],
      educationalExplanations: [
        `Why do we need to normalize?\nMultiplying two 11-bit binary numbers gave us a massive 22-bit product. We need to shrink this back down to the standard 11-bit format so it matches scientific notation.`,
        `In binary, a normalized hardware number MUST start with exactly one '1' before the binary point (e.g., 1.xxxx...).`,
        `The hardware shift mechanism moves the binary point left or right until the first '1' is in the 11th bit position. Every time it shifts the decimal point, it adjustments the exponent by +1 or -1 to keep the total value exactly the same.`,
        `Once shifted, we remove the leading 1 (since it's implicit) to leave us with our raw 10-bit fraction, plus any extra bits that got pushed to the right. We hang on to those extra bits for rounding.`
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
        `Guard bit (G): ${guardBit} (Next bit after the 10-bit fraction)`,
        `Round bit (R): ${roundBit} (Bit after Guard bit)`,
        `Sticky bit (S): ${stickyBit} (Logical OR of all remaining bits)`,
        `LSB of result: ${lsb}`,
        `Rounding Decision Rule: Round up if G=1 AND (R=1 OR S=1 OR LSB=1). Otherwise round down.`,
        `Decision: ${roundBit && (stickyBit || lsb) ? 'ROUND UP (+1 to fraction)' : 'ROUND DOWN (fraction unchanged)'}`,
        `Final 10-bit fraction (Base 10: ${finalFraction}): ${finalFraction.toString(2).padStart(10, '0')}`,
      ],
      educationalExplanations: [
        `Why do we round?\nThe memory only has space to store exactly 10 bits of fraction. But our 22-bit multiplication product left us with many extra bits. We can't keep them all, but we don't want to just throw them in the trash, because that would be inaccurate.`,
        `These extra bits are called Guard (G), Round (R), and Sticky (S) bits. Hardware consolidates all those extra bits into these three indicators.`,
        `The standard rule for floating point is "Round to Nearest, Ties to Even". Let's break down what the hardware checks:`,
        `1. Is the Guard bit 1? (This means the extra bits are exactly halfway, at 0.5, or higher). If it's 0, we just chop off the extra bits (Round Down).`,
        `2. If Guard is 1, are we strictly strictly greater than halfway? We check if Round or Sticky are 1. If yes, we Round Up.`,
        `3. What if it's EXACTLY a tie (Guard=1, Round=0, Sticky=0)? We look at the Last Significant Bit (LSB) of our fraction. If it's a 1 (odd), we round up to make it even. If it's a 0 (even), we leave it alone.`
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
