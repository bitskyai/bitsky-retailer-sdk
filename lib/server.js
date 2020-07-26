/**
 * Created by Neo Xu
 */

// =================================================
// WARNING: This function must be called in the top
// =================================================
const { addNodeModuleFromConfigJSON } = require("./utils/nodeModules");
addNodeModuleFromConfigJSON();
const _ = require("lodash");
const enableDestroy = require("server-destroy");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const serveIndex = require("serve-index");
const cors = require("cors");

const createMyLogger = require("./utils/logger");
const indexRouter = require("./routes/index");
const healthRouter = require("./routes/health");
const constants = require("./utils/constants");
const HTTP = require("./utils/http");
const tasksRouter = require("./routes/tasks");

const DEFAULT_CONFIGS = {
  PORT: 8081,
  MUNEW_BASE_URL: constants.MUNEW_BASE_URL,
  GLOBAL_ID: constants.GLOBAL_ID,
  SERVICE_NAME: constants.SERVICE_NAME,
  NODE_ENV: constants.NODE_ENV,
  LOG_FILES_PATH: constants.LOG_FILES_PATH,
  ERROR_LOG_FILE_NAME: constants.ERROR_LOG_FILE_NAME,
  COMBINED_LOG_FILE_NAME: constants.COMBINED_LOG_FILE_NAME,
  LOG_LEVEL: constants.LOG_LEVEL,
  DATA_PATH: constants.DATA_PATH,
};

// whether exist process
let processExit = false;

/**
 * Configurations Schema
   @typedef {Object} Configurations
   @property {string} MUNEW_BASE_URL=http://localhost:9099      - The Munew Application URL
   @property {string} GLOBAL_ID                                 - The **global id** of your Retailer Service. Please [Get a Retailer Service Global ID](https://docs.munew.io/how-tos/how-to-set-an-analyst-service-global_id)
   @property {number} PORT=8081                                 - [Express server](http://expressjs.com/en/5x/api.html#app.listen) port number
   @property {string} SERVICE_NAME=bitspider-retailer-sdk       - Service name, this name will be used for log
   @property {string} ERROR_LOG_FILE_NAME=error.log             - Error log file name
   @property {string} COMBINED_LOG_FILE_NAME=combined.log       - Combined log file name
   @property {string} LOG_FILES_PATH=public/log                 - Path to your log folder. You can view it by open `http://localhost:{PORT}/log/{COMBINED_LOG_FILE_NAME}` and `http://localhost:{PORT}/log/{ERROR_LOG_FILE_NAME}`. Default `node_modules/bitspider-retailer-sdk/lib/public/log`
   @property {string} LOG_LEVEL=info                            - Loging level you want to log. Please find available loging levels from [Winston Logging Levels](https://github.com/winstonjs/winston#logging-levels)
   @property {string} DATA_PATH=public/data.json                - Path to `data.json`, this is the default way to store data in your disk. Default `node_modules/bitspider-retailer-sdk/lib/public/data.json`
 */

/**
 * Create a Retailer Service
 */
class BaseRetailerService {
  /**
   * test
   * @param {Configurations} configs
   */
  constructor(configs) {
    /**
     * An [Express application](https://expressjs.com/en/4x/api.html#express) return by `express()`.
     * @type {Object}
     * @public
     */
    this.app = undefined;
    /**
     * Before you [baseRetailerService.init()]{@link BaseRetailerService#init}, `logger` is a `console`,  afer you init , `logger` will be a [winston logger](https://github.com/winstonjs/winston#creating-your-own-logger)
     * @type {Object}
     * @public
     */
    this.logger = console;
    //--------------------------------------
    // private properties
    this.__http = undefined;
    this.__server = undefined;
    this.__publicFolders = [];
    this.__manuallySetConfigs = {};
    // parse receive response
    this.__parse = function () {
      console.log("empty parse");
    };
    // trigger task
    this.__trigger = function () {
      console.log("empty trigger");
    };

    if (configs) {
      this.setConfigs(configs);
    }
  }

  /**
   * Init {@link BaseRetailerService}, create {@link BaseRetailerService#logger}
   */
  init() {
    const configs = this.getConfigs();
    this.logger = createMyLogger(
      configs.LOG_LEVEL,
      configs.LOG_FILES_PATH,
      configs.ERROR_LOG_FILE_NAME,
      configs.COMBINED_LOG_FILE_NAME,
      configs.SERVICE_NAME,
      configs.NODE_ENV
    );

    this.__http = new HTTP({
      logger: this.logger,
    });
  }

