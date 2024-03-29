Mapping allows to map TP Team to Jira Components matching by name:
- if no component with such name it creates a new component and applies it in JIRA;
- if no team with name as selected component it shows message in CL "Can't find Team with name <componentName>"

## TP -> JIRA

```js
const newTeam = args.value.changed
const oldTeam = args.value.original
const workSharing = context.getService("workSharing/v2")
const jiraApi = workSharing.getProxy(args.targetTool)
const tpApi = workSharing.getProxy(args.sourceTool)
const http = context.getService("http")
const jiraProjectKey = args.targetEntity.sourceId.split('-')[0]
// fetch all the available versions for project
const components = await jiraApi.getAsync(`rest/api/latest/project/${jiraProjectKey.toUpperCase()}/components`)
const createComponentForTeam = async (team) => {
    const response = await jiraApi.postAsync('rest/api/2/component', {
        body: {
            description: team.name,
            name: team.name,
            project: jiraProjectKey
        },
        headers: {
            'Content-Type': 'application/json'
        }
    })
    return response
}
if (newTeam) {
    // find jira version by matching: version.name === team.name
    const version = components.find(v => v.name.toLowerCase() === newTeam.name.toLowerCase())
    if (!version) {
        // not found version in jira project. Creating a new version
        const newVersion = await createComponentForTeam(newTeam)
        return {
            kind: 'Value',
            value: [newVersion]
        }
    } else {
        return {
            kind: 'Value',
            value: [version]
        }
    }
} else {
    // team unassigned for user story => remove all components in jira
    return {
        kind: 'Value',
        value: []
    }
}
```

## JIRA -> TP
```js
const workSharing = context.getService("workSharing/v2")
const jiraApi = workSharing.getProxy(args.targetTool)
const apiv2 = context.getService("targetprocess/api/v2")
// take Jira Component from new values
const jiraComponent = args.value.changed[args.value.changed.length - 1]
console.log("Jira component" + JSON.stringify(jiraComponent))
if (jiraComponent) {
    return {
        kind: 'Value',
        value: jiraComponent.name
    }
} else {
    return {
        kind: 'Value',
        value: null
    }
}
```
