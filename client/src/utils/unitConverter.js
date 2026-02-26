/**
 * Unit Converter
 * Pure client-side — no server calls.
 *
 * Each category (except temperature & fuel) uses a base unit.
 * Conversion factors map every unit to the base unit.
 */

const CONVERSION_TABLES = {
  length: {
    base: 'm',
    factors: {
      mm: 0.001,
      cm: 0.01,
      m: 1,
      km: 1000,
      in: 0.0254,
      ft: 0.3048,
      yd: 0.9144,
      mi: 1609.344,
    },
  },
  weight: {
    base: 'kg',
    factors: {
      mg: 0.000001,
      g: 0.001,
      kg: 1,
      lb: 0.45359237,
      oz: 0.028349523125,
      ton: 907.18474,
    },
  },
  volume: {
    base: 'ml',
    factors: {
      ml: 1,
      l: 1000,
      gal: 3785.41,
      qt: 946.353,
      pt: 473.176,
      cup: 236.588,
      tbsp: 14.7868,
      tsp: 4.92892,
      fl_oz: 29.5735,
    },
  },
  speed: {
    base: 'm/s',
    factors: {
      'm/s': 1,
      'km/h': 1 / 3.6,
      mph: 0.44704,
      knots: 0.514444,
    },
  },
  area: {
    base: 'm2',
    factors: {
      mm2: 0.000001,
      cm2: 0.0001,
      m2: 1,
      km2: 1000000,
      in2: 0.00064516,
      ft2: 0.092903,
      acre: 4046.86,
      hectare: 10000,
    },
  },
  data: {
    base: 'byte',
    factors: {
      bit: 1 / 8,
      byte: 1,
      kb: 1024,
      mb: 1024 ** 2,
      gb: 1024 ** 3,
      tb: 1024 ** 4,
      pb: 1024 ** 5,
    },
  },
  time: {
    base: 's',
    factors: {
      ms: 0.001,
      s: 1,
      min: 60,
      hr: 3600,
      day: 86400,
      week: 604800,
      month: 2629800,
      year: 31557600,
    },
  },
  pressure: {
    base: 'Pa',
    factors: {
      Pa: 1,
      kPa: 1000,
      bar: 100000,
      atm: 101325,
      psi: 6894.76,
      mmHg: 133.322,
      torr: 133.322,
    },
  },
  energy: {
    base: 'J',
    factors: {
      J: 1,
      kJ: 1000,
      cal: 4.184,
      kcal: 4184,
      Wh: 3600,
      kWh: 3600000,
      BTU: 1055.06,
      eV: 1.602e-19,
    },
  },
  power: {
    base: 'W',
    factors: {
      W: 1,
      kW: 1000,
      MW: 1e6,
      hp: 745.7,
      BTU_hr: 0.29307,
    },
  },
  frequency: {
    base: 'Hz',
    factors: {
      Hz: 1,
      kHz: 1000,
      MHz: 1e6,
      GHz: 1e9,
      rpm: 1 / 60,
    },
  },
  angle: {
    base: 'deg',
    factors: {
      deg: 1,
      rad: 180 / Math.PI,
      grad: 0.9,
      arcmin: 1 / 60,
      arcsec: 1 / 3600,
      turn: 360,
    },
  },
  force: {
    base: 'N',
    factors: {
      N: 1,
      kN: 1000,
      lbf: 4.44822,
      dyn: 0.00001,
      kgf: 9.80665,
    },
  },
  fuel: {
    base: 'km/l',
    factors: {
      'km/l': 1,
      'mpg(US)': 0.425144,
      'mpg(UK)': 0.354006,
      'l/100km': -1, // special inverse unit
    },
  },
  cooking: {
    base: 'ml',
    factors: {
      tsp: 4.929,
      tbsp: 14.787,
      cup: 236.588,
      'fl oz': 29.574,
      ml: 1,
      l: 1000,
      pint: 473.176,
      quart: 946.353,
      gallon: 3785.41,
    },
  },
  typography: {
    base: 'pt',
    factors: {
      pt: 1,
      px: 0.75,
      em: 12,
      rem: 12,
      in: 72,
      cm: 28.3465,
      mm: 2.83465,
      pc: 12,
    },
  },
  density: {
    base: 'kg/m3',
    factors: {
      'kg/m3': 1,
      'g/cm3': 1000,
      'g/ml': 1000,
      'lb/ft3': 16.0185,
      'kg/l': 1000,
    },
  },
  torque: {
    base: 'Nm',
    factors: {
      Nm: 1,
      'ft-lb': 1.35582,
      'in-lb': 0.112985,
      kgm: 9.80665,
    },
  },
};

