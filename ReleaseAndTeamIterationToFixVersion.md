### Mapping of Release to Fix Versions

**Transformation from TargetProcess To Jira**

```js
const newRelease = args.value.changed
const oldRelease = args.value.original
const workSharing = context.getService("workSharing/v2")
const apiV2 = context.getService("targetprocess/api/v2")
const jiraApi = workSharing.getProxy(args.targetTool)
const tpApi = workSharing.getProxy(args.sourceTool)
const http = context.getService("http")
const tpEntity = args.sourceEntity
const jiraProjectKey = args.targetEntity.sourceId.split('-')[0]
// fetch all the available versions for project
const versions = await jiraApi.getAsync(`rest/api/latest/project/${jiraProjectKey}/versions`)
const [{teamIteration}] = await apiV2.queryAsync(tpEntity.entityType, {
    select: '{teamIteration}',
    where: `id==${tpEntity.sourceId}`
})

if (newRelease && !teamIteration) {
    // find version {releaseName}.candidate
    const version = versions.find(v => {
        const name = v.name.toLowerCase()
        return newRelease.Name.toLowerCase().includes(name.replace('.candidate','')) && name.includes('candidate')
    })
    if (version) {
        return {
            kind: 'Value',
            value: [version]
        }
    }
} else if (!newRelease && !teamIteration) {
    return {
        kind: 'Value',
        value: null
    }
}
```

**Transformation from Jira To TargetProcess**

```js
const workSharing = context.getService("workSharing/v2")
const jiraApi = workSharing.getProxy(args.targetTool)
const apiv2 = context.getService("targetprocess/api/v2")

const lastVersion = args.value.changed[args.value.changed.length - 1]

if (!lastVersion) {
    // unassign release
    return {
        kind: 'Value',
        value: null
    }
}

if (lastVersion.name.toLowerCase().includes('candidate')) {
    const releaseName = lastVersion.name.split('.candidate')[0]
    const [release] = await apiv2.queryAsync('release', {
        where: `name.contains("${releaseName}")`
    })
    if (release) {
        return {
            kind: 'Value',
            value: release
        }
    }
    // assign tp entity to proper release
}
```

### Mapping of TeamIteration to Fix Versions
​
**Transformation from TP to Jira:**
​
```js
const newTeamIteration = args.value.changed
const oldTeamIteration = args.value.original
const workSharing = context.getService("workSharing/v2")
const apiV2 = context.getService("targetprocess/api/v2")
const jiraApi = workSharing.getProxy(args.targetTool)
const tpApi = workSharing.getProxy(args.sourceTool)
const http = context.getService("http")
const tpEntity = args.sourceEntity
const jiraProjectKey = args.targetEntity.sourceId.split('-')[0]
// fetch all the available versions for project
const versions = await jiraApi.getAsync(`rest/api/latest/project/${jiraProjectKey}/versions`)
const [{ release }] = await apiV2.queryAsync(tpEntity.entityType, {
    select: '{release}',
    where: `id==${tpEntity.sourceId}`
})
if (newTeamIteration) {
    const version = versions.find(v =>
        newTeamIteration.Name.toLowerCase().includes(v.name.toLowerCase())
    )
    if (version) {
        return {
            kind: 'Value',
            value: [version]
        }
    }
} else if (!newTeamIteration && release) {
    // find version {releaseName}.candidate
    const version = versions.find(v => {
        const name = v.name.toLowerCase()
        return release.name.toLowerCase().includes(name.replace('.candidate','')) && name.includes('candidate')
    })
    if (version) {
        return {
            kind: 'Value',
            value: [version]
        }
    }
}
```

**Transformation form Jira to TP:**

```js
const workSharing = context.getService("workSharing/v2")
const jiraApi = workSharing.getProxy(args.targetTool)
const apiv2 = context.getService("targetprocess/api/v2")

const tpEntity = args.targetEntity
const lastVersion = args.value.changed[args.value.changed.length - 1]

if (!lastVersion) {
    // unassign teamIteration
    return {
        kind: 'Value',
        value: null
    }
}

const [{ team }] = await apiv2.queryAsync(tpEntity.entityType, {
    select: '{team}',
    where: `id==${tpEntity.sourceId}`
})

if (lastVersion.name.toLowerCase().includes('candidate')) {
    return {
        kind: 'Value',
        value: null
    }
} else {
    const [teamIteration] = await apiv2.queryAsync('teamIteration', {
        where: `name.contains("${lastVersion.name}") && team.id==${team.id}`
    })
    if (teamIteration) {
        return {
            kind: 'Value',
            value: teamIteration
        }
    }
}
```
