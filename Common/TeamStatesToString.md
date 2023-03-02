You can use this mapping to transform Targetprocess team states to String

Transformation from Targetprocess to Jira:

```js
const teamAssignments = args.value.changed

if (teamAssignments && teamAssignments.length) {
    const teamAssignment = teamAssignments[0]
    let teamStateName = ''
    if (teamAssignment.EntityState) {
        teamStateName = teamAssignment.EntityState.Name
    } else {
        const tpApi = context.getService('targetprocess/api/v2')

        const loadedTeamAssignment = await tpApi.getByIdAsync('TeamAssignment', teamAssignment.Id, {
            select: '{entityState}'
        })

        if (loadedTeamAssignment && loadedTeamAssignment.entityState) {
            teamStateName = loadedTeamAssignment.entityState.name
        }
    }

    return {
        kind: 'Value',
        value: teamStateName
    }
}

```

No Transformation from Jira to Targetprocess
