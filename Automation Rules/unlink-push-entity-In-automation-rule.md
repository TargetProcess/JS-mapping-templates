### This AR can be used as an example to Unlink/Push entities in Automation Rules.

Use Case:
Targetprocess Team === Jira Project.

When Team Assignment is Created - check if:
\
Entity is already shared
\
AND
\
Jira Project !== Targetprocess Team,
\
THEN : UNLINK and PUSH.
\
ELSE - no action.

```js
const api = context.getService("targetprocess/api/v2");
const assignableId = args.Current.Assignable.Id;
const teamName = args.Current.Team.Name;
const sync = context.getService("workSharing/v2");

const PROFILE_NAME = "Jira PROD";
const DELETE_TARGET_ITEM = true;

const entity = {
  sourceType: args.Current.Assignable.ResourceType,
  sourceId: `${assignableId}`,
  tool: {
    type: "Targetprocess",
    id: args.Account,
  },
};

//check if entity is already shared
const [entityShares] = await sync.getEntityShares(entity);

if (!entityShares) {
  return;
}

const profiles = (await sync.getProfiles()) || [];

//get profile ID by Name
const currentProfile = profiles.find(
  (p) => (p.name || "").toUpperCase() === PROFILE_NAME.toUpperCase()
);

if (!currentProfile) {
  console.log(`Failed to find profile by name: "${PROFILE_NAME}"`);
  return;
}

//get mapping ID
const mappingId = currentProfile.mappings[0].id;
const targetTool = currentProfile.targetTool;
const jiraApi = sync.getProxy(targetTool);

//Fetch issue details from Jira
const issue = await jiraApi
  .getAsync(`/rest/api/2/issue/${entityShares.sourceId}`)
  .catch((e) => {
    console.log(e);
    return;
  });

if (!issue) {
  return;
}

if (teamName.toUpperCase() === issue.fields.project.name.toUpperCase()) {
  return;
} else {
  await sync.deleteEntitySharing({ entity }).then(async (_) => {
    if (DELETE_TARGET_ITEM) {
      await jiraApi
        .deleteAsync(`/rest/api/2/issue/${entityShares.sourceId}`)
        .catch((e) => {
          console.log(e);
        });
    }
  });
  await sync.shareEntity({
    sourceEntity: entity,
    mappingId,
    stateTransfer: {
      kind: "source",
    },
    targetTool: targetTool,
  });
}
```

## AR in JSON

```json
{
  "pipeline": [
    {
      "type": "source:targetprocess:EntityChanged",
      "entityTypes": ["teamassignment"],
      "modifications": {
        "created": true,
        "deleted": false,
        "updated": ["Team"]
      }
    },
    {
      "type": "action:JavaScript",
      "script": "const api = context.getService(\"targetprocess/api/v2\");\nconst assignableId = args.Current.Assignable.Id;\nconst teamName = args.Current.Team.Name;\nconst sync = context.getService(\"workSharing/v2\");\n\nconst PROFILE_NAME = 'Jira PROD';\nconst DELETE_TARGET_ITEM = true;\n\nconst entity = {\n  sourceType: args.Current.Assignable.ResourceType,\n  sourceId: `${assignableId}`,\n  tool: {\n    type: 'Targetprocess',\n    id: args.Account\n  }\n}\n\n//check if entity is already shared\nconst [entityShares] = await sync.getEntityShares(entity);\n\nif (!entityShares) { return };\n\nconst profiles = await sync.getProfiles() || [];\n\n//get profile ID by Name\nconst currentProfile = profiles.find(p => (p.name || '').toUpperCase() === PROFILE_NAME.toUpperCase())\n\nif (!currentProfile) {\n  console.log(`Failed to find profile by name: \"${PROFILE_NAME}\"`);\n  return;\n}\n\n//get mapping ID\nconst mappingId = currentProfile.mappings[0].id;\nconst targetTool = currentProfile.targetTool;\nconst jiraApi = sync.getProxy(targetTool);\n\n//Fetch issue details from Jira\nconst issue = await jiraApi.getAsync(`/rest/api/2/issue/${entityShares.sourceId}`).catch(e => {\n  console.log(e);\n  return;\n})\n\nif (!issue) { return}\n\nif (teamName.toUpperCase() === issue.fields.project.name.toUpperCase()) { return }\n\nelse {\n  await sync.deleteEntitySharing({ entity }).then(async _ => { \n    if (DELETE_TARGET_ITEM) {\n      await jiraApi.deleteAsync(`/rest/api/2/issue/${entityShares.sourceId}`).catch(e => {\n        console.log(e)\n      })\n    }\n  });\n  await sync.shareEntity({\n    sourceEntity: entity,\n    mappingId,\n    stateTransfer: {\n      kind: \"source\"\n    },\n    targetTool: targetTool\n  })\n}"
    }
  ]
}
```
