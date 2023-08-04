### The mappings allows adding a link to tp item to weblinks.

## jira > tp, tp < jira

## fields: id <> key

![image](https://github.com/TargetProcess/JS-mapping-templates/assets/25883081/36df9a0e-f828-40a4-982e-503e4a2fc975)

```js
const isTpSource = args.account === args.sourceTool.id;

const { targetEntity, sourceEntity, targetTool, sourceTool } = args;
const jiraTool = isTpSource ? targetTool : sourceTool;
const jiraEntity = isTpSource ? targetEntity : sourceEntity;
const tpEntity = isTpSource ? sourceEntity : targetEntity;
const tpTool = isTpSource ? sourceTool : targetTool;

const jiraApi = context.getService("workSharing/v2").getProxy(jiraTool);
const link = `https://${tpTool.id}/entity/${tpEntity.sourceId}`;

try {
  const jiraRemoteLinks = await jiraApi.getAsync(
    `rest/api/2/issue/${jiraEntity.sourceId}/remotelink`
  );
  if (!jiraRemoteLinks) {
    return;
  }

  const isAdded = jiraRemoteLinks.find(
    (webLink) => (webLink.object.url || "").toLowerCase() === link.toLowerCase()
  );

  if (!Boolean(isAdded)) {
    const response = await jiraApi.postAsync(
      `rest/api/2/issue/${jiraEntity.sourceId}/remotelink`,
      {
        body: { object: { url: link, title: link } },
      }
    );
    console.log("res: ", response);
  }
} catch (e) {
  console.error(e);
}
```

### comparator

```js
const isTpSource = args.account === args.sourceTool.id;

const { targetEntity, sourceEntity, targetTool, sourceTool } = args;
const jiraTool = isTpSource ? targetTool : sourceTool;
const jiraEntity = isTpSource ? targetEntity : sourceEntity;
const tpEntity = isTpSource ? sourceEntity : targetEntity;
const tpTool = isTpSource ? sourceTool : targetTool;

const jiraApi = context.getService("workSharing/v2").getProxy(jiraTool);
const link = `https://${tpTool.id}/entity/${tpEntity.sourceId}`;

try {
  const jiraRemoteLinks = await jiraApi.getAsync(
    `rest/api/2/issue/${jiraEntity.sourceId}/remotelink`
  );
  if (!jiraRemoteLinks) {
    return;
  }

  const isAdded = jiraRemoteLinks.find(
    (webLink) => (webLink.object.url || "").toLowerCase() === link.toLowerCase()
  );

  return Boolean(isAdded);
} catch (e) {
  console.error(e);
}
```
