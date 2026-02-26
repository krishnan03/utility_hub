import { describe, it, expect } from 'vitest';
import { convert, getUnitsForCategory, getCategories } from './unitConverter.js';

// ============================================================
// getCategories / getUnitsForCategory
// ============================================================

describe('getCategories', () => {
  it('returns all expected categories including new ones', () => {
    const cats = getCategories();
    // Original 7
    expect(cats).toContain('length');
    expect(cats).toContain('weight');
    expect(cats).toContain('temperature');
    expect(cats).toContain('volume');
    expect(cats).toContain('speed');
    expect(cats).toContain('area');
    expect(cats).toContain('data');
    // New 12
    expect(cats).toContain('time');
    expect(cats).toContain('pressure');
    expect(cats).toContain('energy');
    expect(cats).toContain('power');
    expect(cats).toContain('frequency');
    expect(cats).toContain('angle');
    expect(cats).toContain('force');
    expect(cats).toContain('fuel');
    expect(cats).toContain('cooking');
    expect(cats).toContain('typography');
    expect(cats).toContain('density');
    expect(cats).toContain('torque');
  });

  it('has at least 19 categories', () => {
    expect(getCategories().length).toBeGreaterThanOrEqual(19);
  });
});

describe('getUnitsForCategory', () => {
  it('returns length units', () => {
    const units = getUnitsForCategory('length');
    expect(units).toContain('m');
    expect(units).toContain('km');
    expect(units).toContain('mi');
    expect(units).toContain('ft');
  });

  it('returns temperature units', () => {
    const units = getUnitsForCategory('temperature');
    expect(units).toEqual(['celsius', 'fahrenheit', 'kelvin']);
  });

  it('throws on unknown category', () => {
    expect(() => getUnitsForCategory('magic')).toThrow();
  });
});

// ============================================================
// Length conversions
// ============================================================

describe('convert — length', () => {
  it('1 km = 1000 m', () => {
    expect(convert(1, 'km', 'm', 'length')).toBeCloseTo(1000, 5);
  });
  it('1 mi ≈ 1.60934 km', () => {
    expect(convert(1, 'mi', 'km', 'length')).toBeCloseTo(1.609344, 3);
  });
  it('1 ft = 12 in', () => {
    expect(convert(1, 'ft', 'in', 'length')).toBeCloseTo(12, 3);
  });
  it('1 yd = 3 ft', () => {
    expect(convert(1, 'yd', 'ft', 'length')).toBeCloseTo(3, 5);
  });
  it('0 m = 0 km', () => {
    expect(convert(0, 'm', 'km', 'length')).toBe(0);
  });
  it('negative values work', () => {
    expect(convert(-5, 'km', 'm', 'length')).toBeCloseTo(-5000, 5);
  });
});

// ============================================================
// Weight conversions
// ============================================================

describe('convert — weight', () => {
  it('1 kg = 1000 g', () => {
    expect(convert(1, 'kg', 'g', 'weight')).toBeCloseTo(1000, 5);
  });
  it('1 lb ≈ 0.4536 kg', () => {
    expect(convert(1, 'lb', 'kg', 'weight')).toBeCloseTo(0.4536, 3);
  });
  it('1 lb = 16 oz', () => {
    expect(convert(1, 'lb', 'oz', 'weight')).toBeCloseTo(16, 1);
  });
  it('0 kg = 0 lb', () => {
    expect(convert(0, 'kg', 'lb', 'weight')).toBe(0);
  });
});

// ============================================================
// Temperature conversions
// ============================================================

describe('convert — temperature', () => {
  it('0°C = 32°F', () => {
    expect(convert(0, 'celsius', 'fahrenheit', 'temperature')).toBeCloseTo(32, 5);
  });
  it('100°C = 212°F', () => {
    expect(convert(100, 'celsius', 'fahrenheit', 'temperature')).toBeCloseTo(212, 5);
  });
  it('0°C = 273.15K', () => {
    expect(convert(0, 'celsius', 'kelvin', 'temperature')).toBeCloseTo(273.15, 5);
  });
  it('32°F = 0°C', () => {
    expect(convert(32, 'fahrenheit', 'celsius', 'temperature')).toBeCloseTo(0, 5);
  });
  it('273.15K = 0°C', () => {
    expect(convert(273.15, 'kelvin', 'celsius', 'temperature')).toBeCloseTo(0, 5);
  });
  it('-40°C = -40°F', () => {
    expect(convert(-40, 'celsius', 'fahrenheit', 'temperature')).toBeCloseTo(-40, 5);
  });
  it('same unit returns same value', () => {
    expect(convert(42, 'celsius', 'celsius', 'temperature')).toBe(42);
  });
});

// ============================================================
// Volume conversions
// ============================================================

