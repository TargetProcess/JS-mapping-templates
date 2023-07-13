### JSON Version.

```json
{
  "pipeline": [
    {
      "type": "source:targetprocess:EntityChanged",
      "entityTypes": ["release"],
      "modifications": {
        "created": false,
        "deleted": false,
        "updated": ["Import Team Iterations to AzDo"]
      }
    },
    {
      "or": [
        {
          "and": [
            {
              "value": null,
              "target": {
                "name": "Import Team Iterations to AzDo",
                "type": "field",
                "target": {
                  "type": "pipelineBlockOutput"
                }
              },
              "operator": {
                "type": "is true"
              }
            }
          ]
        }
      ],
      "type": "filter:Relational"
    },
    {
      "type": "action:JavaScript",
      "script": "//Specify AzDo profile name. \nconst PROFILE_NAME = 'Basic Case';\n\nconst sync = context.getService(\"workSharing/v2\");\nconst api = context.getService(\"targetprocess/api/v2\");\nconst utils = require('utils');\n\nconst { ResourceType: type, ResourceId: id } = args;\n\nconst [activeProfiles] = await sync\n  .getProfiles()\n  .then((profiles) => {\n    return profiles.filter(\n      (p) => p.status === \"Enabled\" && p.targetTool.type === \"AzureDevOps\"\n        && p.name === PROFILE_NAME\n    );\n  })\n  .catch((e) => {\n    console.log(e);\n    return [];\n  });\n\nif (!activeProfiles) {\n  console.log(`Failed to find AzDo Active profile. `)\n  return;\n}\n\nconst data = await api.getByIdAsync(type, id, {\n  select: `{pidata:{name, startdate, enddate, project:project.name},\n  teamIterations.select({name, startdate, enddate}) as teamiterations}`\n})\n\nif (!data) { return };\n\nconst { pidata, teamiterations } = data;\nconst tis = [...new Map(Object(teamiterations).map(ti => [ti.name, ti])).values()];\n\nconsole.log(tis)\n\nconst perChunk = 10;\n\nconst results = tis.reduce((resultArray, item, index) => {\n  const chunkIndex = Math.floor(index / perChunk)\n  if (!resultArray[chunkIndex]) {\n    resultArray[chunkIndex] = []\n  }\n  resultArray[chunkIndex].push(item)\n  return resultArray\n}, [])\n\nreturn results.map(chunk => utils.activateNamedTrigger('ado-iterations-handler', { dataset: { pi: [pidata], tis: chunk, activeProfiles} }));"
    }
  ]
}
```

### JavaScript Version.

```js
/*
when Release: updated
And at least one of the following fields is modified: Import Team Iterations to AzDo
[Import Team Iterations to AzDo]: is true
*/

//Specify AzDo profile name.
const PROFILE_NAME = "Basic Case";

const sync = context.getService("workSharing/v2");
const api = context.getService("targetprocess/api/v2");
const utils = require("utils");

const { ResourceType: type, ResourceId: id } = args;

const [activeProfiles] = await sync
  .getProfiles()
  .then((profiles) => {
    return profiles.filter(
      (p) =>
        p.status === "Enabled" &&
        p.targetTool.type === "AzureDevOps" &&
        p.name === PROFILE_NAME
    );
  })
  .catch((e) => {
    console.log(e);
    return [];
  });

if (!activeProfiles) {
  console.log(`Failed to find AzDo Active profile. `);
  return;
}

const data = await api.getByIdAsync(type, id, {
  select: `{pidata:{name, startdate, enddate, project:project.name},
  teamIterations.select({name, startdate, enddate}) as teamiterations}`,
});

if (!data) {
  return;
}

const { pidata, teamiterations } = data;
const tis = [
  ...new Map(Object(teamiterations).map((ti) => [ti.name, ti])).values(),
];

const perChunk = 10;

const results = tis.reduce((resultArray, item, index) => {
  const chunkIndex = Math.floor(index / perChunk);
  if (!resultArray[chunkIndex]) {
    resultArray[chunkIndex] = [];
  }
  resultArray[chunkIndex].push(item);
  return resultArray;
}, []);

return results.map((chunk) =>
  utils.activateNamedTrigger("ado-iterations-handler", {
    dataset: { pi: [pidata], tis: chunk, activeProfiles },
  })
);
```
