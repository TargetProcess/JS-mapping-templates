### ATP to JIRA

```js
const workSharing = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");

const CREATE_MISSING_VERSION = false;

const { targetEntity, sourceEntity, targetField, targetTool, sourceTool } =
  args;
const jiraApi = workSharing.getProxy(targetTool);
const tpApi = workSharing.getProxy(sourceTool);
const jiraProjectKey = targetEntity.sourceId.split("-")[0];
const tpItem = args.value.changed;

const getProjectFixversions = async (projectKey) =>
  jiraApi.getAsync(`rest/api/2/project/${projectKey}/versions`).catch((e) => {
    console.error(
      `Failed to fetch fixVersions for the project "${projectKey}"`,
      e
    );
    return undefined;
  });

const createFixVersion = async (versionName, projectKey) => {
  try {
    const response = await jiraApi.postAsync("rest/api/2/version", {
      body: {
        description: versionName,
        name: versionName,
        project: projectKey,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response;
  } catch (error) {
    console.error(
      `Creation of new version "${versionName}" in Jira Project "${projectKey}" Failed: `,
      error
    );
    return undefined;
  }
};

const getTpItem = async ({ Id: id, ResourceType: type }) => {
  if (!id) return;
  const entity = await apiV2
    .getByIdAsync(type, Number(id), {
      select: `{name, id, type:ResourceType}`,
    })
    .catch((e) => {
      console.error(e);
      return;
    });

  if (!entity) {
    console.error(`Faield to get "${type}" by Id: "${id}"`);
    return;
  }
  return entity;
};

const items = Array.isArray(tpItem) ? args.value.changed : [tpItem];

const tpItems = await Promise.all(
  items.map(async (entity) => {
    if (!entity) return;
    return await getTpItem(entity || {});
  })
);

const fixVersions = await Promise.all(
  tpItems
    .filter((v) => !!v)
    .map(async (value) => {
      const { name, type, id } = Object(value);

      const jiraProjectFixVersions = await getProjectFixversions(
        jiraProjectKey
      );

      if (!jiraProjectFixVersions) {
        return;
      }

      const existingFixVersion = name
        ? jiraProjectFixVersions.find((c) => c.name == name)
        : undefined;
      let fixVersion = existingFixVersion;
      !fixVersion && console.warn(`Failed to find FixVersion "${name}"`);

      if (!fixVersion && CREATE_MISSING_VERSION) {
        console.warn(`Going to add a new fix version "${name}" in Jira...`);
        fixVersion = await createFixVersion(name, jiraProjectKey).then(
          async (data) => {
            return data;
          }
        );
      }

      return fixVersion;
    })
);

return {
  kind: "Value",
  value: fixVersions.filter((v) => !!v),
};
```

### JIRA to ATP

```js
const project = args.value.changed;
const workSharing = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const CREATE_MISSING_ITEM = true;
const value = args.value.changed || [];
const field = args.targetField;
const targetEntity = args.targetEntity;

const getProject = async (targeItem) => {
  return apiV2
    .getByIdAsync(targeItem.entityType, Number(targeItem.sourceId), {
      select: `{id:project.id}`,
    })
    .catch((e) => {
      console.error(e);
      return;
    });
};

const getItemByName = async (name) => {
  const [items] = await apiV2.queryAsync(field.meta.type.id, {
    select: `{id, name}`,
    where: `name == "${name}"`,
  });
  return items;
};

const jiraVersion = (value[value.length - 1] || {}).name;

if (!jiraVersion) {
  console.warn(`JiraFixVersion is not defined in Jira`);
  return {
    kind: "Value",
    value: null,
  };
}

if (jiraVersion) {
  let tpItem = await getItemByName(jiraVersion);

  if (!tpItem) {
    console.warn(
      `Failed to find a build by name "${jiraVersion}" in Targetprocess`
    );
    if (CREATE_MISSING_ITEM) {
      console.log(`Creating new ${field.meta.type.id}...`);
      const tpProject = await getProject(targetEntity);

      if (!tpProject) {
        console.error(
          `Failed to get project id for the item ${JSON.stringify(
            targetEntity
          )}`
        );
        return undefined;
      }

      tpItem = await tpApi
        .postAsync(`api/v1/${field.meta.type.id}?format=json`, {
          body: {
            Name: jiraVersion,
            Project: tpProject,
          },
        })
        .then((data) => {
          return data ? { id: data.Id } : null;
        })
        .catch((e) => {
          console.error(
            `Failed to create ${field.meta.type.id} in Targetprocess`,
            e
          );
        });
    }
  }
  console.log(tpItem);
  return {
    kind: "Value",
    value: tpItem ? tpItem : null,
  };
}
```
