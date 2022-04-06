### When Feature gets custom field 'Jira project key' set, it's pushed to Jira.

```js
const workSharing = context.getService("workSharing/v2");
const jiraApi = workSharing.getProxy(args.targetTool);
const apiV2 = context.getService("targetprocess/api/v2");

const customFieldName = 'Jira Project Key';
const entityType = 'Feature'
//filter isuse by entityType

const features = args.entities.filter(f => f.entityType.toLowerCase() === entityType.toLowerCase());
if (!features.length) { return [] }

//Fetch JiraProjectKeys for Features
const featuresJiraProjectKeys = await Promise.all(features.map(async e => {
  const [query] = await apiV2.queryAsync(e.entityType, {
    select: `{entity:{sourceId:id, entityType:entityType.name},jpk:customvalues['${customFieldName}']}`,
    where: `id==${e.sourceId}`
  })
  return query;
}
));

if (!featuresJiraProjectKeys.length) { return [] }

//Fetch unique Jira projects asynchronously
const projectIds = await Promise.all([...new Set(featuresJiraProjectKeys.filter(v => !!v && v.jpk)
  .map(issue => issue.jpk))]
  .map(async key => {
    try {
      return await jiraApi.getAsync(`rest/api/2/project/${key.toUpperCase()}`)
    }
    catch (e) {
      console.warn(e);
    }
  }));

//mapping JiraProject KEY:ID
const jiraKeyIdMapping = new Map(
  projectIds.filter(v => !!v)
    .map(project => [
      project.key.toUpperCase(),
      project.id,
    ])
);

const cmds = featuresJiraProjectKeys.reduce((acc, cv) => {
  const prKey = (cv && cv.jpk || '').toUpperCase();
  if (jiraKeyIdMapping.has(prKey)) {
    acc.push(
      {
        entity: { ...cv.entity, sourceId: cv.entity.sourceId.toString() },
        targetScope: { kind: 'project', sourceId: jiraKeyIdMapping.get(prKey).toString() }
      }
    )
  }
  return acc;
}, []);

const emptyJiraKeys = featuresJiraProjectKeys.filter(v=> !v.jpk);
emptyJiraKeys.length && console.warn(`Jira Project Key should be specified for the following Features: ${emptyJiraKeys.map(v=> v.entity.sourceId)}`);

return cmds;
```