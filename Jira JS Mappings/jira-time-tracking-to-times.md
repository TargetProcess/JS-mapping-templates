This mapping requries adding a text custom field on the Time entity "Worklog id" to store Jira WorkLog id.
If the name is not "Worklog id" - the variable WORKLOG_ID_FIELD should be udpated.

Fields for mapping: Times < TimeTracking

```js
const {
  sourceEntity,
  sourceTool,
  targetEntity,
  targetTool,
  value: { changed: timeTracker = {} },
} = args;
const ws = context.getService("workSharing/v2");
const apiV2 = context.getService("targetprocess/api/v2");
const tpApi = ws.getProxy(targetTool);
const jiraApi = ws.getProxy(sourceTool);
const timeRemainingEstimateSeconds = timeTracker.remainingEstimateSeconds ?? 0;
const timeSpentSeconds = timeTracker.timeSpentSeconds ?? 0;

/* 
WORKLOG_ID_FIELD - field in Targetprocess on the Time entity that will store Jira Worklog id. - REQUIRED.

LIMIT - max number of time records that can be moved to ATP. If exceeds only one sumirized time record will be created. 

DEFAULT_USER - user that will be used for:
1. Sumirized time record
2. When User's email is hidden.

GROUP_BY_USERS: 
1. true - group worklogs by users
2. false - move individual worklogs to ATP.

For cloud only. Domain should be udpated with the real domain.
EMAIL_IS_HIDDEN.USE_ACCOUNT_ID:
1. true - if email is hidden a new user will be added as accountid@domain.com
2. false - will be using default user instead of real one.
 */

const WORKLOG_ID_FIELD = "Worklog id";

const CONFIG = {
  LIMIT: 1000,
  DEFAULT_USER: {
    firstName: "Time",
    lastName: "Tracking",
    email: "default.time.tracking@nonexisting.com",
  },
  DEFAULT_ROLE: {
    id: 1,
  },
  GROUP_BY_USERS: true,

  ADD_USER_STRATEGY: {
    ADD_USER: true,
    EMAIL_IS_HIDDEN: {
      USE_ACCOUNT_ID: false,
      DOMAIN: "@nonexisting.com",
    },
  },
};

class Utils {
  constructor() {
    Object(this)._jiraApi = jiraApi;
    Object(this)._tpApi = tpApi;
    Object(this)._serverInfo;
  }

  deleteResource(type, id) {
    return {
      name: "DeleteResource",
      target: {
        Id: id,
        ResourceType: type,
      },
    };
  }

  createResource(type, fields = {}) {
    return {
      name: "createResource",
      resource: {
        resourceType: type,
        ...fields,
      },
    };
  }

  generateCommands(...commands) {
    return {
      name: "batch",
      commands: commands,
    };
  }

  generatePassword() {
    const length = 8,
      charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }

  validateEmail(email) {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  _setServerInfo(serverInfo) {
    Object(this)._serverInfo = serverInfo;
  }

  async _getServerInfo() {
    if (Object(this)._serverInfo) {
      return Object(this)._serverInfo;
    } else {
      const serverInfo = await Object(this)._jiraApi.getAsync(
        "rest/api/2/serverInfo"
      );
      this._setServerInfo(serverInfo);
      return Object(this)._serverInfo;
    }
  }

  async isJiraCloud() {
    const { deploymentType } = await this._getServerInfo();
    return deploymentType === "Cloud";
  }
}

const startTimer = new Date().getTime();

const utils = new Utils();
const isCloud = await utils.isJiraCloud();

const getWorkLogs = async () => {
  /* 
  
  Bug in jira Server API. startAt doesn't work.
  https://jira.atlassian.com/browse/JRASERVER-67157

   */

  const apiUrl = `rest/api/2/issue/${sourceEntity.sourceId}/worklog`;
  const maxResults = 500;
  let startAt = 0;
  let allWorkLogs = [];
  let workLogsBatch;

  async function fetchWorkLogBatch(startAt) {
    const queryString = `startAt=${startAt}&maxResults=${maxResults}`;
    return await jiraApi
      .getAsync(`${apiUrl}?${queryString}`)
      .then((worklogsData) => {
        const { worklogs = [] } = worklogsData || {};
        return worklogs;
      })
      .catch((e) => {
        console.log(e);
        return [];
      });
  }

  do {
    workLogsBatch = await fetchWorkLogBatch(startAt);
    if (Array.isArray(workLogsBatch)) {
      allWorkLogs.push(...workLogsBatch);
    }
    startAt += maxResults;
  } while (
    Array.isArray(workLogsBatch) &&
    workLogsBatch.length &&
    workLogsBatch.length === maxResults &&
    isCloud
  );

  return allWorkLogs.sort((a, b) => a.id - b.id);
};

const getTpData = async () => {
  const [project, times] = await Promise.all([
    apiV2
      .getByIdAsync(targetEntity.entityType, Number(targetEntity.sourceId), {
        select: `{id:project.id}`,
      })
      .catch((e) => {
        console.error(e);
        return;
      }),
    apiV2
      .queryAsync("time", {
        select: `{id, worklogid:${WORKLOG_ID_FIELD.toLowerCase().replace(
          /\s* \s*/g,
          ""
        )}, spent, remain, email:user.email}`,
        where: `assignable.id==${targetEntity.sourceId}`,
        result: "it",
      })
      .catch((e) => {
        console.error(e);
        return;
      }),
  ]);
  if (!times || !project) {
    return;
  }
  return { project, times: times.sort((a, b) => a.id - b.id) };
};

const normalizeWorklogs = (jiraWorkLogs = []) => {
  return jiraWorkLogs.reduce(
    (acc, workLog, i) => {
      const { author, id, timeSpentSeconds, created } = workLog;
      const [users, origin] = acc;
      const user = normalizeUser(author);
      users.push(user);
      origin.push({
        date: created,
        worklogid: id,
        spent: Number((timeSpentSeconds / 3600).toFixed(4)),
        remain:
          i === jiraWorkLogs.length - 1
            ? Number((timeRemainingEstimateSeconds / 3600).toFixed(4))
            : 0,
        email: user.email,
      });
      return acc;
    },
    [[], []]
  );
};

const normalizeUser = ({
  displayName = "",
  emailAddress = undefined,
  key = undefined,
  accountId = undefined,
} = {}) => {
  const { USE_ACCOUNT_ID, DOMAIN } = CONFIG.ADD_USER_STRATEGY.EMAIL_IS_HIDDEN;
  const [firstName = "", lastName = ""] = displayName.split(/\s* \s*/);

  const jiraId = isCloud ? accountId : key;

  if (!emailAddress) {
    console.warn(`Faield to get Email for the user "${displayName}"`);
  }

  if (!utils.validateEmail(emailAddress)) {
    console.warn(
      `Email "${emailAddress}" is not valid for the user. "${displayName}"`
    );
  }

  if (USE_ACCOUNT_ID && !emailAddress) {
    if (!jiraId) {
      console.warn(
        `Faield to get Jira Account Id for the user "${displayName}"`
      );
      return CONFIG.DEFAULT_USER;
    }

    return {
      firstName,
      lastName,
      email: `${jiraId.replace(":", "-")}${DOMAIN}`,
      login: jiraId,
    };
  }

  if (!USE_ACCOUNT_ID && !emailAddress) {
    return CONFIG.DEFAULT_USER;
  }

  return { firstName, lastName, email: emailAddress, login: emailAddress };
};

const ensureUser = async ({
  firstName,
  lastName = "",
  email,
  login = undefined,
}) => {
  return await tpApi
    .postAsync("api/v1/user?format=json", {
      body: {
        email,
        login: login ? login : email,
        firstName,
        lastName,
        password: utils.generatePassword(),
        isIntegration: true,
      },
    })
    .then((user) => {
      const {
        FirstName: firstName,
        LastName: lastName,
        Id: id,
        Email: email,
        Login: login,
      } = user;
      return { firstName, lastName, id, email, login };
    });
};

const getTpUsers = async (...jiraUsers) => {
  const users = [
    ...new Map(jiraUsers.map((user) => [user["email"], user])).values(),
  ];
  const usersEmail = [...users.map((u) => u.email), CONFIG.DEFAULT_USER.email];
  const usersLogin = users.map((u) => u.login);
  const res = await apiV2.queryAsync("user", {
    select: `{id, firstName, lastName, email, login}`,
    where: `email in ${JSON.stringify(usersEmail)} or login in ${JSON.stringify(
      [...usersEmail, ...usersLogin].filter((v) => !!v)
    )}`,
  });

  const tpUsers = new Map(
    res
      .map((user) => {
        const { email, login } = user;
        if (usersEmail.includes(email)) {
          return user;
        } else {
          const findByLogin = jiraUsers.find((u) => u.login === login);
          if (findByLogin) {
            return {
              ...user,
              email: findByLogin.email,
            };
          }
        }
      })
      .map(({ email, ...u }) => [email, u])
  );

  const usersToAdd = usersEmail.filter((email) => !tpUsers.has(email));
  const mappedJiraUsers = new Map(jiraUsers.map((user) => [user.email, user]));
  if (CONFIG.ADD_USER_STRATEGY.ADD_USER) {
    await Promise.all(
      usersToAdd.map(async (email) => {
        const user =
          email === CONFIG.DEFAULT_USER.email
            ? CONFIG.DEFAULT_USER
            : mappedJiraUsers.get(email);
        if (user) {
          const newUser = await ensureUser(user);
          newUser && tpUsers.set(email, newUser);
        }
      })
    );
  } else {
    const isDefaultUser = tpUsers.get(CONFIG.DEFAULT_USER.email);

    if (!isDefaultUser) {
      const newUser = await ensureUser(CONFIG.DEFAULT_USER);
      if (newUser) {
        tpUsers.set(CONFIG.DEFAULT_USER.email, newUser);
      }
    }
  }
  return tpUsers;
};

const processWorkLogs = async (
  timeRecords = [],
  jiraWorkLogs = [],
  project
) => {
  const mergedWorkLogs = (workLogs) => {
    return Array.from(
      workLogs
        .reduce((map, current) => {
          const existingLog = map.get(current.email);
          if (existingLog) {
            existingLog.spent += current.spent;
            existingLog.remain = current.remain;
            existingLog.worklogid.last = current.worklogid;
          } else {
            map.set(current.email, {
              ...current,
              worklogid: { first: current.worklogid, last: current.worklogid },
            });
          }
          return map;
        }, new Map())
        .values()
    ).map((wl) => {
      return {
        ...Object(wl),
        worklogid: `${Object(wl).worklogid.first}-${Object(wl).worklogid.last}`,
        spent: +Object(wl).spent.toFixed(4),
      };
    });
  };

  const [jiraUsers, normalizedWorklogs] = normalizeWorklogs(jiraWorkLogs);

  const workLogsToProcess = CONFIG.GROUP_BY_USERS
    ? mergedWorkLogs(normalizedWorklogs)
    : normalizedWorklogs;

  const tpUsers = await getTpUsers(...jiraUsers);

  const removeTimeRecords = timeRecords
    .filter(({ id, ...timeRecordfields }, i) => {
      const { date, ...worklogFields } = workLogsToProcess[i] || {};
      return !(
        JSON.stringify(timeRecordfields) === JSON.stringify(worklogFields)
      );
    })
    .map(({ id }) => id && utils.deleteResource("time", id));

  const addTimeRecords = workLogsToProcess
    .filter(({ date, ...worklogFields }, i) => {
      const { id, ...timeRecordfields } = timeRecords[i] || {};
      return !(
        JSON.stringify(timeRecordfields) === JSON.stringify(worklogFields)
      );
    })
    .reduce((acc, { date, worklogid, spent, remain, email }) => {
      const getTPUserId = (email) => {
        const user = tpUsers.get(email);
        if (!user) {
          console.warn(
            `Faield to add a time record "${worklogid}", the user with the email "${email}" doesn't exist. `
          );
        }
        const defaultUserId = tpUsers.get(CONFIG.DEFAULT_USER.email);

        if (!user && !defaultUserId) {
          console.error(
            `Faield to get Id for defautl user "${CONFIG.DEFAULT_USER.email}"`
          );
        }
        return user ? user : defaultUserId;
      };
      const tpUser = getTPUserId(email);

      if (!tpUser) {
        return acc;
      }

      return acc.concat(
        utils.createResource("time", {
          date,
          spent,
          remain,
          [WORKLOG_ID_FIELD]: worklogid,
          user: tpUser,
          role: CONFIG.DEFAULT_ROLE,
          project: project,
          description: "Created by ILI integration",
          assignable: { id: targetEntity.sourceId },
        })
      );
    }, []);

  return [removeTimeRecords, addTimeRecords];
};

