[BitSky Retailer SDK](https://bitsky.ai)
===

A SDK for develop Retailer Service. Retailer service decide what task to excute and how to parse the receive data.

## Installation

This is a [Node.js](https://nodejs.org/en/) module and available through the [npmjs.com](https://npmjs.com).

> If you didn't install NodeJS before, please install [Node.js](https://nodejs.org/en/download/) before you continue. Node.js 10.x or higher is required.

Run following command to install:

```bash
npm install @bitskyai/retailer-sdk
```

## Getting Started
> Before continue, make sure you have a running BitSky application. If you don't have, please follow [Install BitSKy](https://docs.bitsky.ai/#setup-bitsky) to install it

Create `index.js`, and copy follow code to it

```JavaScript
const baseRetailerService = require("bitspider-retailer-sdk");

const triggerFun = async function(){
  return {
    tasks: [
      baseRetailerService.generateTask({
        url: "http://exampleblog.bitsky.ai/"
      })]
  }
}
const parseFun = async function({req}){
  const data = req.body;
  // You can add your logic to parse and decide whether need to add additional tasks
  // For this example, I store get data to disk
  return {
    data: data
  }
}
// You must set `GLOBAL_ID` and `BITSKY_BASE_URL`
baseRetailerService.setConfigs({
  GLOBAL_ID: "c29pOjoxNTkyNzk1NTI1NjAzOjpmZmFkNTI4Zi02NzYyLTRlNmQtOGQyYS05Njk1NzM0YjhkM2Q=",
  BITSKY_BASE_URL: "http://localhost:9099",
});
baseRetailerService.init();
baseRetailerService.trigger(triggerFun);
baseRetailerService.parse(parseFun);
baseRetailerService.express();
baseRetailerService.routers();
baseRetailerService.listen();
```

Change the `GLOBAL_ID` and `BITSKY_BASE_URL`.

Now run `node index.js`, and open [http://localhost:8081](http://localhost:8081), now you start your Retailer Service, click trigger to add your trigger task.

Please take a look of [Example Blog Node](https://github.com/bitskyai/exampleblog-node)

If you want to save data to mongodb

```JavaScript
baseRetailerService.setConfigs({
  GLOBAL_ID: "c29pOjoxNTkyNzk1NTI1NjAzOjpmZmFkNTI4Zi02NzYyLTRlNmQtOGQyYS05Njk1NzM0YjhkM2Q=",
  BITSKY_BASE_URL: "http://localhost:9099",
  CONNECTOR_TYPE: "mongodb",
  MONGODB_URL: "mongodb://username@password.mlab.com:47987/retailer"
});
```

## APIs

Please download [API Doc](https://github.com/bitskyai/bitsky-retailer-sdk/release/latest/apidoc.zip), and open it in your browser

> Will host to a server in future

## Schemas

### Task

```json
{
  "type": "object",
  "required": ["url", "retailer"],
  "properties": {
    "url": {
      "type": "string",
      "description": "web page url that need to be processed"
    },
    "retailer": {
      "type": "object",
      "required": ["globalId"],
      "additionalProperties": false,
      "properties": {
        "globalId": {
          "type": "string",
          "description": "The **global id** of your Retailer Service"
        }
      }
    },
    "priority": {
      "type": "integer",
      "minimum": 1,
      "default": 100,
      "description": "Priority of this task. Only compare priority for same Retailer Service, doesn't compare cross Retailer Service. Bigger value low priority. Priority value 1 is higher than priority value 2."
    },
    "suitableProducers": {
      "type": "array",
      "description": "What kind of producers can execute this task",
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
          "description": "Code want to execute after **window.onload**. If you need producer to execute your code, Only work with **HEADLESSBROSWER** producer"
        }
      }
    }
  }
}
```

### TriggerFunReturn

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "tasks": {
      "type": "array",
      "description": "`tasks`: Send `tasks` to **BitSky** application",
      "items": {
        "$ref": "#schema/task"
      }
    }
  }
}
```

### ParseFunReturn

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [],
  "properties": {
    "tasks": {
      "type": "array",
      "description": "Send `tasks` to **BitSky** application",
      "items": {
        "$ref": "#schema/task"
      }
    },
    "key": {
      "type": "string",
      "description": "Key value for the data you want to save. Default is `data`."
    },
    "data": {
      "type": ["integer", "string", "object", "array"],
      "description": "Data need to save. It will be appended to the `key`. If `data` is empty or `undefined` or `null`, then nothing will be saved. `data` will be saved to `DATA_PATH`"
    },
    "response": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "status": {
          "type": "number",
          "default": 200,
          "description": "HTTP Status. Any value big than 300 will be considered of fail"
        },
        "data": {
          "type": ["integer", "string", "object", "array"],
          "description": "Data want to send back. Only use when you want to return an error, and you can add the reason of error, it is useful for troubleshoot"
        }
      }
    }
  }
}
```
