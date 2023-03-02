## Dynamic routing based on isue epic share.
Use-case:  
When share issue from jira. Getn issue epic. If epic is shared, get epic share project.
Share issue to epic share porject.

```js
const workSharingService = context.getService('workSharing/v2')
const apiV2 = context.getService('targetprocess/api/v2')
const tool = args.sourceTool
const jiraProxy = workSharingService.getProxy(tool)

const getIssueEpicFieldId = async (issue) => {
  const editMetaUrl = `/rest/api/2/issue/${issue.sourceId}/editmeta`
  const editMeta = await jiraProxy.getAsync(editMetaUrl)
  const fields = editMeta.fields
  const keys = Object.keys(fields)
  const epicLinkFieldKey = keys.find(k => fields[k].name === 'Epic Link')
  return epicLinkFieldKey
}

async function isEpic(issueId){
    try{
        const isEpicResponse = await jiraProxy.getAsync(`rest/agile/1.0/epic/${issueId}`)
        return !!isEpicResponse
    }catch{
        return false
    }
}

const getIssueEpicIfSameProject = async(issue) => {
  const epicFieldId = await getIssueEpicFieldId(issue)
  const issueResponse = await jiraProxy.getAsync(`/rest/api/2/issue/${issue.sourceId}`)

  const issueEpicKey = issueResponse.fields[epicFieldId]
  if(issueEpicKey){
    const epic = await jiraProxy.getAsync(`/rest/api/2/issue/${issueEpicKey}`)
    if(epic){
      if(epic.fields.project.id === issueResponse.fields.project.id){
        return {
          sourceId: epic.key,
          sourrceType: epic.fields.issuetype.id
        }
      }else{
        console.error(`Issue and Epic projects does not match.`)
      }
    }
  }
}

const getTargetScopeForNotEpicEntity = async (e) => {
   console.info(`Resolving scope for not epic entity ${e.sourceId}`)
  // Getting epic for issue
  const issueEpic = await getIssueEpicIfSameProject(e)
  if(issueEpic){
  // Getting issue epic shares
  const epicShares = await workSharingService.getEntityShares({
    sourceId: issueEpic.sourceId,
    sourceType: issueEpic.sourrceType,
    tool: tool
  })
  if(epicShares && epicShares.length) {
    const epicShare = epicShares[0]
    // If issue epic shares. Get shared to entity project.
    const epicShareProject = await apiV2.getByIdAsync(epicShare.sourceType, parseInt(epicShare.sourceId, 10), {
      select: `{project}`
    })
    // If was able to resolve issue epic shared entity project. Share entity to this project.
    const epicShareProjectId = epicShareProject.project.id
    if(epicShareProjectId){
        return {
        entity: e,
        targetScope: {
          kind: 'project',
          sourceId: `${epicShareProjectId}`
        }
      }
    }
  }
  else{
      console.error('Failed to get issue epic shares')
  }
  }else{
      console.error('Failed to get issue epic')
    }
  return undefined
}

const getTargetScopeForEpicEntity = async (e) => {
  console.info(`Resolving scope for epic entity ${e.sourceId}`)
  const tpProjectKeyCustomFieldName = 'JiraProjectKey' // Should be defined without witespaces if any
  const epic = await jiraProxy.getAsync(`/rest/api/2/issue/${e.sourceId}`)
  if(epic) {
    const projectKey = epic.fields.project.key
    const matchedPortfolioEpicsResponse = await apiV2.queryAsync('portfolioepic', {
      where: `${tpProjectKeyCustomFieldName}='${projectKey}'`
    })
    if(matchedPortfolioEpicsResponse && matchedPortfolioEpicsResponse.length) {
      const portfolioepic = matchedPortfolioEpicsResponse[0]
      return {
        entity: e,
        targetScope: {
          kind: 'portfolioepic',
          sourceId: `${portfolioepic.id}`
        }
      }
    } else {
      console.error(`Was not able find portfolioepic with ${tpProjectKeyCustomFieldName}=${projectKey}`)
    }
  } else {
    console.error(`Epic with key ${e.sourceId} not found`)
  }
  return undefined
}

const result = await Promise.all(args.entities
  .map(async e => {
    if(await isEpic(e.sourceId)) {
      return getTargetScopeForEpicEntity(e)
    } else {
      return getTargetScopeForNotEpicEntity(e)
    }
  }))


console.log(JSON.stringify(result))
return result.filter(r => !!r)
```