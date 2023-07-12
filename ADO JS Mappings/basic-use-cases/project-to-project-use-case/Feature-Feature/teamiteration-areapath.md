### ADO > TP:

```js
const areaPath = args.value.changed;
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const { targetEntity } = args;

const [root, art, team] = areaPath ? areaPath.split("\\") : [];
const CREATE_MISSING_TEAM = false;
const fieldId = args.targetField.id;

const getTeambyName = async (name) => {
  const [team] = await apiV2
    .queryAsync("team", {
      select: `id`,
      where: `name=="${name}"`,
    })
    .catch((e) => {
      console.log(e);
      return [];
    });
  return team;
};

const getTeamAssignments = async (targetEntity) => {
  return await apiV2.queryAsync("TeamAssignment", {
    select: `team.id`,
    where: `assignable.id==${targetEntity.sourceId}`,
  });
};

const getARTbyName = async (name) => {
  const [art] = await apiV2
    .queryAsync("AgileReleaseTrain", {
      select: `{id:id}`,
      where: `azdoproject=="${name}" or name=="${name}"`,
    })
    .catch((e) => {
      console.error(e);
      return [];
    });
  return art;
};

const createTeam = async (name, artId) => {
  return tpApi
    .postAsync("api/v1/Team?format=json", {
      body: {
        Name: name,
        AgileReleaseTrain: artId || null,
      },
    })
    .then((data) => {
      return data ? data.Id : null;
    })
    .catch((e) => {
      console.log(e);
      return undefined;
    });
};

let tpTeam = null;
if (team) {
  tpTeam = await getTeambyName(team);

  if (!tpTeam && team) {
    console.warn(`Failed to find Team by Name: "${team}" in Targetprocess`);
    if (CREATE_MISSING_TEAM) {
      console.warn(`Creating new Team... ==> "${team}"`);
      const artId = await getARTbyName(root);
      tpTeam = await createTeam(team, artId);
    }
  }
}

const assignedTeams = await getTeamAssignments(targetEntity);
const teams =
  assignedTeams.length > 1
    ? [...new Set([...assignedTeams, tpTeam])]
    : [tpTeam];

return {
  kind: "Value",
  value: teams.filter((v) => !!v).map((team) => ({ id: team })),
};
```

### Comparator:

```js
return true;
```
