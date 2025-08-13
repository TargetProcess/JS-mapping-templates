const { tis, mapping, tool, mappingId } = args.data;
const sync = context.getService("workSharing/v2");
const jiraApi = sync.getProxy(tool);
const ACCOUNT = Object(args).Account;
const sourceTool = { id: ACCOUNT, type: "Targetprocess" };

function Handler() {
  this.tis = tis;
  this.errors = [];
  this.successMessages = [];
  this.inforMessages = [];
  this.mapping = mapping;
  this.tool = tool;
  this.sourceTool = sourceTool;

  this.getLogs = () => {
    return [this.errors, this.successMessages, this.inforMessages];
  };

  this.getAllSprints = (boardId) => {
    let allSprints = [];
    let sprints;
    let startAt = 0;
    const pageSize = 10;

    const fetchSprints = async () => {
      try {
        sprints = await jiraApi.getAsync(
          `rest/agile/1.0/board/${boardId}/sprint?maxResults=${pageSize}&startAt=${startAt}&state=closed`
        );
        allSprints.push(...sprints.values);
        startAt += sprints.maxResults;
      } catch (error) {
        console.error(`Error fetching sprints: ${error.message}`);
      }
    };

    const shouldFetchMore = () => sprints && !sprints.isLast;

    const fetchAllSprints = async () => {
      await fetchSprints();

      while (shouldFetchMore()) {
        await fetchSprints();
      }
    };

    return fetchAllSprints().then(() => Promise.resolve(allSprints));
  };
  this.linkSprints = function (sprint, ti) {
    const entity = {
      sourceEntity: {
        sourceId: `${ti.id}`,
        sourceType: "teamIteration",
        tool: sourceTool,
      },
      mappingId: mappingId,
      targetOverrides: {},
      targetTool: tool,
      targetEntityRef: {
        sourceId: `${sprint.id}`,
        sourceType: "custom_entity_type_sprint",
        tool: tool,
      },
      stateTransfer: {
        kind: "source",
      },
    };

    return sync
      .shareEntity(Object(entity))
      .then(() => {
        this.successMessages.push(
          `Successfully linked Team Iteration ${ti.id} - "${ti.name}" with Jira sprint: "${sprint.name}"`
        );
      })
      .catch((e) => {
        this.errors.push(
          `Failed to link Team Iteration. ${ti.id} - "${ti.name}" with the Jira sprint: "${sprint.name}": ${sprint.id} on the board "${sprint.originBoardId}". Error: ${e.message}`
        );
      });
  };

  this.getSharedIssue = function ({ id, name }) {
    return sync
      .getEntityShares(
        Object({
          sourceId: `${id}`,
          sourceType: `teamiteration`,
          tool: this.sourceTool,
        })
      )
      .then((sharedItem) => {
        const [entity] = sharedItem;
        if (entity) {
          this.inforMessages.push(`Team Iteraion "${name}" is alredy shared. `);
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });
  };
  // this.processTeamIteration = function (ti, mapping) {
  //   const { team, id, name } = ti;
  //   const teamMapping = this.mapping.find(mapping => Number(mapping.team.id) === Number(team));
  //   if (!teamMapping) {
  //     throw new Error(`Failed to find board Id for the team. "${JSON.stringify(team)}"`);
  //   }
  //   return this.getSharedIssue(ti)
  //     .then((data) => {
  //       if (data) return;
  //       return this.getAllSprints(teamMapping.board.id);
  //     })
  //     .then((sprints) => {
  //       if (!sprints) return;
  //       const jiraSprint = sprints.find(sprint => sprint.name === name);
  //       if (!jiraSprint) {
  //         throw new Error(`Failed to find sprint by name "${name}" in Jira on the board "${teamMapping.board.id}"`)
  //       }
  //       return this.linkSprints(jiraSprint, ti);
  //     })
  //     .catch(e => {
  //       this.errors.push(e);
  //     })
  // }

  this.processTeamIteration = async function (ti) {
    const { team, id, name } = ti;
    const teamMapping = this.mapping.find(
      (mapping) => Number(mapping.team.id) === Number(team)
    );
    if (!teamMapping) {
      throw new Error(
        `Failed to find board Id for the team. "${JSON.stringify(team)}"`
      );
    }
    const isShared = await this.getSharedIssue(ti);
    if (isShared) return;

    const sprints = await this.getAllSprints(teamMapping.board.id);
    if (!sprints) return;

    const jiraSprint = sprints.find((sprint) => sprint.name === name);
    if (!jiraSprint) {
      throw new Error(
        `Failed to find sprint by name "${name}" in Jira on the board "${teamMapping.board.id}"`
      );
    }
    await this.linkSprints(jiraSprint, ti);
  };
  // this.processAll = function () {
  //   return Promise.all(this.tis.map(teamIteration => {
  //     return this.processTeamIteration(teamIteration);
  //   }))
  // }

  this.processAll = async function () {
    for (const teamIteration of this.tis) {
      await this.processTeamIteration(teamIteration);
    }
  };
}

const handler = new Handler();
try {
  await handler.processAll();

  const [errors, messages, info] = handler.getLogs();

  if (messages.length) {
    console.log(messages.join("\n"));
  }

  if (info.length) {
    console.log(info.join("\n"));
  }

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }
} catch (e) {
  throw new Error(e);
}
