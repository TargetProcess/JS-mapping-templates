### TP > ADO

```js
const workSharing = context.getService("workSharing/v2");
const tpApiV2 = context.getService("targetprocess/api/v2");
const { targetEntity, sourceEntity, targetTool } = args;
const adoApi = workSharing.getProxy(targetTool);

const getSourceEntity = async (tpEntity) => {
  return await tpApiV2
    .getByIdAsync(tpEntity.entityType, Number(tpEntity.sourceId), {
      select: `{
        art:agilereleasetrains.Select(name).first(),
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

### ADO > TP

```js
const areaPath = args.value.changed;
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const tpEntity = args.targetEntity;

const [root, art, team] = areaPath ? areaPath.split("\\") : [];

const CREATE_MISSING_ART = true;
const fieldId = args.targetField.id;
const commands = [];

const relation = {
  entityType: "agilereleasetrain",
  relationType: "hierarchy",
  propertyName: "AgileReleaseTrains",
};

const getArts = async (tpEntity) => {
  return await apiV2
    .getByIdAsync(tpEntity.entityType, Number(tpEntity.sourceId), {
      select: `AgileReleaseTrains`,
    })
    .then((data) => {
      return data.items ? data.items : [];
    })
    .catch((e) => {
      console.error(e);
      return [];
    });
};

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
      console.error(e);
      return undefined;
    });
};

const tpArts = await getArts(tpEntity);

tpArts.forEach((art) => {
  commands.push({
    kind: "RelationRemoved",
    relation: {
      sourceId: `${art.id}`,
      entityType: "agilereleasetrain",
      relationType: "hierarchy",
      propertyName: "AgileReleaseTrains",
    },
  });
});

let tpArt;

if (art) {
  tpArt = await getARTbyName(art);
  if (!tpArt) {
    console.warn(`Failed to find ART "${art}" in Targetprocess`);
    if (CREATE_MISSING_ART) {
      console.warn(`Creating new ART... ==> "${art}"`);
      tpArt = await createART(art);
    }
  }
}

!art && console.warn(`The ART node is not set, PATH: "${areaPath}"`);

if (tpArt) {
  const isAssigned = tpArts.find((v) => v.id === tpArt.id);
  if (isAssigned) {
    return commands.filter((art) => {
      return Number(art.relation.sourceId) !== isAssigned.id;
    });
  } else {
    commands.push({
      kind: "RelationAdded",
      relation: {
        sourceId: `${tpArt.id}`,
        entityType: "agilereleasetrain",
        relationType: "hierarchy",
        propertyName: "AgileReleaseTrains",
      },
    });
  }
}

return commands;
```

### comparator

```js
const comparisonModes = {
  OneToOne: "OneToOne",
  Contains: "Contains",
};

const compareMode = comparisonModes.Contains;
const tpApiV2 = context.getService("targetprocess/api/v2");
const [root, artNode = null, teamNode = null] = args.targetFieldValue
  ? args.targetFieldValue.toolValue.split("\\")
  : [];
const sourceArtsArray = Array.isArray(args.sourceFieldValue.toolValue)
  ? args.sourceFieldValue.toolValue
  : [];

if (compareMode === comparisonModes.OneToOne && sourceArtsArray.length > 1) {
  console.log(
    `[Valid: false] Multiple source assignments for comparison mode: OneToOne`
  );
  return false;
}

if (artNode === null) {
  return sourceArtsArray.length === 0;
}

if (sourceArtsArray.length === 0) {
  return false;
}

const result = await tpApiV2.queryAsync("agilereleasetrain", {
  select: `{id}`,
  where: `(id in ${JSON.stringify(
    sourceArtsArray.map((x) => x.id)
  )} and (name = '${artNode}'))`,
});

if (result.length) {
  return true;
}

return false;
```
