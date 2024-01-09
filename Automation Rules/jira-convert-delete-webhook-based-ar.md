The AR is used to cover convert/delete/move issues in Jira with disabled two-way delete/convert feature toogles. When synced issue is deleted/converted/moved in Jira, corresponding entity will be deleted/converted in Targetprocess.

Delete in TP will not be processed to Jira.

Rules works for all Jira profiles in the account.

1.  In the integration webhooks delete event must be disabled so that integration stopped reacting on delete events and deleting rule for the sync of two issues.
2.  In Targetprocess Settings > Automation Rules > Add new rule > WHEN "Incoming Web Hook"
3.  Add filter to AND section and script to THEN.
4.  This new webhook must be added in Jira for processing issue **delete** , **update** , **Issue link** : **created**

### AND | Filter section (Execute JavaScript filter againstIncoming Web Hook):

```js
const body = args.body,
  changeLog = Object(body).changelog,
  event = body.webhookEvent;
// console.log(args.body);
const DELETE_EVENT = "jira:issue_deleted";
const fields = ["issuetype", "key"];
return (
  event === DELETE_EVENT ||
  (Boolean(changeLog) &&
    changeLog.items &&
    changeLog.items.some((v) => fields.includes(v.field.toLowerCase()))) ||
  (event === "issuelink_created" &&
    body?.issueLink?.issueLinkType?.name === "jira_subtask_link")
);
```

### THEN | Execute JavaScript function for Incoming Web Hook:

```js
const body = args.body,
  event = body.webhookEvent,
  changeLog = body.changelog,
  issue = body.issue;
const sync = context.getService("workSharing/v2");
const utils = require("utils");
const DELETE_EVENT = "jira:issue_deleted";
const LINK_CREATED_EVENT = "issuelink_created";
const ACCOUNT = Object(args).Account;
const TP_TOOL = { id: ACCOUNT, type: "Targetprocess" };

let changedProject, changedKey, changedIssueType, type, key, tpEntity;

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
      (p) => p.status === "Enabled" && p.targetTool.type === "Jira"
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

const getItemFromLink = async (
  profiles = [],
  { id, sourceIssueId, destinationIssueId }
) => {
  const items = await Promise.all(
    profiles.map(async (profile) => {
      const jiraLink = await sync
        .getProxy(profile.targetTool)
        .getAsync(`rest/api/2/issueLink/${id}`)
        .catch((e) => {
          return;
        });
      const { inwardIssue, outwardIssue } = jiraLink || {};
      if (
        Number(inwardIssue?.id) === Number(sourceIssueId) &&
        Number(outwardIssue?.id) === Number(destinationIssueId)
      ) {
        return [profile, outwardIssue];
      }
    })
  );
  return items.find((f) => Boolean(f)) || [];
};

const unlinkAndDeleteTpEntity = async (entity) => {
  // await removeWebLink(entity.sourceType, entity.sourceId);
  await unlinkEntity(entity.sourceType, entity.sourceId, TP_TOOL);
  return [
    utils.deleteResource(entity.sourceType, parseInt(entity.sourceId, 10)),
  ];
};

if (event === DELETE_EVENT) {
  const tpEntity = await getSharedItem(
    activeProfiles,
    issue.key,
    issue.fields.issuetype.id
  );
  if (tpEntity) {
    return await unlinkAndDeleteTpEntity(tpEntity);
  }
} else if (event === LINK_CREATED_EVENT) {
  const issueLink = body?.issueLink;
  if (!issueLink) {
    return;
  }

  try {
    const [profile, subTask] = await getItemFromLink(activeProfiles, issueLink);

    if (profile && subTask) {
      const jiraIssue = await sync
        .getProxy(profile.targetTool)
        .getAsync(`rest/api/2/issue/${subTask.key}?expand=changelog`);

      const changedTypeRecord =
        (jiraIssue?.changelog?.histories?.[0]?.items || []).find(
          (record) => record.field === "issuetype"
        ) || {};

      const tpEntity =
        changedTypeRecord["from"] &&
        (await getSharedItem(
          [profile],
          subTask.key,
          changedTypeRecord["from"]
        ));

      !tpEntity &&
        console.log(`Faield to get TP entity for the item: "${subTask.key}"`);

      if (tpEntity) {
        return await unlinkAndDeleteTpEntity(tpEntity);
      } else return;
    }
  } catch (e) {
    console.log(e);
  }
} else {
  const changedFields = changeLog.items;
  for (const el of changedFields) {
    const field = el.field;
    switch (field) {
      case "issuetype":
        changedIssueType = el;
        break;
      case "Key":
        changedKey = el;
        break;
    }
  }

  const removeWebLink = async (...entity) => {
    const [type, id] = entity;
    const link = `https://${ACCOUNT}/entity/${id}`;
    try {
      const jiraItem = await getEntity(id, type, TP_TOOL);
      if (!jiraItem) {
        console.log(`Faield to get Jira Item for TP item: "${type}" - "${id}"`);
        return;
      }
      const jiraApi = sync.getProxy(jiraItem.tool);

      const jiraRemoteLinks = await jiraApi.getAsync(
        `rest/api/2/issue/${jiraItem.sourceId}/remotelink`
      );

      if (!jiraRemoteLinks) {
        return;
      }

      const isAdded = jiraRemoteLinks.find(
        (webLink) =>
          (webLink.object.url || "").toLowerCase() === link.toLowerCase()
      );
      if (isAdded) {
        await jiraApi.deleteAsync(
          `rest/api/2/issue/${jiraItem.sourceId}/remotelink/${isAdded.id}`
        );
      }
    } catch (e) {
      console.log(e);
    }
  };

  try {
    if (changedKey || changedIssueType) {
      type =
        (changedIssueType && changedIssueType["from"]) ||
        issue.fields.issuetype.id;
      key = (changedKey && changedKey["fromString"]) || issue.key;
      tpEntity =
        type && key
          ? await getSharedItem(activeProfiles, key, type)
          : undefined;
      !tpEntity &&
        console.log(`Faield to get TP entity for the item: "${key}"`);
      if (tpEntity) {
        return await unlinkAndDeleteTpEntity(tpEntity);
      } else return;
    }
  } catch (e) {
    console.log(e);
  }
}
```
