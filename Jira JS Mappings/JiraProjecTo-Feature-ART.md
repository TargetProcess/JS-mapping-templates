### Jira > TP

```js
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const {
  targetTool,
  sourceTool,
  sourceField,
  sourceEntity,
  targetEntity,
  targetField,
  value: { changed: jiraProject },
} = args;

if (!jiraProject) {
  return;
}

const tpApi = workSharing.getProxy(targetTool);
const fieldId = sourceField.id;

const ENTITY_TYPE_NAME = "agilereleasetrain";
const CREATE_MISSING_ITEM = true;

const unassign = {
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
        const { Id: id, Name: name } = data;
        return {
          id,
          name,
        };
      }
    })
    .catch((e) => {
      throw Error(
        `Failed to create ${ENTITY_TYPE_NAME} ${ENTITY_TYPE_NAME} - ${JSON.stringify(
          e
        )}`
      );
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
      throw Error(`Failed to get assigned ART in ATP. ${JSON.stringify(e)}`);
    });
};

const getItemIdByNameById = async (name) => {
  const [item] = await apiV2.queryAsync(ENTITY_TYPE_NAME, {
    select: `{id:id, name:name}`,
    where: `name="${name}"`,
  });
  return item;
};

try {
  return await getAssignedItems(targetEntity).then(async (data) => {
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
      return unassign;
    }
  });
} catch (e) {
  console.error(e);
}
```

### JS Comparator

```js
const {
  targetFieldValue: { toolStringValue: tpValue },
  sourceFieldValue: { toolStringValue: jiraValue },
} = args;
const normValue = (value) => (value || "").trim().toLowerCase();
return normValue(tpValue) === normValue(jiraValue);
```
