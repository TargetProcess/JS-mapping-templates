You can use this mapping to transform an entity state in Targetprocess to a status in Jira and in the reverse direction.

Transformation from Targetprocess to Jira:

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

Transformation from Jira to Targetprocess:

```js
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);

const assignable = await tpApi.getAsync(
  `api/v2/${args.targetEntity.entityType}/${args.targetEntity.sourceId}?select={id,name,entityState.workflow.entityStates.select({id,name,isInitial,isPlanned,isFinal}) as possibleStates, state:entityState.name}`
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

const item = assignable.items[0];

const { state } = item;

const transitions = new Map(
  item.possibleStates.map(({ id, name, isInitial, isFinal, isPlanned }) => [
    name.toUpperCase(),
    {
      sourceId: id.toString(),
      name,
      isInitial,
      isFinal,
      isPlanned,
    },
  ])
);

const statusToEntityState = [
  ["Backlog", "Open"],
  ["Planned", "Planned"],
  ["In Progress", "In Progress"],
  ["Coded", "In Progress"],
  ["In Testing", "In Progress"],
  ["Done", "Done"],
];

const stateToStatusMap = new Map(
  statusToEntityState.map((mapping) => [
    mapping[1].toUpperCase(),
    mapping[0].toUpperCase(),
  ])
);
const statusToEntityStateMap = new Map(
  statusToEntityState.map((mapping) => [
    mapping[0].toUpperCase(),
    transitions.get(mapping[1].toUpperCase()),
  ])
);

const status = (args.value.changed.name || "").toUpperCase();

if (stateToStatusMap.get(state.toUpperCase()) === status) {
  console.warn(`Entity in the mapped state.`);
  return;
}

const destState = statusToEntityStateMap.get(status);

if (!destState) {
  console.warn(`Faield to get target State for Jira Status: "${status}" `);
  return;
}

const result = destState
  ? {
      kind: "Value",
      value: destState,
    }
  : undefined;

return result;
```
