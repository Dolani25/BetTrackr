import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

export const scraperService = {
  // Get all available scrapers
  async getScrapers() {
    try {
      const response = await axios.get(`${API_BASE_URL}/scrapers`);
      return response.data;
    } catch (error) {
      console.error('Error fetching scrapers:', error);
      throw error;
    }
  },

  // Run scraper for specific bookie
  async scrapeBookie(bookie) {
    try {
      const response = await axios.get(`${API_BASE_URL}/scrape/${bookie}`);
      return response.data;
    } catch (error) {
      console.error(`Error scraping ${bookie}:`, error);
      throw error;
    }
  },

  // Check server health
  async checkHealth() {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
};
