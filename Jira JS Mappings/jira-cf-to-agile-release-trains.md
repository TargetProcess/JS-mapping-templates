### tp > jira

```js
const apiV2 = context.getService("targetprocess/api/v2");
const collection = args.sourceField.id;
const sourceEntity = args.sourceEntity;

const values = await apiV2.getByIdAsync(
  sourceEntity.entityType,
  Number(sourceEntity.sourceId),
  {
    select: `${collection}.select(name)`,
  }
);

return {
  kind: "Value",
  value: values,
};
```

## jira > tp

```js
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const field = args.targetField;
const tpEntity = args.targetEntity;
const CREATE_MISSING_ITEMS = true;
const ENTITY_TYPE_NAME = (field.meta.type.id || "").toLowerCase();

const relation = {
  entityType: ENTITY_TYPE_NAME,
  relationType: "hierarchy",
  propertyName: field.id,
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

const getValues = (sourceValue) => {
  if (Array.isArray(sourceValue)) {
    return sourceValue;
  } else {
    if (sourceValue) {
      return [sourceValue];
    } else return [];
  }
};

const currentValues = getValues(args.value.changed);

const createTpItem = async (options = [], project) => {
  return await Promise.all(
    options.map(async (value) => {
      try {
        return await tpApi
          .postAsync(`api/v1/${field.meta.type.id}?format=json`, {
            body: {
              Name: `${value}`,
              Project: project,
            },
          })
          .then((data) => {
            console.log(data);
            return { id: data.Id };
          });
      } catch (e) {
        console.log(e);
      }
    })
  );
};

const getAssignedTpItems = async (tpEntity) => {
  return await apiV2
    .getByIdAsync(tpEntity.entityType, Number(tpEntity.sourceId), {
      select: `${field.id}.Select({name:name, id:id})`,
    })
    .then((data) => {
      return data ? data : [];
    })
    .catch((e) => {
      console.error(e);
      return [];
    });
};

const getNoLinkedItems = (tpItems, options) => {
  return options.filter(
    (i) =>
      !tpItems.some((t) => {
        t.name.toLowerCase() === i.toLowerCase();
      })
  );
};

const getItemsByName = async (options = []) => {
  if (!options.length) {
    return [];
  }
  const items = await apiV2.queryAsync(field.meta.type.id, {
    select: `{id, name}`,
    where: `name in ${JSON.stringify(options)}`,
  });
  return items;
};

const cmds = await getAssignedTpItems(tpEntity).then(async (items) => {
  let newItems = [];
  const commands = [];

  items.forEach((item) => {
    if (!currentValues.includes(item.name)) {
      commands.push({
        kind: "RelationRemoved",
        relation: {
          sourceId: `${item.id}`,
          ...relation,
        },
      });
    }
  });

  const notLinkedItems = await getNoLinkedItems(items, currentValues);
  const tpItems = await getItemsByName(notLinkedItems);

  if (notLinkedItems.length) {
    const notFoundItems = notLinkedItems.filter(
      (i) => !tpItems.some((t) => t.name.toLowerCase() === i.toLowerCase())
    );

    notFoundItems.length && console.log("Not found items: ", notFoundItems);

    if (notFoundItems.length) {
      console.warn(
        `Not existing Items in ATP ${JSON.stringify(notFoundItems)}`
      );
      if (CREATE_MISSING_ITEMS) {
        console.warn(
          `Going to create a new "${ENTITY_TYPE_NAME}" in Targetprocess ${JSON.stringify(
            notFoundItems
          )}`
        );
        const project = await getProject(tpEntity);
        if (!project) {
          return;
        }
        newItems = await createTpItem(notFoundItems, project);
      }
    }

    [...tpItems, ...newItems]
      .filter((v) => !!v)
      .forEach((tpItem) => {
        commands.push({
          kind: "RelationAdded",
          relation: {
            sourceId: `${tpItem.id}`,
            ...relation,
          },
        });
      });
  }
  return commands;
});

return cmds;
```