  getConfigs() {
    // get configs from env
    let configs = {
      PORT: process.env.PORT && Number(process.env.PORT), // Only when PORT is existing
      SERVICE_NAME: process.env.SERVICE_NAME,
      NODE_ENV: process.env.NODE_ENV,
      LOG_FILES_PATH: process.env.LOG_FILES_PATH,
      LOG_LEVEL: process.env.LOG_LEVEL,
      MUNEW_BASE_URL: process.env.MUNEW_BASE_URL,
      GLOBAL_ID: process.env.GLOBAL_ID,
      DATA_PATH: process.env.DATA_PATH,
    };
    // 1. manually set configs' priority is high than env variables
    // 2. get latest env variables
    configs = _.merge({}, DEFAULT_CONFIGS, this.__manuallySetConfigs, configs);

    return configs;
  }

  setConfigs(configs) {
    if (configs instanceof Object) {
      this.__manuallySetConfigs = configs;
    }
  }

  trigger(trigger) {
    if (!trigger) {
      return this.__trigger;
    }

    if (!(trigger instanceof Function)) {
      throw new Error(
        `${trigger} isn't valid, you must pass a not empty function`
      );
    }
    this.__trigger = trigger;

    return this;
  }

  parse(parse) {
    if (!parse) {
      return this.__parse;
    }

    if (!(parse instanceof Function)) {
      throw new Error(
        `${parse} isn't valid, you must pass a not empty function`
      );
    }
    this.__parse = parse;
    return this;
  }

  getDefaultPublic() {
    return path.join(__dirname, "public");
  }

  /**
   * Add tasks to Munew Engine
   * @param {array} tasks - Array of tasks want to be added
   * @returns {Promise}
   */
  sendTasksToSupplier(tasks) {
    const configs = this.getConfigs();
    const reqConfig = {
      baseURL: configs.MUNEW_BASE_URL,
      url: constants.ADD_TASKS_PATH,
      method: constants.ADD_TASKS_METHOD,
      data: tasks,
      headers: {},
    };

    reqConfig.headers[constants.X_REQUESTED_WITH] = configs.SERVICE_NAME;

    return this.__http.send(reqConfig);
  }

  /**
   * Based on passed url, priority and metadata generate an task object
   * You can find task schema from https://docs.munew.io/api/munew-engine-restful-api#request-body-array-item-schema
   *
   * @param {string} url
   * @param {number} priority
   * @param {object} metadata
   * @returns {object} - task object
   */

  generateTask({ url, priority, metadata, suitableAgents } = {}) {
    const configs = this.getConfigs();
    if (!suitableAgents) {
      suitableAgents = ["HEADLESSBROWSER"];
    }

    // if metadata don't exist or metadata don't have script, then also add `SERVICE`
    if (!metadata || !metadata.script) {
      suitableAgents.push("SERVICE");
    }

    return {
      soi: {
        globalId: configs.GLOBAL_ID,
      },
      suitableAgents,
      priority: priority || 100,
      metadata: metadata,
      url: url,
    };
  }

  /**
   *
   * @param {string} limit - Default "100mb". Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing.
   * @param {string|array} views - A directory or an array of directories for the application's views. If an array, the views are looked up in the order they occur in the array.
   * @param {string|array} statics - **optional**. A directory or an array of directories which to serve static assets, like images, json files and other. You need to pass **absolute path**. For more detail, please take a look [ExpressJS static middleware](https://expressjs.com/en/4x/api.html#express.static)
   */
  express({ limit = "100mb", views, statics, corsOptions } = {}) {
    try {
      // if (this.app) {
      //   return this.app;
      // }

      this.app = express();
      this.app.use(cors(corsOptions));
      // default view
      const defaultViews = [path.join(__dirname, "views")];
      if (views) {
        if (views instanceof Array) {
          views = views.concat(defaultViews);
        } else if (views instanceof String) {
          views = [views].concat(defaultViews);
        }
      }
      // set the view engine to ejs
      this.app.set("views", views);
      this.app.set("view engine", "ejs");

      this.app.use(morgan("dev"));
      this.app.use(
        express.json({
          limit: limit,
        })
      );
      this.app.use(express.urlencoded({ extended: false }));
      this.app.use(cookieParser());

      // set static folder
      let staticFolders = [this.getDefaultPublic()];
      if (statics) {
        if (statics instanceof Array) {
          staticFolders = statics.concat(staticFolders);
        } else if (typeof statics == "string") {
          staticFolders = [statics].concat(staticFolders);
        }
      }

      this.__publicFolders = staticFolders;
      // console.log("staticfolders: ", staticFolders);

      staticFolders.forEach((folder) => {
        this.app.use(express.static(folder));
      });

      return this;
    } catch (err) {
      throw err;
    }
  }

