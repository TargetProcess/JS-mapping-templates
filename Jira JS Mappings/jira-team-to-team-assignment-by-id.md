These mappings are only for the new "Team" field introduced by Jira.

Team entity in Targetprocess should have a custom field "Jira Team Id".
There is no API in JIRA to fetch all teams, if the field "Jira Team Id" is empty, the team cannot be found and assigned in JIRA.

### TP > JIRA

```js
const {
  sourceEntity: { sourceId, entityType },
  sourceTool,
} = args;
const workSharing = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");
const JIRA_ID = "Jira Team Id"; //field for keeping jira team id, should be specifed without spaces

try {
  const [teamAssignment] = await apiV2.queryAsync("teamassignment", {
    select: `{name:team.name, id:team.id, jirateamid:team.${JIRA_ID.replace(
      /\s/g,
      ""
    ).toLowerCase()}}`,
    where: `assignable.id==${sourceId}`,
  });

  if (!teamAssignment) {
    console.warn(`Team is not assigned on ${entityType}:${sourceId}`);
    return {
      kind: "Value",
      value: null,
    };
  }

  const { name, jirateamid = null, id } = teamAssignment;

  !jirateamid &&
    console.error(`Jira Team ID is not specified for the Team: ${name}-${id}`);

  return {
    kind: "Value",
    value: jirateamid,
    options: {
      applyRawValue: true,
    },
  };
} catch (err) {
  console.error(err);
}
```

### Jira > Targetprocess

```js
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const jiraApi = workSharing.getProxy(args.sourceTool);
const fieldId = args.sourceField.id;
const sourceIssue = args.sourceEntity;
const ENTITY_TYPE_NAME = "Team";
const JIRA_ID = "Jira Team id";
const CREATE_MISSING_ITEM = true;

const fetchIssue = async (issue) => {
  return await jiraApi.getAsync(`rest/api/2/issue/${issue}`).catch((e) => {
    console.error(e);
    return undefined;
  });
};

const getField = (issue, fieldId) => {
  if (!issue) return;
  return issue?.fields?.[fieldId];
};

const issue = await fetchIssue(sourceIssue.sourceId);
const fieldValue = getField(issue, fieldId);

const getItemIdByNameById = async (tName, tId) => {
  const trimedField = JIRA_ID.replace(/\s/g, "").toLowerCase();
  const [item] = await apiV2.queryAsync(ENTITY_TYPE_NAME, {
    select: `{id:id, name:name, jirateamid:${trimedField}}`,
    where: `name="${tName}" or 	${trimedField}="${tId}"`,
  });
  return item;
};

const updateTPitem = async (id, name, jiraid) => {
  console.log(`Upadating ${ENTITY_TYPE_NAME}... ${name}`);
  return await tpApi
    .postAsync(`api/v1/${ENTITY_TYPE_NAME}?format=json`, {
      body: {
        Name: name,
        Id: id,
        [JIRA_ID]: jiraid,
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

const createItem = async (name, jiraid) => {
  console.log(`Creating ${ENTITY_TYPE_NAME}... ${name}`);
  return await tpApi
    .postAsync(`api/v1/${ENTITY_TYPE_NAME}?format=json`, {
      body: {
        Name: name,
        [JIRA_ID]: jiraid,
      },
    })
    .then((data) => {
      if (data) {
        const cfs = data?.CustomFields || [];
        const jiraIdCfValue = cfs.find(
          (v) => v.Name.toLowerCase() === JIRA_ID.toLowerCase()
        );
        return {
          id: data.Id,
          name: data.Name,
          jirateamid: jiraIdCfValue?.Value ? jiraIdCfValue.Value : undefined,
        };
      }
    })
    .catch((e) => {
      console.error(e);
      return `Failed to create Team ${ENTITY_TYPE_NAME}`;
    });
};

try {
  if (fieldValue) {
    const optionId = fieldValue.id;
    const optionValue = fieldValue.value || fieldValue.name;

    if (!optionValue) {
      console.error(
        `Faield to access the value property for the object: "${JSON.stringify(
          fieldValue
        )}"`
      );
      return;
    }

    const tpItem = await getItemIdByNameById(optionValue, optionId).then(
      async (data) => {
        if (!data) {
          console.warn(
            `Failed to find ${ENTITY_TYPE_NAME} by name - "${optionValue}" or by option id - "${optionId}" in ATP`
          );
          if (CREATE_MISSING_ITEM) {
            return await createItem(optionValue, optionId);
          }
        }
        return data;
      }
    );

    if (!tpItem) {
      return undefined;
    }

    const { name, id, jirateamid } = tpItem;

    if (name !== optionValue || !jirateamid) {
      console.log(
        "UPDATE: ",
        name,
        optionValue,
        name !== optionValue,
        jirateamid,
        !jirateamid
      );

      const res = await updateTPitem(id, optionValue, optionId);
      console.log(res);
    }

    return {
      kind: "Value",
      value: id ? [{ id }] : [],
    };
  } else {
    return {
      kind: "Value",
      value: [],
    };
  }
} catch (e) {
  console.error(e);
}
```
