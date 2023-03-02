### Jira > TP


```js
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const jiraApi = workSharing.getProxy(args.sourceTool);

const fieldId = args.sourceField.id;
const sourceIssue = args.sourceEntity;
const targetEntity = args.targetEntity;
const ENTITY_TYPE_NAME = 'agilereleasetrain';
const CREATE_MISSING_ITEM = true;
const field = args.targetField;

const jiraProject = args.value.changed;

const relation = {
  entityType: field.meta.type.id,
  relationType: "hierarchy",
  propertyName: field.id,
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
          name: data.Name,
          id:data.Id
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
      select: `agilereleasetrains.Select({name:name, id:id})`,
    })
    .then((data) => {
      return data ? data : [];
    })
    .catch((e) => {
      console.error(e);
      return [];
    });
};

const getNoLinkedItems = (targetItems, ...sourceItems) => {
  return sourceItems.filter(
    (item) =>
      !targetItems.some((t) => t.name.toLowerCase() === item.name.toLowerCase())
  );
};

const getItemIdByNameById = async (tName) => {
  const [item] = await apiV2.queryAsync(ENTITY_TYPE_NAME, {
    select: `{id:id, name:name}`,
    where: `name="${tName}"`,
  });
  return item;
};


const cmds = await getAssignedItems(targetEntity).then(async (data) => {
const unassingItems = data.filter(a => (a.name || '').toLowerCase()!== (jiraProject.name || '').toLowerCase()).map(art=> ({
        kind: "RelationRemoved",
        relation: {
          sourceId: `${art.id}`,
          ...relation}
}))

const notLinkedItems = getNoLinkedItems(data, jiraProject);

const assignItems = await Promise.all(notLinkedItems.map(async item=> {
return await getItemIdByNameById(item.name).then(async data=> {
      if (!data) {
        console.warn(
          `Failed to find ${ENTITY_TYPE_NAME} by name - "${item.name}" in ATP`
        );
        if (CREATE_MISSING_ITEM) {
          return await createItem(item.name);
        } else return undefined;
      }
      return data;
});
}))

const toAssign = assignItems.filter(v=> !!v).map(i=> {
  return {
        kind: "RelationAdded",
        relation: {
          sourceId: `${Object(i).id}`,
          ...relation,
        },
      }
})

return [...unassingItems, ...toAssign]

})
return cmds;
```
