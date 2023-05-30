### Jira - TP

```js
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const jiraApi = workSharing.getProxy(args.sourceTool);
const { targetField, sourceField, sourceEntity, targetEntity } = args;
const CREATE_MISSING_ITEMS = true;
const ENTITY_TYPE_NAME = (targetField.meta.type.id || "").toLowerCase();
const CUSTOM_FIELD_NAME = "jira id";

const relation = {
  entityType: ENTITY_TYPE_NAME,
  relationType: "hierarchy",
  propertyName: targetField.id,
};

const normalizeObjects = (options) => {
  if (options === undefined) return;
  return options.map((option) => ({
    ...option,
    value: option.value ? option.value : option.name,
  }));
};

const getIssue = async (sourceEntity) => {
  return await jiraApi
    .getAsync(`rest/api/2/issue/${sourceEntity.sourceId}`)
    .catch((e) => {
      console.error(e);
    });
};

const issue = await getIssue(sourceEntity);

if (!issue) return;

const getValues = (issue) => {
  const { fields } = issue;

  const rawValues = fields[sourceField.id];

  if (rawValues === undefined) {
    console.error(
      `Faield to get values for the issue: "${sourceEntity.sourceId}"`
    );
    return;
  }
  if (typeof rawValues === "string") {
    console.log(`Value is not an object":  ${JSON.stringify(rawValues)}`);
    return undefined;
  }

  if (rawValues === null) return [];

  return Array.isArray(rawValues) ? rawValues : [rawValues];
};

const currentValues = normalizeObjects(getValues(issue));

if (currentValues === undefined) return;

const createTpItem = async (options = []) => {
  return await Promise.all(
    options.map(async (item) => {
      try {
        return await tpApi
          .postAsync(`api/v1/${targetField.meta.type.id}?format=json`, {
            body: {
              Name: `${item.value}`,
              ["jira id"]: item.id,
            },
          })
          .then((data) => {
            console.log(data);
            return { id: data.Id, jiraid: item.id };
          });
      } catch (e) {
        console.log(e);
      }
    })
  );
};

const updateTpItems = async (items = []) => {
  return await Promise.all(
    items.map(async (item) => {
      try {
        return await tpApi
          .postAsync(
            `api/v1/${targetField.meta.type.id}/${item.id}?format=json`,
            {
              body: {
                name: item.name,
                ["jira id"]: item.jiraid,
              },
            }
          )
          .then((data) => {
            console.log(data);
            return `
            "${data.Id}": ok`;
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
      select: `${targetField.id}.Select({name:name, id:id, jiraid:jiraid})`,
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
    (o) =>
      !tpItems.some((t) => {
        return (
          t.name.toLowerCase() === o.value.toLowerCase() ||
          Number(t.jiraid) === Number(o.id)
        );
      })
  );
};

const getItemsByName = async (options = []) => {
  if (!options.length) {
    return [];
  }
  const items = await apiV2.queryAsync(targetField.meta.type.id, {
    select: `{id, name, jiraid:jiraid}`,
    where: `name in ${JSON.stringify(
      options.map((item) => item.value)
    )} or jiraid in ${JSON.stringify(options.map((item) => Number(item.id)))}`,
  });
  return items;
};

const cmds = await getAssignedTpItems(targetEntity).then(async (items) => {
  let newItems = [];
  const commands = [];
  const unlinkItems = items.reduce((acc, tpValue) => {
    const item = currentValues.find((option) => {
      return (
        (option.value || "").toLowerCase() ===
          (tpValue.name || "").toLowerCase() ||
        Number(option.id) === Number(tpValue.jiraid)
      );
    });
    if (!item) {
      acc.push({
        kind: "RelationRemoved",
        relation: {
          sourceId: `${tpValue.id}`,
          ...relation,
        },
      });
    }
    return acc;
  }, []);

  const notLinkedItems = await getNoLinkedItems(items, currentValues);
  const tpItems = await getItemsByName(notLinkedItems);
  const itemsToUpdate = [...items, ...tpItems].reduce((acc, item) => {
    const updateItem = currentValues.find((o) => {
      return (
        (Number(o.id) === Number(item.jiraid) &&
          (o.value || "").toLowerCase() !== (item.name || "").toLowerCase()) ||
        (!item.jiraid &&
          (o.value || "").toLowerCase() === (item.name || "").toLowerCase())
      );
    });

    if (updateItem) {
      acc.push({ id: item.id, name: updateItem.value, jiraid: updateItem.id });
    }

    return acc;
  }, []);

  const udpateResutlt = await updateTpItems(itemsToUpdate);

  // console.log("Update Result: ", udpateResutlt);

  if (notLinkedItems.length) {
    const notFoundItems = notLinkedItems.filter(
      (o) =>
        !tpItems.some(
          (t) =>
            t.name.toLowerCase() === o.value.toLowerCase() ||
            Number(o.id) === Number(t.jiraid)
        )
    );

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
        newItems = await createTpItem(notFoundItems);
      }
    }

    [...tpItems, ...newItems].forEach((tpItem) => {
      commands.push({
        kind: "RelationAdded",
        relation: {
          sourceId: `${tpItem.id}`,
          ...relation,
        },
      });
    });
  }
  return [...unlinkItems, ...commands];
});

console.log("CMDS: ", cmds);

return cmds;
```

### TP - JIRA

```js
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const jiraApi = workSharing.getProxy(args.targetTool);
const collection = args.sourceField.id;
const sourceEntity = args.sourceEntity;

const values = await apiV2.getByIdAsync(
  sourceEntity.entityType,
  Number(sourceEntity.sourceId),
  {
    select: `${collection}.select({name, jiraid:jiraid})`,
  }
);

const getJiraValueById = async (jiraid) => {
  const jiraValue = await jiraApi
    .getAsync(`rest/api/2/customFieldOption/${jiraid}`)
    .catch((e) => {
      console.error(`Faield to get Option Value by ID "${jiraid}"`, e);
    })
    .then((data) => {
      const { value } = data || {};
      return value;
    });
  return jiraValue;
};

if (values && values.length) {
  const jiraValues = await Promise.all(
    values.map(async (value) => {
      if (value.jiraid) {
        try {
          const jiraValue = await getJiraValueById(value.jiraid);

          return jiraValue ? jiraValue : value.name;
        } catch (e) {
          console.log(e);
        }
      } else {
        return value.name;
      }
    })
  ).catch((e) => {
    console.log(e);
  });

  return {
    kind: "Value",
    value: jiraValues,
  };
}

return {
  kind: "Value",
  value: [],
};
```
