// Ground truth data for oracle failure research
// Loads historical temperature data for evaluation

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('./config');

class GroundTruth {
  constructor() {
    this.data = null;
    this.loaded = false;
  }

  /**
   * Load ground truth data (NOAA historical temperatures)
   */
  async loadData() {
    if (this.loaded) return;

    const source = config.groundTruth.source || 'auto';

    if (source === 'custom') {
      this.loadFromCustomFile();
      this.loaded = true;
      return;
    }

    if (source === 'synthetic') {
      this.loadSyntheticData();
      this.loaded = true;
      return;
    }

    if (source === 'noaa') {
      await this.loadFromNOAA();
      this.loaded = true;
      return;
    }

    try {
      // Try to load from NOAA API
      await this.loadFromNOAA();
    } catch (error) {
      console.log('NOAA API unavailable, using synthetic data');
      this.loadSyntheticData();
    }

    this.loaded = true;
  }

  /**
   * Load real data from NOAA API
   */
  async loadFromNOAA() {
    const stationId = config.groundTruth.noaaStationId;
    const startDate = config.groundTruth.startDate;
    const endDate = config.groundTruth.endDate;

    const url = `https://www.ncdc.noaa.gov/cdo-web/api/v2/data?datasetid=GHCND&stationid=${stationId}&startdate=${startDate}&enddate=${endDate}&datatypeid=TMAX&limit=1000`;

    const response = await axios.get(url, {
      headers: {
        token: process.env.NOAA_API_TOKEN || '' // Optional
      }
    });

    // Process NOAA data (Celsius to Fahrenheit)
    this.data = {};
    response.data.results.forEach(record => {
      const date = record.date.split('T')[0];
      const tempC = record.value / 10; // NOAA stores tenths of degrees
      const tempF = Math.round((tempC * 9/5) + 32);
      this.data[date] = tempF;
    });
  }

  /**
   * Load custom temperature data from CSV
   * Expected columns: date, temperature (configurable in experiments/config.js)
   */
  loadFromCustomFile() {
    const cfg = config.groundTruth;
    const filePath = path.resolve(process.cwd(), cfg.customDataFile);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Custom data file not found: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) {
      throw new Error(`Custom data file is empty: ${filePath}`);
    }

    const lines = raw.split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim());

    const dateIdx = headers.indexOf(cfg.dateColumn);
    const tempIdx = headers.indexOf(cfg.temperatureColumn);

    if (dateIdx === -1 || tempIdx === -1) {
      throw new Error(
        `Missing required columns. Expected '${cfg.dateColumn}' and '${cfg.temperatureColumn}' in ${filePath}`
      );
    }

    this.data = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(p => p.trim());
      const date = parts[dateIdx];
      const tempRaw = parts[tempIdx];
      const parsedTemp = Number(tempRaw);

      if (!date || Number.isNaN(parsedTemp)) continue;

      const tempF = (cfg.temperatureUnit || 'F').toUpperCase() === 'C'
        ? Math.round((parsedTemp * 9/5) + 32)
        : Math.round(parsedTemp);

      this.data[date] = tempF;
    }

    if (Object.keys(this.data).length === 0) {
      throw new Error(`No valid rows parsed from custom data file: ${filePath}`);
    }
  }

  /**
   * Generate synthetic temperature data
   */
  loadSyntheticData() {
    this.data = {};
    const start = new Date(config.groundTruth.startDate);
    const end = new Date(config.groundTruth.endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      // Seasonal variation + random noise
      const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
      const seasonalTemp = 50 + 30 * Math.sin(2 * Math.PI * (dayOfYear - 80) / 365);
      const noise = (Math.random() - 0.5) * 20; // ±10°F noise

      const unclamped = Math.round(seasonalTemp + noise);
      this.data[dateStr] = Math.max(
        config.groundTruth.syntheticRange.min,
        Math.min(config.groundTruth.syntheticRange.max, unclamped)
      );
    }
  }

  /**
   * Get expected temperature for a date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {number} - Temperature in °F
   */
  getExpectedTemperature(date) {
    if (!this.loaded) {
      throw new Error('Ground truth data not loaded');
    }

    return this.data[date] || null;
  }

  /**
   * Get random date from available data
   * @returns {string} - Random date string
   */
  getRandomDate() {
    if (!this.loaded) {
      throw new Error('Ground truth data not loaded');
    }

    const dates = Object.keys(this.data);
    return dates[Math.floor(Math.random() * dates.length)];
  }

  /**
   * Check if date should trigger payout (3+ consecutive cold days)
   * @param {string} date - Target date
   * @param {number} threshold - Cold temperature threshold
   * @returns {boolean} - Whether payout should occur
   */
  shouldTriggerPayout(date, threshold = 60) {
    // Simplified: check if current day and 2 previous are cold
    const d = new Date(date);
    let consecutive = 0;

    for (let i = 0; i < 3; i++) {
      const checkDate = new Date(d);
      checkDate.setDate(d.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      const temp = this.getExpectedTemperature(dateStr);
      if (temp !== null && temp <= threshold) {
        consecutive++;
      } else {
        break;
      }
    }

    return consecutive >= 3;
  }
}

module.exports = new GroundTruth();