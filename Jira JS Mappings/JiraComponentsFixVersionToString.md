You can use this mapping to transform Versions (Fix versions, affected versions), Components from Jira to string/DDL field in Targetprocess.

Transformation from Jira to Targetprocess:

```js
const mapJiraObjectsArrayToString = (obj, separator = ", ") => {
  const result = obj.value.changed.map((c) => c.name);

  return [
    {
      kind: "Value",
      value: result.join(separator),
    },
  ];
};
// You can pass string with separator as second argument. ', ' is used as default separator
return mapJiraObjectsArrayToString(args);
```

No Transformation from Targetprocess to Jira
