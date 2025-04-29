// API service for handling external API calls
import axios from 'axios';

// Base API instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  }
});

export default api;
