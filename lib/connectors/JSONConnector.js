const _ = require('lodash');
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

class JSONConnector {
  constructor({ JSONPath, logger }) {
    const adapter = new FileSync(JSONPath);
    this.db = low(adapter);
    this.db.defaults({ data: [] }).write();
    this.logger = logger||console;
  }
  async push({ data, key='data' } = {}) {
    try {
      if (data) {
        // data maybe array, object, string, number
        if (_.isArray(data)) {
          if (data.length) {
            // if data isn't empty then save it
            const state = this.db.getState();
            let newState = state[key] || [];
            newState = newState.concat(data);
            this.db.set(key, newState).write();
          }
          // if it is empty arry, then don't do anything
        } else {
          // need write data to json
          this.db.get(key).push(data).write();
        }
      }
    } catch (err) {
      this.logger.error(`JSONConnector push data fail ${err.message}`, {
        error: err,
      });
    }
  }
}

module.exports = JSONConnector;
