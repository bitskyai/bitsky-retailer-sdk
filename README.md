# bitspider-retailer-sdk

A SDK for develop Retailer Service. Retailer service decide what task to excute and how to parse the receive data.

## Installation

This is a [Node.js](https://nodejs.org/en/) module and available through the [npmjs.com](https://npmjs.com).

> If you didn't install NodeJS before, please install [Node.js](https://nodejs.org/en/download/) before you continue. Node.js 10.x or higher is required.

Run following command to install:

```bash
npm install bitspider-retailer-sdk
```

## Getting Started

## Schema

### Task

```json
{
  "type": "object",
  "required": ["url", "soi"],
  "properties": {
    "url": {
      "type": "string"
    },
    "soi": {
      "type": "object",
      "required": ["globalId"],
      "additionalProperties": false,
      "properties": {
        "globalId": {
          "type": "string"
        }
      }
    },
    "priority": {
      "type": "integer",
      "minimum": 1,
      "default": 100,
      "description": "Priority of this task. Only compare priority for same Retailer Service, doesn't compare cross Retailer Service. Bigger value low priority. Priority value 1 is higher than priority value 2."
    },
    "suitableAgents": {
      "type": "array",
      "description": "What kind of agent types can execute this task",
      "default": ["HEADLESSBROWSER"],
      "items": {
        "type": "string",
        "enum": ["HEADLESSBROWSER", "SERVICE"]
      },
      "minItems": 1,
      "uniqueItems": true
    },
    "metadata": {
      "type": "object",
      "additionalProperties": true,
      "description": "Additional metadata for this task",
      "properties": {
        "script": {
          "type": "string",
          "description": "Code want to execute after **window.onload**. If you need agent to execute your code, Only work with **HEADLESSBROSWER** agent"
        }
      }
    }
  }
}
```

## APIs

### getConfigs()/setConfigs(options)

Get or set configurations.

**Arguments**
The `options` object has following properties:

1. `MUNEW_BASE_URL`: **Required**. The Munew Application URL. Default value `http://localhost:9099`.
2. `GLOBAL_ID`: **Required**. The global id for your Retailer Service. Please [Get a Retailer Service Global ID
   ](https://docs.munew.io/how-tos/how-to-set-an-analyst-service-global_id)
3. `PORT`: [Express server](http://expressjs.com/en/5x/api.html#app.listen) port number. Default value `8081`
4. `SERVICE_NAME`: Service name, this name will be used for log. Default value `bitspider-retailer-sdk`
5. `ERROR_LOG_FILE_NAME`: Error log file name. Default `error.log`.
6. `COMBINED_LOG_FILE_NAME`: Combined log file name. Default `combined.log`.
7. `LOG_FILES_PATH`: Path to your log folder. Default `node_modules/bitspider-retailer-sdk/lib/public/log`. You can view it by open `http://localhost:{port}/log/{COMBINED_LOG_FILE_NAME}` and `http://localhost:{port}/log/{ERROR_LOG_FILE_NAME}`
8. `LOG_LEVEL`: Loging level you want to log. Please find available loging levels from [Winston Logging Levels](https://github.com/winstonjs/winston#logging-levels). Default `info`
9. `DATA_PATH`: Path to `data.json`, this is the default way to store data in your disk. Default value `node_modules/bitspider-retailer-sdk/lib/public/data.json`

You can use `baseRetailerService.setConfigs` to set configurations or you also can set them as **environment variables**, like `process.env.GLOBAL_ID=xxxx.xxxx` in NodeJS, or `export GLOBAL_ID=xxxx.xxxx` in Bash. Environment variables will overwrite same variable set by `baseRetailerService.setConfigs`.

For example, you set environment:

```bash
expoort GLOBAL_ID=abcd.environment
```

And in your code, you also set it manually:

```JavaScript
baseRetailerService.setConfigs({
  GLOBAL_ID:"abcd.manual"
})
```

So in this case, `GLOBAL_ID` is `abcd.environment`, not `abcd.manual`.

**Examples:**

```JavaScript
baseRetailerService.setConfigs({
  GLOBAL_ID:"abcd.manual",
  SERVICE_NAME: "hello_world_retailer"
})
baseRetailerService.getConfigs()
```

### init()

Create logger and http request based on the configruations. You should call this function after your `setConfigs`.

**Arguments**
No arguments

### trigger(triggerFun)

Add the trigger task(s)

> `trigger()` return `trigger function`

**Arguments**
function or async function.

This function will get an object as parameter

```JavaScript
{
  req,
  res
}
```

1. `req`: [ExpressJS Request](https://expressjs.com/en/5x/api.html#req)
2. `res`: [ExpressJS Response](https://expressjs.com/en/5x/api.html#res)

This function need to return an object, this object has `tasks` property that contains trigger tasks. `tasks` will be sent to **Munew** application

The schema of this object.

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "tasks": {
      "type": "array",
      "description": "`tasks`: Send `tasks` to **Munew** application",
      "items": {
        "$ref": "#schema/task"
      }
    }
  }
}
```

**Example**

```json
{
  "soi": {
    "globalId": "c29pOjoxNTkyNzk1NTI1NjAzOjpmZmFkNTI4Zi02NzYyLTRlNmQtOGQyYS05Njk1NzM0YjhkM2Q="
  },
  "url": "http://exampleblog.munew.io/",
  "priority": 1,
  "metadata": {
    "type": "bloglist"
  }
}
```

Normally, you should use **generateTask** to create task object.

**Trigger Example**

```JavaScript
const baseRetailerService = require("bitspider-retailer-sdk");

const trigger = async function trigger({ req, res }) {
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
```

### parse(parseFun)

Add the parse function to parse received data, it can continue add more tasks or store data to a json or other format to disk.

> `parse()` return `parse function`

**Arguments**
function or async function.

This function will get an object as parameter

```JavaScript
{
  req,
  res
}
```

1. `req`: [ExpressJS Request](https://expressjs.com/en/5x/api.html#req)
2. `res`: [ExpressJS Response](https://expressjs.com/en/5x/api.html#res)

This function need to return an object, the schema of this object.

```JSON
{
 "type":"object",
 "additionalProperties": false,
 "required":[],
 "properties":{
   "tasks": {
      "type": "array",
      "description": "Send `tasks` to **Munew** application",
      "items": {
        "$ref": "#schema/task"
      }
    },
    "key": {
      "type": "string",
      "description":"Key value for the data you want to save. Default is `data`."
    },
    "data": {
      "type": ["integer", "string", "object", "array"],
      "description": "Data need to save. It will be appended to the `key`. If `data` is empty or `undefined` or `null`, then nothing will be saved. `data` will be saved to `DATA_PATH`"
    },
    "response":{
      "type":"object",
      "additionalProperties": false,
      "properties":{
        "status":{
          "type":"number",
          "default": 200,
          "description": "HTTP Status. Any value big than 300 will be considered of fail"
        },
        "data":{
          "type": ["integer", "string", "object", "array"],
          "description": "Data want to send back. Only use when you want to return an error, and you can add the reason of error, it is useful for troubleshoot"
        }
      }
    }
 }
}
```

**Example**

```json
{
  "key": "blogs",
  "response": {
    "status": 200
  },
  "data": [{ "value": "hello world" }],
  "tasks": []
}
```

This will append `data` to the `blogs` property, don't need to add new task and response successful. Same result with:

```json
{
  "key": "blogs",
  "data": [{ "value": "hello world" }]
}
```

**Parse Example**

```JavaScript
const parse = async function parse({ req, res }) {
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
```

### generateTask({ url, priority, metadata, suitableAgents })

Based on the parameters you passed, return a valid task object, so you can send this task to **Munew** application.

**Arguments**

1. `url`: **required**. url of web page that need to be processed
2. `priority`: **optional**. please take a look [Scheme->Task->priority]()
3. `metadata`: **optional**. please take a look [Scheme->Task->metadata]()
4. `suitableAgents`: **optional**. please take a look [Scheme->Task->suitableAgents]()

**Return**
Return `Task` object

### express({ limit, views, statics, corsOptions })

Initial a [ExpressJS](https://expressjs.com/) server and configure it.

1. View engine is [ejs](https://ejs.co/)
2. Default enable [cors](https://www.npmjs.com/package/cors). You can pass `cors` to configure it.

**Arguments**

1. `limit`: **optional**. Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing. More information, please take a look [ExpressJS JSON Options](https://expressjs.com/en/4x/api.html#express). Default `100mb`
2. `views`: **optional**. A directory or an array of directories for the application's views. If an array, the views are looked up in the order they occur in the array. You need to pass **absolute path**
3. `statics`: **optional**. A directory or an array of directories which to serve static assets, like images, json files and other. You need to pass **absolute path**. For more detail, please take a look [ExpressJS static middleware](https://expressjs.com/en/4x/api.html#express.static)
4. `corsOptions`: **optional**. Please take a look [cors](https://www.npmjs.com/package/cors)

**Return**
Return `BaseRetailerService`

###
