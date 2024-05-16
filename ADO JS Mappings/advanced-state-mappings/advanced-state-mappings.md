### Advanced state mapping based on ATP Project.

### ATP > ADO

```js
const {
  targetEntity,
  targetTool,
  sourceEntity,
  value: { changed: tpState },
  sourceEntityModification: { changed = {} },
} = args;
const apiV2 = context.getService("targetprocess/api/v2");

const { Name: tpStateName } = tpState;

const portfolio = changed["Project"]?.Name;

const PORTFOLIO_DEVOPS = "DevOps";
const PORTFOLIO_B = "Portfolio B";
const PORTFOLIO_C = "Portoflio C";

const MAPPING = {
  [PORTFOLIO_DEVOPS]: [
    ["Release", "Closed"],
    ["Analyzing", "Analyzing"],
    ["Ready for Development", "Ready for Development"],
    ["In Development", "In Development"],
    ["Development Done", "In Development"],
    ["Ready for QA", "In Development"],
    ["In QA", "In Development"],
    ["Blocked", "In Development"],
    ["Awaiting Feedback", "In Development"],
    ["QA passed", "In Development"],
    ["Ready for Preprod", "In Development"],
    ["Preprod Release", "Development Done"],
    ["Preprod Testing", "Development Done"],
    ["Ready for Release", "Development Done"],
    ["Production", "Completed"],
  ],
  [PORTFOLIO_B]: [
    ["To Do", "New"],
    ["Design", "Setting Up"],
    ["Ready for Development", "Ready for Development"],
    ["In Development", "In Development"],
    ["Development Done", "In Development"],
    ["Ready for QA", "In Development"],
    ["In QA", "In Development"],
    ["Blocked", "In Development"],
    ["Awaiting Feedback", "In Development"],
    ["QA passed", "In Development"],
    ["Ready for Preprod", "In Development"],
    ["Preprod Release", "Development Done"],
    ["Preprod Testing", "Development Done"],
    ["Ready for Release", "Development Done"],
    ["Production", "Completed"],
  ],
  [PORTFOLIO_C]: [
    ["To Do", "New"],
    ["Design", "Setting Up"],
    ["Ready for Development", "Ready for Development"],
    ["In Development", "In Development"],
    ["Development Done", "In Development"],
    ["Ready for QA", "In Development"],
    ["In QA", "In Development"],
    ["Blocked", "In Development"],
    ["Awaiting Feedback", "In Development"],
    ["QA passed", "In Development"],
    ["Ready for Preprod", "In Development"],
    ["Preprod Release", "Development Done"],
    ["Preprod Testing", "Development Done"],
    ["Ready for Release", "Development Done"],
    ["Production", "Completed"],
  ],
};

if (!portfolio) {
  console.warn(
    `Portofolio is not available for the entity "${JSON.stringify(
      sourceEntity
    )}"`
  );
  return;
}

const entityStateToStateMapping = MAPPING[portfolio]
  ? new Map(
      MAPPING[portfolio].map((mapping) => [
        mapping[0].toUpperCase(),
        mapping[1],
      ])
    )
  : undefined;

if (!entityStateToStateMapping) {
  console.warn(`Failed to find the mapping for the portfolio "${portfolio}"`);
  return;
}

const targetState = entityStateToStateMapping.get(tpStateName.toUpperCase());

if (!targetState) {
  console.warn(
    `Cannot find ADO targetstate for ATP State: "${tpStateName}" for Portfolio "${portfolio}"`
  );
  return;
}

return {
  kind: "Value",
  value: targetState,
};
```

### ADO > ATP

```js
const {
  targetEntity,
  targetTool,
  sourceEntity,
  value: { changed: adostate },
} = args;
const apiV2 = context.getService("targetprocess/api/v2");

const PORTFOLIO_DEVOPS = "DevOps";
const PORTFOLIO_B = "Portfolio B";
const PORTFOLIO_C = "Portoflio C";

const MAPPING = {
  [PORTFOLIO_DEVOPS]: [
    ["Closed", "Release"],
    ["Design", "Setting Up"],
    ["Ready for Development", "Ready for Development"],
    ["In Development", "In Development"],
    ["Development Done", "In Development"],
    ["Ready for QA", "In Development"],
    ["In QA", "In Development"],
    ["Blocked", "In Development"],
    ["Awaiting Feedback", "In Development"],
    ["QA passed", "In Development"],
    ["Ready for Preprod", "In Development"],
    ["Preprod Release", "Development Done"],
    ["Preprod Testing", "Development Done"],
    ["Ready for Release", "Development Done"],
    ["Production", "Completed"],
  ],
  [PORTFOLIO_B]: [
    ["To Do", "New"],
    ["Design", "Setting Up"],
    ["Ready for Development", "Ready for Development"],
    ["In Development", "In Development"],
    ["Development Done", "In Development"],
    ["Ready for QA", "In Development"],
    ["In QA", "In Development"],
    ["Blocked", "In Development"],
    ["Awaiting Feedback", "In Development"],
    ["QA passed", "In Development"],
    ["Ready for Preprod", "In Development"],
    ["Preprod Release", "Development Done"],
    ["Preprod Testing", "Development Done"],
    ["Ready for Release", "Development Done"],
    ["Production", "Completed"],
  ],
  [PORTFOLIO_C]: [
    ["To Do", "New"],
    ["Design", "Setting Up"],
    ["Ready for Development", "Ready for Development"],
    ["In Development", "In Development"],
    ["Development Done", "In Development"],
    ["Ready for QA", "In Development"],
    ["In QA", "In Development"],
    ["Blocked", "In Development"],
    ["Awaiting Feedback", "In Development"],
    ["QA passed", "In Development"],
    ["Ready for Preprod", "In Development"],
    ["Preprod Release", "Development Done"],
    ["Preprod Testing", "Development Done"],
    ["Ready for Release", "Development Done"],
    ["Production", "Completed"],
  ],
};

