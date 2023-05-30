### JIRA --> TP

```js
const ws = context.getService("workSharing/v2");
const sourceItem = args.sourceEntity;
const jiraApi = ws.getProxy(args.sourceTool);
const fixVersions = args.value.changed;

const fixVersionsData = await Promise.all(
  fixVersions.map(async (version) => {
    return jiraApi.getAsync(`rest/api/2/version/${version.id}`);
  })
);

const getVersionWithMaxDate = (fixVersionsData) => {
  const mostRecentDate = new Date(
    Math.max.apply(
      null,
      fixVersionsData.map((version) => {
        return new Date(version.releaseDate);
      })
    )
  );

  return fixVersionsData.find((e) => {
    const d = new Date(e.releaseDate);
    return d.getTime() == mostRecentDate.getTime();
  });
};

const getVersionWithMinDate = (fixVersionsData) => {
  const mostMinDate = new Date(
    Math.min.apply(
      null,
      fixVersionsData.map((version) => {
        return new Date(version.startDate);
      })
    )
  );

  return fixVersionsData.find((e) => {
    const d = new Date(e.startDate);
    return d.getTime() == mostMinDate.getTime();
  });
};

const fixVersionWithMaxEndDate = getVersionWithMaxDate(fixVersionsData);
const fixVersionWithMinEndDate = getVersionWithMinDate(fixVersionsData);

if (!fixVersionWithMaxEndDate) {
  console.warn(
    `There is no fixVersions attached for the issue: ${JSON.stringify(
      sourceItem
    )}`
  );
}

if (!fixVersionWithMinEndDate) {
  console.warn(
    `There is no fixVersions attached for the issue: ${JSON.stringify(
      sourceItem
    )}`
  );
}

const { startDate: startDate } = fixVersionWithMinEndDate || {};
const { releaseDate: endDate } = fixVersionWithMaxEndDate || {};

fixVersionWithMinEndDate &&
  !startDate &&
  console.warn(
    `Start Date is not defined for the fix version "${fixVersionWithMaxEndDate.name}"`
  );
fixVersionWithMaxEndDate &&
  !endDate &&
  console.warn(
    `Release Date is not defined for the fix version "${fixVersionWithMaxEndDate.name}"`
  );

return {
  kind: "Update",
  fieldModifications: [
    {
      fieldDef: {
        id: "PlannedStartDate",
        meta: {
          kind: "FieldMeta",
          type: {
            id: "Date",
            kind: "date",
          },
          required: false,
          isReadonly: false,
          roundsDate: true,
        },
        name: "PlannedStartDate",
        path: "PlannedStartDate",
      },
      options: {
        applyRawValue: false,
      },
      value: startDate ? startDate : null,
    },
    {
      fieldDef: {
        id: "PlannedEndDate",
        meta: {
          kind: "FieldMeta",
          type: {
            id: "Date",
            kind: "date",
          },
          required: false,
          isReadonly: false,
          roundsDate: true,
        },
        name: "PlannedEndDate",
        path: "PlannedEndDate",
      },
      value: endDate ? endDate : null,
    },
  ],
};
```
