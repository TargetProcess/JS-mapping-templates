### TP > ADO:

```js
const workSharing = context.getService("workSharing/v2");
const tpApiV2 = context.getService("targetprocess/api/v2");
const { targetEntity, sourceEntity, targetTool } = args;
const adoApi = workSharing.getProxy(targetTool);

const getSourceEntity = async (tpEntity) => {
  return await tpApiV2
    .getByIdAsync(tpEntity.entityType, Number(tpEntity.sourceId), {
      select: `{
        art:agilereleasetrains.Select(name).first(),
        team:assignedteams.Select(team.name).first()}`,
    })
    .then((data) => {
      const { art, team } = data || {};
      return {
        team,
        art,
      };
    })
    .catch((e) => {
      console.error(e);
      return undefined;
    });
};

const getTargetEntity = async (entity) => {
  return await adoApi
    .getAsync(`_apis/wit/workitems/${entity.sourceId}?api-version=6.0`)
    .catch((e) => {
      console.log(e);
      return undefined;
    });
};

const getRoot = (adoEntity) => {
  return adoEntity?.fields["System.TeamProject"];
};

const getAreaPath = async (root, area) => {
  const res = await adoApi
    .getAsync(
      `${root}/_apis/wit/classificationnodes/areas/${area}?api-version=6.0`
    )
    .then((data) => {
      if (data) {
        return true;
      } else return false;
    })
    .catch((e) => {
      console.warn("Failed to get Area Path: ", e);
      return false;
    });
  return res;
};

const [targetItem, sourceItem] = await Promise.all([
  getTargetEntity(targetEntity),
  getSourceEntity(sourceEntity),
]);

const rootNode = getRoot(targetItem);

if (!rootNode) {
  console.error(`Failed to get root node`);
  return undefined;
}

const { art, team } = Object(sourceItem) || {};

const generateAreaPath = (...nodes) => {
  const adoNodes = [];
  for (let i in nodes) {
    if (nodes[i] !== undefined) {
      adoNodes.push(nodes[i]);
    } else break;
  }
  return adoNodes;
};

const validatePath = async (root, adoNodes = []) => {
  if (adoNodes && adoNodes.length) {
    const areaPath = `${adoNodes.join("\\")}`;
    const isAreaPath = await getAreaPath(root, areaPath);
    if (isAreaPath) {
      return `${rootNode}\\${areaPath}`;
    } else {
      console.warn(`Area Path "${areaPath}" doesn't exist in ADO`);
      return await validatePath(root, adoNodes.slice(0, -1));
    }
  }
  return root;
};

const area = await validatePath(rootNode, generateAreaPath(art, team));

return {
  kind: "Value",
  value: area,
};
```

### ADO > TP:

```js
const CREATE_MISSING_TEAM = true;

const areaPath = args.value.changed;
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const { targetEntity } = args;

const [root, adoArt, team] = areaPath ? areaPath.split("\\") : [];
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
      where: `name=="${name}"`,
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
      const tpArt = await getARTbyName(adoArt);
      tpTeam = await createTeam(team, tpArt);
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

### Comporator:

```js
const comparisonModes = {
  OneToOne: "OneToOne",
  Contains: "Contains",
};
const compareMode = comparisonModes.Contains;
const tpApiV2 = context.getService("targetprocess/api/v2");
const [rootNode = null, artNode = null, teamNode = null] = args.targetFieldValue
  ? args.targetFieldValue.toolValue.split("\\")
  : [];
const sourceAssignmentsArray = Array.isArray(args.sourceFieldValue.toolValue)
  ? args.sourceFieldValue.toolValue
  : [];

if (
  compareMode === comparisonModes.OneToOne &&
  sourceAssignmentsArray.length > 1
) {
  console.log(
    `[Valid: false] Multiple source team assignments for comparison mode: OneToOne`
  );
  return false;
}

if (teamNode === null) {
  return sourceAssignmentsArray.length === 0;
}

if (sourceAssignmentsArray.length === 0) {
  return false;
}

const result = await tpApiV2.queryAsync("TeamAssignment", {
  select: `{id}`,
  where: `(id in ${JSON.stringify(
    sourceAssignmentsArray.map((x) => x.id)
  )} and team.name = '${teamNode}')`,
});

if (result.length === 1) {
  return true;
}

return false;
```