describe('convert — volume', () => {
  it('1 l = 1000 ml', () => {
    expect(convert(1, 'l', 'ml', 'volume')).toBeCloseTo(1000, 3);
  });
  it('1 gal ≈ 3785.41 ml', () => {
    expect(convert(1, 'gal', 'ml', 'volume')).toBeCloseTo(3785.41, 0);
  });
  it('1 cup = 16 tbsp', () => {
    expect(convert(1, 'cup', 'tbsp', 'volume')).toBeCloseTo(16, 0);
  });
});

// ============================================================
// Speed conversions
// ============================================================

describe('convert — speed', () => {
  it('1 m/s = 3.6 km/h', () => {
    expect(convert(1, 'm/s', 'km/h', 'speed')).toBeCloseTo(3.6, 3);
  });
  it('100 km/h ≈ 62.14 mph', () => {
    expect(convert(100, 'km/h', 'mph', 'speed')).toBeCloseTo(62.14, 1);
  });
});

// ============================================================
// Area conversions
// ============================================================

describe('convert — area', () => {
  it('1 km2 = 1000000 m2', () => {
    expect(convert(1, 'km2', 'm2', 'area')).toBeCloseTo(1000000, 0);
  });
  it('1 acre ≈ 4046.86 m2', () => {
    expect(convert(1, 'acre', 'm2', 'area')).toBeCloseTo(4046.86, 0);
  });
  it('1 hectare = 10000 m2', () => {
    expect(convert(1, 'hectare', 'm2', 'area')).toBeCloseTo(10000, 0);
  });
});

// ============================================================
// Data conversions
// ============================================================

describe('convert — data', () => {
  it('1 GB = 1024 MB', () => {
    expect(convert(1, 'gb', 'mb', 'data')).toBeCloseTo(1024, 5);
  });
  it('1 byte = 8 bits', () => {
    expect(convert(1, 'byte', 'bit', 'data')).toBeCloseTo(8, 5);
  });
  it('1 TB = 1024 GB', () => {
    expect(convert(1, 'tb', 'gb', 'data')).toBeCloseTo(1024, 5);
  });
  it('1 MB = 1024 KB', () => {
    expect(convert(1, 'mb', 'kb', 'data')).toBeCloseTo(1024, 5);
  });
});

// ============================================================
// Error handling
// ============================================================

describe('convert — errors', () => {
  it('throws on unknown category', () => {
    expect(() => convert(1, 'm', 'km', 'magic')).toThrow();
  });
  it('throws on unknown fromUnit', () => {
    expect(() => convert(1, 'parsec', 'km', 'length')).toThrow();
  });
  it('throws on unknown toUnit', () => {
    expect(() => convert(1, 'km', 'parsec', 'length')).toThrow();
  });
  it('throws on non-number value', () => {
    expect(() => convert('abc', 'km', 'm', 'length')).toThrow();
  });
  it('throws on Infinity', () => {
    expect(() => convert(Infinity, 'km', 'm', 'length')).toThrow();
  });
});

// ============================================================
// Time conversions
// ============================================================

describe('convert — time', () => {
  it('1 hr = 3600 s', () => {
    expect(convert(1, 'hr', 's', 'time')).toBeCloseTo(3600, 5);
  });
  it('1 day = 24 hr', () => {
    expect(convert(1, 'day', 'hr', 'time')).toBeCloseTo(24, 5);
  });
  it('1 week = 7 days', () => {
    expect(convert(1, 'week', 'day', 'time')).toBeCloseTo(7, 5);
  });
  it('1 min = 60000 ms', () => {
    expect(convert(1, 'min', 'ms', 'time')).toBeCloseTo(60000, 5);
  });
});

// ============================================================
// Pressure conversions
// ============================================================

describe('convert — pressure', () => {
  it('1 atm ≈ 101325 Pa', () => {
    expect(convert(1, 'atm', 'Pa', 'pressure')).toBeCloseTo(101325, 0);
  });
  it('1 bar = 100 kPa', () => {
    expect(convert(1, 'bar', 'kPa', 'pressure')).toBeCloseTo(100, 1);
  });
  it('1 atm ≈ 14.696 psi', () => {
    expect(convert(1, 'atm', 'psi', 'pressure')).toBeCloseTo(14.696, 1);
  });
});

// ============================================================
// Energy conversions
// ============================================================

describe('convert — energy', () => {
  it('1 kJ = 1000 J', () => {
    expect(convert(1, 'kJ', 'J', 'energy')).toBeCloseTo(1000, 5);
  });
  it('1 kcal = 4184 J', () => {
    expect(convert(1, 'kcal', 'J', 'energy')).toBeCloseTo(4184, 0);
  });
  it('1 kWh = 3600000 J', () => {
    expect(convert(1, 'kWh', 'J', 'energy')).toBeCloseTo(3600000, 0);
  });
});

// ============================================================
// Power conversions
// ============================================================

