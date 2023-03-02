You can use this mapping to transform AssignedTeams in Targetprocess to a multi select in Jira.

Transformation from Targetprocess to Jira(AssingedTems -> Multi DD):
```js
const apiV2 = context.getService('targetprocess/api/v2');
const entityId = args.sourceEntity.sourceId;

const teams = await apiV2.queryAsync('TeamAssignment', {
    select:`Team.Name`,
    where:`assignable.id==${args.sourceEntity.sourceId}`
})
return {
    kind:'Value',
    value: teams
}
```

Transformation from Jira to Targetprocess(Multi DD -> AssignedTeams):
```js
const apiV2 = context.getService('targetprocess/api/v2');
const prevousValue = args.sourceField.meta
const curentValue = args.value.changed;
const workSharing = context.getService("workSharing/v2");
const tpapi = workSharing.getProxy(args.targetTool);

if (curentValue) {
    const teams = await apiV2.queryAsync('Teams', {
        select: '{id,name}',
        where: `Name in ${JSON.stringify(curentValue)}`
    });
    const notFoundTeams = curentValue.filter(name => !teams.some(t => t.name.toLowerCase() === name.toLowerCase()))
    if(notFoundTeams.length){
        console.error(`Can't find following teams: ${notFoundTeams.join(',')}`)
    }

    return {
        kind: 'Value',
        value: teams.map(t => ({id: t.id}))
    }
} 
```