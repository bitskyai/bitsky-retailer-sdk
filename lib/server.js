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
 * A Retailer Service Class, it has all the features you need to create your Reatailer Service.
 */
class BaseRetailerService {
  /**
   * Create a Retailer Service. **Environment variables** are highest priority.
   *
   * For example, you set environment:
   *
   * ```bash
   * expoort GLOBAL_ID=abcd.environment
   * ```
   *
   * And in your code, you also set it manually:
   *
   * ```JavaScript
   * new BaseRetailerService({
   *   GLOBAL_ID:"abcd.manual"
   * })
   * ```
   *
   * So in this case, `GLOBAL_ID` is `abcd.environment`, not `abcd.manual`.
   * @param {Configurations} configs - {@link Configurations} also can set by call [baseRetailerService.setConfigs(configs)]{@link BaseRetailerService#setConfigs} or set as [environment variables](https://nodejs.org/api/process.html#process_process_env)
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
    this.__tasksQueue = [];
    this.__sendingTasks = false;
    this.__resendWaitingTime = 0;
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

  /**
   * Get {@link Configurations}
   * @returns {Configurations}
   */
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

  /**
   * Set {@link BaseRetailerService} configurations
   * @param {Configurations} configs - Configuraions you want to set
   */
  setConfigs(configs) {
    if (configs instanceof Object) {
      this.__manuallySetConfigs = configs;
    }
  }

  /**
   * Get or set trigger function
   * @param {Function} [triggerFun] - Trigger function, it can be `function` or `async function`
   *
   * `triggerFun` will get an object as parameter.
   * ```JSON
   * {
   *   req,
   *   res
   * }
   * ```
   * 1. `req`: [ExpressJS Request](https://expressjs.com/en/5x/api.html#req)
   * 2. `res`: [ExpressJS Response](https://expressjs.com/en/5x/api.html#res)
   *
   * And `triggerFun` need to return a [trigger result object]{@link TriggerFunReturn}
   *
   * @example
const baseRetailerService = require("bitspider-retailer-sdk");
const triggerFun = async function trigger({ req, res }) {
  return {
    tasks: [
      baseRetailerService.generateTask({
        url: "http://exampleblog.munew.io/",
        priority: 1,
        metadata: { type: "bloglist" },
      }),
    ],
  };
};
baseRetailerService.trigger(triggerFun)
   * @returns {BaseRetailerService}
   */
  trigger(triggerFun) {
    if (!triggerFun) {
      return this.__trigger;
    }

    if (!(triggerFun instanceof Function)) {
      throw new Error(
        `${triggerFun} isn't valid, you must pass a not empty function`
      );
    }
    this.__trigger = triggerFun;
    return this;
  }

