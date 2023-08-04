## JS mapping mapping jira key -> tp custom field

Targetprocess side:

```js
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.sourceTool);
const fieldId = args.sourceField.id;

await tpApi.postAsync(
  `api/v1/${args.sourceEntity.entityType}/${args.sourceEntity.sourceId}`,
  {
    body: {
      [fieldId]: args.targetEntity.sourceId,
    },
  }
);
```

Jira side:

```js
return {
  kind: "Value",
  value: args.value.changed.toString(),
};
```
