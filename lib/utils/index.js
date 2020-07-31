const _ = require("lodash");

function joinURL(url, base) {
  let urlInstance = new URL(url, base);
  return urlInstance.toString();
}

function setIntelligencesToFail(intelligence, err) {
  _.set(intelligence, "system.state", "FAILED");
  _.set(intelligence, "system.agent.endedAt", Date.now());
  _.set(intelligence, "system.failuresReason", _.get(err, "message"));

  return intelligence;
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
  setIntelligencesToFail,
  getMongoDBConnectionURL,
};