  /**
   * Get or set parse function
   * @param {Function} [parseFun] - Parse function, it can be `function` or `async function`
   *
   * `parseFun` will get an object as parameter.
   * ```JSON
   * {
   *   req,
   *   res
   * }
   * ```
   * 1. `req`: [ExpressJS Request](https://expressjs.com/en/5x/api.html#req)
   * 2. `res`: [ExpressJS Response](https://expressjs.com/en/5x/api.html#res)
   *
   * And `parseFun` need to return a [parse result object]{@link ParseFunReturn}
   * @example
const baseRetailerService = require("bitspider-retailer-sdk");
const cheerio = require("cheerio");
const parseFun = async function parse({ req, res }) {
  try {
    let collectedIntelligences = req.body;
    // Intelligences that need collected by Agent
    let needCollectIntelligences = [];
    // Collected data
    let collectedData = [];

    for (let i = 0; i < collectedIntelligences.length; i++) {
      let item = collectedIntelligences[i];
      // req.body - https://docs.munew.io/api/munew-engine-restful-api#request-body-array-item-schema
      let data = item.dataset.data.content;

      // You can find how to use cheerio from https://cheerio.js.org/
      // cheerio: Fast, flexible & lean implementation of core jQuery designed specifically for the server.
      let $ = cheerio.load(data);

      let targetBaseURL = "http://exampleblog.munew.io/";
      if (item.metadata.type == "bloglist") {
        // get all blogs url in blog list page
        let blogUrls = $("div.post-preview a");
        for (let i = 0; i < blogUrls.length; i++) {
          let $blog = blogUrls[i];
          $blog = $($blog);
          let url = new URL($blog.attr("href"), targetBaseURL).toString();
          needCollectIntelligences.push(
            baseRetailerService.generateTask({
              url,
              priority: 2,
              metadata: {
                type: "blog",
              },
            })
          );
        }
        let nextUrl = $("ul.pager li.next a").attr("href");
        if (nextUrl) {
          nextUrl = new URL(nextUrl, targetBaseURL).toString();
          needCollectIntelligences.push(
            baseRetailerService.generateTask({
              url: nextUrl,
              priority: 2,
              metadata: {
                type: "bloglist",
              },
            })
          );
        }
      } else if (item.metadata.type == "blog") {
        collectedData.push({
          title: $("div.post-heading h1").text(),
          author: $("div.post-heading p.meta span.author").text(),
          date: $("div.post-heading p.meta span.date").text(),
          content: $("div.post-container div.post-content").text(),
          url: item.dataset.url,
        });
      } else {
        console.error("unknown type");
      }
    }
    return {
      key: "blogs",
      response: {
        status: 200
      },
      data: collectedData,
      tasks: needCollectIntelligences,
    };
  } catch (err) {
    console.log(`parse error: ${err.message}`);
  }
};
baseRetailerService.parse(parseFun)
   * @returns {BaseRetailerService}
   */
  parse(parseFun) {
    if (!parseFun) {
      return this.__parse;
    }

    if (!(parseFun instanceof Function)) {
      throw new Error(
        `${parseFun} isn't valid, you must pass a not empty function`
      );
    }
    this.__parse = parseFun;
    return this;
  }

  /**
   * Get path to default public folder
   * @returns {string}
   */
  getDefaultPublic() {
    return path.join(__dirname, "public");
  }

  // private function
  async __sendTasksQueue() {
    if (!this.__tasksQueue.length) {
      // if task queue is empty, then don't need to contiue
      // reset resend waiting time to 0
      this.__resendWaitingTime = 0;
      // indicate no sending tasks in progress
      this.__sendingTasks = false;
      return;
    }
    // get first 100
    const tasks = this.__tasksQueue.splice(0, 100);
    try {
      // send tasks in progress
      this.__sendingTasks = true;
      const configs = this.getConfigs();
      const reqConfig = {
        baseURL: configs.MUNEW_BASE_URL,
        url: constants.ADD_TASKS_PATH,
        method: constants.ADD_TASKS_METHOD,
        data: tasks,
        headers: {},
      };
      reqConfig.headers[constants.X_REQUESTED_WITH] = configs.SERVICE_NAME;
      await this.__http.send(reqConfig);
      // when send successful, reset resend waiting time to 0
      this.__resendWaitingTime = 0;
      // call next send
      this.__sendTasksQueue();
    } catch (err) {
      this.logger.error(`send task fail. Error: ${err.message}`, {
        error: err,
        tasks
      });
      // Put the tasks to the end of queue
      // TODO: This maybe cause duplicate tasks
      this.__tasksQueue = this.__tasksQueue.concat(tasks);
      // increase waiting time 5*1000
      this.__resendWaitingTime += 5 * 1000;
      if (this.__resendWaitingTime >= 2 * 60 * 1000) {
        // max waiting time is 2*60*1000, 2mins
        this.__resendWaitingTime = 2 * 60 * 1000;
      }
      setTimeout(() => {
        // call next send
        this.__sendTasksQueue();
      }, this.__resendWaitingTime);
    }
  }

  /**
   * Add tasks to **Munew** application
   * @param {array} tasks - Array of {@link Task} want to be added
   * @returns {Promise}
   */
  sendTasksToSupplier(tasks) {
    this.__tasksQueue = this.__tasksQueue.concat(tasks);
    const summary = {
      totalTasks: this.__tasksQueue.length,
      added: tasks.length,
    };
    if (!this.__sendingTasks) {
      this.__sendTasksQueue();
    }
    return summary;
  }