try {
  const [tpData, jiraWorkLogs] = await Promise.all([
    getTpData(),
    getWorkLogs(),
  ]);

  if (!tpData) return;

  const { project, times } = tpData;

  if (!project) {
    console.error(
      `Faield to get Project for the item "${JSON.stringify(targetEntity)}"`
    );
    return;
  }

  if (jiraWorkLogs.length <= CONFIG.LIMIT) {
    const [removeTimeRecords, addTimeRecords] = await processWorkLogs(
      times,
      jiraWorkLogs,
      project
    );

    const commands = [...removeTimeRecords, ...addTimeRecords];
    commands.length &&
      (await tpApi.postAsync("/api/commands/v1/execute", {
        body: utils.generateCommands(...commands),
      }));
  } else {
    console.warn(
      `There are "${jiraWorkLogs.length}" worklogs. Limit is set to "${CONFIG.LIMIT}" worklogs.`
    );
    const { DEFAULT_USER: defaultUser } = CONFIG;

    const tpUser = await getTpUsers(defaultUser);

    if (!tpUser.has(defaultUser.email)) {
      console.error(
        `Failed to get id for the deffault user ${defaultUser.email}`
      );
      return;
    }
    const removeTimeRecords = times.map((item) =>
      utils.deleteResource("time", item.id)
    );
    const addTimeRecord = utils.createResource("time", {
      date: new Date(),
      spent: timeSpentSeconds / 3600,
      remain: timeRemainingEstimateSeconds / 3600,
      user: tpUser.get(defaultUser.email),
      role: CONFIG.DEFAULT_ROLE,
      project: project,
      description: `Created by ILI integration. Number of Time Logs in Jira: "${jiraWorkLogs.length}"`,
      assignable: { id: targetEntity.sourceId },
    });

    await tpApi.postAsync("/api/commands/v1/execute", {
      body: utils.generateCommands(...removeTimeRecords, addTimeRecord),
    });
  }

  console.log(
    `Processed ${jiraWorkLogs.length} workLogs for: ${(
      (new Date().getTime() - startTimer) /
      3600
    ).toFixed(2)}s`
  );
} catch (e) {
  console.error(e);
}
```
