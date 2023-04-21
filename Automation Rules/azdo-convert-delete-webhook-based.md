The AR is used to cover convert/delete/move issues in AzDo with disabled two-way delete/convert feature toogles. When synced issue is deleted/converted/moved in AzDo, corresponding entity will be deleted/converted in Targetprocess.

1. Disable all "DELETE" webhooks in AzDo.
2. Add filter to AND section and script to THEN.
3. This new webhook must be added in AzDo for processing issue **delete** and **update** events for all needed projects.

### AND | Filter section (Execute JavaScript filter againstIncoming Web Hook):

```js
console.log(args.body);
const { eventType, resource = {} } = args.body;
const UPDATE_EVENT = "workitem.updated";
const DELETE_EVENT = "workitem.deleted";
const { fields = {} } = resource;

return (
  (UPDATE_EVENT === eventType &&
    (Boolean(fields["System.WorkItemType"]) ||
      Boolean(fields["System.TeamProject"]))) ||
  DELETE_EVENT === eventType
);
```

### THEN | Execute JavaScript function for Incoming Web Hook:

```js
const { eventType, resource = {}, revision = {} } = args.body;

const UPDATE_EVENT = "workitem.updated";
const DELETE_EVENT = "workitem.deleted";

const ACCOUNT = Object(args).Account;
const TP_TOOL = { id: ACCOUNT, type: "Targetprocess" };
const sync = context.getService("workSharing/v2");
const utils = require("utils");

const { id, workItemId, fields } = resource;

const itemId = workItemId ? workItemId : id;
const itemType = fields["System.WorkItemType"];
console.log(
  `Current Item Id: "${itemId}", Item Type: "${JSON.stringify(itemType)}"`
);

if (!itemId || !itemType) return;

const getEntity = async (id, type, tool) => {
  const [share] = await sync.getEntityShares({
    sourceId: id,
    sourceType: type,
    tool: tool,
  });
  return share;
};

const activeProfiles = await sync
  .getProfiles()
  .then((profiles) => {
    return profiles.filter(
      (p) => p.status === "Enabled" && p.targetTool.type === "AzureDevOps"
    );
  })
  .catch((e) => {
    console.log(e);
    return [];
  });

const unlinkEntity = async (type, id, tool) => {
  try {
    await sync.deleteEntitySharing({
      sourceType: type,
      sourceId: id,
      tool: tool,
    });
  } catch (e) {
    console.log(e);
  }
};

const getSharedItem = async (profiles = [], id, type) => {
  const items = await Promise.all(
    profiles.map(
      async (profile) => await getEntity(id, type, profile.targetTool)
    )
  );
  return items.find((f) => Boolean(f));
};

try {
  if (eventType === DELETE_EVENT) {
    const tpEntity = await getSharedItem(
      activeProfiles,
      String(itemId),
      itemType
    );

    console.log(`TP Entity: `, tpEntity, String(itemId), itemType);

    if (tpEntity) {
      return await unlinkEntity(
        tpEntity.sourceType,
        tpEntity.sourceId,
        TP_TOOL
      ).then((_) => {
        return utils.deleteResource(
          tpEntity.sourceType,
          parseInt(tpEntity.sourceId, 10)
        );
      });
    }
  }

  if (eventType === UPDATE_EVENT) {
    const { oldValue } = fields["System.WorkItemType"] || Object({});

    const type = fields["System.WorkItemType"] ? oldValue : itemType;

    console.log(type);

    if (!type) {
      return;
    }

    const tpEntity = await getSharedItem(activeProfiles, String(itemId), type);

    console.log(String(itemId), type, tpEntity);

    if (tpEntity) {
      return await unlinkEntity(
        tpEntity.sourceType,
        tpEntity.sourceId,
        TP_TOOL
      ).then((_) => {
        return utils.deleteResource(
          tpEntity.sourceType,
          parseInt(tpEntity.sourceId, 10)
        );
      });
    } else return;
  }
} catch (e) {
  console.log(e);
}
```
