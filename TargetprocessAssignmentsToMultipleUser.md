You can use this mapping to transform Assignemnts in Targetprocess to a multi select user field in Jira.

 Targetprocess to Jira(Assignments -> Multiple User Field):

 ```js
const workSharing = context.getService("workSharing/v2")
const jiraApi = workSharing.getProxy(args.targetTool);
const targetProcessApi = context.getService("targetprocess/api/v2")
const roleAssignment = args.value.changed && args.value.changed[0] || args.value.original && args.value.original[0];
const fieldId = args.targetField.id;
const issueId = args.targetEntity.sourceId;
const accountIDs = [];

if (roleAssignment) {
    //Query existing assignments
    const [{ assignments }] = await targetProcessApi.queryAsync(args.sourceEntity.entityType, {
        select: `{assignments.where(role.id==${roleAssignment.role.id}).select({generalUser.email})}`,
        where: `id==${args.sourceEntity.sourceId}`
    })
    
    //Get account IDs for assigned users
    const jiraUsers = await Promise.all(assignments.map(async e => {
        try {
            const [query] = await jiraApi.getAsync(`/rest/api/3/user/search?query=${e.email}`)
            return query
        }
        catch (e) {
            console.error(e);
        }
    }));
    jiraUsers.filter(v => !!v).map(id => {accountIDs.push({ "accountId": id['accountId'] }) })
}
//Push users into custom field
const response = await jiraApi.putAsync(`rest/api/2/issue/${issueId}`, {
    headers: {
        'Content-Type': 'application/json'
    },
    body: {
        "fields": {
            [fieldId]: accountIDs
        }
    }
})
 ```
 Jira to Targetprocess (Multiple User Field > Assignments):

```js
const apiv2 = require('targetprocess/api/v2');
const workSharing = context.getService("workSharing/v2")
const jiraApi = workSharing.getProxy(args.sourceTool);
const users = args.value.changed;
const roleName = args.targetField.id;
const fieldId = args.sourceField.id;

const [roleId] = await apiv2.queryAsync('Role', {
    select: `id`,
    where: `name=="${roleName}"`
})

if (users) {
    //Get field data directly from the issue, due to GDPR policy a user can allow seeing email either anyone or admin only. With the second option, no email in the webhook
    const query = await jiraApi.getAsync(`/rest/api/latest/issue/${args.sourceEntity.sourceId}`)
    const fieldData = query.fields && query.fields[fieldId];
    const assignments = fieldData.map(v => {
        const [firstName, lastName = ''] = v.displayName.split(' ');
        return { 'user': { 'email': v.emailAddress || null, firstName, lastName }, role: { id: roleId } }
    });

    const noEmails = fieldData.filter(v=> !v.emailAddress).map(m=> m.displayName);
    noEmails.length && console.warn(`Email is not avaliable or hidden for the following users: ${noEmails.join(', ')}`)

    return {
        kind: 'Value',
        value: assignments.filter(v => !!v.user.email)
    }
} else return {
    kind: 'Value',
    value: []

}
```