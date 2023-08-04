### Jira > TP

```js
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const jiraApi = workSharing.getProxy(args.sourceTool);

const fieldId = args.sourceField.id;
const sourceIssue = args.sourceEntity;
const targetEntity = args.targetEntity;
const ENTITY_TYPE_NAME = "agilereleasetrain";
const CREATE_MISSING_ITEM = true;
const field = args.targetField;

const jiraProject = args.value.changed;

const unAssign = {
  kind: "Value",
  value: null,
};

const createItem = async (name) => {
  console.log(`Creating ${ENTITY_TYPE_NAME}... ${name}`);
  return await tpApi
    .postAsync(`api/v1/${ENTITY_TYPE_NAME}?format=json`, {
      body: {
        Name: name,
      },
    })
    .then((data) => {
      if (data) {
        return {
          id: data.Id,
          name: data.Name,
        };
      }
    })
    .catch((e) => {
      console.error(e);
      return `Failed to create Team ${ENTITY_TYPE_NAME}`;
    });
};

const getAssignedItems = async (tpEntity) => {
  return await apiV2
    .getByIdAsync(tpEntity.entityType, Number(tpEntity.sourceId), {
      select: `agilereleasetrain.name`,
    })
    .then((data) => {
      return data ? data : null;
    })
    .catch((e) => {
      console.error(e);
      return null;
    });
};

const getItemIdByNameById = async (tName) => {
  const [item] = await apiV2.queryAsync(ENTITY_TYPE_NAME, {
    select: `{id:id, name:name}`,
    where: `name="${tName}"`,
  });
  return item;
};

const cmds = await getAssignedItems(targetEntity).then(async (data) => {
  if (!jiraProject) {
    return unAssign;
  }

  const tpArt = await getItemIdByNameById(jiraProject.name).then(
    async (data) => {
      if (!data) {
        console.warn(
          `Failed to find ${ENTITY_TYPE_NAME} by name - "${jiraProject.name}" in ATP`
        );
        if (CREATE_MISSING_ITEM) {
          return await createItem(jiraProject.name);
        } else return undefined;
      }
      return data;
    }
  );

  if (tpArt) {
    return {
      kind: "Value",
      value: tpArt,
    };
  } else {
    return unAssign;
  }
});

return cmds;
```
