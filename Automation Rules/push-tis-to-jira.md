#### Automation Rule pushes Team Iterations automatically to Jira as soon as they are created in Targetprocess

in line 5 `'Jira Integration Profile'` must be changed to a real profile name (case sensitive)
\

```js
{
  "pipeline": [
    {
      "type": "source:targetprocess:EntityChanged",
      "entityTypes": [
        "teamiteration"
      ],
      "modifications": {
        "created": true,
        "deleted": false,
        "updated": false
      }
    },
    {
      "type": "action:JavaScript",
      "script": "const api = context.getService(\"targetprocess/api/v2\");\nconst assignableId = args.Current.Id;\nconst sync = context.getService(\"workSharing/v2\");\n\nconst PROFILE_NAME = 'Jira Integration Profile';\n\nconst entity = {\n  sourceType: args.Current.ResourceType,\n  sourceId: `${assignableId}`,\n  tool: {\n    type: 'Targetprocess',\n    id: args.Account\n  }\n}\n\nconst profiles = await sync.getProfiles();\nconst currentProfile = profiles.find(p => p.name === PROFILE_NAME)\n\nif (!currentProfile) {\n  throw Error(`Faield to find profile by name. ${PROFILE_NAME}`)\n}\n\nconst mappingId = currentProfile.mappings[0].id;\nconst targetTool = currentProfile.targetTool;\nconst jiraApi = sync.getProxy(targetTool);\n\ntry {\n  await sync.shareEntity({\n    sourceEntity: entity,\n    mappingId,\n    stateTransfer: {\n      kind: \"source\"\n    },\n    targetTool: targetTool\n  })\n\n} catch (e) {\n  throw Error(`Faield to push Team Iteration ${JSON.stringify(e)}`)\n}\n\n\n"
    }
  ]
}

```

```js
//Need specify jira profile name (case sensetive);
const PROFILE_NAME = "AWS";
```
