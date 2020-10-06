const _ = require("lodash");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

class JSONConnector {
  constructor({ JSONPath, logger }) {
    const adapter = new FileSync(JSONPath);
    this.db = low(adapter);
    this.db.defaults({ data: [] }).write();
    this.logger = logger || console;
  }
  async push({ data } = {}) {
    try {
      if (data) {
        const state = this.db.getState();
        // console.log("JSONConnector==============");
        // console.log('data: ', data);
        if (_.isObject(data) && !_.isArray(data)) {
          // get all keys
          const keys = Object.keys(data);
          for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let newState = state[key] || [];
            newState = newState.concat(data[key] || []);
            this.db.set(key, newState).write();
          }
        } else {
          if (!_.isArray(data)) {
            // data exist and isn't array, then convert it to array
            data = [data];
          }
          let newState = state['data'] || [];
          newState = newState.concat(data || []);
          this.db.set('data', newState).write();
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
