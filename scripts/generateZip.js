const zip = require("cross-zip");
const path = require("path");
zip.zipSync(
  path.join(__dirname, "../dist/apidoc"),
  path.join(__dirname, "../dist/apidoc.zip")
);
