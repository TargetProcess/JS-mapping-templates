### TP > ADO:

```js
const workSharing = context.getService("workSharing/v2");
const tpApiV2 = context.getService("targetprocess/api/v2");
const { targetEntity, sourceEntity, targetTool } = args;
const adoApi = workSharing.getProxy(targetTool);

const getSourceEntity = async (tpEntity) => {
  return await tpApiV2
    .getByIdAsync(tpEntity.entityType, Number(tpEntity.sourceId), {
      select: `{
        art:agilereleasetrain.name,
        team:assignedteams.Select(team.name).first()}`,
    })
    .then((data) => {
      const { art, team } = data || {};
      return {
        team,
        art,
      };
    })
    .catch((e) => {
      console.error(e);
      return undefined;
    });
};

const getTargetEntity = async (entity) => {
  return await adoApi
    .getAsync(`_apis/wit/workitems/${entity.sourceId}?api-version=6.0`)
    .catch((e) => {
      console.log(e);
      return undefined;
    });
};

const getRoot = (adoEntity) => {
  return adoEntity?.fields["System.TeamProject"];
};

const getAreaPath = async (root, area) => {
  const res = await adoApi
    .getAsync(
      `${root}/_apis/wit/classificationnodes/areas/${area}?api-version=6.0`
    )
    .then((data) => {
      if (data) {
        return true;
      } else return false;
    })
    .catch((e) => {
      console.warn("Failed to get Area Path: ", e);
      return false;
    });
  return res;
};

const [targetItem, sourceItem] = await Promise.all([
  getTargetEntity(targetEntity),
  getSourceEntity(sourceEntity),
]);

const rootNode = getRoot(targetItem);

if (!rootNode) {
  console.error(`Failed to get root node`);
  return undefined;
}

const { art, team } = Object(sourceItem) || {};

const generateAreaPath = (...nodes) => {
  const adoNodes = [];
  for (let i in nodes) {
    if (nodes[i] !== undefined) {
      adoNodes.push(nodes[i]);
    } else break;
  }
  return adoNodes;
};

const validatePath = async (root, adoNodes = []) => {
  if (adoNodes && adoNodes.length) {
    const areaPath = `${adoNodes.join("\\")}`;
    const isAreaPath = await getAreaPath(root, areaPath);
    if (isAreaPath) {
      return `${rootNode}\\${areaPath}`;
    } else {
      console.warn(`Area Path "${areaPath}" doesn't exist in ADO`);
      return await validatePath(root, adoNodes.slice(0, -1));
    }
  }
  return root;
};

const area = await validatePath(rootNode, generateAreaPath(art, team));

return {
  kind: "Value",
  value: area,
};
```

### ADO > TP:

```js
const CREATE_MISSING_ART = true;

const areaPath = args.value.changed;
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const { targetEntity } = args;

const [root, adoArt, team] = areaPath ? areaPath.split("\\") : [];
console.log(`Areapath [${areaPath}], project [${adoArt}],  team [${team}]`);

const fieldId = args.targetField.id;
const commands = [];

const getARTbyName = async (name) => {
  const [art] = await apiV2
    .queryAsync("AgileReleaseTrain", {
      select: `{id:id}`,
      where: `name=="${name}"`,
    })
    .catch((e) => {
      console.error(e);
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

let tpArt = null;

if (adoArt) {
  tpArt = await getARTbyName(adoArt);
  if (!tpArt && adoArt) {
    console.warn(`Failed to find ART [${adoArt}] in Targetprocess`);
    if (CREATE_MISSING_ART) {
      console.warn(`Creating new ART... ==> "${adoArt}"`);
      tpArt = await createART(adoArt);
    }
  }
}

return {
  kind: "Value",
  value: adoArt && tpArt ? tpArt : null,
};
```

### Comparators:

```js
const [rootNode = null, artNode = null, teamNode = null] = args.targetFieldValue
  ? args.targetFieldValue.toolValue.split("\\")
  : [];
const { Name: tpItem = null } = args.sourceFieldValue.toolValue || {};

return (artNode && artNode.toLowerCase()) === (tpItem && tpItem.toLowerCase());
```
