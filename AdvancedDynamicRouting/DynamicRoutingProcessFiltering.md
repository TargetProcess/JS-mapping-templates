## Dynamic routing with the filter by process.

Use-case:  
№1 integration profile must work when entity pushed to any project with the "ScrumOne" process  
№2 integration profile must work if we import to all other projects but not "ScrumOne"  

```js
const workSharing = context.getService("workSharing/v2");
const jiraApi = workSharing.getProxy(args.sourceTool);
const apiV2 = context.getService("targetprocess/api/v2");

const customFieldName = 'Targetprocess Project';
const status = 'In Progress';

//Add processes comma separated for filterting 
const fitlerByProcesses = ['ScrumOne']

//helper function to get issues in parallel, n - default value that defines a number of issues fetching in parallel.
async function getIssues(issues, n=10){
const a = [...issues];
    const chunks = new Array(Math.ceil(a.length/n))
    .fill(void 0).map(_ => a.splice(0, n));
     const results = [];
     for (const chunk of chunks) {
      const result = await Promise.all(chunk.map(async e => await jiraApi.getAsync(`rest/api/2/issue/${e.sourceId}?expand=names`)));
      results.push(...result)
    }
      return results
  }

const issues = await getIssues(args.entities);

const indexedIssues = new Map(issues.map(v =>[
    v.key, v
  ]));

//Get TP project names from CF.
const entityProjectNames = args.entities.reduce((acc, entity) => {
    const jiraIssue = indexedIssues.get(entity.sourceId);
    if (jiraIssue) {
    const customFieldId = Object.keys(jiraIssue.names).find(key => jiraIssue.names[key] === customFieldName);
    const jiraFieldValue = jiraIssue.fields[customFieldId]
    const isInStatus = jiraIssue.fields.status.name.toUpperCase() === status.toUpperCase();
    jiraFieldValue && isInStatus && acc.push({entity, projectName:jiraFieldValue.value});
    }
    return acc;
    },[]);

if (!entityProjectNames.length) {return[]}

const entityProjects = await apiV2.queryAsync('project', {
select:`{id, name, process:process.name}`,
where: `name in ${JSON.stringify([...new Set(entityProjectNames.map(v=> v.projectName))])}`
})

//ProjectMapping name,id
const projectsMapping = new Map(
    entityProjects
    .filter(process => fitlerByProcesses.some(s=> s.toUpperCase()===process.process.toUpperCase()))
    .map(({ id, name }) => [
        name.toUpperCase(),
        id,
    ]));

const cmds = entityProjectNames.reduce((acc, cv) => {
    const prName = (cv.projectName || '').toUpperCase();
    if (projectsMapping.has(prName)) {
        acc.push(
            {
                entity: cv.entity,
                targetScope: { kind: 'project', sourceId: projectsMapping.get(prName).toString() }
            }
        )
        return acc;
    }

}, []);

return cmds;
```

For the opposite filtering for e.g take into account all the processes except the process/processes specified in the array, change the following line:
```js
.filter(process => fitlerByProcesses.some(s=> s.toUpperCase()===process.process.toUpperCase()))
```
to
```js
.filter(process => !fitlerByProcesses.some(s=> s.toUpperCase()===process.process.toUpperCase()))
```

