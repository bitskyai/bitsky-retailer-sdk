const express = require("express");
const _ = require("lodash");
const path = require("path");
const { getMongoDBConnectionURL } = require("../utils");
const constants = require('../utils/constants');

function indexRouter({ baseRetailerService, indexOptions } = {}) {
  function initRouter({ baseRetailerService, indexOptions } = {}) {
    const router = express.Router();
    router.get("/", function (req, res, next) {
      const configs = baseRetailerService.getConfigs();
      const connector = {
        type: "json",
      };
      const logConfig = {
        combineLog: path.join(
          configs.LOG_FILES_PATH,
          configs.COMBINED_LOG_FILE_NAME || constants.ERROR_LOG_FILE_NAME
        ),
        errorLog: path.join(
          configs.LOG_FILES_PATH,
          configs.ERROR_LOG_FILE_NAME || constants.ERROR_LOG_FILE_NAME
        ),
      };
      const staticFolders = baseRetailerService.__publicFolders;
      if (configs.CONNECTOR_TYPE == "mongodb") {
        connector.type = "mongodb";
        connector.url = getMongoDBConnectionURL() || configs.MONGODB_URL;
      } else {
        connector.type = "json";
        connector.path = configs.DATA_PATH;
        delete configs.MONGODB_URL;
      }
      // default index data
      const indexData = {
        title: "Retailer Service",
        description: `A retailer server to crawl data from website`,
        configuration: JSON.stringify(configs, null, 2),
        triggerURL: "/apis/tasks/trigger",
        tasksQueueURL: "/apis/tasks/queue",
        githubURL: "https://github.com/bitskyai",
        homeURL: "https://bitsky.ai",
        staticFolders: staticFolders,
        connector: connector,
        logConfig: logConfig,
        docURL: "https://docs.bitsky.ai",
        copyright: "&copy; 2020 BitSky.ai",
        items: [],
      };
      const data = _.merge({}, indexData, indexOptions || {});
      res.render("index", data);
    });

    return router;
  }
  return initRouter({ baseRetailerService, indexOptions });
}

module.exports = indexRouter;
