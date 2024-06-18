### Jira Project Key custom field is required on Team entity in ATP.

```js
const {
  sourceEntity,
  targetEntity,
  sourceTool,
  targetTool,
  value: { changed: jiraProject },
} = args;
const sync = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");
const ENTITY_TYPE_NAME = "Team";
const CUSTOM_FILED_NAME = "Jira Project Key";
const CREATE_MISSING_ITEM = false;
const tpApi = sync.getProxy(args.targetTool);

if (!(jiraProject && jiraProject.key)) {
  console.error(`Jira Project is undefined.`);
  return;
}

function TeamHandler(project, type) {
  this.type = type;
  this.project = project;

  this.team = {
    kind: "Value",
    value: [],
  };

  this.getFieldType = function () {
    return apiV2
      .queryAsync("customfield", {
        select: `FieldType`,
        where: `entityType.name="${ENTITY_TYPE_NAME}" and name="${CUSTOM_FILED_NAME}"`,
      })
      .then((fields) => {
        const [fieldType] = fields || [];
        this.fieldType = fieldType;
        if (!fieldType) {
          throw new Error(
            `Field named "${CUSTOM_FILED_NAME}" is not availible on Team entity.`
          );
        }
      });
  };

  this.consoleLogHandler = function (msg, type = "log") {
    switch (type) {
      case "warn":
        console.warn(msg);
        break;
      case "err":
        console.error(msg);
        break;
      case "log":
        console.log(msg);
        break;
    }
  };

  this.process = function () {
    return this.getFieldType()
      .then(() => {
        return this.getItemById();
      })
      .then((data) => {
        !data.length &&
          this.consoleLogHandler(
            `Failed to find Team in Targetprocess by jira project key: "${this.project.key}"`,
            "warn"
          );
        this.team.value = data;
        if (data.length) {
          return Promise.resolve();
        } else if (!data.length && CREATE_MISSING_ITEM) {
          return this.createNewTeam();
        } else {
          return Promise.resolve();
        }
      })
      .then(() => {
        this.team.value = this.team.value.map((team) => ({ id: team.id }));
        return this.team;
      })
      .catch((e) => {
        throw new Error(e);
      });
  };

  this.getItemById = function () {
    const trimedField = CUSTOM_FILED_NAME.replace(/\s/g, "").toLowerCase();
    return apiV2.queryAsync(this.type, {
      select: `{id:id, name:name, jirateamid:${trimedField}}`,
      where: `${trimedField} == ${
        this.fieldType == "Number" ? this.project.key : `"${this.project.key}"`
      }`,
    });
  };

  this.createNewTeam = function () {
    this.consoleLogHandler(
      `Creating ${this.type}... ${this.project.key}`,
      "warn"
    );
    return tpApi
      .postAsync(`api/v1/${this.type}?format=json`, {
        body: {
          Name: this.project.key,
          [CUSTOM_FILED_NAME]: this.project.key,
        },
      })
      .then((data) => {
        const team = { id: data.Id, name: data.Name };
        this.team.value = [team];
        return Promise.resolve();
      })
      .catch((e) => {
        throw new Error(JSON.stringify(e));
      });
  };
}

try {
  const team = await new TeamHandler(jiraProject, "Team").process();
  return team;
} catch (e) {
  console.error(e);
}
```
