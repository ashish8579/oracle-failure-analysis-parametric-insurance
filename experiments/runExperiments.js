// Main experiment runner for oracle failure research
// Executes the full experiment matrix

const TrialRunner = require('./runTrial');
const config = require('./config');
const fs = require('fs');
const path = require('path');

async function runExperiments() {
  console.log('Starting oracle failure research experiments...');

  const runner = new TrialRunner();
  await runner.initialize();

  const allResults = [];

  // Generate experiment matrix
  for (const failureMode of config.failureModes) {
    console.log(`\n=== Running failure mode: ${failureMode} ===`);

    const modeResults = [];

    for (const aggregationStrategy of config.aggregationStrategies) {
      for (const failureProbability of config.failureProbabilities) {
        const scenario = {
          failureMode,
          aggregationStrategy,
          failureProbability
        };

        console.log(`Running scenario: ${failureMode} + ${aggregationStrategy} + ${failureProbability}`);

        const results = await runner.runScenario(scenario);
        modeResults.push(...results);
      }
    }

    // Save results for this failure mode
    const outputFile = path.join(config.output.trialsDir, `trials-${failureMode}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(modeResults, null, 2));
    console.log(`Saved ${modeResults.length} trials to ${outputFile}`);

    allResults.push(...modeResults);
  }

  // Save complete results
  const completeFile = path.join(config.output.trialsDir, 'trials-complete.json');
  fs.writeFileSync(completeFile, JSON.stringify(allResults, null, 2));

  // Generate summary
  const evaluator = runner.getEvaluator();
  const summaryFile = config.output.summaryFile;
  evaluator.exportSummaryToCSV(summaryFile);

  console.log('\nExperiments completed!');
  console.log(`Total trials: ${allResults.length}`);
  console.log(`Results saved to: ${completeFile}`);
  console.log(`Summary saved to: ${summaryFile}`);
}

// Run if called directly
if (require.main === module) {
  runExperiments().catch(console.error);
}

module.exports = { runExperiments };