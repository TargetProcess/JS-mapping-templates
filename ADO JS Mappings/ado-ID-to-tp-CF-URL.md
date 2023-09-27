Mapping of TP URL CF to ADO ID


### From TP to ADO

```js
const workSharingService = context.getService('workSharing/v2')
const jiraTool = args.sourceTool;
const tpTool = args.targetTool.id
const jiraApi = workSharingService.getProxy(jiraTool);
const issueId = args.sourceEntity.sourceId;
const fieldId = args.sourceField.id;

//put Azure DevOps Organization here: 
const azureOrganizationName = 'ADO_ORGANIZATION_FROM_PROFILE'

await jiraApi.postAsync(`api/v1/${args.sourceEntity.entityType}/${args.sourceEntity.sourceId}`, {
   headers: {
       'Content-Type': 'application/json'
   },
   body: {
       [fieldId]: {
           label: `${args.targetEntity.sourceId}`,
           url: `https://dev.azure.com/${azureOrganizationName}/_workitems/edit/${args.targetEntity.sourceId}`
       }
   }
})
```


### ADO >> TP 

```js
const azureOrganizationName = 'ADO_ORGANIZATION_FROM_PROFILE'

return {
  kind: 'Value',
  value: {
    label:`${args.sourceEntity.sourceId}`,
    url:`https://dev.azure.com/${azureOrganizationName}/_workitems/edit/${args.sourceEntity.sourceId}`
  }
}
```


### COMPARATOR

```js
const {sourceFieldValue, targetFieldValue} = args;
// const url = sourceFieldValue.toolValue && sourceFieldValue.toolValue.URL;
// return (url && url.split('/').pop()) === (targetFieldValue.toolValue && targetFieldValue.toolValue.toString())

const url = sourceFieldValue.toolValue && sourceFieldValue.toolValue.Label;
return (url) === (targetFieldValue.toolValue && targetFieldValue.toolValue.toString())
```
