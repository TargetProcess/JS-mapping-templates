### Main handler

## JSON Version

```json
{
  "pipeline": [
    {
      "name": "team-iteration-handler",
      "type": "source:uniqueName"
    },
    {
      "type": "action:JavaScript",
      "script": "const sync = require(\"workSharing/v2\");\nconst ACCOUNT = Object(args).Account;\nconst TP_TOOL = { id: ACCOUNT, type: \"Targetprocess\" };\nconst profiles = (await sync.getProfiles()) || [];\n\nif (!args.data) {\n  return;\n}\n\nconst {\n  data: { tis = [] },\n} = args;\n\nconst LogStore = function () {\n  this.warning = [];\n  this.error = [];\n  this.info = [];\n\n  this._makeAllPropertiesEnumerable = (obj) => {\n    const newObj = {};\n\n    Object.getOwnPropertyNames(obj).forEach((prop) => {\n      newObj[prop] = obj[prop];\n    });\n    return newObj;\n  };\n\n  this.addMessage = (type, rawMessage) => {\n    const addTimeStamp = (m) => {\n      const date = new Date().toISOString();\n      return `${date} | ${m}`;\n    };\n\n    const message = addTimeStamp(\n      typeof rawMessage === \"string\"\n        ? rawMessage\n        : JSON.stringify(\n            rawMessage instanceof Error\n              ? this._makeAllPropertiesEnumerable(rawMessage)\n              : rawMessage\n          )\n    );\n\n    if (type === \"err\") {\n      this.error.push(message);\n    }\n\n    if (type === \"warn\") {\n      this.warning.push(message);\n    }\n\n    if (type === \"info\") {\n      this.info.push(message);\n    }\n    return this;\n  };\n\n  this.getLogStore = () => {\n    return [\n      { name: \"info\", messages: this.info },\n      { name: \"warning\", messages: this.warning },\n      { name: \"error\", messages: this.error },\n    ];\n  };\n\n  this.printLogs = () => {\n    const logs = this.getLogStore();\n    const printer = ({ name, messages }) => {\n      if (messages.length) {\n        console.log(\n          `*****${name}****\\n` +\n            messages.map((message, i) => `${i + 1}.${message}`).join(\"\\n\") +\n            `\\n*****end****`\n        );\n      }\n    };\n    logs.forEach((logContainer) => {\n      printer(logContainer);\n    });\n  };\n};\n\nconst logStore = new LogStore();\n\nconst SprintHandler = function (TP_TOOL, sync, ti) {\n  this._tptool = TP_TOOL;\n  this.sync = sync;\n  this._ti = ti;\n\n  this.getEntityShare = async () => {\n    try {\n      logStore.addMessage(\n        \"info\",\n        `Going to process \"${JSON.stringify(this._ti)}\"`\n      );\n\n      const { id: sourceId, type: sourceType } = this._ti;\n\n      const [entityShare] = await this.sync.getEntityShares({\n        sourceId: `${sourceId}`,\n        sourceType,\n        tool: this._tptool,\n      });\n\n      logStore.addMessage(\n        \"info\",\n        entityShare\n          ? `Got the shared sprint: \"${JSON.stringify(\n              entityShare\n            )}\" for TI: \"${JSON.stringify(this._ti)}\"`\n          : `Sprint ${JSON.stringify(this._ti)} is not shared.`\n      );\n\n      this._entityShare = entityShare;\n\n      return this;\n    } catch (e) {}\n  };\n\n  this.getSprint = async (jiraApi, sourceId) => {\n    try {\n      return await jiraApi.getAsync(\n        `rest/agile/1.0/sprint/${Number(sourceId)}`\n      );\n    } catch (e) {\n      logStore.addMessage(\n        \"err\",\n        `Failed to get srpint sourceId: \"${sourceId}\", ${JSON.stringify(e)}`\n      );\n    }\n  };\n\n  this.updateSprint = async (jiraApi, sprint) => {\n    try {\n      return await jiraApi\n        .putAsync(`/rest/agile/1.0/sprint/${sprint.id}`, {\n          body: {\n            ...sprint,\n            state: this._ti.state,\n          },\n        })\n        .then((data) => {\n          logStore.addMessage(\n            \"info\",\n            `Succefully update Sprint. ${JSON.stringify(\n              sprint\n            )}, ${JSON.stringify(data)}`\n          );\n        });\n    } catch (e) {\n      logStore.addMessage(\n        \"err\",\n        `Failed to update srpint: \"${sprint.id}\" \"${JSON.stringify(\n          e\n        )}\", ${JSON.stringify(e)}`\n      );\n    }\n  };\n\n  this.processSprint = async () => {\n    if (!this._entityShare) {\n      return;\n    }\n\n    try {\n      const { tool, sourceId } = this._entityShare;\n\n      const jiraApi = this.sync.getProxy(tool);\n\n      const jiraSprint = await this.getSprint(jiraApi, sourceId);\n\n      if (!jiraSprint) return;\n\n      if (jiraSprint.state === this._ti.state) {\n        logStore.addMessage(\n          \"info\",\n          `Jira sprint \"${JSON.stringify(jiraSprint)}\" is alredy in \"${\n            this._ti.state\n          }\" state.`\n        );\n        return;\n      }\n\n      const updateResult = await this.updateSprint(jiraApi, jiraSprint);\n    } catch (e) {\n      throw e;\n    }\n  };\n};\n\ntry {\n  await tis.reduce((prevPromise, ti) => {\n    const handler = new SprintHandler(TP_TOOL, sync, ti);\n    return prevPromise.then(async () => {\n      const entityShare = await handler.getEntityShare();\n      return entityShare.processSprint();\n    });\n  }, Promise.resolve());\n} catch (e) {\n  throw new Error(JSON.stringify(e));\n} finally {\n  logStore.printLogs();\n}\n"
    }
  ]
}
```

## JS Version

```js
const sync = require("workSharing/v2");
const ACCOUNT = Object(args).Account;
const TP_TOOL = { id: ACCOUNT, type: "Targetprocess" };
const profiles = (await sync.getProfiles()) || [];

