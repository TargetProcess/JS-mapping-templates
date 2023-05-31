### TP > Jira

```js
return args.value.changed
  ? { kind: "Value", value: args.value.changed }
  : { kind: "Value", value: null };
```

### JIRA > TP

```js
const workSharing = context.getService("workSharing/v2");
const jiraApi = workSharing.getProxy(args.sourceTool);
const tpApi = workSharing.getProxy(args.targetTool);
const apiV2 = context.getService("targetprocess/api/v2");

const getMultiselect = async () => {
  const result = await apiV2.queryAsync("customField", {
    select: `{value,id}`,
    where: `(name=="${args.targetField.id}")`,
  });
  return result;
};

const updateCustomField = async (customField, newValue) =>
  tpApi.postAsync(`api/v1/customFields/${customField.id}`, {
    body: {
      value: newValue,
    },
  });

if (args.value.changed) {
  const options = Array.isArray(args.value.changed)
    ? args.value.changed
    : [args.value.changed];

  const tpMultiselects = await getMultiselect();

  for (const cf of tpMultiselects) {
    var newValue = cf.value || "";
    const values = newValue.split("\r\n");
    options.forEach((c) => {
      if (!values.find((v) => v === c)) {
        newValue = newValue.concat("\r\n" + c);
      }
    });
    if (newValue !== cf.value) {
      await tpApi.postAsync(`api/v1/customFields/${cf.id}`, {
        body: {
          value: newValue,
        },
      });
    }
    return {
      kind: "Value",
      value: options.length ? options.join(",") : null,
    };
  }
} else {
  return {
    value: null,
    kind: "Value",
  };
}
```
