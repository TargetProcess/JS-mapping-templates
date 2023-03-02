## JIRA > ATP

### Identical mappings should be applied for both:

### Tags < Components
### Tags < Labels

```

const proxy = context.getService('workSharing/v2');
const sourceTool = args.sourceTool;
const jiraApi = proxy.getProxy(sourceTool);
const sourceEntity = args.sourceEntity;

const values = await jiraApi.getAsync(`rest/api/2/issue/${sourceEntity.sourceId}`).then(data=> {
    const {components = [], labels = []} = data.fields;
    return [...components.map(v=> v.name), ...labels].join(',')
}).catch(e=> {
    console.error(e);
    return undefined;
})

return {
    kind:'Value',
    value: values ? values : []
}

```
