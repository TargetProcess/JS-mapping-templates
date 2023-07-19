### TP > JIRA:

```js
const workSharing = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");

const { targetEntity, sourceEntity, targetField, targetTool, sourceTool } =
  args;
const jiraApi = workSharing.getProxy(targetTool);
const tpApi = workSharing.getProxy(sourceTool);
const jiraProjectKey = targetEntity.sourceId.split("-")[0];
const tpItem = args.value.changed;

const JIRA_ID_FIELD_NAME = "JiraBuildID";

if (!tpItem) {
  return {
    kind: "Value",
    value: [],
  };
}

const updateTPitem = async (id, type, jiraid) => {
  return await tpApi
    .postAsync(`api/v1/${type}/${id}?format=json`, {
      body: {
        [JIRA_ID_FIELD_NAME]: jiraid,
      },
    })
    .then((_) => {
      return "ok";
    })
    .catch((e) => {
      console.error(e);
      return `Failed to Update ${type}`;
    });
};

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
        startDate: null,
        releaseDate: null,
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
      select: `{name, id, type:ResourceType, jiraid:customvalues["${JIRA_ID_FIELD_NAME}"]}`,
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
      const { name, jiraid, type, id } = Object(value);

      console.log(name, jiraid, type, id, value);

      const jiraProjectFixVersions = await getProjectFixversions(
        jiraProjectKey
      );
      console.log("jiraProjectFixVersions", jiraProjectFixVersions);

      if (!jiraProjectFixVersions) {
        return;
      }

      const existingFixVersion = jiraid
        ? jiraProjectFixVersions.find((c) => Number(c.id) === jiraid)
        : undefined;
      let fixVersion = existingFixVersion;

      !fixVersion &&
        jiraid &&
        console.warn(
          `Failed to find FixVersion "${name}" in Jira by Id: "${jiraid}"`
        );

      if (!jiraid && !fixVersion) {
        fixVersion = await createFixVersion(name, jiraProjectKey).then(
          async (data) => {
            const { id: fixVersionid } = data || {};
            id && (await updateTPitem(id, type, fixVersionid));
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

### Jira > TP

```js
const workSharing = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");
const { targetEntity, targetField, targetTool } = args;
const tpApi = workSharing.getProxy(targetTool);
const ENTITY_TYPE_NAME = targetField.meta.type.id;
const value = args.value.changed || [];
const CREATE_MISSING_ITEM = true;

const JIRA_ID_FIELD_NAME = "JiraBuildID";

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

const getItemIdByNameById = async (tName, jId) => {
  const [item] = await apiV2.queryAsync(ENTITY_TYPE_NAME, {
    select: `{id:id, name:name, jiraid:customvalues["${JIRA_ID_FIELD_NAME}"]}`,
    where: `[${JIRA_ID_FIELD_NAME}] = ${jId}`,
  });
  return item;
};

const updateTPitem = async (id, name, jiraid) => {
  console.warn(`Updating ${ENTITY_TYPE_NAME}... ${name}`);
  return await tpApi
    .postAsync(`api/v1/${ENTITY_TYPE_NAME}?format=json`, {
      body: {
        Name: name,
        Id: id,
        [JIRA_ID_FIELD_NAME]: jiraid,
      },
    })
    .then((_) => {
      return "ok";
    })
    .catch((e) => {
      console.error(e);
      return `Failed to Update ${ENTITY_TYPE_NAME}`;
    });
};

const createItem = async (project, name, jiraid) => {
  console.log(`Creating ${ENTITY_TYPE_NAME}... ${name}`);
  return await tpApi
    .postAsync(`api/v1/${ENTITY_TYPE_NAME}?format=json`, {
      body: {
        Name: name,
        [JIRA_ID_FIELD_NAME]: jiraid,
        Project: project,
      },
    })
    .then((data) => {
      if (data) {
        const cfs = data?.CustomFields || [];
        const jiraIdCfValue = cfs.find(
          (v) => v.Name.toLowerCase() === JIRA_ID_FIELD_NAME.toLowerCase()
        );
        return {
          id: data.Id,
          name: data.Name,
          jiraid: jiraIdCfValue?.Value ? jiraIdCfValue.Value : undefined,
        };
      }
    })
    .catch((e) => {
      console.error(e);
      return `Failed to create FixVersion ${ENTITY_TYPE_NAME}`;
    });
};

const jiraVersion = value[value.length - 1] || {};
const { id: fixversionId, name: fixversionName } = jiraVersion;

if (!fixversionId) {
  console.warn(`JiraFixVersion is not defined in Jira`);
  return {
    kind: "Value",
    value: null,
  };
}

const tpItem = await getItemIdByNameById(fixversionName, fixversionId)
  .then(async (data) => {
    if (!data) {
      console.warn(
        `Failed to find ${ENTITY_TYPE_NAME} by name - "${fixversionName}" or by option id - "${fixversionId}" in ATP`
      );
      if (CREATE_MISSING_ITEM) {
        const tpProject = await getProject(targetEntity);
        return await createItem(tpProject, fixversionName, fixversionId);
      } else return undefined;
    }
    return data;
  })
  .catch((e) => {
    console.error(e);
  });

if (!tpItem) {
  return undefined;
}

const { name, id } = tpItem;
const jiraid = tpItem[JIRA_ID_FIELD_NAME.replace(/\s*/gi, "")];

if (name !== fixversionName || !jiraid) {
  const res = await updateTPitem(id, fixversionName, fixversionId);
  console.log(`Response: `, res);
}

return {
  kind: "Value",
  value: tpItem ? { id: tpItem.id } : null,
};
```
