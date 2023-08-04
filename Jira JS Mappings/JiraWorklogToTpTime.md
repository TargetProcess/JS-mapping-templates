Transforms Jira issue worklog to Targetprocess time entity. When worlkog changes delete all the time records from the target entity and creates new one with target spent/remaining from Jira.

Transformation from Jira to Targetprocess:

```js
if (
  !args.value.changed ||
  (args.value.changed && Object.keys(args.value.changed).length === 0)
) {
  return;
}

const proxySvc = context.getService("workSharing/v2");
const tpApi = context.getService("targetprocess/api/v2");
const proxy = proxySvc.getProxy(args.targetTool);
const timeResponse = await tpApi.queryAsync("time", {
  where: `assignable.id = ${args.targetEntity.sourceId}`,
});
const tpEntityId = parseInt(args.targetEntity.sourceId);
const entityResponse = await tpApi.getByIdAsync(
  args.targetEntity.entityType,
  tpEntityId,
  {
    select: "{{owner.id,owner.kind} as owner, project}",
  }
);
const { owner, project } = entityResponse;
if (project) {
  const timeRecordOwnerId =
    owner && owner.kind.toLowerCase() === "user" ? owner.id : 1; // set any default user id which will be used as time records onwer here
  const deleteCommands = timeResponse.map((tr) => ({
    name: "DeleteResource",
    target: {
      Id: tr.id,
      ResourceType: "Time",
    },
  }));
  // developer
  const role = {
    id: 1,
  };
  const createCommand = {
    name: "createResource",
    resource: {
      resourceType: "Time",
      assignable: { id: tpEntityId },
      project: { id: project.id },
      user: { id: timeRecordOwnerId },
      description: "Created by ILI integration",
      spent: args.value.changed.timeSpentSeconds / 3600,
      remain: args.value.changed.remainingEstimateSeconds / 3600,
      role,
    },
  };
  const batchCommand = {
    name: "batch",
    commands: [...deleteCommands, createCommand],
  };
  await proxy.postAsync("/api/commands/v1/execute", { body: batchCommand });
}
```

Cloud Version:

```js
if (
  !args.value.changed ||
  (args.value.changed && Object.keys(args.value.changed).length === 0)
) {
  return;
}
const proxySvc = context.getService("workSharing/v2");
const tpApi = context.getService("targetprocess/api/v2");
const proxy = proxySvc.getProxy(args.targetTool);
const timeResponse = await tpApi.queryAsync("time", {
  where: `assignable.id = ${args.targetEntity.sourceId}`,
});
const tpEntityId = parseInt(args.targetEntity.sourceId);
const entityResponse = await tpApi.getByIdAsync(
  args.targetEntity.entityType,
  tpEntityId,
  {
    select: "{{owner.id,owner.kind} as owner, project}",
  }
);
const { owner, project } = entityResponse;
if (project) {
  const timeRecordOwnerId =
    owner && owner.kind.toLowerCase() === "user" ? owner.id : 1; // set any default user id which will be used as time records onwer here
  const deleteCommands = timeResponse.map((tr) => ({
    name: "DeleteResource",
    target: {
      Id: tr.id,
      ResourceType: "Time",
    },
  }));
  // developer
  const role = {
    id: 1,
  };

  const timeSpentSeconds = args.value.changed.timeSpentSeconds ?? 0;
  const timeremainingEstimateSeconds =
    args.value.changed.remainingEstimateSeconds ?? 0;

  const createCommand = {
    name: "createResource",
    resource: {
      resourceType: "Time",
      assignable: { id: tpEntityId },
      project: { id: project.id },
      user: { id: timeRecordOwnerId },
      description: "Created by ILI integration",
      spent: timeSpentSeconds / 3600,
      remain: timeremainingEstimateSeconds / 3600,
      role,
    },
  };
  const batchCommand = {
    name: "batch",
    commands: [...deleteCommands, createCommand],
  };
  await proxy
    .postAsync("/api/commands/v1/execute", { body: batchCommand })
    .catch((e) => {
      console.log(e);
    });
}
```
