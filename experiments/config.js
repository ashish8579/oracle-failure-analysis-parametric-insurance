// Experiment configuration for oracle failure research

const experimentConfig = {
  // Failure modes (F1-F5)
  failureModes: ['F1'], // Test with just one mode first

  // Aggregation strategies
  aggregationStrategies: ['single', 'mean', 'median'],

  // Failure probabilities to test
  failureProbabilities: [0.0, 0.1, 0.2, 0.3, 0.4, 0.5],

  // Trials per scenario
  trialsPerScenario: 10, // Reduced for testing

  // Ground truth parameters
  groundTruth: {
    city: 'New York',
    startDate: '2020-01-01',
    endDate: '2023-12-31',
    // Fallback synthetic data if NOAA unavailable
    syntheticRange: { min: 20, max: 90 } // °F
  },

  // Smart contract parameters
  contract: {
    coldTempThreshold: 60, // °F
    consecutiveColdDaysThreshold: 3
  },

  // Output directories
  output: {
    trialsDir: 'results/',
    graphsDir: 'results/graphs/',
    summaryFile: 'results/summary.csv'
  }
};

module.exports = experimentConfig;