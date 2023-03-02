You can use this mapping to transform Targetprocess assignments (collection of QA, Dev assignments) to String

Transformation from Targetprocess to Jira:

```js
const targetProcessApi = context.getService("targetprocess/api/v2")
const roleAssignment = args.value.changed[0] || args.value.original[0]

// return empty string if there is no assignments in event
if (!roleAssignment) {
    return [{
        kind: 'Value',
        value: ""
    }]
}

// fetch all assignments for entity
const response = await targetProcessApi.queryAsync(args.sourceEntity.entityType, {
    select: `{assignments.where(role.id==${roleAssignment.role.id}).select({generalUser})}`,
    where: `id==${args.sourceEntity.sourceId}`
})
const assignments = response[0].assignments

// transform collection of assignments to string
const value =  assignments
    .map(assignment => {
        const fullName = [assignment.generalUser.firstName, assignment.generalUser.lastName]
        return fullName.join(' ')
    })
    .join(', ')

return [{
    kind: 'Value',
    value
}]

```

No Transformation from Jira to Targetprocess