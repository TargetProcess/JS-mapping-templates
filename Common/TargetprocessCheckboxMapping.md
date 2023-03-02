### Set checkbox to true/false based on the process/processes and entity type

if tp target project is ScrumOne and type=='Story', then we must set with the checkbox 'isBug' === True.  
it will be using when dynaminc entity type is implemented.  
Mapping example:  
isBug (CF in Targeporcess)<> Created (native field in Jira)  

```js
const api = context.getService('targetprocess/api/v2');
const workSharing = context.getService("workSharing/v2");
const jiraApi= workSharing.getProxy(args.sourceTool);
const issueType = args.sourceEntity.entityType;

//specify procceses and entity type for which the value should be set to true.
const processes = ['ScrumOne'];
const type = 'Story';

const [[projectProcess], issueTypeName] = await Promise.all([await api.queryAsync("Assignable",{
    select:`Project.Process.Name`,
    where:`id==${args.targetEntity.sourceId}`
}), await jiraApi.getAsync(`rest/api/2/issuetype/${issueType}`)])

if (projectProcess 
&& processes.some(s=> s.toUpperCase()===projectProcess.toUpperCase()) 
&& issueTypeName 
&& (issueTypeName.name || '').toUpperCase()===type.toUpperCase()) {
return {
    kind: 'Value',
    value: true
}
} else return undefined
```