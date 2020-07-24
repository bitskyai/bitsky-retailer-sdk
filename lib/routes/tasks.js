const express = require("express");

//================================
// Axios used to send HTTP Request
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const _ = require("lodash");

function tasksRouter({ baseRetailerService, parse, trigger }) {
  function initRouter({ baseRetailerService, parse, trigger }) {
    const router = express.Router();
    /* Analyst Service - GET /apis/tasks/init */
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

    /* Analyst Service - POST /apis/tasks */
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
        // need write data to json
        if (_.get(result, "data")) {
          // save crawl data to json
          let dataPath = path.join(__dirname, "../public/data.json");
          fs.ensureFileSync(dataPath);
          let crawledData = fs.readFileSync(dataPath, "utf8");
          if (!crawledData || !crawledData.length) {
            crawledData = [];
          } else {
            crawledData = JSON.parse(crawledData);
          }
          crawledData = crawledData.concat(_.get(result, "data"));
          fs.writeJSONSync(dataPath, crawledData);
        }

        res.status(200).end();
      } catch (err) {
        console.log('post / error: ', err);
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
