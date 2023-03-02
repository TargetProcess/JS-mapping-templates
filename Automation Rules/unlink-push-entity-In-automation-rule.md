### This AR can be used as an example to Unlink/Push entities in Automation Rules.

Use Case:
Targetprocess Team === Jira Project.

When Team Assignment is Created - check if:
\
Entity is already shared
\
AND
\
Jira Project !== Targetprocess Team,
\
THEN : UNLINK and PUSH.
\
ELSE - no action.

```js
const api = context.getService("targetprocess/api/v2");
const assignableId = args.Current.Assignable.Id;
const teamName = args.Current.Team.Name;
const sync = context.getService("workSharing/v2");

const entity = {
  sourceType: args.Current.Assignable.ResourceType,
  sourceId: `${assignableId}`,
  tool: {
    type: 'Targetprocess',
    id:args.Account
  }
}

//check if entity is already shared
const [entityShares] = await sync.getEntityShares(entity);

if (!entityShares) { return };

const profiles = await sync.getProfiles();

//get profile ID by Name
const currentProfile = profiles.find(p => p.name === 'Jira PROD')

//get mapping ID
const mappingId = currentProfile.mappings[0].id;
const targetTool = currentProfile.targetTool;
const jiraApi = sync.getProxy(targetTool);

//Fetch issue details from Jira
const issue = await jiraApi.getAsync(`/rest/api/2/issue/${entityShares.sourceId}`)

if (teamName.toUpperCase() === issue.fields.project.name.toUpperCase()) { return }

else {
  await sync.deleteEntitySharing({entity});
  await sync.shareEntity({
    sourceEntity: entity,
    mappingId,
    stateTransfer: {
      kind: "source"
    },
    targetTool: targetTool
  })
}

```