  /**
   * @param {object} [{indexOptions, skipRouters}]
   * @param {object} skipRouters - which router you want to skip
   * Default Data:
   * {
   *    index: false,
   *    health: false,
   *    tasks: false
   * }
   * @param {object} indexOptions - Data you want to overwrite default index data
   * Default Data:
   *  {
        title: "Retailer Service",
        githubURL: "https://github.com/munew",
        homeURL: "https://munew.io",
        docBaseURL: "https://docs.munew.io",
        items: [
          {
            url: "/agent",
            title: "Agent",
            description: "Currently Agent Configuration",
          },
          {
            url: "/log/combined.log",
            title: "Information Logs",
            description: "Informational messages that can help you to debug",
          },
          {
            url: "/log/error.log",
            title: "Error Log",
            description:
              "Error events of considerable importance that will prevent Agent execution",
          },
        ],
      }
   */
  routers({ indexOptions, skipRouters } = {}) {
    try {
      if (!skipRouters) {
        skipRouters = {
          index: false,
          health: false,
          tasks: false,
        };
      }
      if (!skipRouters.index) {
        this.app.use(
          "/",
          indexRouter({ baseRetailerService: this, indexOptions })
        );
      }
      if (!skipRouters.health) {
        this.app.use("/health", healthRouter({ baseRetailerService: this }));
      }
      if (!skipRouters.tasks) {
        this.app.use(
          "/apis/intelligences",
          tasksRouter({
            baseRetailerService: this,
            parse: this.parse(),
            trigger: this.trigger(),
          })
        );
      }
      this.app.use((req, res, next) => {
        let folder = path.join(__dirname, "public");
        if (indexOptions && indexOptions.home) {
          folder = indexOptions.home;
        }
        serveIndex(folder, {
          icons: true,
        })(req, res, next);
      });

      return this;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Start http server and listen to port, also agent start to watch tasks
   * @param {number} [port] - port number
   */
  async listen(port) {
    return await new Promise((resolve, reject) => {
      try {
        const configs = this.getConfigs();
        if (!port) {
          port = configs["PORT"];
        }

        this.__server = this.app.listen(port, () => {
          console.info(
            "Agent server listening on http://localhost:%d/ in %s mode",
            port,
            this.app.get("env")
          );
          resolve(this.__server);
        });

        enableDestroy(this.__server);

        // Handle signals gracefully. Heroku will send SIGTERM before idle.
        process.on("SIGTERM", () => {
          // maybe server was already destory, so need to make sure server still exist
          if (this.__server) {
            const type = this.type ? this.type() : "Unknown";
            console.info(
              `SIGTERM received. Closing Server - {{ ${type} }}" ..`
            );
            processExit = true;
            this.__server.destroy();
          }
        });
        process.on("SIGINT", () => {
          if (this.__server) {
            const type = this.type ? this.type() : "Unknown";
            console.info(
              `SIGINT(Ctrl-C) received. Closing Server - {{ ${type} }} ..`
            );
            processExit = true;
            this.__server.destroy();
          }
        });

        this.__server.on("close", () => {
          const type = this.type ? this.type() : "Unknown";
          console.info(
            `Close server - {{ ${type} }}, Giving 100ms time to cleanup..`
          );
          // Give a small time frame to clean up
          if (processExit) {
            setTimeout(process.exit, 100);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Destory this agent
   */
  async stop() {
    try {
      await new Promise((resolve) => {
        this.__server.destroy(() => {
          resolve(true);
        });
      });

      // to release all memory
      this.__server = undefined;
      this.app = undefined;
      this.logger = undefined;
      this.__http = undefined;
    } catch (err) {
      console.error("Stop base server fail", err);
    }
  }
}

module.exports = BaseRetailerService;
