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
      "script": "const api = context.getService(\"targetprocess/api/v2\");\nconst assignableId = args.Current.Id;\nconst sync = context.getService(\"workSharing/v2\");\n\nconst entity = {\n  sourceType: args.Current.ResourceType,\n  sourceId: `${assignableId}`,\n  tool: {\n    type: 'Targetprocess',\n    id: args.Account\n  }\n}\n\nconst profiles = await sync.getProfiles();\n\n//get profile ID by Name\nconst currentProfile = profiles.find(p => p.name === 'Jira Integration Profile')\n\n//get mapping ID\nconst mappingId = currentProfile.mappings[0].id;\nconst targetTool = currentProfile.targetTool;\nconst jiraApi = sync.getProxy(targetTool);\n\nawait sync.shareEntity({\n  sourceEntity: entity,\n  mappingId,\n  stateTransfer: {\n    kind: \"source\"\n  },\n  targetTool: targetTool\n})\n\n"
    }
  ]
}

```

```js

//Need specify jira profile name (case sensetive);
const PROFILE_NAME = 'AWS'

```
