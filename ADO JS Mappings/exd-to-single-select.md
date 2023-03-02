### ADO > ATP

```js
const cv = args.value.changed;
const field = args.targetField;
const workSharing = context.getService('workSharing/v2');
const tpApi = workSharing.getProxy(args.targetTool);
const apiV2 = context.getService('targetprocess/api/v2');
const targetItem = args.targetEntity;
const CREATE_MISSING_ITEM = true;

const createItem = async (name, entityType, project) => {
if (!name || !project || !entityType) {
    return;
}
return await tpApi.postAsync(`api/v1/${entityType}?format=json`,{
    body:{
        name:name,
        project:project
    }
}).then(data=> {
    return data ? {id: data.Id} : undefined;
})
}

const getProject = async (item)=> {
    return await apiV2.getByIdAsync(item.entityType, Number(item.sourceId),{
        select:`{id:project.id}`
    })
}

const getitem = async (name)=> {
    const product = await apiV2.queryAsync(field.id, {
        select:`{id:id}`,
        where:`name=="${name}"`
    }).then(async data=> {
        const [item] = data;
        if (!item && CREATE_MISSING_ITEM) {
            console.log(`Going to create a new item "${name}"`);
            const project = await getProject(targetItem);
            return await createItem(name, field.id, project);
        }
        return item;
    })
    return product;
}

if (cv) {

const tpItem = await getitem(cv);

return {
    kind:'Value',
    value:tpItem ? tpItem : null
}

} else {
    return {
        kind:'Value',
        value:null
    }
}





```

### ATP > ADO

```js
const cv = args.value.changed;

return {
    kind:'Value',
    value: cv ? cv.Name : null
}
```


