### Transform status category to jira state.

```js
const workSharing = context.getService("workSharing/v2")
const tpApi = workSharing.getProxy(args.targetTool)
const mainStatus = args.value.changed?.statusCategory?.name;

const assignable = await tpApi.getAsync(`api/v2/${args.targetEntity.entityType}/${args.targetEntity.sourceId}?select={id,name,entityState.workflow.entityStates.select({id,name,isInitial,isPlanned,isFinal}) as possibleStates}`)
if (!(assignable && assignable.items && assignable.items[0] && assignable.items[0].possibleStates)) {
    return undefined
}

const transitions = new Map(
    assignable.items[0].possibleStates.map(({ id, name, isInitial, isFinal, isPlanned }) => [
        name.toUpperCase(),
        {
            sourceId: id.toString(),
            name,
            isInitial,
            isFinal,
            isPlanned
        }
    ])
)

const status = (mainStatus || '').toUpperCase();
const tpState = transitions.has(status);

if (!tpState) {
    console.warn(`Faield to find State name in Targetprocess for Jira Status "${status}"`);
    return;
}


return {
        kind: 'Value',
        value: transitions.get(status)
    }

```
