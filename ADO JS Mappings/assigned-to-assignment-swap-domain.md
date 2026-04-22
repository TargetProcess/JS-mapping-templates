```js
const {
  targetField,
  sourceEntity,
  targetEntity,
  sourceTool,
  targetTool,
  value: { changed: adoUser },
} = args;
const apiV2 = context.getService("targetprocess/api/v2");
const { meta: fieldMeta } = targetField;

const roleId = Object(fieldMeta)?.attributes?.roleId;

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

try {
  if (!roleId) {
    throw new Error(
      `RoleId is not defined in meta: ${JSON.stringify(fieldMeta)}`,
    );
  }

  if (!adoUser) {
    return {
      kind: "Value",
      value: [],
    };
  }

  const { displayName = "", uniqueName } = adoUser;

  if (!isValidEmail(uniqueName)) {
    throw new Error(`Invalid email format: ${uniqueName}`);
  }

  const email = uniqueName
    .toLowerCase()
    .replace("@blackbaud.me", "@blackbaud.com");
  const [firstName, lastName = ""] = displayName.split(" ");
  return {
    kind: "Value",
    value: [
      {
        user: { email, firstName, lastName, login: email },
        role: { id: roleId },
      },
    ],
  };
} catch (e) {
  return Promise.reject(
    new Error(`ERROR IN JS MAPPING: ${e.message || e.body}`),
  );
}
```
