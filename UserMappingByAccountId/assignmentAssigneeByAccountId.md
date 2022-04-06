### Jira to TP.

domain.com - should be replaced with the client domain.

```js
const apiv2 = require('targetprocess/api/v2');
const workSharing = context.getService("workSharing/v2")
const jiraApi = workSharing.getProxy(args.sourceTool);
const users = args.value.changed;
const roleName = args.targetField.id;
const fieldId = args.sourceField.id;

if (users) {
    
    const [roleId] = await apiv2.queryAsync('Role', {
    select: `id`,
    where: `name=="${roleName}"`
})

    //Get field data directly from the issue, due to GDPR policy a user can allow seeing email either anyone or admin only. With the second option, no email in the webhook
    const query = await jiraApi.getAsync(`/rest/api/latest/issue/${args.sourceEntity.sourceId}`)

    const fieldData = query.fields && query.fields[fieldId];
    const displayName = fieldData?.displayName;
    const email = fieldData?.emailAddress;
    const accountId =fieldData.accountId;

        const [firstName, lastName = ''] = displayName.split(' ');
        const assignment = { 'user': { 'email': email || `${accountId.replace(':', '-')}@domain.com`, firstName, lastName, login:accountId}, role: { id: roleId } }

    const getUserByEmailByLogin = async (email, accountId)=> {
        return await apiv2.queryAsync("User",{
            select:`{user:{login:login, email:email, firstName:firstName, lastName:lastName}}`,
            where:`email="${email}" or login="${accountId}"`
        })
    }
    const [user] = await getUserByEmailByLogin(email, accountId);
    return {
        kind: 'Value',
        value: user ? [{...user, role:{id:roleId}}] : [assignment]
    }

} else return {
    kind: 'Value',
    value: []

}

```

### TP to Jira

```js
const workSharing = context.getService("workSharing/v2")
const jiraApi = workSharing.getProxy(args.targetTool);
const targetProcessApi = context.getService("targetprocess/api/v2")
const roleAssignment = args.value.changed && args.value.changed[0] || args.value.original && args.value.original[0];
const fieldId = args.targetField.id;
const issueId = args.targetEntity.sourceId;
let accountId = null;

if (roleAssignment) {
    //Query existing assignments
   const [assignment] = await targetProcessApi.queryAsync("Assignments", {
       select: `{id:id, email:generalUser.email, login:generalUser.login}`,
       where: `Assignable.id==${args.sourceEntity.sourceId} and role.id==${roleAssignment.role.id}`
   })

   const getjiraUserAccountId = async (email, login)=> {
    try{
    const [user] = await jiraApi.getAsync(`/rest/api/2/user/search?query=${email}`).then(async userEmail=>{
        if (Array(userEmail) && !userEmail.length) {
               return await jiraApi.getAsync(`/rest/api/2/user/search?accountId=${login}`)
        }
        return userEmail;
    })
    return user ? {accountId:user.accountId} : null;

    } catch (e) {
        console.log(e)
    }
   }

   accountId = assignment ? await getjiraUserAccountId(assignment.email, assignment.login) : null;

}

//Push users into custom field
const response = await jiraApi.putAsync(`rest/api/2/issue/${issueId}`, {
   headers: {
       'Content-Type': 'application/json'
   },
   body: {
       "fields": {
           [fieldId]: accountId
       }
   }
})

```
