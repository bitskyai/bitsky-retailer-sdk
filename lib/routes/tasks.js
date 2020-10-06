const express = require("express");
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
        const tasksSummary = await baseRetailerService.sendTasksToSupplier(
          result.tasks
        );
        res.json(tasksSummary);
      } catch (err) {
        baseRetailerService.logger.error(
          `GET /trigger fail. Error: ${err.message}`,
          { error: err }
        );
        res.status(500).json({
          message: _.get(err, "message"),
        });
      }
    });

    router.get("/queue", async function (req, res, next) {
      try {
        res.json({
          remainTasks: baseRetailerService.__tasksQueue.length,
          queue: baseRetailerService.__tasksQueue,
        });
      } catch (err) {
        baseRetailerService.logger.error(
          `GET /queue fail. Error: ${err.message}`,
          { error: err }
        );
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
          baseRetailerService.sendTasksToSupplier(result.tasks);
        }
        // const key = _.get(result, "key") || "data";
        const status = _.get(result, "response.status") || 200;
        const resData = _.get(result, "response.data") || "";
        const data = _.get(result, "data");
        if (data) {
          baseRetailerService.__connector.push({ data });
        }
        res.status(status).json(resData);
      } catch (err) {
        baseRetailerService.logger.error(`POST / fail. Error: ${err.message}`, {
          error: err,
        });
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