/**
 * Temperature conversions (special-cased, not simple multiplication).
 */
function convertTemperature(value, from, to) {
  let celsius;
  switch (from) {
    case 'celsius':    celsius = value; break;
    case 'fahrenheit': celsius = (value - 32) * (5 / 9); break;
    case 'kelvin':     celsius = value - 273.15; break;
    default: throw new Error(`Unknown temperature unit: ${from}`);
  }
  switch (to) {
    case 'celsius':    return celsius;
    case 'fahrenheit': return celsius * (9 / 5) + 32;
    case 'kelvin':     return celsius + 273.15;
    default: throw new Error(`Unknown temperature unit: ${to}`);
  }
}

const TEMPERATURE_UNITS = ['celsius', 'fahrenheit', 'kelvin'];

/**
 * Fuel economy conversion helper.
 * l/100km is an inverse unit — needs special handling.
 * All other fuel units convert through km/l as the base.
 */
function convertFuel(value, fromUnit, toUnit) {
  const table = CONVERSION_TABLES.fuel;

  // Step 1: Convert input value to km/l (the base)
  let kmPerL;
  if (fromUnit === 'l/100km') {
    if (value === 0) throw new Error('Cannot convert 0 l/100km');
    kmPerL = 100 / value;
  } else {
    const fromFactor = table.factors[fromUnit];
    if (fromFactor === undefined) throw new Error(`Unknown unit "${fromUnit}" in category "fuel"`);
    kmPerL = value * fromFactor;
  }

  // Step 2: Convert km/l to target unit
  if (toUnit === 'l/100km') {
    if (kmPerL === 0) throw new Error('Cannot convert 0 to l/100km');
    return 100 / kmPerL;
  }
  const toFactor = table.factors[toUnit];
  if (toFactor === undefined) throw new Error(`Unknown unit "${toUnit}" in category "fuel"`);
  return kmPerL / toFactor;
}

/**
 * Convert a value between units within a category.
 * @param {number} value
 * @param {string} fromUnit
 * @param {string} toUnit
 * @param {string} category
 * @returns {number}
 */
export function convert(value, fromUnit, toUnit, category) {
  if (typeof value !== 'number' || !isFinite(value)) {
    throw new Error('Value must be a finite number');
  }

  if (category === 'temperature') {
    if (!TEMPERATURE_UNITS.includes(fromUnit)) {
      throw new Error(`Unknown unit "${fromUnit}" in category "temperature"`);
    }
    if (!TEMPERATURE_UNITS.includes(toUnit)) {
      throw new Error(`Unknown unit "${toUnit}" in category "temperature"`);
    }
    return convertTemperature(value, fromUnit, toUnit);
  }

  if (category === 'fuel') {
    return convertFuel(value, fromUnit, toUnit);
  }

  const table = CONVERSION_TABLES[category];
  if (!table) {
    throw new Error(`Unknown category: ${category}`);
  }

  const fromFactor = table.factors[fromUnit];
  const toFactor = table.factors[toUnit];
  if (fromFactor === undefined) {
    throw new Error(`Unknown unit "${fromUnit}" in category "${category}"`);
  }
  if (toFactor === undefined) {
    throw new Error(`Unknown unit "${toUnit}" in category "${category}"`);
  }

  // value → base → target
  return (value * fromFactor) / toFactor;
}

/**
 * Get all unit names for a category.
 * @param {string} category
 * @returns {string[]}
 */
export function getUnitsForCategory(category) {
  if (category === 'temperature') return [...TEMPERATURE_UNITS];
  const table = CONVERSION_TABLES[category];
  if (!table) throw new Error(`Unknown category: ${category}`);
  return Object.keys(table.factors);
}

/**
 * Get all available category names.
 * @returns {string[]}
 */
export function getCategories() {
  return [...Object.keys(CONVERSION_TABLES), 'temperature'];
}
