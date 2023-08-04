This mapping can be used for mapping JIRA sprint to TP team iteration. Sprint is mapped to Team Iteration by name.

Supported version: 1.4.2 or higher

### Transformation from Jira to Targetprocess:

#### JIRA Server

Implementation is based on current JIRA server API. It returns sprint changes in the following format:

```
"com.atlassian.greenhopper.service.sprint.Sprint@7061c65c[id=2475,rapidViewId=513,state=CLOSED,name=iOS Sprint 1,startDate=2020-09-17T15:04:51.488Z,endDate=2020-10-01T15:04:00.000Z,completeDate=2020-09-17T15:05:03.019Z,sequence=2475,goal=]",
"com.atlassian.greenhopper.service.sprint.Sprint@7644e801[id=2476,rapidViewId=513,state=ACTIVE,name=iOS Sprint 2,startDate=2020-09-17T15:16:28.126Z,endDate=2020-10-01T15:16:00.000Z,completeDate=<null>,sequence=2476,goal=]"
```

```js
if (args.value.changed) {
  const notClosedSprints = args.value.changed.filter(
    (s) => !s.includes("CLOSED")
  );
  const closedSprints = args.value.changed.filter((s) => s.includes("CLOSED"));
  let sprint = null;
  if (notClosedSprints.length > 0) {
    sprint = notClosedSprints[notClosedSprints.length - 1];
  } else if (closedSprints.length > 0) {
    sprint = closedSprints[closedSprints.length - 1];
  } else {
    return {
      kind: "Value",
      value: null,
    };
  }

  const name = sprint.split(",").find((v) => v.includes("name"));
  if (name) {
    return {
      kind: "Value",
      value: name.split("name=")[1],
    };
  }
}

return {
  kind: "Value",
  value: null,
};
```

#### JIRA Cloud

```js
if (args.value.changed) {
  const notClosedSprints = args.value.changed.filter(
    (s) => s.state !== "closed"
  );
  const closedSprints = args.value.changed.filter((s) => s.state === "closed");

  let sprint = null;
  if (notClosedSprints.length > 0) {
    sprint = notClosedSprints[notClosedSprints.length - 1];
  } else if (closedSprints.length > 0) {
    sprint = closedSprints[closedSprints.length - 1];
  } else {
    return {
      kind: "Value",
      value: null,
    };
  }

  if (sprint) {
    return {
      kind: "Value",
      value: sprint.name,
    };
  }
}

return {
  kind: "Value",
  value: null,
};
```

No transformation from Targetprocess to Jira
