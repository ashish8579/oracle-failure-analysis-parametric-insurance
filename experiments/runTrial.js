// Trial executor for oracle failure research
// Runs individual trials with failure injection and evaluation

const { ethers } = require('hardhat');
const { injectFailure } = require('../oracle/failureInjector');
const { aggregateTemperatures } = require('../oracle/aggregationStrategies');
const groundTruth = require('./groundTruth');
const Evaluator = require('./evaluator');
const config = require('./config');

class TrialRunner {
  constructor() {
    this.evaluator = new Evaluator(groundTruth, config.contract);
    this.snapshotId = null;
  }

  /**
   * Initialize the trial runner
   */
  async initialize() {
    await groundTruth.loadData();
    console.log('Ground truth data loaded');
  }

  /**
   * Run a single trial
   * @param {Object} params - Trial parameters
   * @returns {Object} - Trial result
   */
  async runTrial(params) {
    const {
      trialId,
      failureMode,
      aggregationStrategy,
      failureProbability,
      seed
    } = params;

    // Take snapshot for state reset
    this.snapshotId = await ethers.provider.send('evm_snapshot');

    try {
      // 1. Select random date and get ground truth
      const date = groundTruth.getRandomDate();
      const groundTruthTemp = groundTruth.getExpectedTemperature(date);

      // 2. Simulate API responses (3 temperatures)
      const baseTemp = groundTruthTemp;
      const apiResponses = [
        baseTemp + (Math.random() - 0.5) * 4, // Slight variation
        baseTemp + (Math.random() - 0.5) * 4,
        baseTemp + (Math.random() - 0.5) * 4
      ];

      // 3. Apply failure injection
      const corruptedResponses = injectFailure(
        apiResponses,
        failureMode,
        failureProbability,
        seed
      );

      // 4. Apply aggregation strategy
      let oracleOutput;
      try {
        oracleOutput = aggregateTemperatures(corruptedResponses, aggregationStrategy);
      } catch (error) {
        // If aggregation fails (not enough valid data), treat as no temperature data
        // In real scenario, this would be an oracle error, so no payout
        oracleOutput = 100; // Warm temperature, no payout
      }

      // 5. Simulate smart contract execution
      const contractDecision = await this.simulateContractExecution(oracleOutput);

      // 6. Evaluate trial
      const trial = {
        trialId,
        date,
        groundTruthTemp,
        oracleOutput,
        contractDecision,
        failureMode,
        aggregationStrategy,
        failureProbability
      };

      return this.evaluator.evaluateTrial(trial);

    } finally {
      // Reset state
      await ethers.provider.send('evm_revert', [this.snapshotId]);
    }
  }

  /**
   * Simulate smart contract execution
   * @param {number} oracleOutput - Temperature from oracle
   * @returns {Object} - Contract decision
   */
  async simulateContractExecution(oracleOutput) {
    // Deploy test contract
    const ParametricInsuranceTestHelper = await ethers.getContractFactory('ParametricInsuranceTestHelper');
    const [deployer] = await ethers.getSigners();
    const client = deployer; // Use deployer as client for simplicity

    const insurance = await ParametricInsuranceTestHelper.deploy(deployer.address, client.address);
    await insurance.deployed();

    // Fund contract
    await deployer.sendTransaction({
      to: insurance.address,
      value: ethers.utils.parseEther('1')
    });

    // Simulate 3 consecutive days with the same temperature
    let payoutTriggered = false;
    for (let i = 0; i < 3; i++) {
      // Advance time by 1 day
      await ethers.provider.send('evm_increaseTime', [86400]);
      await ethers.provider.send('evm_mine');

      // Fulfill request with oracle output
      const encodedResponse = ethers.utils.defaultAbiCoder.encode(['uint256'], [oracleOutput]);
      await insurance.testFulfillRequest(ethers.constants.HashZero, encodedResponse, '0x');

      // Check if payout was triggered
      const contractActive = await insurance.contractActive();
      if (!contractActive) {
        payoutTriggered = true;
        break;
      }
    }

    return { payoutTriggered };
  }

  /**
   * Run multiple trials for a scenario
   * @param {Object} scenario - Scenario parameters
   * @param {number} numTrials - Number of trials
   * @returns {Array} - Trial results
   */
  async runScenario(scenario, numTrials = config.trialsPerScenario) {
    const results = [];

    console.log(`Running scenario: ${JSON.stringify(scenario)}`);

    for (let i = 0; i < numTrials; i++) {
      const trialParams = {
        trialId: `${scenario.failureMode}-${scenario.aggregationStrategy}-${scenario.failureProbability}-${i}`,
        ...scenario,
        seed: i + 1 // Deterministic seed
      };

      const result = await this.runTrial(trialParams);
      results.push(result);

      if ((i + 1) % 50 === 0) {
        console.log(`Completed ${i + 1}/${numTrials} trials`);
      }
    }

    return results;
  }

  /**
   * Get evaluator for results analysis
   */
  getEvaluator() {
    return this.evaluator;
  }
}

module.exports = TrialRunner;