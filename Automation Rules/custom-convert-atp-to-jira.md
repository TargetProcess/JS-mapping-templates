WHEN MULITPLE Entities: Created/Deleted(optional)

```js
const apiV2 = context.getService("targetprocess/api/v2"),
  sync = context.getService("workSharing/v2"),
  utils = require("utils"),
  isDeleteEvent = args.Modification === "Deleted",
  currentItem = { type: args.ResourceType, id: args.ResourceId };

const [item] = !isDeleteEvent
  ? await apiV2.queryAsync("generalconversion", {
      select: `{type: FromGeneralType.name, id:FromGeneralID}`,
      where: `ActualGeneral.id==${args.ResourceId}`,
    })
  : [currentItem];

if (!item) {
  return;
}

const { type, id } = item;

const entity = {
  sourceType: type,
  sourceId: `${id}`,
  tool: {
    type: "Targetprocess",
    id: args.Account,
  },
};
try {
  const entityShares = await sync.getEntityShares(entity);

  if (!entityShares.length) {
    console.log(`Entity: "${type}" - ${id} is not shared`);
    return;
  }

  await Promise.all(
    entityShares.map(async (entity) => {
      const targetTool = entity.tool;
      const jiraApi = sync.getProxy(targetTool);
      try {
        console.log(`Going to remove the item: "${JSON.stringify(entity)}"`);
        await sync.deleteEntitySharing({ entity });
        await jiraApi.deleteAsync(`/rest/api/2/issue/${entity.sourceId}`);
      } catch (e) {
        console.log(e);
      }
    })
  );
} catch (e) {
  console.log(e);
}
```
