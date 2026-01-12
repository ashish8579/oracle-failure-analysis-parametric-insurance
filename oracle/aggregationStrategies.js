// Aggregation strategies for oracle failure research
// Implements single oracle, mean, and median aggregation

/**
 * Aggregation Strategies:
 * - single: Use first valid temperature
 * - mean: Average of all valid temperatures
 * - median: Median of all valid temperatures
 */

/**
 * Applies aggregation strategy to temperature array
 * @param {number[]} temperatures - Array of temperature values (may include nulls)
 * @param {string} strategy - Aggregation strategy ('single', 'mean', 'median')
 * @returns {number} - Aggregated temperature value
 */
function aggregateTemperatures(temperatures, strategy) {
  // Filter out null/invalid values
  const validTemps = temperatures.filter(temp => temp !== null && !isNaN(temp));

  if (validTemps.length === 0) {
    throw new Error('No valid temperature data available');
  }

  switch (strategy) {
    case 'single':
      return aggregateSingle(validTemps);
    case 'mean':
      return aggregateMean(validTemps);
    case 'median':
      return aggregateMedian(validTemps);
    default:
      throw new Error(`Unknown aggregation strategy: ${strategy}`);
  }
}

/**
 * Single oracle: Return first valid temperature
 */
function aggregateSingle(validTemps) {
  return Math.round(validTemps[0]);
}

/**
 * Mean aggregation: Average of all valid temperatures
 */
function aggregateMean(validTemps) {
  const sum = validTemps.reduce((acc, temp) => acc + temp, 0);
  return Math.round(sum / validTemps.length);
}

/**
 * Median aggregation: Middle value when sorted
 */
function aggregateMedian(validTemps) {
  const sorted = [...validTemps].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    // Even length: average of two middle values
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  } else {
    // Odd length: middle value
    return Math.round(sorted[mid]);
  }
}

module.exports = {
  aggregateTemperatures,
  aggregateSingle,
  aggregateMean,
  aggregateMedian
};