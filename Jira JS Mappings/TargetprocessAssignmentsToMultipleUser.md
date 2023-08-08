You can use this mapping to transform Assignemnts in Targetprocess to a multi select user field in Jira.

Targetprocess to Jira(Assignments -> Multiple User Field):

```js
const workSharing = context.getService("workSharing/v2");
const jiraApi = workSharing.getProxy(args.targetTool);
const targetProcessApi = context.getService("targetprocess/api/v2");
const roleAssignment =
  (args.value.changed && args.value.changed[0]) ||
  (args.value.original && args.value.original[0]);
const fieldId = args.targetField.id;
const issueId = args.targetEntity.sourceId;
const accountIDs = [];

if (roleAssignment) {
  //Query existing assignments
  const [{ assignments }] = await targetProcessApi.queryAsync(
    args.sourceEntity.entityType,
    {
      select: `{assignments.where(role.id==${roleAssignment.role.id}).select({generalUser.email})}`,
      where: `id==${args.sourceEntity.sourceId}`,
    }
  );

  //Get account IDs for assigned users
  const jiraUsers = await Promise.all(
    assignments.map(async (e) => {
      try {
        const [query] = await jiraApi.getAsync(
          `/rest/api/3/user/search?query=${e.email}`
        );
        return query;
      } catch (e) {
        console.error(e);
      }
    })
  );
  jiraUsers
    .filter((v) => !!v)
    .map((id) => {
      accountIDs.push({ accountId: id["accountId"] });
    });
}
//Push users into custom field
const response = await jiraApi.putAsync(`rest/api/2/issue/${issueId}`, {
  headers: {
    "Content-Type": "application/json",
  },
  body: {
    fields: {
      [fieldId]: accountIDs,
    },
  },
});
```

Jira to Targetprocess (Multiple User Field > Assignments):

```js
const apiv2 = require("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const jiraApi = workSharing.getProxy(args.sourceTool);
const users = args.value.changed;
const roleName = args.targetField.id;
const fieldId = args.sourceField.id;

if (users) {
  const [roleId] = await apiv2.queryAsync("Role", {
    select: `id`,
    where: `name=="${roleName}"`,
  });

  //Get field data directly from the issue, due to GDPR policy a user can allow seeing email either anyone or admin only. With the second option, no email in the webhook
  const query = await jiraApi.getAsync(
    `/rest/api/latest/issue/${args.sourceEntity.sourceId}`
  );

  const fieldData = query.fields && query.fields[fieldId];
  const displayName = fieldData?.displayName;
  const email = fieldData?.emailAddress;
  const accountId = fieldData?.accountId;

  if (!fieldData) {
    console.error(`Faield to get data for the field "${fieldId}"`);
    return;
  }

  const [firstName, lastName = ""] = displayName.split(" ");
  const assignment = {
    user: {
      email: email || `${accountId.replace(":", "-")}@domain.com`,
      firstName,
      lastName,
      login: accountId,
    },
    role: { id: roleId },
  };

  const getUserByEmailByLogin = async (email, accountId) => {
    return await apiv2.queryAsync("User", {
      select: `{user:{login:login, email:email, firstName:firstName, lastName:lastName}}`,
      where: `email="${email}" or login="${accountId}"`,
    });
  };
  const [user] = await getUserByEmailByLogin(email, accountId);
  return {
    kind: "Value",
    value: user ? [{ ...user, role: { id: roleId } }] : [assignment],
  };
} else
  return {
    kind: "Value",
    value: [],
  };
```
