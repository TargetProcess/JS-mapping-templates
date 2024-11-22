## JSON Version

```json
{
  "pipeline": [
    {
      "type": "source:schedule",
      "schedule": {
        "kind": "interval",
        "unit": "hour",
        "value": 1
      }
    },
    {
      "type": "action:JavaScript",
      "script": "const utils = require('utils');\nconst date = args.FireTime.split('T')[0]\nconst time = new Date(args.FireTime).getHours()\nconst apiV2 = context.getService(`targetprocess/api/v2`);\n\nif (time === 1) { \n  \n  const tis = await apiV2.queryAsync(`teamiteration`, {\n    select: `{id, type:resourceType, name, startDate, endDate, state:'active'}`,\n    where:`startDate = DateTime.Parse(\"${date}\")`\n  })\n\nreturn utils.activateNamedTrigger('team-iteration-handler', {tis})\n\n}"
    }
  ]
}
```

## JS Version

```js
const utils = require("utils");
const date = args.FireTime.split("T")[0];
const time = new Date(args.FireTime).getHours();
const apiV2 = context.getService(`targetprocess/api/v2`);

if (time === 1) {
  const tis = await apiV2.queryAsync(`teamiteration`, {
    select: `{id, type:resourceType, name, startDate, endDate, state:'active'}`,
    where: `startDate = DateTime.Parse("${date}")`,
  });

  return utils.activateNamedTrigger("team-iteration-handler", { tis });
}
```
