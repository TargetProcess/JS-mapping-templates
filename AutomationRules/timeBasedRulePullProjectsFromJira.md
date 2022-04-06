### Automation can be used to pull projects from Jira and create ExD entities in Targetprocess.

```js
const api = context.getService("targetprocess/api/v2");
const jiraKeyCustomFieldName = 'Jira Project Key'
const targetTool = { id: "aebcb451-98cf-4c48-9b28-aecd14eb4578", type: "Jira" };
const jiraApi = context.getService("workSharing/v2").getProxy(targetTool);

//Fetch Jira projects
const jiraProjects = await jiraApi.getAsync(`rest/api/latest/project?expand=description`)

if (jiraProjects && jiraProjects.length) {

  //Fetch JiraWorkspaces
  const tpJiraWorkspaces = await api.queryAsync('JiraWorkspace', {
    select: `{name:name, key:CustomValues.Text('${jiraKeyCustomFieldName}')}`,
    result: "it"
  })

  const jiraKeyWorkspacemapping = new Map(
    Object(tpJiraWorkspaces).map(({ name, key }) => [
      key,
      name,
    ]));

  return jiraProjects.filter(v => !jiraKeyWorkspacemapping.get(v.key)).map(project => {
    return {
      command: 'targetprocess:createResource',
      payload: {
        resourceType: 'JiraWorkspace',
        fields: {
          name: project.name,
          Description: project.description || null,
          [jiraKeyCustomFieldName]: project.key
        }
      }
    }
  })

} else {
  return []

}

```

targetTool id/Object can be found in the network tab of Chrome DevTools