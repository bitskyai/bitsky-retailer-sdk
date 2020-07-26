const express = require("express");

//================================
// Axios used to send HTTP Request
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const _ = require("lodash");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

function tasksRouter({ baseRetailerService, parse, trigger }) {
  function initRouter({ baseRetailerService, parse, trigger }) {
    const router = express.Router();
    const configs = baseRetailerService.getConfigs();
    const dataPath = configs.DATA_PATH;
    const adapter = new FileSync(dataPath);
    const db = low(adapter);
    db.defaults({ data: [] }).write();
    /* Retailer Service - GET /apis/tasks/trigger */
    router.get("/trigger", async function (req, res, next) {
      try {
        const result = await trigger({ req, res });
        const createdTasks = await baseRetailerService.sendTasksToSupplier(
          result.tasks
        );
        res.json(_.get(createdTasks, "data"));
      } catch (err) {
        res.status(500).json({
          message: _.get(err, "message"),
        });
      }
    });

    /* Retailer Service - POST /apis/tasks */
    router.post("/", async function (req, res, next) {
      try {
        const result = await parse({ req, res });
        // continue want to add tasks to suppllier
        if (_.get(result, "tasks")) {
          baseRetailerService
            .sendTasksToSupplier(result.tasks)
            .then(() => {
              console.log("sendTasksToSupplier successful");
            })
            .catch((err) => {
              console.error("sendTasksToSupplier fail: ", err);
            });
        }

        if (_.get(result, "data")) {
          // need write data to json
          db.push(_.get(result, "data")).write();
        }
        res.status(200).end();
      } catch (err) {
        res.status(500).json({
          message: _.get(err, "message"),
        });
      }
    });

    return router;
  }
  return initRouter({ baseRetailerService, parse, trigger });
}

module.exports = tasksRouter;
