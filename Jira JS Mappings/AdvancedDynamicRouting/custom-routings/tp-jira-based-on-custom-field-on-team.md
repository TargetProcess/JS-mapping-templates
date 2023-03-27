### Routing based on "Jira Project" custom field on the Team Level

```js
const workSharing = context.getService("workSharing/v2");
const jiraApi = workSharing.getProxy(args.targetTool);
const apiV2 = context.getService("targetprocess/api/v2");
const entities = args.entities;

const getAssignedTeam = async (entity) => {
  const [jiraproject] = await apiV2.queryAsync("TeamAssignment", {
    select: `{teamname:team.name, jiraproject:team.jiraproject}`,
    where: `Assignable.id==${entity.sourceId}`,
  });
  return jiraproject;
};

console.log(args.entities);

const getJirProjectByName = async (projectName) => {
  try {
    return await jiraApi
      .getAsync(`rest/api/2/project/search?query=${projectName}`)
      .then((data) => {
        if (data?.values?.length) {
          return data.values.find(
            (v) => v.name.toLowerCase() === projectName.toLowerCase()
          );
        }
        return undefined;
      });
  } catch (e) {
    console.log(e);
    return undefined;
  }
};

const getjiraProjectByKey = async (projectKey) => {
  try {
    return await jiraApi.getAsync(
      `rest/api/2/project/${projectKey.toUpperCase()}`
    );
  } catch (e) {
    console.log(e);
    return undefined;
  }
};

const getTargetScopeForWorkItems = async (e) => {
  const { jiraproject, teamname } = await getAssignedTeam(e);

  if (!teamname) {
    console.warn(`Team is not attached to the item ${JSON.stringify(e)}`);
    return;
  }

  if (!jiraproject) {
    console.warn(`Jira Project is not attached to the Team "${teamname}"`);
    return;
  }

  return await getJirProjectByName(jiraproject).then((project) => {
    if (!project) {
      console.warn(
        `Was not able to find the project in Jira with the name "${jiraproject}"`
      );
      return;
    }
    return {
      entity: e,
      targetScope: {
        kind: "project",
        sourceId: `${project.id}`,
      },
    };
  });
};

const result = await Promise.all(
  args.entities
    .filter((f) => f.entityType.toLowerCase() !== "teamiteration")
    .map(async (e) => {
      const type = e.entityType.toLowerCase();
      return getTargetScopeForWorkItems(e);
    })
);

console.log(JSON.stringify(result));
return result.filter((r) => !!r);
```
