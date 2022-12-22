import * as dotenv from 'dotenv'
dotenv.config();

module.exports = {
  EVERFLOW_API_URL: process.env.EVERFLOW_API_URL,
  EVERFLOW_API_KEY: process.env.EVERFLOW_API_KEY,
};