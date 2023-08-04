You can use this mapping to transform Versions (Fix versions, affected versions), Components from Jira to feature in Targetprocess.
As side effect assign Story in Jira to epic by feature's epic name

Transformation from Targetprocess to Jira:

```js
const newFeature = args.value.changed;
const oldFeature = args.value.original;

const workSharing = context.getService("workSharing/v2");
const jiraApi = workSharing.getProxy(args.targetTool);
const tpApi = workSharing.getProxy(args.sourceTool);
const http = context.getService("http");

const jiraProjectKey = args.targetEntity.sourceId.split("-")[0];
// fetch all the available versions for project
const versions = await jiraApi.getAsync(
  `rest/api/latest/project/${jiraProjectKey}/versions`
);

const createVersionForFeature = async (feature) => {
  const response = await jiraApi.postAsync("rest/api/2/version", {
    body: {
      description: feature.name,
      name: feature.name,
      startDate: null,
      releaseDate: null,
      project: jiraProjectKey,
    },
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response;
};

const getJiraEpicForFeature = async (feature) => {
  const getEpicResult = await tpApi.postAsync(
    `api/v2/feature/${feature.id}?select={epic:{epic.id,epic.name}}`
  );
  const tpEpic = getEpicResult.items[0].epic;

  console.log("Finding epic name for tpEpic");
  console.log(tpEpic.name);
  if (tpEpic) {
    const jiraSearchResult = await jiraApi.getAsync(
      `rest/api/2/search?jql=summary~"${tpEpic.name}" and issuetype in (Epic) and project=${jiraProjectKey}`
    );
    const jiraEpic = jiraSearchResult.issues[0];

    return jiraEpic;
  }
};

if (newFeature) {
  // find jira version by matching: version.name === feature.name
  const version = versions.find(
    (v) => v.name.toLowerCase() === newFeature.name.toLowerCase()
  );

  // assign story to epic
  const jiraEpic = await getJiraEpicForFeature(newFeature);
  if (jiraEpic) {
    await jiraApi.postAsync(`rest/agile/1.0/epic/${jiraEpic.key}/issue`, {
      body: {
        issues: [args.targetEntity.sourceId],
      },
    });
  }

  if (!version) {
    // not found version in jira project. Creating a new version
    const newVersion = await createVersionForFeature(newFeature);
    return {
      kind: "Value",
      value: [newVersion],
    };
  } else {
    return {
      kind: "Value",
      value: [version],
    };
  }
} else {
  // unassign story from epic
  await jiraApi.postAsync(`rest/agile/1.0/epic/none/issue`, {
    body: {
      issues: [args.targetEntity.sourceId],
    },
  });

  // feature unassigned for user story => remove all components in jira
  return {
    kind: "Value",
    value: [],
  };
}
```

Transformation from Jira to Targetprocess:

```js
const workSharing = context.getService("workSharing/v2");
const jiraApi = workSharing.getProxy(args.targetTool);
const apiv2 = context.getService("targetprocess/api/v2");

// take the last jira version from new values
const jiraVersion = args.value.changed[args.value.changed.length - 1];

if (jiraVersion) {
  // finding Feature by name
  const result = await apiv2.queryAsync("feature", {
    where: `name=="${jiraVersion.name}"`,
  });
  const feature = result[0];

  if (feature) {
    return {
      kind: "Value",
      value: feature,
    };
  } else {
    console.error(`Not found feature with name '${jiraVersion.name}'`);
    return [];
  }
} else {
  return {
    kind: "Value",
    value: null,
  };
}
```
