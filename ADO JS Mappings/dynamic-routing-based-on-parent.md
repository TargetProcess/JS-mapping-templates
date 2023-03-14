
## Dynamic routing based on parent item

```js
const workSharing = context.getService("workSharing/v2");
const targetTool = args.targetTool;
const sourceTool = args.sourceTool;
const azure = workSharing.getProxy(sourceTool);
const apiV2 = context.getService("targetprocess/api/v2");

const childEntities = ['Capability','Feature', 'User Story']
.map(entityType => (entityType || "").toUpperCase());

async function getIssues(issues, n = 10) {
    const a = [...issues];
    const chunks = new Array(Math.ceil(a.length / n))
        .fill(void 0).map(_ => a.splice(0, n));
    const results = [];
    for (const chunk of chunks) {
        const result = await Promise.all(chunk.map(async e => await azure.getAsync(`_apis/wit/workitems/${e.sourceId}?$expand=relations&api-version=6.0`).catch((e)=>{
            console.log(e)
            return undefined
        })));
        results.push(...result)
    }
    return results
}
const workItems = await getIssues(args.entities);

const indexedIssues = new Map(workItems
    .map(workItem => [
        workItem?.id, workItem
    ]));

const getParent = (relations) => {
  if (!relations) {
    return undefined;
  }
  return relations.filter(relation=> relation?.rel=='System.LinkTypes.Hierarchy-Reverse' && relation?.attributes.name=='Parent')[0]
}


const getIdFromUrl = (url) => {
  console.log(url)
  return url ? url.split('/').pop() : undefined;
}

const getAzDoItem = async(id)=> {
  if (!id) {
    console.warn(`id is not defined`);
    return undefined
  }
 return await azure.getAsync(`_apis/wit/workitems/${id}?fields=System.WorkItemType&api-version=6.0`).catch(e=> {
    console.error(e);
    console.warn(`Failed to get Parent Item`);
    return undefined;
  })
}

const getIssueShare = async (sourceId, sourceType) => {
  console.log('SourceID', sourceId, "SourceType", sourceType)
    const [share] = await workSharing.getEntityShares({
        sourceId: `${sourceId}`,
        sourceType: sourceType,
        tool: sourceTool
    })
    return share;
}

const getScopeForIssue = async (e) => {
const issue = indexedIssues.get(Number(e.sourceId));
console.log(issue)
if (issue) {
  const parentLink = getParent(issue?.relations);

  console.log(parentLink)

  if (!parentLink) {
    console.warn(`There is no parent item for the work item ${JSON.stringify(e)}`)
    return undefined
  }

  const parentItem = await getAzDoItem(getIdFromUrl(parentLink?.url));
  console.log(parentItem)
  if (!parentItem) {
    return undefined;
  }
          const entityShares = await getIssueShare(parentItem.id, parentItem.fields["System.WorkItemType"]);
          console.log(entityShares)
        if (entityShares) {
            const issueShareProject = await apiV2.getByIdAsync(entityShares.sourceType, parseInt(entityShares.sourceId, 10), {
                select: `{project}`
            })
            if (!issueShareProject) {
                console.log(`Failed to get project for the entity ${entityShares.sourceId}`);
                return undefined
            }
            return {
                entity: e,
                targetScope: {
                    kind: 'project',
                    sourceId: `${issueShareProject.project.id}`
                }
            }
        } else {
            console.warn(`Could not able to find a parent item in Targetprocess for the AzDo issue "${e.sourceId}"`)
            return undefined
        }

} else {
  return undefined;
}
}

const results =  await Promise.all(args.entities
.filter(entity=> childEntities.includes((entity.entityType || "").toUpperCase()))
.map(async (e) => {
    return getScopeForIssue(e);
  }))
console.log(results);
return results.filter(r => !!r);

```
