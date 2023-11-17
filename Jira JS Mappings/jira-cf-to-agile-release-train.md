### tp > jira

```js
const { Name: art } = args.value.changed || {};
return {
  kind: "Value",
  value: art ? [art] : [],
};
```

### jira > tp

```js
const [value] = args.value.changed || [];
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const apiV2 = context.getService("targetprocess/api/v2");
const targetItem = args.targetEntity;
const CREATE_MISSING_ITEM = true;

const createItem = async (name, project) => {
  if (!name) {
    return;
  }
  return await tpApi
    .postAsync(`api/v1/agilereleasetrain?format=json`, {
      body: {
        name: name,
        Project: project,
      },
    })
    .then((data) => {
      return data ? { id: data.Id } : null;
    });
};

const getProject = async (targeItem) => {
  return apiV2
    .getByIdAsync(targeItem.entityType, Number(targeItem.sourceId), {
      select: `{id:project.id}`,
    })
    .catch((e) => {
      console.error(e);
      return;
    });
};

const getItem = async (name) => {
  const art = await apiV2
    .queryAsync("agilereleasetrain", {
      select: `{id:id}`,
      where: `name=="${name}"`,
    })
    .then(async (data) => {
      const [tpArt] = data;
      if (!tpArt && CREATE_MISSING_ITEM) {
        console.log(`Going to create a new item "${name}"`);
        const project = await getProject(targetItem);
        if (!project) {
          return;
        }
        return await createItem(name, project);
      }
      return tpArt || null;
    });
  return art;
};

if (value) {
  const tpItem = await getItem(value);

  return {
    kind: "Value",
    value: tpItem,
  };
} else {
  return {
    kind: "Value",
    value: null,
  };
}
```
