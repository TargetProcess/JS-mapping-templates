Mapping for tp-tp integration map teams by name.

```js
const workSharing = context.getService(`workSharing/v2`);
const sourceTool = args.sourceTool,
  targetTool = args.targetTool;
const sourceItem = args.sourceEntity,
  targetItem = args.targetEntity;
const sourceApi = workSharing.getProxy(sourceTool),
  targetApi = workSharing.getProxy(targetTool);
const CREATE_MISSING_TEAMS = true;

const getTeams = async (item, api) => {
  return await api
    .getAsync(
      `api/v2/teamassignment?select={id:team.id,name:team.name}&where=(assignable.id==${item.sourceId})`
    )
    .then((data) => {
      const { items } = data;
      return items;
    });
};

const [sourceTeams, targetTeams] = await Promise.all([
  getTeams(sourceItem, sourceApi),
  getTeams(targetItem, targetApi),
]);

const getTeamByName = async (team, api) => {
  return await api
    .getAsync(`api/v2/team?select={id, name}&where=name=="${team}"`)
    .then((data) => {
      const {
        items: [team],
      } = data;
      return team;
    });
};

const createTeam = async (team, api) => {
  return await api
    .postAsync(`api/v1/team?format=json`, {
      body: {
        name: team,
      },
    })
    .then((data) => {
      return { name: data.Name, id: data.Id };
    })
    .catch((e) => {
      console.log(e);
    });
};

const result = await Promise.all(
  sourceTeams.map(async (team) => {
    return getTeamByName(team.name, targetApi).then((data) => {
      if (data) {
        return { id: data.id };
      } else {
        console.warn(`Failed to find team "${team.name}" in the target tool`);
        CREATE_MISSING_TEAMS &&
          console.warn(`Going to create a new Team "${team.name}"`);
        if (CREATE_MISSING_TEAMS) {
          return createTeam(team.name, targetApi).then((data) => {
            if (data) {
              return { id: data.id };
            }
          });
        }
      }
    });
  })
).catch((e) => {
  console.log(e);
});

return {
  kind: "Value",
  value: result,
};

``

