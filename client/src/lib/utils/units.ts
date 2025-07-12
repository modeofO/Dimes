export type Unit = 'mm' | 'cm' | 'm' | 'in';

const conversionFactors: Record<Unit, number> = {
    mm: 1,
    cm: 10,
    m: 1000,
    in: 25.4,
};

/**
 * Converts a value from a given unit to millimeters.
 * @param value The value to convert.
 * @param fromUnit The unit to convert from.
 * @returns The value in millimeters.
 */
export function toMillimeters(value: number, fromUnit: Unit): number {
    return value * conversionFactors[fromUnit];
}

/**
 * Converts a value from millimeters to a given unit.
 * @param value The value in millimeters to convert.
 * @param toUnit The unit to convert to.
 * @returns The value in the target unit.
 */
export function fromMillimeters(value: number, toUnit: Unit): number {
    return value / conversionFactors[toUnit];
}