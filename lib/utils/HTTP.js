const axios = require("axios");
const _ = require("lodash");
const uuid = require('uuid');
const constants = require("./constants");
const { HTTPError } = require("./HTTPError");

class HTTP {
  constructor({logger}){
    this.logger = logger;
  }

  send(config){
    return new Promise((resolve, reject) => {
      const defaultHeader = {};
      // defaultHeader[constants.X_REQUESTED_WITH] = constants.AGENT_TYPE;
      // defaultHeader[constants.X_SERIAL_ID] = configs.AGENT_SERIAL_ID;
      defaultHeader[constants.X_JOB_ID] = uuid.v4();
      config.headers = _.merge({}, defaultHeader, config.headers || {});
      if (!config.timeout) {
        config.timeout = constants.REQUEST_TIMEOUT; // timeout value: 20s, because pollingInterval is 30s
      }

      axios
        .request(config)
        .then((response) => {
          let res = {
            status: response.status,
            data: response.data,
            headers: response.headers,
          };
          resolve(res);
        })
        .catch((err) => {
          let error = new HTTPError(err);
          this.logger.error(
            `http send request fail. Error: ${_.get(err, "message")}`,
            {
              statusCode: error.status,
              error: err,
            }
          );
          reject(error);
        });
    });
  }
}


module.exports = HTTP;
