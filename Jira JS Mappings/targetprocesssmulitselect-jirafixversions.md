This mapping can be used to map Targetprocess's multiselect CF AND single select CF to Jira's components field. Values match by name.

## Transformation from Targetprocess to Jira

```js
const workSharing = context.getService("workSharing/v2");
const jiraApi = workSharing.getProxy(args.targetTool);
const tpApi = workSharing.getProxy(args.sourceTool);
const apiV2 = context.getService("targetprocess/api/v2");
const http = context.getService("http");

const jiraProjectKey = args.targetEntity.sourceId.split("-")[0];

// get components for JIRA project
const getProjectFixVersions = async (projectKey) =>
  jiraApi.getAsync(`rest/api/2/project/${projectKey}/versions`);

// create component
const createFixVersionWithName = async (name) => {
  const response = await jiraApi.postAsync("rest/api/2/version", {
    body: {
      description: name,
      name: name,
      project: jiraProjectKey,
    },
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response;
};

if (!args.value.changed) {
  return {
    value: [],
    kind: "Value",
  };
}

const value = Array.isArray(args.value.changed)
  ? args.value.changed
  : [args.value.changed];
const fixVersions = await Promise.all(
  value.map(async (value) => {
    const jiraProjectFixVersions = await getProjectFixVersions(jiraProjectKey);
    const existingVersion = jiraProjectFixVersions.find(
      (c) => c.name === value
    );
    let version = existingVersion;
    if (!version) {
      version = await createFixVersionWithName(value);
    }
    return version;
  })
);

return {
  kind: "Value",
  value: fixVersions,
};
```

## Transformation from Jira to Targetprocess:

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

if (args.value.changed && args.value.changed.length > 0) {
  const versions = args.value.changed;

  const tpMultiselects = await getMultiselect();

  for (const cf of tpMultiselects) {
    var newValue = cf.value || "";
    const values = newValue.split("\r\n");
    versions.forEach((c) => {
      if (!values.find((v) => v === c.name)) {
        newValue = newValue.concat("\r\n" + c.name);
      }
    });
    if (newValue !== cf.value) {
      await tpApi.postAsync(`api/v1/customFields/${cf.id}`, {
        body: {
          value: newValue,
        },
      });
    }
  }
  return {
    kind: "Value",
    value: versions.map((c) => c.name).join(","),
  };
} else {
  return {
    value: null,
    kind: "Value",
  };
}
```