const { portfolio, states } = await apiV2.getByIdAsync(
  targetEntity.entityType,
  Number(targetEntity.sourceId),
  {
    select: `{portfolio:project,entityState.workflow.entityStates.select({id,name,isInitial,isPlanned,isFinal}) as states}`,
  }
);

if (!portfolio) {
  console.warn(
    `Portofolio is not available for the entity "${JSON.stringify(
      targetEntity
    )}"`
  );
  return;
}

const transitions = new Map(
  states.map(({ id, name, isInitial, isFinal, isPlanned }) => [
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

const entityStateToStateMapping = MAPPING[portfolio.name]
  ? new Map(
      MAPPING[portfolio.name].map((mapping) => [
        mapping[0].toUpperCase(),
        transitions.get(mapping[1].toUpperCase()),
      ])
    )
  : undefined;

if (!entityStateToStateMapping) {
  console.warn(
    `Failed to find the mapping for the portfolio "${portfolio.name}"`
  );
  return;
}

const mappedState = entityStateToStateMapping.has(adostate.toUpperCase());

if (!mappedState) {
  console.warn(
    `ADO State "${adostate}" for portfolilo "${portfolio.name}" is not mapped.`
  );
  return;
}

const targetState = entityStateToStateMapping.get(adostate.toUpperCase());

if (!targetState) {
  console.warn(
    `Cannot find ATP targetstate for ADO State: "${adostate}" for Portfolio "${portfolio.name}"`
  );
  return;
}

return {
  kind: "Value",
  value: targetState,
};
```

### Comparator

```js
const {
  targetEntityState,
  sourceEntityState,
  sourceFieldValue: { toolStringValue: tpstate },
  targetFieldValue: { toolStringValue: adostate },
  sourceTool,
  sourceEntity,
} = args;
const sync = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");

const { portfolio } = await apiV2.getByIdAsync(
  sourceEntity.entityType,
  Number(sourceEntity.sourceId),
  {
    select: `{portfolio:project.name}`,
  }
);

const PORTFOLIO_DEVOPS = "DevOps";
const PORTFOLIO_B = "Portfolio B";
const PORTFOLIO_C = "Portoflio C";

const MAPPING = {
  [PORTFOLIO_DEVOPS]: [
    ["Release", "Closed"],
    ["Analyzing", "Analyzing"],
    ["Ready for Development", "Ready for Development"],
    ["In Development", "In Development"],
    ["Development Done", "In Development"],
    ["Ready for QA", "In Development"],
    ["In QA", "In Development"],
    ["Blocked", "In Development"],
    ["Awaiting Feedback", "In Development"],
    ["QA passed", "In Development"],
    ["Ready for Preprod", "In Development"],
    ["Preprod Release", "Development Done"],
    ["Preprod Testing", "Development Done"],
    ["Ready for Release", "Development Done"],
    ["Production", "Completed"],
  ],
  [PORTFOLIO_B]: [
    ["To Do", "New"],
    ["Design", "Setting Up"],
    ["Ready for Development", "Ready for Development"],
    ["In Development", "In Development"],
    ["Development Done", "In Development"],
    ["Ready for QA", "In Development"],
    ["In QA", "In Development"],
    ["Blocked", "In Development"],
    ["Awaiting Feedback", "In Development"],
    ["QA passed", "In Development"],
    ["Ready for Preprod", "In Development"],
    ["Preprod Release", "Development Done"],
    ["Preprod Testing", "Development Done"],
    ["Ready for Release", "Development Done"],
    ["Production", "Completed"],
  ],
  [PORTFOLIO_C]: [
    ["To Do", "New"],
    ["Design", "Setting Up"],
    ["Ready for Development", "Ready for Development"],
    ["In Development", "In Development"],
    ["Development Done", "In Development"],
    ["Ready for QA", "In Development"],
    ["In QA", "In Development"],
    ["Blocked", "In Development"],
    ["Awaiting Feedback", "In Development"],
    ["QA passed", "In Development"],
    ["Ready for Preprod", "In Development"],
    ["Preprod Release", "Development Done"],
    ["Preprod Testing", "Development Done"],
    ["Ready for Release", "Development Done"],
    ["Production", "Completed"],
  ],
};

const entityStateToStateMapping = MAPPING[portfolio]
  ? new Map(
      MAPPING[portfolio].map((mapping) => [
        mapping[0].toUpperCase(),
        mapping[1],
      ])
    )
  : undefined;

if (!entityStateToStateMapping) {
  //do not show conflict if mapping is missing for portfolio.
  return true;
}
const targetState = entityStateToStateMapping.get(tpstate.toUpperCase());
return targetState === adostate;
```
