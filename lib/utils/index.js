const _ = require("lodash");

function joinURL(url, base) {
  let urlInstance = new URL(url, base);
  return urlInstance.toString();
}

function setTasksToFail(task, err) {
  _.set(task, "system.state", "FAILED");
  _.set(task, "system.producer.endedAt", Date.now());
  _.set(task, "system.failuresReason", _.get(err, "message"));

  return task;
}

function getMongoDBConnectionURL() {
  let dbUrl;
  if (process.env.MONGODB_URL) {
    dbUrl = process.env.MONGODB_URL;
  } else if (process.env.MONGODB_HOST && process.env.MONGODB_NAME) {
    let baseURL = process.env.MONGODB_HOST;
    if (process.env.MONGODB_PORT) {
      baseURL = `${baseURL}:${process.env.MONGODB_PORT}`;
    }
    if (!process.env.MONGODB_USERNAME || !process.env.MONGODB_PASSWORD) {
      dbUrl = `mongodb://${baseURL}/${process.env.MONGODB_NAME}`;
    } else {
      dbUrl = `mongodb://${baseURL}/${process.env.MONGODB_NAME}`;
      dbUrl = `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${baseURL}/${process.env.MONGODB_NAME}`;
    }
  }
  return dbUrl;
}

module.exports = {
  joinURL,
  setTasksToFail,
  getMongoDBConnectionURL,
};
