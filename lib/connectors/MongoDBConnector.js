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

  covertToObjectArray(data) {
    if (data === null || data === undefined) {
      return [];
    }
    if (_.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        if (!_.isObject(data[i])) {
          data[i] = {
            value: data[i],
          };
        }
      }
    } else {
      if (!_.isObject(data)) {
        data = {
          value: data,
        };
      }

      data = [data];
    }

    return data;
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
        if (_.isObject(data) && !_.isArray(data)) {
          // get all keys
          const keys = Object.keys(data);
          for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let collection = this.db.collection(key);
            let insertData = this.covertToObjectArray(data[key]);
            if (insertData.length) {
              // console.log(`key: `, key);
              // console.log(`data: `, insertData);
              await collection.insertMany(insertData, {});
            }
          }
        } else {
          let insertData = this.covertToObjectArray(data);
          if (insertData.length) {
            let collection = this.db.collection(key);
            await collection.insertMany(
              this.covertToObjectArray(insertData),
              {}
            );
          }
        }
      }
    } catch (err) {
      console.error(`++++++++++ push error: `, err);
      console.error(`++++++++++ push error data:  `, data);
      this.logger.error(`MongoDB Connector push data fail ${err.message}`, {
        error: err,
      });
    }
  }
}

module.exports = MongoDBConnector;
