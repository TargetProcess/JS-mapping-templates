const sync = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");
const utils = require("utils");
const commands = [];
const profiles = await sync.getProfiles();
const PROFILE_NAME = "0.0 Prod JIRA to ATP";
const teamIterationIds = [702507]; /*Input specific Team Iteration IDs if needed*/
const currentProfile = profiles.find(
  (p) => (p.name || "").toUpperCase() === PROFILE_NAME.toUpperCase()
);

if (!currentProfile) {
  console.log(`Failed to find profile by name: "${PROFILE_NAME}"`);
  return;
}

const mappingId = currentProfile.mappings[0].id;
const jiraTool = currentProfile.targetTool;
const jiraApi = sync.getProxy(jiraTool);

const getMappingTeamBoardIds = (profiles) => {
  const teamBoardMapping = [];
  profiles
    .filter((profile) => profile.targetTool.id === jiraTool.id)
    .forEach((profile) => {
      profile.mappings.forEach((mapping) => {
        mapping.typeMappings.forEach((typeMapping) => {
          if (
            typeMapping.settings &&
            typeMapping.settings &&
            typeMapping.settings.kind ===
              "TargetprocessTeamIterationToJiraSprint"
          ) {
            teamBoardMapping.push(...typeMapping.settings.mappings);
          }
        });
      });
    });

  return teamBoardMapping;
};

const teamBoardIdsMapping = getMappingTeamBoardIds(profiles);

if (!teamBoardIdsMapping.length) {
  console.log(`Faield to find mapped teams.`);
  return;
}

/* and StartDate>=Today */
const teamIterations = await apiV2.queryAsync("teamiteration", {
  where: `team.id in ${JSON.stringify(
    teamBoardIdsMapping.map((mapping) => Number(mapping.team.id))
  )} 
  and isCurrent=false
  ${teamIterationIds.length > 0 ? `and id in [${teamIterationIds}]` : ""}`,
  select: `{id, name, team:team.id}`,
  orderBy: `endDate desc`,
});

const CHUNK_SIZE = 4;

const chunks = teamIterations.reduce((acc, ti, i) => {
  const chunkIndex = Math.floor(i / CHUNK_SIZE);
  if (!acc[chunkIndex]) {
    acc[chunkIndex] = [];
  }
  acc[chunkIndex].push(ti);
  return acc;
}, []);

console.log(chunks);

return chunks.map((chunk) => {
  return utils.activateNamedTrigger("process-ti", {
    tis: chunk,
    mapping: teamBoardIdsMapping,
    tool: jiraTool,
    mappingId,
  });
});
