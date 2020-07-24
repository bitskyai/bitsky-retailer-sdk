const express = require("express");
const _ = require("lodash");

function indexRouter({ indexOptions }) {
  function initRouter({ indexOptions }) {
    const router = express.Router();
    router.get("/", function (req, res, next) {
      // default index data
      const indexData = {
        title: "Retailer Service",
        description: `
                      A retailer server to crawl data from website
                      `,
        triggerURL: '/apis/intelligences/trigger',
        githubURL: "https://github.com/munew",
        homeURL: "https://munew.io",
        docBaseURL: "https://docs.munew.io",
        items: [],
      };
      const data = _.merge({}, indexData, indexOptions || {});
      res.render("index", data);
    });

    return router;
  }
  return initRouter({ indexOptions });
}

module.exports = indexRouter;
