### tp > jira

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

const CONFIG = {
  destinationValueType: {},
};

const getProjectFixversions = async (projectKey) =>
  jiraApi.getAsync(`rest/api/2/project/${projectKey}/versions`).catch((e) => {
    console.error(
      `Failed to fetch fixVersions for the project "${projectKey}"`,
      e
    );
    return undefined;
  });

const createFixVersion = async (
  versionName,
  startDate,
  releaseDate,
  projectKey
) => {
  try {
    const response = await jiraApi.postAsync("rest/api/2/version", {
      body: {
        description: versionName,
        name: versionName,
        startDate: startDate,
        releaseDate: releaseDate,
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
      select: `{name, id, type:ResourceType, startDate, endDate}`,
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
      const { name, type, id, startDate, endDate } = Object(value);

      console.log(name, type, id, value, startDate, endDate);

      const jiraProjectFixVersions = await getProjectFixversions(
        jiraProjectKey
      );
      console.log("jiraProjectFixVersions", jiraProjectFixVersions);

      if (!jiraProjectFixVersions) {
        return;
      }

      console.log(jiraProjectFixVersions);

      const existingFixVersion = name
        ? jiraProjectFixVersions.find((c) => c.name == name)
        : undefined;
      let fixVersion = existingFixVersion;
      !fixVersion && console.warn(`Failed to find FixVersion "${name}"`);

      if (!fixVersion && CREATE_MISSING_VERSION) {
        console.warn(`Going to add a new fix version "${name}" in Jira...`);
        fixVersion = await createFixVersion(
          name,
          startDate,
          endDate,
          jiraProjectKey
        ).then(async (data) => {
          return data;
        });
      }

      return fixVersion;
    })
);
/* 
if dest. field accept a single value unccoment the line 131, and comment the line 130
*/
return {
  kind: "Value",
  value: fixVersions.filter((v) => !!v),
  // value: fixVersions.filter((v) => !!v)[0] || null,
};
```

### jira > tp

```js
const {
  targetTool,
  sourceTool,
  targetEntity,
  sourceEntity,
  targetField,
  value: { changed },
} = args;
const workSharing = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");
const tpApi = workSharing.getProxy(targetTool);
const jiraApi = workSharing.getProxy(sourceTool);
const getValues = (value) =>
  value === null ? [] : Array.isArray(value) ? value : [value];
const fixVersions = getValues(changed);

const CONFIG = {
  CREATE_MISSING_ITEM: false,
  MULTIPLE_FIXVERSIONS_STRATEGY: {
    USE_MAX_END_DATE: false, //by default will be using the first fixVersion.
    USE_REG_EX: {
      USE: false,
      REG_EX: /\s*\d{2}Q\d{1}/gim, //current regEx *Q1, *Q2 etc.
    },
  },
};

const unAssignPI = {
  kind: "Value",
  value: null,
};

if (fixVersions.length === 0) {
  return unAssignPI;
}

const getJiraFixVersion = async (fixVersions) => {
  return await Promise.all(
    fixVersions.map(async (version) => {
      return jiraApi.getAsync(`rest/api/2/version/${version.id}`);
    })
  );
};

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

const getVersionWithMaxDate = (fixVersions) => {
  const mostRecentDate = new Date(
    Math.max.apply(
      null,
      fixVersions
        .filter((v) => !!v.releaseDate)
        .map((version) => {
          return new Date(version.releaseDate);
        })
    )
  );
  const maxDateFixVersion = fixVersions.find((e) => {
    const d = new Date(e.releaseDate);
    return d.getTime() == mostRecentDate.getTime();
  });
  return maxDateFixVersion ? [maxDateFixVersion] : [];
};

const getfixVersionsDataMatchRegEx = (fixVersions) => {
  return fixVersions.filter((fixVersion) => {
    const piRegEx = new RegExp(
      CONFIG.MULTIPLE_FIXVERSIONS_STRATEGY.USE_REG_EX.REG_EX
    );
    const isPi = piRegEx.test(fixVersion.name);
    !isPi &&
      console.warn(
        `Fix Version ${fixVersion.name} doesn't match regEx "${CONFIG.MULTIPLE_FIXVERSIONS_STRATEGY.USE_REG_EX.REG_EX}" for PI: "*XXQX"`
      );
    return isPi;
  });
};

const jiraFixVersions = await getJiraFixVersion(fixVersions);

const getFixVersion = (fixVersions) => {
  const { MULTIPLE_FIXVERSIONS_STRATEGY } = CONFIG;

  if (
    MULTIPLE_FIXVERSIONS_STRATEGY.USE_MAX_END_DATE ||
    MULTIPLE_FIXVERSIONS_STRATEGY.USE_REG_EX.USE
  ) {
    const maxDateFixVersions = getVersionWithMaxDate(fixVersions) || [];
    const matchRegExFixVersions =
      (MULTIPLE_FIXVERSIONS_STRATEGY.USE_REG_EX.USE &&
        getfixVersionsDataMatchRegEx(fixVersions)) ||
      [];

    if (
      MULTIPLE_FIXVERSIONS_STRATEGY.USE_MAX_END_DATE &&
      MULTIPLE_FIXVERSIONS_STRATEGY.USE_REG_EX.USE
    ) {
      return getVersionWithMaxDate(matchRegExFixVersions)[0];
    } else if (MULTIPLE_FIXVERSIONS_STRATEGY.USE_MAX_END_DATE) {
      return maxDateFixVersions[0];
    } else {
      return matchRegExFixVersions[0];
    }
  } else {
    return fixVersions[0];
  }
};
const fixVersion = getFixVersion(jiraFixVersions);

if (!fixVersion) {
  console.warn(`No FixVersion matching creterias`);
  return unAssignPI;
}

const {
  startDate: startDate,
  releaseDate: endDate,
  name: name,
} = fixVersion || {};

const getArt = async (name) => {
  const [item] = await apiV2.queryAsync("agilereleasetrain", {
    where: `name=="${name}"`,
    select: `{id:id}`,
  });
  return item;
};

const getPiByName = async (name, project) => {
  const [item] = await apiV2
    .queryAsync(targetField.meta.type.id, {
      select: `{id, name}`,
      where: `name == "${name}" and project.id==${project.id}`,
    })
    .catch((e) => {
      console.log(e);
      return [];
    });
  return item;
};

const tpProject = await getProject(targetEntity);

if (!tpProject) {
  return;
}
let tpItem = await getPiByName(name, tpProject);

if (!tpItem) {
  console.warn(
    `Failed to find a Program Increment by name "${name}" in Targetprocess`
  );
  if (CONFIG.CREATE_MISSING_ITEM) {
    if (!startDate || !endDate) {
      console.warn(
        `Start and End Dates are required to create item in ATP, skip adding a new item`
      );
      return;
    }
    console.log(`Creating new ${targetField.meta.type.id}...`);
    tpItem = await tpApi
      .postAsync(`api/v1/${targetField.meta.type.id}?format=json`, {
        body: {
          Name: name,
          Project: tpProject,
          StartDate: startDate,
          EndDate: endDate,
        },
      })
      .then((data) => {
        return data ? { id: data.Id } : null;
      })
      .catch((e) => {
        console.error(
          `Failed to create ${targetField.meta.type.id} in Targetprocess`,
          e
        );
      });
  }
}

return {
  kind: "Value",
  value: tpItem ? tpItem : null,
};
```

### comparator

```js
const {
  sourceFieldValue: { toolValue: tpValue },
  targetFieldValue: { toolValue: jiraValues = [] },
} = args;

const { Name: name } = tpValue || {};
const jiraFixNames = jiraValues.map((v) => v.name);

return name
  ? Boolean(jiraFixNames.find((v) => v === name))
  : Boolean(name) === Boolean(jiraValues.length);
```
