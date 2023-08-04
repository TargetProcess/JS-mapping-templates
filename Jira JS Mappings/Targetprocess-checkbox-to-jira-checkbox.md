### Transformation Targetprocess to Jira.

```js
if (args.value.changed) {
  return {
    kind: "Value",
    value: ["Yes"],
  };
} else {
  return {
    kind: "Value",
    value: [],
  };
}
```

### Transformation Jira to Targetprocess

```js
const value = args.value.changed;
if (value && value.length) {
  return {
    kind: "Value",
    value: true,
  };
} else {
  return {
    kind: "Value",
    value: false,
  };
}
```
