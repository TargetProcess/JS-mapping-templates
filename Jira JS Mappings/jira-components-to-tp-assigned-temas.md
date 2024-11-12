### TP > Jira:

```js
const sync = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");
const { targetEntity, sourceEntity, targetTool } = args;
const jiraApi = sync.getProxy(targetTool);
const jiraProjectKey = targetEntity.sourceId.split("-")[0];
const CREATE_IF_MISSING = false;

const createComponentForTeam = async (name) => {
  console.warn(
    `Going to create a new component "${name}" in Jira Project: "${jiraProjectKey}"`
  );
  return await jiraApi
    .postAsync("rest/api/2/component", {
      body: {
        description: name,
        name: name,
        project: jiraProjectKey,
      },
      headers: {
        "Content-Type": "application/json",
      },
    })
    .catch((e) => {
      console.error(`Failed to create a new component. "${name}"`);
    });
};

try {
  const [assignedTeams, components] = await Promise.all([
    apiV2.queryAsync("TeamAssignment", {
      select: `team.name`,
      where: `assignable.id==${sourceEntity.sourceId}`,
    }),
    jiraApi.getAsync(
      `rest/api/latest/project/${jiraProjectKey.toUpperCase()}/components`
    ),
  ]);

  if (!assignedTeams.length) {
    return {
      kind: "Value",
      value: [],
    };
  }

  const assignComponents = await Promise.all(
    assignedTeams.map(async (team) => {
      const foundComponent = components.find(({ name }) => name === team);
      if (foundComponent) {
        return foundComponent;
      } else {
        console.warn(`Failed to find component "${team}" by name in Jira.`);
        if (CREATE_IF_MISSING) {
          return await createComponentForTeam(team);
        }
      }
    })
  );

  return {
    kind: "Value",
    value: assignComponents.filter(Boolean),
  };
} catch (e) {
  console.error(`unhadled error:`, e);
}
```

### Jira > TP:

```js
const {
  sourceTool,
  targetTool,
  value: { changed: components = [] },
} = args;

const apiv2 = context.getService("targetprocess/api/v2");
const sync = context.getService(`workSharing/v2`);
const tpApi = sync.getProxy(targetTool);

const CREATE_IF_MISSING = false;

const getTeams = async (names) => {
  return await apiv2.queryAsync("team", {
    select: `{id, name}`,
    where: `name in ${JSON.stringify(names)}`,
  });
};

const createTeam = async (name) => {
  console.warn(`Going to create a new team "${name}" in ATP.`);
  return await tpApi
    .postAsync(`api/v1/team?format=json`, {
      body: {
        name,
      },
    })
    .then((data) => {
      const { Id: id, Name: name } = data;
      return { id, name };
    })
    .catch((e) => {
      console.error(`Failed to create a team "${name}"`, e);
    });
};

try {
  const componentNames = components.map(({ name }) => name);

  if (!componentNames.length) {
    return {
      kind: "Value",
      value: [],
    };
  }

  const atpTeams = await getTeams(componentNames).then(async (teams) => {
    const notFoundTeams = componentNames.filter(
      (name) => !teams.map(({ name }) => name).includes(name)
    );

    if (notFoundTeams.length) {
      console.warn(
        `Not found teams in ATP. "${JSON.stringify(notFoundTeams)}"`
      );

      if (CREATE_IF_MISSING) {
        const addedTeams = await Promise.all(
          notFoundTeams.map((team) => createTeam(team))
        );

        return [...teams, ...addedTeams.filter(Boolean)];
      }
    }

    return teams;
  });

  return {
    kind: "Value",
    value: atpTeams,
  };
} catch (e) {
  console.error(e);
}
```

### Comporator:

```js
const {
  sourceFieldValue,
  targetFieldValue: { toolValue: components = [] },
  sourceEntity,
} = args;
const apiV2 = context.getService("targetprocess/api/v2");

try {
  const componentNames = components.map(({ name }) => name);

  const assignedTeams = await apiV2.queryAsync("TeamAssignment", {
    select: `team.name`,
    where: `assignable.id==${sourceEntity.sourceId}`,
  });

  return (
    JSON.stringify(assignedTeams.sort()) ===
    JSON.stringify(componentNames.sort())
  );
} catch (e) {
  console.error(e);
  return false;
}
```
