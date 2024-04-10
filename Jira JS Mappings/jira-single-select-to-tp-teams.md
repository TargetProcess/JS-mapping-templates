### Data transformation Jira Single Select Custom field to ATP Assigned Teams.

### Jira > ATP

```js
const jiraTeam = args.value.changed;
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const apiV2 = context.getService("targetprocess/api/v2");
const targetItem = args.targetEntity;
const CREATE_MISSING_ITEM = true;

const createItem = async (name, entityType) => {
  if (!name || !entityType) {
    return;
  }
  return await tpApi
    .postAsync(`api/v1/${entityType}?format=json`, {
      body: {
        name: name,
      },
    })
    .then((data) => {
      return data ? [{ id: data.Id }] : [];
    });
};

const getitem = async (name) => {
  const team = await apiV2
    .queryAsync("Team", {
      select: `{id:id}`,
      where: `name=="${name}"`,
    })
    .then(async (data) => {
      if (!data.length && CREATE_MISSING_ITEM) {
        console.log(`Going to create a new item "${name}"`);
        return await createItem(name, "Team");
      }
      return data;
    });
  return team;
};

if (jiraTeam) {
  const tpItem = await getitem(jiraTeam);

  return {
    kind: "Value",
    value: tpItem,
  };
} else {
  return {
    kind: "Value",
    value: [],
  };
}
```

### ATP > JIRA

```js
const { sourceEntity, sourceTool } = args;
const apiV2 = context.getService("targetprocess/api/v2");

try {
  const [assignedTeam] = await apiV2.queryAsync("teamassignment", {
    select: `team.name`,
    where: `assignable.id==${sourceEntity.sourceId}`,
  });

  return {
    kind: "Value",
    value: assignedTeam || null,
  };
} catch (e) {
  console.error(e);
}
```
