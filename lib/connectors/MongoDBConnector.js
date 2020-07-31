const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;

class MongoDBConnector {
  constructor({ url, logger }) {
    this.logger = logger || console;
    this.db = undefined;
    this.url = url;
    this.initDB();
  }

  async initDB() {
    try {
      if (this.db) {
        return this.db;
      }
      return new Promise((resolve, reject) => {
        this.logger.info(`mongodbURL: ${this.url}`);
        let options = {
          autoReconnect: true,
          reconnectTries: Number.MAX_SAFE_INTEGER,
          reconnectInterval: 500,
          useNewUrlParser: true,
        };
        this.logger.info(`options: `, {
          options,
        });
        MongoClient.connect(this.url, options, (err, client) => {
          if (err) {
            this.logger.error("Connect to DB Fail!", { error: err });
            reject(err);
          } else {
            this.db = client.db();
            this.logger.info("Connect to DB successful!");
            resolve(this.db);
          }
        });
      });
    } catch (err) {
      throw err;
    }
  }

  async push({ data, key = "data" } = {}) {
    try {
      if (data) {
        try {
          await this.initDB();
        } catch (err) {
          this.logger.error("Get DB instance fail!", { error: err });
          return err;
        }
        // data maybe array, object, string, number
        if (_.isArray(data)) {
          if (data.length) {
            const collection = this.db.collection(key);
            await collection.insertMany(data, {});
          }
          // if it is empty arry, then don't do anything
        } else {
          // need write data to json
          const collection = this.db.collection(key);
          await collection.insertOne(data, {});
        }
      }
    } catch (err) {
      this.logger.error(`MongoDB Connector push data fail ${err.message}`, {
        error: err,
      });
    }
  }
}

module.exports = MongoDBConnector;
