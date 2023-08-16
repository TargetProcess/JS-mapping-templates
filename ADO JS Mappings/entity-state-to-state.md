You can use this mapping to transform an entity state in Targetprocess to a state in ADO and in the reverse direction.

Transformation from Targetprocess to ADO:

```js
const workSharing = context.getService("workSharing/v2");

// mapping configuration:
const entityStateToStatusMap = new Map(
  [
    ["Open", "Backlog"],
    ["Planned", "Planned"],
    ["In Progress", "In Progress"],
    ["Coded", "In Progress"],
    ["In Testing", "In Progress"],
    ["Done", "Done"],
  ].map((mapping) => [mapping[0].toUpperCase(), mapping[1]])
);
const targetStatus = entityStateToStatusMap.get(
  (args.value.changed.Name || "").toUpperCase()
);
if (!targetStatus) {
  throw new Error("Failed to map target status");
}

return {
  kind: "Value",
  value: targetStatus,
};
```

Transformation from ADO to Targetprocess:

```js
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);

const assignable = await tpApi.getAsync(
  `api/v2/${args.targetEntity.entityType}/${args.targetEntity.sourceId}?select={id,name,entityState.workflow.entityStates.select({id,name,isInitial,isPlanned,isFinal}) as possibleStates}`
);
if (
  !(
    assignable &&
    assignable.items &&
    assignable.items[0] &&
    assignable.items[0].possibleStates
  )
) {
  return undefined;
}

const transitions = new Map(
  assignable.items[0].possibleStates.map(
    ({ id, name, isInitial, isFinal, isPlanned }) => [
      name.toUpperCase(),
      {
        sourceId: id.toString(),
        name,
        isInitial,
        isFinal,
        isPlanned,
      },
    ]
  )
);

// mapping configuration:
const statusToEntityStateMap = new Map(
  [
    ["To Do", "Planned"],
    ["In Progress", "In Progress"],
    ["Done", "Done"],
  ].map((mapping) => [
    mapping[0].toUpperCase(),
    transitions.get(mapping[1].toUpperCase()),
  ])
);

const status = (args.value.changed || "").toUpperCase();
const result = statusToEntityStateMap.has(status)
  ? {
      kind: "Value",
      value: statusToEntityStateMap.get(status),
    }
  : undefined;

return result;
```