  /**
   * Based on passed url, priority, globalId and metadata generate an task object.
   * You can find task schema from https://docs.munew.io/api/munew-engine-restful-api#request-body-array-item-schema
   *
   * @param {Object} param
   * @param {string} param.url                  - web page url that need to be processed
   * @param {integer} [param.priority]          - Priority of this task. Only compare priority for same Retailer Service, doesn't compare cross Retailer Service. Bigger value low priority. Priority value 1 is higher than priority value 2
   * @param {Object} [param.metadata]           - Additional metadata for this task
   * @param {Array} [param.suitableAgents]      - What kind of agents can execute this task
   * @param {string} [param.globalId]           - The global id of your Retailer Service. If you didn't pass will get from [Configurations.GLOBAL_ID]{@link Configurations}
   * @returns {Task}
   */
  generateTask({ url, priority, metadata, suitableAgents, globalId } = {}) {
    if (!globalId) {
      const configs = this.getConfigs();
      globalId = configs.GLOBAL_ID;
    }
    if (!suitableAgents) {
      suitableAgents = ["HEADLESSBROWSER"];
    }

    // if metadata don't exist or metadata don't have script, then also add `SERVICE`
    if (!metadata || !metadata.script) {
      suitableAgents.push("SERVICE");
    }

    return {
      soi: {
        globalId: globalId,
      },
      suitableAgents,
      priority: priority || 100,
      metadata: metadata,
      url: url,
    };
  }

  /**
   * Configure express application
   * @param {Object} [param]
   * @param {string} [param.limit=100mb]        - Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing.
   * @param {string|array} [param.views]        - A directory or an array of directories for the application's views. If an array, the views are looked up in the order they occur in the array.
   * @param {string|array} [param.statics]      - A directory or an array of directories which to serve static assets, like images, json files and other. You need to pass **absolute path**. For more detail, please take a look [ExpressJS static middleware](https://expressjs.com/en/4x/api.html#express.static)
   * @returns {BaseRetailerService}
   */
  express({ limit = "100mb", views, statics, corsOptions } = {}) {
    try {
      // if (this.app) {
      //   return this.app;
      // }

      this.app = express();
      this.app.use(cors(corsOptions));
      // default view
      let viewFolders = [path.join(__dirname, "views")];
      if (views) {
        if (views instanceof Array) {
          viewFolders = views.concat(viewFolders);
        } else if (views instanceof String) {
          viewFolders = [views].concat(viewFolders);
        }
      }

      // set the view engine to ejs
      this.app.set("views", viewFolders);
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
      this.logger.error(`express() fail. Error: ${err.message}`, {
        error: err,
        views,
        statics,
        corsOptions,
      });
      throw err;
    }
  }

