### Jira > TP

```js
const {
  sourceField,
  targetTool,
  sourceTool,
  sourceEntity,
  targetField,
  targetEntity,
  sourceEntityModification: { changed } = {},
} = args;
const workSharing = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");
const jiraAPI = workSharing.getProxy(targetTool);
const tpAPI = workSharing.getProxy(sourceTool);

const CHECK_BOX_FIELD_NAME = "Team Project";

const CUSTOM_MAPPING_JIRA_PROJECTS_TO_TARGETPROCESS_TEAMS = [
  //['Jira Team', 'Team1']
  ["Jira Team 1", "TP Team 1"],
  ["Jira Value 1", "TP Team 2"],
];

const getTeamName = (mapping, ...teams) => {
  const [team] = teams;
  const teamName = mapping.get((team || "").toUpperCase());
  if (!teamName) {
    console.warn(`Targetprocess Team "${team}" is not mapped`);
  }
  return teamName || team;
};

const getCFOptions = async (targetEntity, targetField) => {
  const { id } = targetField;
  const editMeta = await jiraAPI
    .getAsync(`rest/api/2/issue/${targetEntity.sourceId}/editmeta`)
    .catch((e) => {
      console.warn(`Failed to get meta`, e);
      return;
    });
  if (!editMeta) {
    return;
  }
  const { fields = {} } = editMeta;
  const field = fields[id];

  if (!field) {
    console.warn(`Faield to get meta data for the CF "${id}"`);
    return;
  }

  const { allowedValues: values } = field;
  return Array.isArray(values) ? values.map((option) => option.value) : [];
};

const transformMapping = (mapping) => {
  const revertMapping = mapping.map(([jiraValue, tpValue]) => [
    tpValue.toUpperCase(),
    jiraValue,
  ]);
  return new Map(revertMapping);
};

const getAssignedTeam = async () => {
  const [team] = await apiV2.getByIdAsync(
    sourceEntity.entityType,
    Number(sourceEntity.sourceId),
    {
      select: `AssignedTeams.select({name:team.name, isteamproject:team.${CHECK_BOX_FIELD_NAME.toLowerCase().replace(
        /\s*/g,
        ""
      )}})`,
    }
  );
  return team;
};

try {
  const tpTeam = await getAssignedTeam();

  if (tpTeam) {
    const { name, isteamproject } = tpTeam;

    if (isteamproject) {
      console.warn(
        `Skip updating... Team "${name}" is set as "TEAM === JIRA PROJECT"`
      );
      return undefined;
    }

    const cfOptions = await getCFOptions(targetEntity, targetField);

    const teamName = getTeamName(
      transformMapping(CUSTOM_MAPPING_JIRA_PROJECTS_TO_TARGETPROCESS_TEAMS),
      name
    );

    const isOptionAllowed = cfOptions.find(
      (option) => option.toLowerCase() === teamName.toLowerCase()
    );

    if (!isOptionAllowed) {
      console.error(
        `The Option "${teamName}" is not allowed. `,
        `Possible options: "${cfOptions.join(", ")}"`
      );
    }

    return {
      kind: "Value",
      value: teamName,
    };
  } else {
    return {
      kind: "Value",
      value: null,
    };
  }
} catch (e) {
  console.error(e);
}
```

### Jira > TP.

```js
const {
  sourceField,
  targetTool,
  sourceTool,
  sourceEntity,
  targetEntity,
  sourceEntityModification: { changed: { fields } = {} } = {},
} = args;
const teamOption = fields[sourceField.id],
  { project } = fields;

const workSharing = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");
const tpApi = workSharing.getProxy(targetTool);
const jiraApi = workSharing.getProxy(sourceTool);

const CREATE_MISSING_TEAM = false;

const CUSTOM_MAPPING_JIRA_PROJECTS_TO_TARGETPROCESS_TEAMS = [
  //['Jira Team', 'Team1']
  ["Jira Team 1", "TP Team 1"],
  ["Jira Value 1", "TP Team 2"],
];

const createTpTeam = async (name) => {
  if (!name) {
    return;
  }
  try {
    return await tpApi
      .postAsync(`api/v1/Team?format=json`, {
        body: {
          Name: `${name}`,
        },
      })
      .then((data) => {
        return { id: data.Id };
      });
  } catch (e) {
    console.log(e);
  }
};

const getTpTeam = async (name) => {
  if (!name) return;
  return await apiV2.queryAsync("Teams", {
    select: "{id,name}",
    where: `Name in ['${name}']`,
  });
};

const getTeam = (mapping, ...teams) => {
  const [teamOption, teamProject] = teams;
  if (teamOption) {
    const mappedTeam = mapping.get((teamOption || "").toUpperCase());
    !mappedTeam &&
      console.warn(`Custom Field option: "${teamOption}" is not mapped`);
    return mappedTeam || teamOption;
  } else {
    const { name } = teamProject;
    const mappedProject = mapping.get((name || "").toUpperCase());
    !mappedProject && console.warn(`Jira Project: "${name}" is not mapped`);
    return mappedProject || name;
  }
};

const teamProjectMapping = new Map(
  CUSTOM_MAPPING_JIRA_PROJECTS_TO_TARGETPROCESS_TEAMS.map((mapping) => [
    mapping[0].toUpperCase(),
    mapping[1],
  ])
);
const teamName = getTeam(teamProjectMapping, teamOption, project);

let [team] = (await getTpTeam(teamName)) || [];

if (!team) {
  console.warn(`Can't find team for the value: ${JSON.stringify(teamName)}`);
  if (CREATE_MISSING_TEAM && teamName) {
    console.log(`Creating new team...`);
    team = await createTpTeam(teamName);
  }
}

return {
  kind: "Value",
  value: team ? [team] : [],
};
```
