### Jira To TP

```js
const jiraProject = args.value.changed?.name;
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
      const item = data;
      if (!item.length && CREATE_MISSING_ITEM) {
        console.log(`Going to create a new item "${name}"`);
        return await createItem(name, "Team");
      }
      return item;
    });
  return team;
};

if (jiraProject) {
  const tpItem = await getitem(jiraProject);

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
