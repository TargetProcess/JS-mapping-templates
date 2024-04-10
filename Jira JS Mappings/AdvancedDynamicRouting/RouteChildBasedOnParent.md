```js
const workSharing = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");
const { sourceTool, targetTool, entities } = args;
const jiraApi = workSharing.getProxy(sourceTool);
const tpApi = workSharing.getProxy(targetTool);
const PROJECT_KEY_FIELD = "Jira Project Keys";
const regEx = new RegExp("^CIO\\s*-.*");

/* 
['Jira Project Name', 'Tp Project Name'] or ['Jira Project Name', 123] where 123 - is a TP project id.

DEFAULT mapping means that if a custom mapping is not defined for CIO jira Project, data will be routed to e.g "TEST JIRA INTEGRATION" TP project. 
 */

const CUSTOM_MAPPING_BY_JIRA_KEY = [
  // ["EXAMPLE", "TEST JIRA INTEGRATION"],
  ["IP", "Delivery Services"],
  ["IEST", "Delivery Services"],
  ["CDO", "Delivery Services"], //CIO-IVMAA-IAM-Directory Services US Ops.
  ["AAD", "Delivery Services"],
  ["DCSAB", "Delivery Services"], //CIO-IVMAA-IAM-Digital Certificate squad.
  ["IRTDEVNEW", "Delivery Services"], //CIO-IVMAA-IAM-IRT
  ["CIOIS", "Delivery Services"],
  ["CIORACF", "Delivery Services"],
  ["CIOAHTOOLS", "Delivery Services"],
  ["MFA2FA", "Delivery Services"],
  ["NGSQD", "Delivery Services"], //CIO-IVMAA-IAM-NextGen UX & Automation Team.
  //ECLM
  ["ECLMSIRION", "Business Services"],
  ["ECLMSIRION", "Platform Services"],
];

async function getIssues(issues, n = 5) {
  const a = [...issues];
  const chunks = new Array(Math.ceil(a.length / n))
    .fill(void 0)
    .map((_) => a.splice(0, n));
  const results = [];
  for (const chunk of chunks) {
    const result = await Promise.all(
      chunk.map(async (e) => {
        try {
          return await jiraApi.getAsync(
            `rest/api/2/issue/${e.sourceId}?expand=names`
          );
        } catch (e) {
          console.error(e);
        }
      })
    );
    results.push(...result);
  }
  return results;
}

async function getIssueSearch(issues) {
  try {
    return await jiraApi
      .getAsync(
        `rest/api/2/search?jql=issuekey in (${issues
          .map((v) => v.sourceId)
          .join(",")})&expand=names`
      )
      .then((v) => {
        const names = v.names;
        const issues = v.issues;
        return issues.map((v) => {
          return { ...v, names };
        });
      });
  } catch (e) {
    console.warn(e);
    throw new Error(e);
  }
}

const issues = await getIssueSearch(entities).catch(async (e) => {
  return await getIssues(entities);
});

const indexedIssues = new Map(
  issues.filter((v) => !!v).map((v) => [v?.key, v])
);

function HandlerError(message, type) {
  const handlerError = new Error(message);
  handlerError["type"] = type;
  return handlerError;
}

function LogStore(e) {
  this.e = e;
  this.logs = [];
  this.addLog = (log, type = null) => {
    if (typeof log === "string") {
      this.logs.push({ message: log, type: type || "info" });
    } else this.logs.push(log);
  };

  this.printLogs = () => {
    this.logs.forEach(({ type, message }) => {
      switch (type) {
        case "warn":
          console.warn(message);
          break;
        case "err":
          console.error(message);
          break;
        case "info":
          console.info(message);
          break;
        default:
          console.error(message);
      }
    });
  };
}

function ScopeHandler() {
  this.customMapping = new Map(
    Object(
      CUSTOM_MAPPING_BY_JIRA_KEY.map(([key, value]) => [
        Object(key).toUpperCase(),
        value,
      ])
    )
  );
  this.getResolvedScope = () => {
    return this.scope;
  };

  this.setData = (e) => {
    this.e = e;
    this.issue = indexedIssues.get(e.sourceId);
    this.scope = {
      entity: this.e,
      targetScope: {
        kind: "project",
        sourceId: null,
      },
    };
  };

  this.getProjectByName = (name) => {
    return apiV2
      .queryAsync("project", {
        select: `id`,
        where: `name=="${name}"`,
      })
      .then((data) => {
        const [project] = data;
        return Promise.resolve(project);
      });
  };

  this.getScopeForTheme = () => {
    const {
      project: { name, key: projectKey },
    } = Object(this.issue).fields;
    return this.getProjectByKey(projectKey)
      .then((projectId) => {
        if (!projectId) {
          throw HandlerError(
            `Cannot to get TP Project by Jira KEY "${projectKey}"`,
            "warn"
          );
        }

        if (regEx.test(name)) {
          const mappedProject = this.customMapping.get(
            projectKey.toUpperCase()
          );
          const defaultProject = this.customMapping.get("DEFAULT");
          const tpProject = projectId || mappedProject || defaultProject;

          if (!tpProject) {
            throw HandlerError(`Failed to get target project`, "err");
          }

          if (/^\d+$/.test(Object(tpProject))) {
            this.scope.targetScope.sourceId = `${tpProject}`;
            return this.getResolvedScope();
          } else {
            return this.getProjectByName(tpProject).then((pr) => {
              if (pr) {
                this.scope.targetScope.sourceId = `${pr}`;
                return this.getResolvedScope();
              }
            });
          }
        }
        throw HandlerError(
          `The project name "${name}" doesn't contain CIO prefix.`,
          "warn"
        );
      })
      .catch((e) => {
        this.logStore.addLog(e);
      });
  };

  this.getChildScope = (linkName, id = null, tpParentField) => {
    if (tpParentField && linkName === null) {
      const fieldValue = this.issue.fields[tpParentField];

      if (fieldValue === undefined) {
        throw HandlerError(
          `Field "${tpParentField}" is not on the screen`,
          "err"
        );
      }

      if (fieldValue === null) {
        throw HandlerError(`Field "${tpParentField}" is empty`, "warn");
      }

      return this.getAssignableProject(fieldValue)
        .then((assignable) => {
          if (!assignable) {
            throw HandlerError(
              `Failed to get tp Entity "${fieldValue}"`,
              "err"
            );
          }

          this.scope.targetScope.sourceId = assignable.project
            ? `${assignable.project}`
            : null;
          return this.getResolvedScope();
        })
        .catch((e) => {
          this.logStore.addLog(e);
        });
    }

    if (!linkName) {
      throw HandlerError(`Link Name is not specified.`, "err");
    }

    return Promise.resolve()
      .then(() => {
        const customFieldId = id ? id : this.getFieldId(linkName);
        if (!customFieldId) {
          throw HandlerError(
            `Fialed to get field id for the field name "${linkName}"`,
            "err"
          );
        }

        const fieldValue = this.issue.fields[customFieldId];

        if (!fieldValue) {
          throw HandlerError(
            `Parent Item is not linked to the issue ${this.e.sourceId}`,
            "warn"
          );
        }

        if (typeof fieldValue !== "string") {
          throw HandlerError(
            `Parent link is an object and cannot be handled by that scope handler`,
            "err"
          );
        }

        return this.getIssue(fieldValue);
      })
      .then((issue) => {
        this.logStore.addLog(
          `Checking if parent entity "${issue.key}" is shared...`
        );
        return this.getIssueShare({
          sourceId: issue.key,
          sourceType: issue.fields.issuetype.id,
        });
      })
      .then((data) => {
        const [parentTpItem] = data;

        if (!parentTpItem) {
          throw HandlerError(`Parent entity is not shared...`, "warn");
        }
        return this.getTpProject(parentTpItem);
      })
      .then((project) => {
        this.scope.targetScope.sourceId = `${project}`;
        return this.getResolvedScope();
      })
      .catch((e) => {
        this.logStore.addLog(e);
      });
  };

  this.getAssignableProject = (id) => {
    return apiV2.getByIdAsync("assignable", Number(id), {
      select: "{id, project:project.id}",
    });
  };

  this.getFieldId = (linkName) => {
    return Object.keys(this.issue.names).find(
      (key) => this.issue.names[key] === linkName
    );
  };

  this.getScope = (e) => {
    this.setData(e);
    this.logStore = new LogStore(e);
    this.printLogs = this.logStore.printLogs.bind(this.logStore);
    this.logStore.addLog(`Resolving scope for entity ${e.sourceId}`);
    const { issuetype } = this.issue.fields;
    if (issuetype.name === "Theme") {
      return this.getScopeForTheme();
    } else if (["Initiative", "Epic"].includes(issuetype.name)) {
      return this.getChildScope("Parent Link", null, "customfield_28800");
    } else if (
      ["Story", "Bug", "Maintenance", "Task"].includes(issuetype.name)
    ) {
      return this.getChildScope("Epic Link", null, "customfield_28800");
    } else {
      this.logStore.addLog(
        `There is no handler for the issue type "${issuetype.name}"`,
        "warn"
      );
      return Promise.resolve();
    }
  };

  this.getProjectByKey = (key) => {
    return apiV2
      .queryAsync("project", {
        select: `{id, keys:CustomValues.Text("${PROJECT_KEY_FIELD}")}`,
        where: `CustomValues.Text("${PROJECT_KEY_FIELD}").contains("${key}")`,
      })
      .then((projects) => {
        const project = projects.find(({ keys }) => {
          const projectKeys = keys
            .split(/\s*,\s*/g)
            .map((v) => v.toUpperCase());
          return projectKeys.indexOf(key) > -1;
        });
        if (project && project.id) {
          return project.id;
        }
      });
  };

  this.getIssue = (key) => {
    return jiraApi.getAsync(`rest/api/2/issue/${key}`);
  };

  this.getProjectsByName = (name) => {
    return apiV2
      .queryAsync("project", {
        select: `id`,
        where: `name=="${name}"`,
      })
      .then((data) => {
        return data;
      });
  };

  this.getTpProject = ({ sourceId, sourceType }) => {
    return apiV2.getByIdAsync(sourceType, Number(sourceId), {
      select: `project.id`,
    });
  };

  this.getIssueFieldId = (field) => {
    return Object.keys(this.issue.names).find(
      (key) => this.issue.names[key] === field
    );
  };

  this.getIssueShare = ({ sourceId, sourceType }) => {
    return workSharing.getEntityShares(
      Object({
        sourceId: sourceId,
        sourceType: sourceType,
        tool: sourceTool,
      })
    );
  };
}

try {
  const result = await Promise.all(
    entities.map((e) => {
      const issue = indexedIssues.get(e.sourceId);

      if (!issue) {
        console.error(`Faield to get issue by key "${e.sourceId}"`);
        return;
      }
      const handler = new ScopeHandler();
      return handler.getScope(e).then((scope) => {
        handler.printLogs();
        return scope;
      });
    })
  );

  console.log(`Result`, result);
  return result.filter((r) => !!r);
} catch (e) {
  console.error(e);
}
```
