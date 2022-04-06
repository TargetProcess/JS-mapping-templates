### Jira to TP

domain.com - should be replaced with the client domain.

```js
const apiv2 = require('targetprocess/api/v2');
const workSharing = context.getService("workSharing/v2")
const jiraApi = workSharing.getProxy(args.sourceTool);
const users = args.value.changed;
const fieldId = args.sourceField.id;

if (users) {
    
    //Get field data directly from the issue, due to GDPR policy a user can allow seeing email either anyone or admin only. With the second option, no email in the webhook
    const query = await jiraApi.getAsync(`/rest/api/latest/issue/${args.sourceEntity.sourceId}`)

    const fieldData = query.fields && query.fields[fieldId];
    const displayName = fieldData?.displayName;
    const email = fieldData?.emailAddress;
    const accountId =fieldData.accountId;

        const [firstName, lastName = ''] = displayName.split(' ');
        const assignment = { 'email': email || `${accountId.replace(':', '-')}@domain.com`, firstName, lastName, login:accountId}

    const getUserByEmailByLogin = async (email, accountId)=> {
        return await apiv2.queryAsync("User",{
            select:`{login, email, firstName, lastName}`,
            where:`email="${email}" or login="${accountId}"`
        })
    }
    const [user] = await getUserByEmailByLogin(email, accountId);

    return {
        kind: 'Value',
        value: user ? user : assignment
    }

} else {
    console.log(`Was not able to find the user`)
    return undefined
}

```

### TP to Jira

```js
const workSharing = context.getService("workSharing/v2")
const jiraApi = workSharing.getProxy(args.targetTool);
const targetProcessApi = context.getService("targetprocess/api/v2")
const creator = args.value.changed;
const fieldId = args.targetField.id;
const issueId = args.targetEntity.sourceId;
let accountId = null;

if (creator) {

const {Email:email, Login:login} = creator;

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

   accountId = await getjiraUserAccountId(email, login);

   if (!accountId) {
       console.warn(`Was not able to find the user in Jira ${JSON.stringify(creator)}`)
       return undefined;
   }


await jiraApi.putAsync(`rest/api/2/issue/${issueId}`, {
   headers: {
       'Content-Type': 'application/json'
   },
   body: {
       "fields": {
           [fieldId]: accountId
       }
   }
})
}

```