if (!args.data) {
  return;
}

const {
  data: { tis = [] },
} = args;

const LogStore = function () {
  this.warning = [];
  this.error = [];
  this.info = [];

  this._makeAllPropertiesEnumerable = (obj) => {
    const newObj = {};

    Object.getOwnPropertyNames(obj).forEach((prop) => {
      newObj[prop] = obj[prop];
    });
    return newObj;
  };

  this.addMessage = (type, rawMessage) => {
    const addTimeStamp = (m) => {
      const date = new Date().toISOString();
      return `${date} | ${m}`;
    };

    const message = addTimeStamp(
      typeof rawMessage === "string"
        ? rawMessage
        : JSON.stringify(
            rawMessage instanceof Error
              ? this._makeAllPropertiesEnumerable(rawMessage)
              : rawMessage
          )
    );

    if (type === "err") {
      this.error.push(message);
    }

    if (type === "warn") {
      this.warning.push(message);
    }

    if (type === "info") {
      this.info.push(message);
    }
    return this;
  };

  this.getLogStore = () => {
    return [
      { name: "info", messages: this.info },
      { name: "warning", messages: this.warning },
      { name: "error", messages: this.error },
    ];
  };

  this.printLogs = () => {
    const logs = this.getLogStore();
    const printer = ({ name, messages }) => {
      if (messages.length) {
        console.log(
          `*****${name}****\n` +
            messages.map((message, i) => `${i + 1}.${message}`).join("\n") +
            `\n*****end****`
        );
      }
    };
    logs.forEach((logContainer) => {
      printer(logContainer);
    });
  };
};

const logStore = new LogStore();

const SprintHandler = function (TP_TOOL, sync, ti) {
  this._tptool = TP_TOOL;
  this.sync = sync;
  this._ti = ti;

  this.getEntityShare = async () => {
    try {
      logStore.addMessage(
        "info",
        `Going to process "${JSON.stringify(this._ti)}"`
      );

      const { id: sourceId, type: sourceType } = this._ti;

      const [entityShare] = await this.sync.getEntityShares({
        sourceId: `${sourceId}`,
        sourceType,
        tool: this._tptool,
      });

      logStore.addMessage(
        "info",
        entityShare
          ? `Got the shared sprint: "${JSON.stringify(
              entityShare
            )}" for TI: "${JSON.stringify(this._ti)}"`
          : `Sprint ${JSON.stringify(this._ti)} is not shared.`
      );

      this._entityShare = entityShare;

      return this;
    } catch (e) {}
  };

  this.getSprint = async (jiraApi, sourceId) => {
    try {
      return await jiraApi.getAsync(
        `rest/agile/1.0/sprint/${Number(sourceId)}`
      );
    } catch (e) {
      logStore.addMessage(
        "err",
        `Failed to get srpint sourceId: "${sourceId}", ${JSON.stringify(e)}`
      );
    }
  };

  this.updateSprint = async (jiraApi, sprint) => {
    try {
      return await jiraApi
        .putAsync(`/rest/agile/1.0/sprint/${sprint.id}`, {
          body: {
            ...sprint,
            state: this._ti.state,
          },
        })
        .then((data) => {
          logStore.addMessage(
            "info",
            `Succefully update Sprint. ${JSON.stringify(
              sprint
            )}, ${JSON.stringify(data)}`
          );
        });
    } catch (e) {
      logStore.addMessage(
        "err",
        `Failed to update srpint: "${sprint.id}" "${JSON.stringify(
          e
        )}", ${JSON.stringify(e)}`
      );
    }
  };

  this.processSprint = async () => {
    if (!this._entityShare) {
      return;
    }

    try {
      const { tool, sourceId } = this._entityShare;

      const jiraApi = this.sync.getProxy(tool);

      const jiraSprint = await this.getSprint(jiraApi, sourceId);

      if (!jiraSprint) return;

      if (jiraSprint.state === this._ti.state) {
        logStore.addMessage(
          "info",
          `Jira sprint "${JSON.stringify(jiraSprint)}" is alredy in "${
            this._ti.state
          }" state.`
        );
        return;
      }

      const updateResult = await this.updateSprint(jiraApi, jiraSprint);
    } catch (e) {
      throw e;
    }
  };
};

try {
  await tis.reduce((prevPromise, ti) => {
    const handler = new SprintHandler(TP_TOOL, sync, ti);
    return prevPromise.then(async () => {
      const entityShare = await handler.getEntityShare();
      return entityShare.processSprint();
    });
  }, Promise.resolve());
} catch (e) {
  throw new Error(JSON.stringify(e));
} finally {
  logStore.printLogs();
}
```
