You can use this mapping to transform Jira project key to Targetprocess team.

Transformation from Jira to Targetprocess:

```js
const wsService = context.getService("workSharing/v2");
const projectToTeamsMapping = {
  //Jira project name or key: Targetprocess Tem
  //'PKEY': 'Maintain Team',
  IOS: "iOS team",
  ANDR: "Android team",
};
const proxy = wsService.getProxy(args.sourceTool);
const entity = await proxy.getAsync(
  `rest/api/2/issue/${args.sourceEntity.sourceId}`
);

if (entity && entity.fields && entity.fields.project) {
  const projectName = entity.fields.project.name;
  const projectKey = entity.fields.project.key;
  //console.log('entity.fields.project: ',entity.fields.project);
  const teamName =
    projectToTeamsMapping[projectKey] || projectToTeamsMapping[projectName];

  if (teamName) {
    return {
      kind: "Value",
      value: teamName,
    };
  } else {
    console.log(
      `Failed resolve team for project: ${projectName} key: ${projectKey}`
    );
  }
}
console.log(`Failed get issue details ${args.sourceEntity.sourceId}`);
```

No Transformation from Targetprocess to Jira
