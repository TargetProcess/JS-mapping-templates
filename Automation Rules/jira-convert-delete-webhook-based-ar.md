The AR is used to cover convert/delete/move issues in Jira with disabled two-way delete/convert feature toogles. When synced issue is deleted/converted/moved in Jira, corresponding entity will be deleted/converted in Targetprocess.

Delete in TP will not be processed to Jira.

Rules works for all Jira profiles in the account.

1.  In the integration webhooks delete event must be disabled so that integration stopped reacting on delete events and deleting rule for the sync of two issues.
2.  In Targetprocess Settings > Automation Rules > Add new rule > WHEN "Incoming Web Hook"
3.  Add filter to AND section and script to THEN.
4.  This new webhook must be added in Jira for processing issue **delete** , **update** , **Issue link** : **created**

### AND | Filter section (Execute JavaScript filter againstIncoming Web Hook):

```js
const body = args.body;

const EVENTS = {
  DELETE_EVENT: "jira:issue_deleted",
  LINK_CREATED_EVENT: "issuelink_created",
  UPDATE_EVENT: "jira:issue_updated",
};

const { changelog, webhookEvent } = Object(body);

const fields = ["issuetype", "key", "issueparentassociation"];

console.log(`webhookEvent - ${webhookEvent}`);
changelog && console.log("changeLog: ", changelog);

return (
  webhookEvent === EVENTS.DELETE_EVENT ||
  (Boolean(changelog) &&
    changelog.items &&
    changelog.items.some((v) => fields.includes(v.field.toLowerCase()))) ||
  (webhookEvent === EVENTS.LINK_CREATED_EVENT &&
    body?.issueLink?.issueLinkType?.name === "jira_subtask_link")
);
```

### THEN | Execute JavaScript function for Incoming Web Hook:

```js
const body = args.body;
const utils = require("utils");
const { webhookEvent, changelog, issue, issueLink } = Object(body);
const sync = context.getService("workSharing/v2");

let changedProject, changedKey, changedIssueType, sourceType, sourceId;

const sourceEntity = {
  sourceId: issue && issue.key,
  sourceType: issue && issue.fields.issuetype.id,
};

const EVENTS = {
  DELETE_EVENT: "jira:issue_deleted",
  LINK_CREATED_EVENT: "issuelink_created",
  UPDATE_EVENT: "jira:issue_updated",
};

const SUB_TASK = "Sub-task";
const ACCOUNT = Object(args).Account;
const TP_TOOL = { id: ACCOUNT, type: "Targetprocess" };

console.log = new Proxy(console.log, {
  apply: (target, thisArg, args) => {
    const [firstArg, ...restArgs] = args;
    const logLevels = {
      info: "[INFO]",
      warn: "[WARN]",
      err: "[ERR]",
    };
    const logLevel = logLevels[firstArg?.toLowerCase()] || "";
    const filteredArgs = logLevel ? restArgs : args;
    target.call(
      thisArg,
      `${logLevel} ${new Date().toISOString()}`,
      ...filteredArgs
    );
  },
});

const getEntity = async (sourceEntity) => {
  const [share] = await sync.getEntityShares(sourceEntity);
  return share;
};

const profiles = await sync
  .getProfiles()
  .then((profiles) => {
    return profiles.filter(
      (p) => p.status === "Enabled" && p.targetTool.type === "Jira"
    );
  })
  .catch((e) => {
    throw Error("Failed to get profiles...");
  });

const unlinkEntity = async (sourceEntity) => {
  try {
    await sync.deleteEntitySharing(sourceEntity);
  } catch (e) {
    console.log("err", e);
  }
};

const removeWebLink = async (sourceEntity) => {
  const { sourceType, sourceId } = sourceEntity;
  const link = `https://${ACCOUNT}/entity/${sourceId}`;
  try {
    const jiraItem = await getEntity({ sourceType, sourceId, tool: TP_TOOL });
    if (!jiraItem) {
      console.log(
        `Faield to get Jira Item for TP item: "${sourceType}" - "${sourceId}"`
      );
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

const getSharedItem = async (profiles = [], sourceEntity) => {
  const items = await Promise.all(
    profiles.map(
      async (profile) =>
        await getEntity({ ...sourceEntity, tool: profile.targetTool })
    )
  );
  return items.find((f) => Boolean(f));
};

const getItemForKey = async (profiles = [], key) => {
  const items = await Promise.all(
    profiles.map(async (profile) => {
      const jiraIssue = await sync
        .getProxy(profile.targetTool)
        .getAsync(`rest/api/2/issue/${key}?expand=changelog`)
        .catch((e) => {
          return;
        });

      if (jiraIssue) {
        return [profile, jiraIssue];
      }
    })
  );
  return items.find((f) => Boolean(f)) || [];
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

const unlinkAndDeleteTpEntity = async ({ entity, key }) => {
  if (!entity) {
    return;
  }

  const { sourceType, sourceId } = entity;

  console.log(
    "info",
    `Going to remove tp item: "${sourceType}" | ID:"${sourceId}" for the issue "${key}"...`
  );

  // await removeWebLink({sourceType, sourceId});

  await unlinkEntity({
    sourceType,
    sourceId,
    tool: TP_TOOL,
  });

  return [utils.deleteResource(sourceType, parseInt(sourceId, 10))];
};

const getItemFromHistory = async ({ profile, subTask }) => {
  const changedTypeRecord = (subTask?.changelog?.histories || []).reduce(
    (acc, record) => {
      const subTaskRecord = record.items.find((r) => {
        const descriptor = Object.getOwnPropertyDescriptor(r, "toString");
        return r.field === "issuetype" && descriptor.value === SUB_TASK;
      });
      if (subTaskRecord && !Object.keys(acc).length) {
        acc = { ...subTaskRecord };
      }
      return acc;
    },
    {}
  );

  return changedTypeRecord["from"]
    ? await getSharedItem([profile], {
        sourceId: subTask.key,
        sourceType: changedTypeRecord["from"],
      })
    : undefined;
};

if (webhookEvent === EVENTS.DELETE_EVENT) {
  const entity = await getSharedItem(profiles, sourceEntity);

  if (!entity) {
    console.log(
      "warn",
      `Failed to get atp item for sourceEntity: ${JSON.stringify(sourceEntity)}`
    );
    return;
  }

  console.log(
    "info",
    `event: - ${EVENTS.DELETE_EVENT}, targetEntity: ${JSON.stringify(entity)}`
  );

  return await unlinkAndDeleteTpEntity({ entity, key: issue.key });
} else if (webhookEvent === EVENTS.LINK_CREATED_EVENT) {
  if (!issueLink) {
    return;
  }

  try {
    const [profile, subTask] = await getItemFromLink(profiles, issueLink);

    if (profile && subTask) {
      const entity = await getItemFromHistory({ profile, subTask });

      !entity &&
        console.log(
          "warn",
          `Faield to get TP entity for the item: "${subTask.key}"`
        );

      return await unlinkAndDeleteTpEntity({ entity, key: subTask.key });
    }
  } catch (e) {
    console.log("err", e);
  }
} else if (
  webhookEvent === EVENTS.UPDATE_EVENT &&
  issue.fields.issuetype.name === SUB_TASK
) {
  const [profile, subTask] = await getItemForKey(
    profiles,
    sourceEntity.sourceId
  );

  if (profile && subTask) {
    const entity = await getItemFromHistory({ profile, subTask });
    !entity &&
      console.log(
        "warn",
        `Faield to get TP entity for the item: "${subTask.key}"`
      );

    return await unlinkAndDeleteTpEntity({ entity, key: subTask.key });
  }
} else {
  const changedFields = changelog.items;

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

  try {
    if (changedKey || changedIssueType) {
      sourceType =
        (changedIssueType && changedIssueType["from"]) ||
        sourceEntity.sourceType;
      sourceId =
        (changedKey && changedKey["fromString"]) || sourceEntity.sourceId;
      const entity =
        sourceType && sourceId
          ? await getSharedItem(profiles, { sourceType, sourceId })
          : undefined;

      if (!entity) {
        console.log(
          "warn",
          `Faield to get TP entity for the item: "${sourceId}"`
        );
        return;
      }
      return await unlinkAndDeleteTpEntity({ entity, key: sourceId });
    }
  } catch (e) {
    console.log("err", e);
  }
}
```
