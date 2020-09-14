"use strict";
const path = require("path");
const packageJson = require("../../package.json");

module.exports = {
  MONGODB_URL: `mongodb://localhost:27017/${packageJson.name}`,
  DEBUG: false,
  JSON_CONNECTOR: "json",
  MONGODB_CONNECTOR: 'mongodb',
  LOG_LEVEL: "info",
  BITSKY_BASE_URL:'http://localhost:9099',
  GLOBAL_ID: undefined,
  SERVICE_NAME: packageJson.name,
  LOG_FILES_PATH: path.join(__dirname, "../public/log"),
  DATA_PATH: path.join(__dirname, "../public/data.json"),
  ERROR_LOG_FILE_NAME: "error.log",
  COMBINED_LOG_FILE_NAME: "combined.log",
  HEADLESS_AGENT_TYPE: "HEADLESSBROWSER",
  SERVICE_AGENT_TYPE: "SERVICE",
  // BitSky Server Configuration
  ADD_TASKS_PATH: "/apis/tasks",
  ADD_TASKS_METHOD: "POST",
  ENGINE_API_KEY: undefined,
  REQUEST_TIMEOUT: 30 * 1000, // Request timeout, include send to RETAILER or BitSky

  // unconfigurable from option
  X_SECURITY_KEY_HEADER: "x-bitsky-security-key",
  X_REQUESTED_WITH: "x-bitsky-requested-with", // who send this request
  X_SERIAL_ID: "x-bitsky-serial-id", // request serial id
  X_JOB_ID: "x-bitsky-job-id" // each request is a job
};
