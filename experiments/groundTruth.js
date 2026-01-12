// Ground truth data for oracle failure research
// Loads historical temperature data for evaluation

const axios = require('axios');
const fs = require('fs');
const path = require('path');

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
    const stationId = 'GHCND:USW00094728'; // Central Park, NYC
    const startDate = '2020-01-01';
    const endDate = '2023-12-31';

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
   * Generate synthetic temperature data
   */
  loadSyntheticData() {
    this.data = {};
    const start = new Date('2020-01-01');
    const end = new Date('2023-12-31');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      // Seasonal variation + random noise
      const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
      const seasonalTemp = 50 + 30 * Math.sin(2 * Math.PI * (dayOfYear - 80) / 365);
      const noise = (Math.random() - 0.5) * 20; // ±10°F noise

      this.data[dateStr] = Math.round(seasonalTemp + noise);
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