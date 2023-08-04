## Dynamic Mapping From Jira to Targetprocess based on the custom field value in Jira

### Description of the mapping:

TP project is defined from drop-down list on Jira issue (match by name)
Additional filer: Jira issue gets to state "Waiting for development"
If issue is in 'Waiting for development' and Project is selected in drop-down, then card will be pushed automatically to TP to the project with the same name.

```js
const workSharing = context.getService("workSharing/v2");
const jiraApi = workSharing.getProxy(args.sourceTool);
const apiV2 = context.getService("targetprocess/api/v2");
const customFieldName = "Targetprocess Project";
const status = "Waiting for Development";

//helper function to get issues in parallel, n - default value that defines a number of issues fetching in parallel.
async function getIssues(issues, n = 10) {
  const a = [...issues];
  const chunks = new Array(Math.ceil(a.length / n))
    .fill(void 0)
    .map((_) => a.splice(0, n));
  const results = [];
  for (const chunk of chunks) {
    const result = await Promise.all(
      chunk.map(
        async (e) =>
          await jiraApi.getAsync(`rest/api/2/issue/${e.sourceId}?expand=names`)
      )
    );
    results.push(...result);
  }
  return results;
}

const issues = await getIssues(args.entities);

const indexedIssues = new Map(issues.map((v) => [v.key, v]));

//Get TP project names from CF.
const entityProjectNames = args.entities.reduce((acc, entity) => {
  const jiraIssue = indexedIssues.get(entity.sourceId);
  if (jiraIssue) {
    const customFieldId = Object.keys(jiraIssue.names).find(
      (key) => jiraIssue.names[key] === customFieldName
    );
    console.log(customFieldId);
    const jiraFieldValue = jiraIssue.fields[customFieldId];
    const isInStatus =
      jiraIssue.fields.status.name.toUpperCase() === status.toUpperCase();
    jiraFieldValue &&
      isInStatus &&
      acc.push({ entity, projectName: jiraFieldValue.value });
  }
  return acc;
}, []);

if (!entityProjectNames.length) {
  return [];
}

const entityProjects = await apiV2.queryAsync("project", {
  select: `{id, name}`,
  where: `name in ${JSON.stringify([
    ...new Set(entityProjectNames.map((v) => v.projectName)),
  ])}`,
});

//ProjectMapping name,id.
const projectsMapping = new Map(
  entityProjects.map(({ id, name }) => [name.toUpperCase(), id])
);

const cmds = entityProjectNames.reduce((acc, cv) => {
  const prName = (cv.projectName || "").toUpperCase();
  if (projectsMapping.has(prName)) {
    acc.push({
      entity: cv.entity,
      targetScope: {
        kind: "project",
        sourceId: projectsMapping.get(prName).toString(),
      },
    });
    return acc;
  }
}, []);

return cmds;
```