describe('convert — power', () => {
  it('1 kW = 1000 W', () => {
    expect(convert(1, 'kW', 'W', 'power')).toBeCloseTo(1000, 5);
  });
  it('1 hp ≈ 745.7 W', () => {
    expect(convert(1, 'hp', 'W', 'power')).toBeCloseTo(745.7, 0);
  });
});

// ============================================================
// Frequency conversions
// ============================================================

describe('convert — frequency', () => {
  it('1 kHz = 1000 Hz', () => {
    expect(convert(1, 'kHz', 'Hz', 'frequency')).toBeCloseTo(1000, 5);
  });
  it('1 GHz = 1000 MHz', () => {
    expect(convert(1, 'GHz', 'MHz', 'frequency')).toBeCloseTo(1000, 5);
  });
  it('60 rpm = 1 Hz', () => {
    expect(convert(60, 'rpm', 'Hz', 'frequency')).toBeCloseTo(1, 3);
  });
});

// ============================================================
// Angle conversions
// ============================================================

describe('convert — angle', () => {
  it('180 deg ≈ π rad', () => {
    expect(convert(180, 'deg', 'rad', 'angle')).toBeCloseTo(Math.PI, 5);
  });
  it('1 turn = 360 deg', () => {
    expect(convert(1, 'turn', 'deg', 'angle')).toBeCloseTo(360, 5);
  });
  it('1 deg = 60 arcmin', () => {
    expect(convert(1, 'deg', 'arcmin', 'angle')).toBeCloseTo(60, 3);
  });
});

// ============================================================
// Force conversions
// ============================================================

describe('convert — force', () => {
  it('1 kN = 1000 N', () => {
    expect(convert(1, 'kN', 'N', 'force')).toBeCloseTo(1000, 5);
  });
  it('1 kgf ≈ 9.807 N', () => {
    expect(convert(1, 'kgf', 'N', 'force')).toBeCloseTo(9.80665, 2);
  });
});

// ============================================================
// Fuel economy conversions (with inverse l/100km)
// ============================================================

describe('convert — fuel', () => {
  it('1 km/l ≈ 2.352 mpg(US)', () => {
    expect(convert(1, 'km/l', 'mpg(US)', 'fuel')).toBeCloseTo(2.352, 1);
  });
  it('10 km/l = 10 l/100km', () => {
    expect(convert(10, 'km/l', 'l/100km', 'fuel')).toBeCloseTo(10, 3);
  });
  it('5 l/100km = 20 km/l', () => {
    expect(convert(5, 'l/100km', 'km/l', 'fuel')).toBeCloseTo(20, 3);
  });
  it('l/100km round-trip', () => {
    const result = convert(convert(8, 'l/100km', 'mpg(US)', 'fuel'), 'mpg(US)', 'l/100km', 'fuel');
    expect(result).toBeCloseTo(8, 3);
  });
  it('throws on 0 l/100km input', () => {
    expect(() => convert(0, 'l/100km', 'km/l', 'fuel')).toThrow();
  });
});

// ============================================================
// Cooking conversions
// ============================================================

describe('convert — cooking', () => {
  it('1 cup ≈ 236.588 ml', () => {
    expect(convert(1, 'cup', 'ml', 'cooking')).toBeCloseTo(236.588, 0);
  });
  it('1 tbsp = 3 tsp', () => {
    expect(convert(1, 'tbsp', 'tsp', 'cooking')).toBeCloseTo(3, 0);
  });
  it('1 l = 1000 ml', () => {
    expect(convert(1, 'l', 'ml', 'cooking')).toBeCloseTo(1000, 5);
  });
});

// ============================================================
// Typography conversions
// ============================================================

describe('convert — typography', () => {
  it('1 in = 72 pt', () => {
    expect(convert(1, 'in', 'pt', 'typography')).toBeCloseTo(72, 3);
  });
  it('12 pt = 1 pc', () => {
    expect(convert(12, 'pt', 'pc', 'typography')).toBeCloseTo(1, 3);
  });
});

// ============================================================
// Density conversions
// ============================================================

describe('convert — density', () => {
  it('1 g/cm3 = 1000 kg/m3', () => {
    expect(convert(1, 'g/cm3', 'kg/m3', 'density')).toBeCloseTo(1000, 5);
  });
  it('1 kg/l = 1 g/ml', () => {
    expect(convert(1, 'kg/l', 'g/ml', 'density')).toBeCloseTo(1, 5);
  });
});

// ============================================================
// Torque conversions
// ============================================================

describe('convert — torque', () => {
  it('1 ft-lb ≈ 1.356 Nm', () => {
    expect(convert(1, 'ft-lb', 'Nm', 'torque')).toBeCloseTo(1.35582, 2);
  });
  it('1 kgm ≈ 9.807 Nm', () => {
    expect(convert(1, 'kgm', 'Nm', 'torque')).toBeCloseTo(9.80665, 2);
  });
});
