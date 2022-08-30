## 3. TeamIteration <> IterationPath

### 3.1 TP > ADO

```js

const workSharing = context.getService('workSharing/v2');
const tpApiV2 = context.getService('targetprocess/api/v2');
const targetTool = args.targetTool;
const adoApi = workSharing.getProxy(targetTool);
const sourceArtefact = args.sourceEntity;
const targetArtefact = args.targetEntity;

const getSourceEntity = async (tpEntity) => {
    return await tpApiV2.getByIdAsync(tpEntity.entityType, Number(tpEntity.sourceId), {
        select:`{pi:Release.Name, ti:TeamIteration.Name}`
    }).then(data=> {
        return {pi:data?.pi, ti:data?.ti}
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

const getPath = async(root, area)=> {
    const res = await adoApi.getAsync(`${root}/_apis/wit/classificationnodes/Iterations/${area}?api-version=6.0`).then(data=> {
        if (data) {
            return true;
        } else return false
    }).catch(e=> {
        console.warn('Failed to get Iteration Path: ',e);
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

const {pi, ti} = await getSourceEntity(sourceArtefact) || {};

const generatePath = (...nodes) => {

  const adoNodes = [];
  for (let i in nodes) {
    if (nodes[i] !== undefined) {

      adoNodes.push(nodes[i]);
    } else break;
  }
  return adoNodes;
}

const normalizeTiPi = (name)=> {
if (name) {
    const nameSplit = name.split(/\s* \s*/)
    return nameSplit.length===1 ? nameSplit[0] : nameSplit.slice(0,-1).join(' ');
} return name
}

const validatePath = async (root, adoNodes = []) => {
  if (adoNodes.length) {
    const path = `${root}\\${adoNodes.join("\\")}`;
    const isPath = await getPath(root, adoNodes.join("\\"));
    if (isPath) {
      return path;
    } else {
      console.warn(`Iteration Path "${path}" doesn't exit in ADO`);
      return await validatePath(root, adoNodes.slice(0, -1));
    }
  } else {
    return root;
  }
};

if (pi) {
const iterationPathNodes = generatePath(normalizeTiPi(pi), normalizeTiPi(ti));
const iteration = await validatePath(rootNode, iterationPathNodes);
console.log('Iteration Path: ', iteration);
return {
    kind:'Value',
    value:iteration
}

} else {
    return {
        kind:"Value",
        value:rootNode
    }
}

```

### 3.2 ADO > TP

```js
const areaPath = args.value.changed;
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const adoApi= workSharing.getProxy(args.sourceTool);
const srouceEntity = args.sourceEntity;
let tpTi;

const getSourceEntity = async (entity)=> {
return  await adoApi.getAsync(`_apis/wit/workitems/${entity.sourceId}?api-version=6.0`).catch(e=> {
    console.log(e);
    return undefined;
});
}

const getAreaPath = (adoEntity) => {
  const areaPath = adoEntity?.fields["System.AreaPath"];
  const [, , art, team] = areaPath ? areaPath.split("\\") : [];
  if (!art) {
    console.warn(`AreaPath doesn't contain ART, "${areaPath}"`);
  }
  return {art, team};
};

const getIterationPath = (adoEntity) => {
  const iterationPath = adoEntity?.fields["System.IterationPath"];
  const [, pi, ti] = iterationPath ? iterationPath.split("\\") : [];
  if (!pi) {
    console.warn(`Iteration Path doesn't contain TI, "${iterationPath}"`);
  }
  return {pi, ti};
};

  const getPiByName = async (name, art) => {
    const [pi] = await apiV2
      .queryAsync("Release", {
        select: `{id:id}`,
        where: `name=="${name}" and agileReleaseTrain.Name=="${art}"`,
      })
      .catch((e) => {
        console.log(e);
        return undefined;
      });
    return pi;
  };

    const getTiByName = async (name, team) => {
    const [ti] = await apiV2
      .queryAsync("TeamIteration", {
        select: `{id:id}`,
        where: `name=="${name}" and Team.Name=="${team}"`,
      })
      .catch((e) => {
        console.log(e);
        return undefined;
      });
    return ti;
  };

  const getArtShortName = async (name) => {
      const [artAbbr] = await apiV2.queryAsync('AgileReleaseTrain',{
          select:`ARTShortName`,
          where:`name=="${name}"`
      })
      return artAbbr ? artAbbr : null;
  }

    const getTeamAbbr = async (name) => {
      const [teamAbbr] = await apiV2.queryAsync('Team',{
          select:`abbreviation`,
          where:`name=="${name}"`
      })
      return teamAbbr ? teamAbbr : null;
  }

const adoEntity = await getSourceEntity(srouceEntity);
const {art, team} = await getAreaPath(adoEntity);
const {pi, ti} = await getIterationPath(adoEntity);

if (ti) {
  if (!team){
      return {
    kind: "Value",
    value: null,
  };
  }
  const teamAbbr = await getTeamAbbr(team)
  const tiName = teamAbbr ? `${ti} ${teamAbbr}` : ti
  tpTi = await getTiByName(tiName, team);

  if (!tpTi) {
    console.warn(`Failed to find TI "${tiName}" in Targetprocess for Team "${team}"`);
  }

  return {
    kind: "Value",
    value: ti && tpTi ? tpTi : null,
  };
} else {
  return {
    kind: "Value",
    value: null,
  };
}

```
