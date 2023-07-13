### JSON Version:

```json
{
  "pipeline": [
    {
      "name": "ado-iterations-handler",
      "type": "source:uniqueName"
    },
    {
      "type": "action:JavaScript",
      "script": "const sync = context.getService(\"workSharing/v2\");\nconst { pi, tis, activeProfiles} = args.data.dataset;\nconst http = context.getService('http');\nconst adoApi = sync.getProxy(activeProfiles.targetTool);\n\nfunction parseDate(input) {\n  const rx =\n    /(\\d{4}-[01]\\d-[0-3]\\d)(T[0-2]\\d:[0-5]\\d:[0-5]\\d)(\\.\\d+)?([+-][0-2]\\d:[0-5]\\d|Z)/;\n  return rx.exec(input)[1];\n}\n\nconst createIteration = async (project, currentNode, node) => {\n  const { name, startDate, endDate} = node;\n  console.log('ADO Project: ', project, startDate, endDate)\n  console.log(`Going to create node \"${name}\" under Iteration Path: \"${currentNode}\"` );\n  return await adoApi.postAsync(`${project}/_apis/wit/classificationnodes/${currentNode}?api-version=5.1`, {\n    body: {\n      name: name, \"attributes\": {\n        \"startDate\": startDate ? new Date(parseDate(startDate)) : null,\n        \"finishDate\": endDate ? new Date(parseDate(endDate)) : null\n      }\n    }\n  }).catch(err => {\n    if (err && err.statusCode === 409) {\n      console.log(`Iteration \"${currentNode}\\\\${name}\" alredy exists: ${(err && err.body && err.body.message) ? err.body.message : 'Unexpected error'}`)\n    } else {\n      console.log(err)\n    }\n    })\n};\n\nconst createIterations = async (project, ...nodes) => {\n  let rootIteration = [\"Iterations\"];\n  for (const innerNodes of nodes) {\n    const currentIterations = [];\n    try {\n      for (const prev of rootIteration) {\n        const result = await Promise.all(innerNodes.map(async (v) => {\n          currentIterations.push(`${prev}\\\\${v.name}`);\n          await createIteration(project, prev, v);\n        }))\n      }\n      rootIteration = currentIterations;\n    } catch (error) {\n      console.error(\"Error occurred:\", error);\n    }\n  }\n}\nconst { project } = pi[0];\n\nif (!project) {\n  console.log(`Faield to get Project for Release.`)\n  return;\n}\nawait createIterations(project, pi, tis);\n\n\n"
    }
  ]
}
```

### JavaScript Version:

```js
/*
Named Trigger Activated: ado-iterations-handler
*/
const sync = context.getService("workSharing/v2");
const { pi, tis, activeProfiles } = args.data.dataset;
const http = context.getService("http");
const adoApi = sync.getProxy(activeProfiles.targetTool);

function parseDate(input) {
  const rx =
    /(\d{4}-[01]\d-[0-3]\d)(T[0-2]\d:[0-5]\d:[0-5]\d)(\.\d+)?([+-][0-2]\d:[0-5]\d|Z)/;
  return rx.exec(input)[1];
}

const createIteration = async (project, currentNode, node) => {
  const { name, startDate, endDate } = node;
  console.log("ADO Project: ", project, startDate, endDate);
  console.log(
    `Going to create node "${name}" under Iteration Path: "${currentNode}"`
  );
  return await adoApi
    .postAsync(
      `${project}/_apis/wit/classificationnodes/${currentNode}?api-version=5.1`,
      {
        body: {
          name: name,
          attributes: {
            startDate: startDate ? new Date(parseDate(startDate)) : null,
            finishDate: endDate ? new Date(parseDate(endDate)) : null,
          },
        },
      }
    )
    .catch((err) => {
      if (err && err.statusCode === 409) {
        console.log(
          `Iteration "${currentNode}\\${name}" alredy exists: ${
            err && err.body && err.body.message
              ? err.body.message
              : "Unexpected error"
          }`
        );
      } else {
        console.log(err);
      }
    });
};

const createIterations = async (project, ...nodes) => {
  let rootIteration = ["Iterations"];
  for (const innerNodes of nodes) {
    const currentIterations = [];
    try {
      for (const prev of rootIteration) {
        const result = await Promise.all(
          innerNodes.map(async (v) => {
            currentIterations.push(`${prev}\\${v.name}`);
            await createIteration(project, prev, v);
          })
        );
      }
      rootIteration = currentIterations;
    } catch (error) {
      console.error("Error occurred:", error);
    }
  }
};
const { project } = pi[0];

if (!project) {
  console.log(`Faield to get Project for Release.`);
  return;
}
await createIterations(project, pi, tis);
```
