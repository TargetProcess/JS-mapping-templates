### ADO > TP:

```js
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const tpApi = workSharing.getProxy(args.targetTool);
const adoApi = workSharing.getProxy(args.sourceTool);
const sourceEntity = args.sourceEntity;

const getSourceEntity = async (entity) => {
  return await adoApi
    .getAsync(`_apis/wit/workitems/${entity.sourceId}?api-version=6.0`)
    .catch((e) => {
      console.log(e);
      return undefined;
    });
};

const getAreaPath = (adoEntity) => {
  const areaPath = adoEntity?.fields["System.AreaPath"];
  const [root, art, team] = areaPath ? areaPath.split("\\") : [];
  if (!art) {
    console.warn(`AreaPath doesn't contain ART; PATH: "${areaPath}"`);
  }
  return { art, team };
};

const getIterationPath = (adoEntity) => {
  const iterationPath = adoEntity?.fields["System.IterationPath"];
  const [, pi, ti] = iterationPath ? iterationPath.split("\\") : [];
  if (!ti) {
    console.warn(`Iteration Path doesn't contain TI; PATH: "${iterationPath}"`);
  }
  return { pi, ti };
};

const getTiByName = async (pi, name, team) => {
  const [ti] = await apiV2
    .queryAsync("TeamIteration", {
      select: `{id:id}`,
      where: `name=="${name}" and Team.Name=="${team}" and Release.Name=="${pi}"`,
    })
    .catch((e) => {
      console.log(e);
      return undefined;
    });
  return ti;
};

const adoEntity = await getSourceEntity(sourceEntity);
const { art, team } = await getAreaPath(adoEntity);
const { pi, ti } = await getIterationPath(adoEntity);

if (ti) {
  if (!team) {
    console.warn(`Team node is not set for the item.`);
    return {
      kind: "Value",
      value: null,
    };
  }

  const tpTi = await getTiByName(pi, ti, team);

  if (!tpTi) {
    console.warn(
      `Failed to find TI "${ti}" in Targetprocess for Team "${team}"`
    );
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

### Comparator:

```js
return true;
```
