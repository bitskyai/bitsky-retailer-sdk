const express = require("express");

function healthRouter() {
  function initRouter() {
    const router = express.Router();
    router.get("/", function (req, res, next) {
      res.json({
        status: 200,
      });
    });

    return router;
  }
  return initRouter();
}

module.exports = healthRouter;
