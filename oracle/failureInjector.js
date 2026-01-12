// Failure injection module for oracle failure research
// Injects 5 failure modes into temperature data

const { randomBytes } = require('crypto');

/**
 * Failure Modes:
 * F1 — Data Unavailability

API timeout

Empty response

HTTP error

F2 — Noisy Data

Random perturbation

Sudden spikes

High variance

F3 — Systematic Bias

Constant offset (+2°C)

Underestimated rainfall

F4 — Malicious Oracle

Always flips condition

Always triggers / blocks payout

F5 — Delayed Response

Stale timestamp

Old cached data

 */

/**
 * Applies failure injection to temperature array
 * @param {number[]} temperatures - Array of 3 temperature values
 * @param {string} mode - Failure mode (F1-F5)
 * @param {number} probability - Failure probability (0-1)
 * @param {number} seed - RNG seed for reproducibility
 * @returns {number[]} - Corrupted temperature array
 */
function injectFailure(temperatures, mode, probability, seed) {
  // Seed RNG for reproducibility
  const rng = seededRandom(seed);

  // Determine if failure occurs
  if (rng() > probability) {
    return temperatures; // No failure
  }

  switch (mode) {
    case 'F1': return injectDataUnavailability(temperatures, rng);
    case 'F2': return injectNoisyData(temperatures, rng);
    case 'F3': return injectSystematicBias(temperatures, rng);
    case 'F4': return injectMaliciousOracle(temperatures, rng);
    case 'F5': return injectDelayedResponse(temperatures, rng);
    default: return temperatures;
  }
}

/**
 * F1 — Data Unavailability: Randomly set temperatures to null/undefined
 */
function injectDataUnavailability(temperatures, rng) {
  return temperatures.map(temp => rng() < 0.5 ? null : temp);
}

/**
 * F2 — Noisy Data: Add random perturbation (±10°F) or spikes
 */
function injectNoisyData(temperatures, rng) {
  return temperatures.map(temp => {
    if (temp === null) return null;
    const noise = (rng() - 0.5) * 20; // ±10°F
    return Math.round(temp + noise);
  });
}

/**
 * F3 — Systematic Bias: Add constant offset (+5°F or -5°F)
 */
function injectSystematicBias(temperatures, rng) {
  const offset = rng() < 0.5 ? 5 : -5;
  return temperatures.map(temp => temp === null ? null : temp + offset);
}

/**
 * F4 — Malicious Oracle: Always set to trigger payout (cold) or block payout (warm)
 */
function injectMaliciousOracle(temperatures, rng) {
  const maliciousTemp = rng() < 0.5 ? 50 : 70; // Cold or warm
  return temperatures.map(() => maliciousTemp);
}

/**
 * F5 — Delayed Response: Use stale data (simulate old cached values)
 */
function injectDelayedResponse(temperatures, rng) {
  // Simulate using previous day's temperature (shift by random amount)
  const shift = Math.floor(rng() * 10) - 5; // ±5°F shift
  return temperatures.map(temp => temp === null ? null : temp + shift);
}

/**
 * Seeded random number generator for reproducibility
 */
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return function() {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

module.exports = {
  injectFailure,
  injectDataUnavailability,
  injectNoisyData,
  injectSystematicBias,
  injectMaliciousOracle,
  injectDelayedResponse
};