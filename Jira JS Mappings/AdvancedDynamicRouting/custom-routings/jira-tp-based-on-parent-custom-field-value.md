### Epic/Initiative based on "ATP Portfolio" custom field value and Story/Bugs based on parent Epic.

```js
console.log(args.entities);

const workSharing = context.getService("workSharing/v2");
const jiraApi = workSharing.getProxy(args.sourceTool);
const tpApi = workSharing.getProxy(args.targetTool);
const apiV2 = context.getService("targetprocess/api/v2");
const tool = args.sourceTool;
const PORTFOLIO_FIELD_NAME = "ATP Portfolio";
const CREATE_MISSING_PORTFOLIO = false;

//helper function to get issues in parallel, n - default value that defines a number of issues fetching in parallel.
async function getIssues(issues, n = 10) {
  const a = [...issues];
  const chunks = new Array(Math.ceil(a.length / n))
    .fill(void 0)
    .map((_) => a.splice(0, n));
  const results = [];
  for (const chunk of chunks) {
    const result = await Promise.all(
      chunk.map(
        async (e) =>
          await jiraApi
            .getAsync(`rest/api/2/issue/${e.sourceId}?expand=names`)
            .catch((e) => {
              console.error(e);
            })
      )
    );
    results.push(...result);
  }
  return results;
}

async function getIssueSearch(issues) {
  try {
    return await jiraApi
      .getAsync(
        `rest/api/2/search?jql=issuekey in (${issues
          .map((v) => v.sourceId)
          .join(",")})&expand=names`
      )
      .then((v) => {
        const names = v.names;
        const issues = v.issues;
        return issues.map((v) => {
          return { ...v, names };
        });
      });
  } catch (e) {
    throw new Error(JSON.stringify(e));
  }
}

const issues = await getIssueSearch(args.entities).catch(async (e) => {
  console.log("getIssueSearch failed with the error: ", e);
  return await getIssues(args.entities);
});

if (issues && !issues.length) return;

const indexedIssues = new Map(
  issues.filter((f) => !!f).map((v) => [v && v.key, v])
);

const getIssueFieldId = (jiraIssue, customFieldName) => {
  const customFieldId = Object.keys(jiraIssue.names).find(
    (key) => jiraIssue.names[key] === customFieldName
  );
  return customFieldId;
};

const getProject = async (portfolio) => {
  const [project] = await apiV2.queryAsync("Project", {
    where: `name="${portfolio}"`,
  });
  return project;
};

const getIssueShare = async (sourceId, sourceType) => {
  const [share] = await workSharing.getEntityShares(
    Object({
      sourceId: sourceId,
      sourceType: sourceType,
      tool: tool,
    })
  );
  return share;
};

const getTargetScopeForParent = async (e) => {
  console.info(`Resolving scope for entity ${e.sourceId}`);
  const item = indexedIssues.get(e.sourceId);
  if (item) {
    const portfolioFieldId = getIssueFieldId(item, PORTFOLIO_FIELD_NAME);
    const portfolio = item.fields[portfolioFieldId];

    console.log("Portfolio", portfolio);

    if (!portfolio) {
      console.warn(`Portfolio was not specified for the item ${e.sourceId}`);
      return undefined;
    }

    let project = await getProject(portfolio.value);

    if (!project && CREATE_MISSING_PORTFOLIO) {
      CREATE_MISSING_PORTFOLIO &&
        console.log(`Going to create a new portfolio: "${portfolio.value}"`);
      project = await tpApi
        .postAsync("api/v1/project?format=json", {
          body: {
            Name: portfolio.value,
          },
        })
        .then((data) => {
          if (data) {
            return { id: data.Id };
          }
        })
        .catch((e) => {
          console.error(e);
          return;
        });
    }
    if (project) {
      return {
        entity: e,
        targetScope: {
          kind: "project",
          sourceId: `${project.id}`,
        },
      };
    } else {
      console.warn(
        `Was not able to find a project with the name "${portfolio.value}"`
      );
      return undefined;
    }
  } else {
    console.warn(`Jira Epic with key ${e.sourceId} not found`);
    return undefined;
  }
};

const getTargetScopeForNoneParentItems = async (e) => {
  console.info(`Resolving scope for Story/Bug entity ${e.sourceId}`);
  const fieldName = "Epic Link";
  const issue = indexedIssues.get(e.sourceId);
  if (issue) {
    const parentFiledId = getIssueFieldId(issue, fieldName);
    const linkedEpic = issue.fields[parentFiledId];
    if (!linkedEpic) {
      console.warn(`Epic is not attached for the issue ${e.sourceId}`);
      return undefined;
    }

    const epic = await jiraApi
      .getAsync(`/rest/api/2/issue/${linkedEpic}`)
      .catch((err) => {
        console.warn(`${JSON.stringify(err)} for the Epic ${e.sourceId}`);
        return undefined;
      });

    if (!epic) {
      console.warn(
        `Failed to retrive Epic ${linkedEpic} for the issue ${e.sourceId}`
      );
      return undefined;
    }
    const epicShares = await getIssueShare(epic.key, epic.fields.issuetype.id);
    if (epicShares) {
      const issueShareProject = await apiV2.getByIdAsync(
        epicShares.sourceType,
        parseInt(epicShares.sourceId, 10),
        {
          select: `{project}`,
        }
      );
      if (!issueShareProject) {
        console.log(
          `Failed to get project for the entity ${epicShares.sourceId}`
        );
        return undefined;
      }
      return {
        entity: e,
        targetScope: {
          kind: "project",
          sourceId: `${issueShareProject.project.id}`,
        },
      };
    } else {
      console.warn(
        `Was not able to find parent in Targetprocess with the key ${epic.key} for the issue ${e.sourceId}`
      );
      return undefined;
    }
  } else {
    console.warn(`Item with key ${e.sourceId} not found`);
    return undefined;
  }
};

const result = await Promise.all(
  args.entities.map(async (e) => {
    const issue = indexedIssues.get(e.sourceId);
    if (issue) {
      const type = issue.fields.issuetype.name.toLowerCase();
      if (
        type === "Initiative".toLowerCase() ||
        type === "Epic".toLowerCase()
      ) {
        return getTargetScopeForParent(e);
      } else {
        return getTargetScopeForNoneParentItems(e);
      }
    } else {
      return undefined;
    }
  })
);

console.log(JSON.stringify(result));
return result.filter((r) => !!r);
```
