
### TP > ADO

```js
const workSharing = context.getService('workSharing/v2');
const tpApiV2 = context.getService('targetprocess/api/v2');
const targetTool = args.targetTool;
const adoApi = workSharing.getProxy(targetTool);
const sourceArtefact = args.sourceEntity;
const targetArtefact = args.targetEntity;


const updateAreaPathFeildsinTp = async(entity,areaPath, fieldName)=>{
const tpApi = workSharing.getProxy(args.sourceTool);
await tpApi.postAsync(`api/v1/${entity.entityType}/${entity.sourceId}`,{
    body:{
        [fieldName]:areaPath
    }
}).catch(e=> {
    console.log(e);
    return undefined;
})
}

const getSourceEntity = async (tpEntity) => {
    return await tpApiV2.getByIdAsync(tpEntity.entityType, Number(tpEntity.sourceId), {
        select:`{
        portfolio:Project.Name,
        art:AgileReleaseTrain.Name,
        team:AssignedTeams.Select(Team.Name).first()}`
    }).then(data=> {
        return {portfolio:data?.portfolio, art:data?.art, team:data?.team}
    }).catch(e=> {
        console.error(e);
        return undefined;
    })
}

const getTargetEntity = async (entity)=> {
return  await adoApi.getAsync(`_apis/wit/workitems/${entity.sourceId}?api-version=6.0`).catch(e=> {
    console.log(e);
    return undefined;
});
}

const getRoot = (adoEntity) => {
return adoEntity?.fields["System.TeamProject"];
}

const getAreaPath = async(root, area)=> {
    const res = await adoApi.getAsync(`${root}/_apis/wit/classificationnodes/areas/${area}?api-version=6.0`).then(data=> {
        if (data) {
            return true;
        } else return false
    }).catch(e=> {
        console.warn('Failed to get Area Path: ',e);
        return false;
    })
    return res;
}

const adoEntity = await getTargetEntity(targetArtefact);
const rootNode = getRoot(adoEntity);

if (!rootNode) {
    console.error(`Faield to get root node`);
    return undefined;
}

const {portfolio, art, team} = await getSourceEntity(sourceArtefact) || {};


const generateAreaPath = (...nodes) => {
  const adoNodes = [];
  for (let i in nodes) {
    if (nodes[i] !== undefined) {
      adoNodes.push(nodes[i]);
    } else break;
  }
  console.log(adoNodes)
  return adoNodes;
}

const validatePath = async (root, adoNodes = []) => {
  if (adoNodes.length) {
    const areaPath = `${root}\\${adoNodes.join("\\")}`;
    const isAreaPath = await getAreaPath(root, adoNodes.join("\\"));
    if (isAreaPath) {
      return areaPath;
    } else {
      console.warn(`Area Path "${areaPath}" doesn't exit in ADO`);
      return await validatePath(root, adoNodes.slice(0, -1));
    }
  } else {
    return root;
  }
};


if (portfolio || art) {

if(!art) {
    console.warn(`ART is not attached to the entity`);
}

console.log(portfolio, art, team)
const areaPathNodes = generateAreaPath(portfolio, art, team);
const area = await validatePath(rootNode, areaPathNodes);

  return {
    kind: "Value",
    value: area,
  };

} else {
    return {
        kind:"Value",
        value:rootNode
    }
}


```

### ADO > TP
```js
const areaPath = args.value.changed;
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
console.log(areaPath);
const [root,portfolio,art] = areaPath ? areaPath.split("\\") : [];
let tpArt = null;
const CREATE_MISSING_ART = true;
const fieldId = args.targetField.id;

const getARTbyName = async (name) => {
  const [art] = await apiV2
    .queryAsync("AgileReleaseTrain", {
      select: `{id:id}`,
      where: `name=="${name}"`,
    })
    .catch((e) => {
      console.log(e);
      return undefined;
    });
  return art;
};

const createART = async (name) => {
  return tpApi
    .postAsync("api/v1/AgileReleaseTrain?format=json", {
      body: {
        Name: name,
      },
    })
    .then((data) => {
      return data ? { id: data.Id } : null;
    })
    .catch((e) => {
      console.log(e);
      return undefined;
    });
};

if (!art) {
  return {
  kind: "Value",
  value: null,
};
}

tpArt = await getARTbyName(art);

if (!tpArt) {
  console.warn(`Failed to find ART "${art}" in Targetprocess`);
  if (CREATE_MISSING_ART){
  console.warn(`Creating new ART... ==> "${art}"`);
    tpArt = await createART(art)
  }  
}

return {
  kind: "Value",
  value: art && tpArt ? tpArt : null,
};

```
