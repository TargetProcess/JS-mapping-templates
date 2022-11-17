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
