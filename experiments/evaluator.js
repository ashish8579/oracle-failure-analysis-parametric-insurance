// Evaluation harness for oracle failure research
// Measures false positives and false negatives

class Evaluator {
  constructor(groundTruth, contractConfig) {
    this.groundTruth = groundTruth;
    this.contractConfig = contractConfig;
    this.results = [];
  }

  /**
   * Evaluate a single trial
   * @param {Object} trial - Trial data
   * @returns {Object} - Evaluation result
   */
  evaluateTrial(trial) {
    const {
      date,
      groundTruthTemp,
      oracleOutput,
      contractDecision,
      failureMode,
      aggregationStrategy,
      failureProbability
    } = trial;

    // Determine expected decision
    const expectedPayout = this.groundTruth.shouldTriggerPayout(
      date,
      this.contractConfig.coldTempThreshold
    );

    // Determine actual decision (simplified: did contract trigger payout?)
    const actualPayout = contractDecision.payoutTriggered;

    // Calculate metrics
    const falsePositive = !expectedPayout && actualPayout; // Paid when shouldn't
    const falseNegative = expectedPayout && !actualPayout; // Didn't pay when should
    const correct = expectedPayout === actualPayout;

    const result = {
      trialId: trial.trialId,
      date,
      groundTruthTemp,
      oracleOutput,
      expectedPayout,
      actualPayout,
      falsePositive,
      falseNegative,
      correct,
      failureMode,
      aggregationStrategy,
      failureProbability,
      timestamp: new Date().toISOString()
    };

    this.results.push(result);
    return result;
  }

  /**
   * Get aggregate statistics
   * @returns {Object} - Summary statistics
   */
  getSummary() {
    const total = this.results.length;
    const falsePositives = this.results.filter(r => r.falsePositive).length;
    const falseNegatives = this.results.filter(r => r.falseNegative).length;
    const correct = this.results.filter(r => r.correct).length;

    return {
      totalTrials: total,
      falsePositiveRate: falsePositives / total,
      falseNegativeRate: falseNegatives / total,
      accuracy: correct / total,
      falsePositives,
      falseNegatives,
      correct
    };
  }

  /**
   * Get results filtered by criteria
   * @param {Object} filters - Filter criteria
   * @returns {Array} - Filtered results
   */
  getFilteredResults(filters = {}) {
    return this.results.filter(result => {
      for (const [key, value] of Object.entries(filters)) {
        if (result[key] !== value) return false;
      }
      return true;
    });
  }

  /**
   * Export results to JSON
   * @param {string} filename - Output filename
   */
  exportToJSON(filename) {
    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
  }

  /**
   * Export summary to CSV
   * @param {string} filename - Output filename
   */
  exportSummaryToCSV(filename) {
    const fs = require('fs');
    const summary = this.getSummary();

    const csv = [
      'metric,value',
      `total_trials,${summary.totalTrials}`,
      `false_positive_rate,${summary.falsePositiveRate}`,
      `false_negative_rate,${summary.falseNegativeRate}`,
      `accuracy,${summary.accuracy}`,
      `false_positives,${summary.falsePositives}`,
      `false_negatives,${summary.falseNegatives}`,
      `correct,${summary.correct}`
    ].join('\n');

    fs.writeFileSync(filename, csv);
  }
}

module.exports = Evaluator;