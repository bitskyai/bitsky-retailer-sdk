var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  // default index data
  const indexData = {
    githubURL: "https://github.com/munew/exampleblog-node",
    homeURL: "https://munew.io",
    docBaseURL: "https://docs.munew.io"
  };
  res.render("index", indexData);
});

module.exports = router;
