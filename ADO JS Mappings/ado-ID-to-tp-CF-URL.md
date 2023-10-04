Mapping of TP URL CF to ADO ID.
Mapping is two-way due to loop prevention and enabled proper update of CF in TP in both cases, when entity was created in TP and pushed to ADO; 2) created in ADO and imported to TP.

### From TP to ADO

```js
const workSharingService = context.getService("workSharing/v2");
const jiraTool = args.sourceTool;
const tpTool = args.targetTool.id;
const jiraApi = workSharingService.getProxy(jiraTool);
const issueId = args.sourceEntity.sourceId;
const fieldId = args.sourceField.id;

//put Azure DevOps Organization here:
const azureOrganizationName = "ADO_ORGANIZATION_FROM_PROFILE";

await jiraApi.postAsync(
  `api/v1/${args.sourceEntity.entityType}/${args.sourceEntity.sourceId}`,
  {
    headers: {
      "Content-Type": "application/json",
    },
    body: {
      [fieldId]: {
        label: `${args.targetEntity.sourceId}`,
        url: `https://dev.azure.com/${azureOrganizationName}/_workitems/edit/${args.targetEntity.sourceId}`,
      },
    },
  }
);
```

### ADO >> TP

```js
const azureOrganizationName = "ADO_ORGANIZATION_FROM_PROFILE";

return {
  kind: "Value",
  value: {
    label: `${args.sourceEntity.sourceId}`,
    url: `https://dev.azure.com/${azureOrganizationName}/_workitems/edit/${args.sourceEntity.sourceId}`,
  },
};
```

### COMPARATOR

Note that current version of comparator compares not the URL itself, but label, which is a number equal to ID, not the URL itself. If you want to compare URL itself, uncomment the previous 2 lines and comment the last 2.

```js
const { sourceFieldValue, targetFieldValue } = args;
const url = sourceFieldValue.toolValue && sourceFieldValue.toolValue.URL;
return (
  (url && url.split("/").pop()) ===
  (targetFieldValue.toolValue && targetFieldValue.toolValue.toString())
);
```
