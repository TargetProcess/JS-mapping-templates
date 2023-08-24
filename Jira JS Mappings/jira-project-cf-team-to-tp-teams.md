```js
const { targetTool, sourceTool, sourceEntity, targetEntity } = args;
const workSharing = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");
const tpApi = workSharing.getProxy(targetTool);
const jiraApi = workSharing.getProxy(sourceTool);
const FIELD_NAME = "Team";

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

const getIssueFieldId = (jiraIssue = {}, fieldName) => {
  const { names } = Object(jiraIssue);
  if (!names) {
    console.error(`Failed to get custom field names`);
    return;
  }
  const customFieldId = Object.keys(names).find(
    (key) => names[key] === fieldName
  );
  return customFieldId;
};

const getIssue = async (sourceEntity) => {
  return await jiraApi
    .getAsync(`rest/api/2/issue/${sourceEntity.sourceId}?expand=names`)
    .catch((e) => {
      throw new Error(e);
    });
};

const jiraIssue = await getIssue(sourceEntity);

const getTeam = (mapping, ...teams) => {
  const [teamField, teamProject] = teams;
  if (teamField) {
    const { value } = teamField;
    const mappedTeam = mapping.get((value || "").toUpperCase());
    !mappedTeam &&
      console.warn(`CF "${FIELD_NAME}" value: "${value}" is not mapped`);
    return mappedTeam || value;
  } else {
    const { name } = teamProject;
    const mappedProject = mapping.get((name || "").toUpperCase());
    !mappedProject && console.warn(`Jira Project: "${name}" is not mapped`);
    return mappedProject || name;
  }
};

if (jiraIssue) {
  const { fields } = jiraIssue;
  const teamField = fields[getIssueFieldId(jiraIssue, FIELD_NAME)];

  const { project } = fields;

  const teamProjectMapping = new Map(
    CUSTOM_MAPPING_JIRA_PROJECTS_TO_TARGETPROCESS_TEAMS.map((mapping) => [
      mapping[0].toUpperCase(),
      mapping[1],
    ])
  );
  const teamName = getTeam(teamProjectMapping, teamField, project);

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
}
return undefined;
```
