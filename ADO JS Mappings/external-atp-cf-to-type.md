### ATP --> ADO

```js
const sync = context.getService("workSharing/v2");
const {
  sourceTool,
  sourceField,
  sourceEntity,
  targetField,
  targetEntity,
  targetTool,
  value: { changed },
} = args;
const tpApi = sync.getProxy(sourceTool);
const apdoApi = sync.getProxy(targetTool);

if (changed) {
  return;
}

try {
  await apdoApi
    .getAsync(`_apis/wit/workitems/${targetEntity.sourceId}?api-version=6.0`)
    .then(({ fields }) => {
      return tpApi.postAsync(
        `api/v1/${sourceEntity.entityType}/${sourceEntity.sourceId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          body: {
            [sourceField.id]: fields[targetField.id],
          },
        }
      );
    });
} catch (e) {
  console.error(e);
}
```

### ADO --> ATP

```js
return {
  kind: "Value",
  value: args.value.changed,
};
```
