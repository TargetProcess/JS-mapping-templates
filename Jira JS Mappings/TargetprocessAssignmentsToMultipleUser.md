You can use this mapping to transform Assignemnts in Targetprocess to a multi select user field in Jira.

Targetprocess to Jira(Assignments -> Multiple User Field):

```js
const workSharing = context.getService("workSharing/v2");
const targetProcessApi = context.getService("targetprocess/api/v2");
const jiraApi = workSharing.getProxy(args.targetTool);
const { targetEntity, targetField, sourceField } = args;

const [{ assignments }] = await targetProcessApi.queryAsync(
  args.sourceEntity.entityType,
  {
    select: `{assignments.where(role.name=="${sourceField.id}").select({email:generalUser.email, login:generalUser.login})}`,
    where: `id==${args.sourceEntity.sourceId}`,
  }
);
const getjiraUserAccountId = async (email, login) => {
  try {
    const [user] = await jiraApi
      .getAsync(`/rest/api/2/user/search?query=${email}`)
      .then(async (userEmail) => {
        if (Array.isArray(userEmail) && !userEmail.length) {
          return await jiraApi.getAsync(
            `/rest/api/2/user/search?accountId=${login}`
          );
        }
        return userEmail;
      });
    if (!user) {
      console.warn(
        `Faield to find user in Jira by "${email}" or by accountId in Jira "${login}"`
      );
    }
    return user && { accountId: user.accountId };
  } catch (e) {
    console.log(e);
  }
};

if (Array.isArray(assignments) && assignments.length) {
  const jiraUsers = await Promise.all(
    assignments.map(async (assignment) =>
      getjiraUserAccountId(assignment.email, assignment.login)
    )
  );

  return {
    kind: "Value",
    options: {
      applyRawValue: true,
    },
    value: jiraUsers.filter((v) => !!v),
  };
} else {
  return {
    kind: "Value",
    value: [],
    options: {
      applyRawValue: true,
    },
  };
}
```

Jira to Targetprocess (Multiple User Field > Assignments):

```js
const { sourceTool, value, targetField, sourceField } = args,
  apiv2 = require("targetprocess/api/v2"),
  workSharing = context.getService("workSharing/v2"),
  jiraApi = workSharing.getProxy(sourceTool);
const users = value.changed;
const { roleId } = Object(targetField.meta).attributes;
const roleName = args.targetField.id;
const { id: fieldId } = args.sourceField;

const DOMAIN = "domain.com";

const getUserByEmailByLogin = async (email, accountId) => {
  return await apiv2.queryAsync("User", {
    select: `{user:{login:login, email:email, firstName:firstName, lastName:lastName}}`,
    where: `email="${email}" or login="${accountId}"`,
  });
};

async function processUser({ displayName = "", emailAddress, accountId }) {
  if (!accountId) {
    return;
  }
  const [firstName, lastName = ""] = displayName.split(" ");
  const assignment = {
    user: {
      email: emailAddress || `${accountId.replace(":", "-")}@${DOMAIN}`,
      firstName,
      lastName,
      login: accountId,
    },
    role: { id: roleId },
  };
  const [user] = await getUserByEmailByLogin(emailAddress, accountId);
  return user ? { ...user, role: { id: roleId } } : assignment;
}

if (users) {
  try {
    const jiraIssue = await jiraApi.getAsync(
      `/rest/api/latest/issue/${args.sourceEntity.sourceId}`
    );

    const fieldData = (jiraIssue.fields && jiraIssue.fields[fieldId]) || [];

    const users = await Promise.all(
      fieldData.map(async (user) => processUser(user))
    );

    return {
      kind: "Value",
      value: users.filter((v) => !!v),
    };
  } catch (e) {
    console.error(e);
    return;
  }
} else
  return {
    kind: "Value",s
    value: [],
  };
```
