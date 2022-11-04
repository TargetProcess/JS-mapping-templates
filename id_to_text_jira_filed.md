
This mapping can be used to set up TP URL in Jira


### Mapping for Targetproccess

```js
const tptool = args.sourceTool.id;
const id = args.value.changed;
return {
    kind:'Value',
    value:`https://${tptool}/entity/${id}`
}

```


### Mapping for Jira

```js 
const workSharingService = context.getService('workSharing/v2')
const jiraTool = args.sourceTool;
const tpTool = args.targetTool.id
const jiraApi = workSharingService.getProxy(jiraTool);
const issueId = args.sourceEntity.sourceId;
const fieldId = args.sourceField.id;

if (args.value.changed) {
    return
}
await jiraApi.putAsync(`rest/api/2/issue/${issueId}`, {
   headers: {
       'Content-Type': 'application/json'
   },
   body: {
       "fields": {
           [fieldId]: `https://${tpTool}/entity/${args.targetEntity.sourceId}`
       }
   }
})

```

