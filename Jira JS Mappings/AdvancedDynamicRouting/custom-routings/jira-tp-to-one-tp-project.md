## Route data from Jira to TP to one TP project.

### TP_PROJECT_ID should be updated with Targetprocess project

```js
const workSharing = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");
const { sourceTool, targetTool, entities } = args;
const jiraApi = workSharing.getProxy(sourceTool);
const tpApi = workSharing.getProxy(targetTool);
const TP_PROJECT_ID = 1;

//Specify KEYS of Jira Projects that should not be synchronized. ['KEY1', 'KEY2']
const DO_NOT_SYNC_JIRA_PROJECTS = [];

async function getIssues(issues, n = 5) {
  const a = [...issues];
  const chunks = new Array(Math.ceil(a.length / n))
    .fill(void 0)
    .map((_) => a.splice(0, n));
  const results = [];
  for (const chunk of chunks) {
    const result = await Promise.all(
      chunk.map(async (e) => {
        try {
          return await jiraApi.getAsync(
            `rest/api/2/issue/${e.sourceId}?expand=names`
          );
        } catch (e) {
          console.error(e);
        }
      })
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
    console.warn(e);
    throw new Error(e);
  }
}

const issues = await getIssueSearch(entities).catch(async (e) => {
  return await getIssues(entities);
});

const indexedIssues = new Map(
  issues.filter((v) => !!v).map((v) => [v?.key, v])
);

const getTargetScopeForWorkItems = async (e) => {
  console.info(`Resolving scope for entity ${e.sourceId}`);

  const issue = indexedIssues.get(e.sourceId);
  if (issue) {
    const { project } = Object(issue).fields;

    const isProjectKeyInBlackList = DO_NOT_SYNC_JIRA_PROJECTS.some(
      (key) => key.toUpperCase() === project.key.toUpperCase()
    );

    if (
      Boolean(isProjectKeyInBlackList) &&
      DO_NOT_SYNC_JIRA_PROJECTS.length > 0
    ) {
      console.warn(
        `JIRA Project KEY "${project.key}" is not allowed for sync.`
      );
      return undefined;
    }

    return {
      entity: e,
      targetScope: {
        kind: "project",
        sourceId: `${TP_PROJECT_ID}`,
      },
    };
  }
  console.log(`issue with key ${e.sourceId} not found`);
  return undefined;
};

const result = await Promise.all(
  entities.map(async (e) => {
    const issue = indexedIssues.get(e.sourceId);

    if (!issue) {
      console.log(`Faield to get issue by key "${e.sourceId}"`);
      return undefined;
    }

    return await getTargetScopeForWorkItems(e);
  })
);

return result.filter((r) => !!r);
```