  /**
   * Configure express router
   * @param {Object} [param]
   * @param {object} [param.skipRouters] - which router you want to skip, when you skip a router, then you need implement by yourself, otherwise it maybe cause issue, especially for **tasks**
   * @param {boolean} [param.skipRouters.index=false] - skip index router
   * @param {boolean} [param.skipRouters.health=false] - skip health router
   * @param {boolean} [param.skipRouters.tasks=false] - skip tasks router
   * @param {IndexOptions} [param.indexOptions] - Data you want to overwrite default index data
   */
  routers({ skipRouters, indexOptions } = {}) {
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
      this.logger.error(`router() fail. Error: ${err.message}`, {
        error: err,
        skipRouters,
        indexOptions,
      });
      throw err;
    }
  }

  /**
   * Start http server and listen to port, also agent start to watch tasks
   * @param {number} [port] - port number. Default get from [Configuration.PORT]{@link Configurations}
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
   * Destory this retailer service
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
      this.logger.error(`stop() fail. Error: ${err.message}`, {
        error: err,
      });
    }
  }
}

module.exports = BaseRetailerService;

//==============================
// For JSDoc
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
 * @typedef {object} Task
 * @property {string} url                                       - web page url that need to be processed
 * @property {object} soi
 * @property {string} soi.globalId                              - The **global id** of your Retailer Service
 * @property {integer} [priority=100]                           - Priority of this task. Only compare priority for same Retailer Service, doesn't compare cross Retailer Service. Bigger value low priority. Priority value 1 is higher than priority value 2.
 * @property {array} [suitableAgents=["HEADLESSBROWSER"]]       - What kind of agents can execute this task
 * @property {object} [metadata]                                - Additional metadata for this task
 * @property {string} [metadata.script]                         -
 * Code want to execute after [page load](https://pptr.dev/#?product=Puppeteer&version=v4.0.0&show=api-pagegotourl-options). Only **HEADLESSBROSWER** agent can execute code.
 *
 * You code should be a `async function`, like this:
 *
 * ```JavaScript
 * async function(){
 *  await $$page.waitFor(5000);
 * }
 * ```
 *
 * This code will let page wait 5s.
 *
 * Inside your code, you have four global variables, and you **CANNOT** change it, if you do `$$page=newPage`, will cause your code execute fail
 * 1. [$$page](https://pptr.dev/#?product=Puppeteer&version=v4.0.0&show=api-class-page): Puppeteer page instance, refer to current page
 * 2. [$$task]{@link Task}: Task information
 * 3. [$$_](https://lodash.com/docs/4.17.15): Lodash instance
 * 4. [$$logger]{@link BaseRetailerService#logger}: [Winston Logger](https://github.com/winstonjs/winston#creating-your-own-logger), you can add log
 *
 * Except those four global variables, you also can use `require` to require [NodeJS](https://nodejs.org/en/docs/) native modules.
 *
 * If your return value isn't `undefined` or `null`, then this vlaue will be set as `dataset` and send back to your Retailer Service. If you return `undefined` or `null` or don't return any value, then will send whole page back to your Retailer Service.
 *
 * **Example**
 *
 * This example, we will wait 5s, then send whole page back. It is useful for single page application to wait until data finish load.
 * ```JavaScript
 * {
 *  metadata:{
 *    script: `
 *              async function(){
 *                await $$page.waitFor(5000);
 *              }
 *            `
 *  }
 * }
 * ```
 *
 * You also can define your code as function, and use `toString()`.
 */

/**
 * @typedef {object} ParseFunReturn
 * @property {array} [tasks]                                  - Send an array of {@link Task} to **Munew** application
 * @property {string} [key]                                   - Key value for the data you want to save. Default is `data`.
 * @property {integer|string|Object|Array} [data]             - Data you want to save. It will be appended to the `key`. If `data` is empty or `undefined` or `null`, then nothing will be saved. `data` will be saved to {@link Configurations.DATA_PATH}
 * @property {object} [response]
 * @property {number} [response.status=200]                   - [HTTP response status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status). Any value big than 300 will be considered of fail
 * @property {integer|string|object|array} [response.data]    - Data want to send back. Only use when you want to return an error, and you can add the reason of error, it is useful for troubleshoot
 */

/**
 * @typedef {object} TriggerFunReturn
 * @property {array} [tasks] - Send an array of {@link Task} to **Munew** application
 */

/**
 * @typedef {object} IndexOptions
 * @property {string} [title=Retailer Service] - Title of this retailer service
 * @property {string} [description=A retailer server to crawl data from website] - Description of this retailer service
 * @property {string} [githubURL=https://github.com/munew] - Your github repo URL
 * @property {string} [homeURL=https://munew.io] - Your github repo URL
 * @property {string} [docURL=https://docs.munew.io] - Your document URL
 * @property {string} [copyright=&copy; 2020 Munew.io] - copyright
 * @property {Array<Item>} [items] - Additional links you want to render
 */

/**
 * @typedef {object} Item
 * @property {string} title - Item title
 * @property {string} url - Item url
 * @property {string} description - Item description
 */
