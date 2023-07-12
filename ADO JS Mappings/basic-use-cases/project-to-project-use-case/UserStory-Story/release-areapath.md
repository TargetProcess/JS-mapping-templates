### ADO > TP:

```js
const apiV2 = context.getService("targetprocess/api/v2");
const workSharing = context.getService("workSharing/v2");
const { sourceEntity, targetEntity, targetTool, sourceTool } = args;
const tpApi = workSharing.getProxy(targetTool);
const adoApi = workSharing.getProxy(sourceTool);

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
  if (!pi) {
    console.warn(`Iteration Path doesn't contain PI; PATH: "${iterationPath}"`);
  }
  return { pi, ti };
};

const getPiByName = async (name, art) => {
  const [pi] = await apiV2
    .queryAsync("Release", {
      select: `{id:id}`,
      where: `name=="${name}" and project.generals.count(id=${targetEntity.sourceId})>0`,
    })
    .catch((e) => {
      console.log(e);
      return undefined;
    });
  return pi;
};

const adoEntity = await getSourceEntity(sourceEntity);
const { art, team } = getAreaPath(adoEntity);
const { pi, ti } = getIterationPath(adoEntity);

let tpPi;
if (pi) {
  tpPi = await getPiByName(pi, art);

  if (!tpPi) {
    console.warn(`Failed to find PI "${pi}" in Targetprocess`);
  }

  return {
    kind: "Value",
    value: pi && tpPi ? tpPi : null,
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
