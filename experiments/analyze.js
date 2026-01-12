// Analysis and visualization for oracle failure research
// Generates graphs and summary tables

const fs = require('fs');
const path = require('path');
const config = require('./config');

class Analyzer {
  constructor(resultsFile) {
    this.results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  }

  /**
   * Generate summary table
   */
  generateSummaryTable() {
    const summary = {};

    // Group by failure mode and aggregation strategy
    this.results.forEach(result => {
      const key = `${result.failureMode}-${result.aggregationStrategy}`;
      if (!summary[key]) {
        summary[key] = {
          failureMode: result.failureMode,
          aggregationStrategy: result.aggregationStrategy,
          trials: 0,
          falsePositives: 0,
          falseNegatives: 0
        };
      }

      summary[key].trials++;
      if (result.falsePositive) summary[key].falsePositives++;
      if (result.falseNegative) summary[key].falseNegatives++;
    });

    // Convert to table format
    const table = Object.values(summary).map(row => ({
      ...row,
      falsePositiveRate: row.falsePositives / row.trials,
      falseNegativeRate: row.falseNegatives / row.trials
    }));

    return table;
  }

  /**
   * Generate data for false positive rate vs failure probability
   */
  generateFalsePositiveData() {
    const data = {};

    config.aggregationStrategies.forEach(strategy => {
      data[strategy] = {};
      config.failureProbabilities.forEach(prob => {
        data[strategy][prob] = { total: 0, falsePositives: 0 };
      });
    });

    this.results.forEach(result => {
      const prob = result.failureProbability;
      const strategy = result.aggregationStrategy;

      data[strategy][prob].total++;
      if (result.falsePositive) {
        data[strategy][prob].falsePositives++;
      }
    });

    // Convert to plottable format
    const plotData = {};
    config.aggregationStrategies.forEach(strategy => {
      plotData[strategy] = config.failureProbabilities.map(prob => ({
        probability: prob,
        rate: data[strategy][prob].falsePositives / data[strategy][prob].total
      }));
    });

    return plotData;
  }

  /**
   * Generate data for false negative rate vs failure probability
   */
  generateFalseNegativeData() {
    const data = {};

    config.aggregationStrategies.forEach(strategy => {
      data[strategy] = {};
      config.failureProbabilities.forEach(prob => {
        data[strategy][prob] = { total: 0, falseNegatives: 0 };
      });
    });

    this.results.forEach(result => {
      const prob = result.failureProbability;
      const strategy = result.aggregationStrategy;

      data[strategy][prob].total++;
      if (result.falseNegative) {
        data[strategy][prob].falseNegatives++;
      }
    });

    // Convert to plottable format
    const plotData = {};
    config.aggregationStrategies.forEach(strategy => {
      plotData[strategy] = config.failureProbabilities.map(prob => ({
        probability: prob,
        rate: data[strategy][prob].falseNegatives / data[strategy][prob].total
      }));
    });

    return plotData;
  }

  /**
   * Export analysis to markdown
   */
  exportToMarkdown(filename) {
    const summaryTable = this.generateSummaryTable();
    const falsePositiveData = this.generateFalsePositiveData();
    const falseNegativeData = this.generateFalseNegativeData();

    let markdown = '# Oracle Failure Research Results\n\n';

    markdown += '## Summary Table\n\n';
    markdown += '| Failure Mode | Aggregation | Trials | False Positive Rate | False Negative Rate |\n';
    markdown += '|-------------|-------------|--------|-------------------|-------------------|\n';

    summaryTable.forEach(row => {
      markdown += `| ${row.failureMode} | ${row.aggregationStrategy} | ${row.trials} | ${(row.falsePositiveRate * 100).toFixed(2)}% | ${(row.falseNegativeRate * 100).toFixed(2)}% |\n`;
    });

    markdown += '\n## Key Findings\n\n';
    markdown += '### False Positive Rates by Aggregation Strategy\n\n';
    config.aggregationStrategies.forEach(strategy => {
      markdown += `**${strategy}**: `;
      falsePositiveData[strategy].forEach(point => {
        markdown += `${(point.rate * 100).toFixed(1)}% (${point.probability * 100}%), `;
      });
      markdown = markdown.slice(0, -2) + '\n';
    });

    markdown += '\n### False Negative Rates by Aggregation Strategy\n\n';
    config.aggregationStrategies.forEach(strategy => {
      markdown += `**${strategy}**: `;
      falseNegativeData[strategy].forEach(point => {
        markdown += `${(point.rate * 100).toFixed(1)}% (${point.probability * 100}%), `;
      });
      markdown = markdown.slice(0, -2) + '\n';
    });

    fs.writeFileSync(filename, markdown);
  }

  /**
   * Export data for graphing (JSON format)
   */
  exportGraphData(filename) {
    const graphData = {
      falsePositive: this.generateFalsePositiveData(),
      falseNegative: this.generateFalseNegativeData(),
      summary: this.generateSummaryTable()
    };

    fs.writeFileSync(filename, JSON.stringify(graphData, null, 2));
  }
}

// Run analysis if called directly
if (require.main === module) {
  const resultsFile = path.join(config.output.trialsDir, 'trials-complete.json');
  const analyzer = new Analyzer(resultsFile);

  analyzer.exportToMarkdown(path.join(config.output.trialsDir, 'analysis.md'));
  analyzer.exportGraphData(path.join(config.output.graphsDir, 'graph-data.json'));

  console.log('Analysis completed!');
  console.log('Results saved to:');
  console.log('- analysis.md');
  console.log('- graphs/graph-data.json');
}

module.exports = Analyzer;