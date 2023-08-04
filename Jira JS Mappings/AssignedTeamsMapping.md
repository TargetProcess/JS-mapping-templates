### From Source tp

```
const apiV2 = context.getService('targetprocess/api/v2');
const entityId = args.sourceEntity.sourceId;
const workSharing = context.getService("workSharing/v2");
const tpApi2 = workSharing.getProxy(args.targetTool);

const teamsSoruce = await apiV2.queryAsync('TeamAssignment', {
    select: `Team.Name`,
    where: `assignable.id==${args.sourceEntity.sourceId}`
})

if (teamsSoruce.length) {
const teamsTarget = await tpApi2.getAsync(`/api/v2/Teams?where=(name in ${JSON.stringify(teamsSoruce)})&select={id:id, name:name}`).then(data => {
    return data.items;
}
).catch(e => {
    console.log(e);
    return undefined;
})

if (teamsTarget) {
    return {
        kind: "Value",
        value: teamsTarget
    }
} else return {
    kind: "Value",
    value: []
} 

} else return {
    kind: "Value",
    value: []
}
```


From Target tp
```
const apiV2 = context.getService('targetprocess/api/v2');
const entityId = args.sourceEntity.sourceId;
const workSharing = context.getService("workSharing/v2");
const tpApi2 = workSharing.getProxy(args.sourceTool);

const teamsSource = await tpApi2.getAsync(`/api/v2/TeamAssignment?where=(assignable.id==${args.sourceEntity.sourceId})&select=(Team.Name)`).then(data => {
    return data.items;
}
).catch(e => {
    console.log(e);
    return undefined;
})

if (teamsSource && teamsSource.length) {

    const teamsTarget = await apiV2.queryAsync('Team', {
        select: `{id:id, name:name}`,
        where: `Name in ${JSON.stringify(teamsSource)}`
    })
    return {
        kind: "Value",
        value: teamsTarget
    }
} else return {
    kind: "Value",
    value: []
}
```
