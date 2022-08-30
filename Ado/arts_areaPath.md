ADO > ATP

```js
const areaPath = args.value.changed;
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const tpEntity = args.targetEntity;
console.log(areaPath);
const [root, portfolio, art] = areaPath ? areaPath.split("\\") : [];
let tpArt = null;
const CREATE_MISSING_ART = true;
const fieldId = args.targetField.id;
const commands = [];

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

const relation = {
  entityType: "agilereleasetrain",
  relationType: "hierarchy",
  propertyName: "AgileReleaseTrains",
};

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

tpArt = await getARTbyName(art);

if (!tpArt) {
  console.warn(`Failed to find ART "${art}" in Targetprocess`);
  if (CREATE_MISSING_ART) {
    console.warn(`Creating new ART... ==> "${art}"`);
    tpArt = await createART(art);
  }
}

if (tpArt) {
  const isAssigned = tpArts.find((v) => v.id === tpArt.id);
  if (isAssigned) {
    return commands.filter((art) => {
      return art.relation.sourceId !== (isAssigned.id || "").toString();
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
