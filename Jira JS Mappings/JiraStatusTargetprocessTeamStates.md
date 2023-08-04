### 1. Transformation TeamState > Status (Targetprocess > Jira)

```js
const targetProcessApi = context.getService("targetprocess/api/v2");
const teamAssignments = args.value.changed;
const teamAssignment = teamAssignments[0];
const restType = args.sourceEntity.entityType;
const resId = args.sourceEntity.sourceId;
let teamStateName = "";

const [live] = await targetProcessApi.queryAsync(`${restType}`, {
  select: `live`,
  where: `id==${resId}`,
});

const entityStateToStatusMap = new Map(
  [
    ["Done", "In Progress"],
    ["Cancelled", "In Progress"],
  ].map((mapping) => [mapping[0].toUpperCase(), mapping[1]])
);

if (teamAssignment.EntityState) {
  teamStateName = teamAssignment.EntityState.Name;
}

const targetStatus = entityStateToStatusMap.get(
  (teamStateName || "").toUpperCase()
);
if (!targetStatus) {
  return undefined;
}

if (
  (teamStateName === "Done" && live) ||
  (teamStateName === "Cancelled" && !live)
) {
  return {
    kind: "Value",
    value: targetStatus,
  };
}
```

## 2. Transformation Jira Status >> Targetprocess TeamState

```js
const workSharing = context.getService("workSharing/v2");
const api = context.getService("targetprocess/api/v2");
const tpapi = workSharing.getProxy(args.targetTool);
const targetType = args.targetEntity.entityType;
const targetId = args.targetEntity.sourceId;
console.log("State " + JSON.stringify(args.value.changed));
if (args.value.changed) {
  const jiraState = (args.value.changed.name || "").toUpperCase();
  const [teamAssignments] = await api.queryAsync(targetType, {
    where: `id==${targetId}`,
    select: `{AssignedTeams.Select({id:id, teamId:Team.id, project:assignable.project.id}) as assignedTeams}`,
  });
  if (!(teamAssignments && teamAssignments.assignedTeams.length)) {
    return undefined;
  }
  const teamIds = teamAssignments.assignedTeams.map((v) => v.teamId);
  const teamstateIds = await api.queryAsync("EntityStates", {
    where: `workflow.teamprojects.count(team.id in ${JSON.stringify(
      teamIds
    )} and project.id==${
      teamAssignments.assignedTeams[0].project
    }) > 0 and workflow.entitytype.name = '${targetType}'`,
    select: `{id, name, workflow.teamprojects.Where(Team.id in ${JSON.stringify(
      teamIds
    )} and project.id==${
      teamAssignments.assignedTeams[0].project
    }).select(Team.id)}`,
  });
  //Possible TeamStates
  const transitions = new Map(
    teamstateIds.map(({ id, name, teamProjects }) => [
      name.toUpperCase(),
      {
        id: id.toString(),
        teamProjects,
      },
    ])
  );
  //State mapping
  //[Jira Status, Targetprocess TeamState]
  //['Status1', 'TeamState1'],['Status2','TeamState2']
  const statusToEntityStateMap = new Map(
    [["Waiting for development", "Backlog"]].map((mapping) => [
      mapping[0].toUpperCase(),
      transitions.get(mapping[1].toUpperCase()),
    ])
  );
  if (statusToEntityStateMap.has(jiraState)) {
    const tpStatus = statusToEntityStateMap.get(jiraState);
    const [teamAssignment] = teamAssignments.assignedTeams.filter((v) =>
      tpStatus.teamProjects.some((s) => s === v.teamId)
    );

    if (teamAssignment) {
      console.log("TPStatus ID " + tpStatus.id);
      return {
        kind: "Value",
        value: [
          {
            team: { id: teamAssignment.teamId },
            entityState: { id: tpStatus.id },
          },
        ],
      };
    } else {
      return [];
    }
  }
}
```
