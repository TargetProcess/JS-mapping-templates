## Script accespts 4 arguments

1 - account URL (with protocol)
2 - profile identifier
3 - Targetprocess admin access token
4 - Target tool token that will be set in profile settings

#### Example

`node update.profile.token.js http://tplocal.com 87c6199a-bfae-4cba-9bca-043bda7dff4b MTpBL1BsRXhtc3h3MmFMS3hnSTZudldicDA3MmlBc2szUjMxOC9vaDYwMVpVPQ== 6v54c5wlwtyssr3cyq5yg4htccy6bjchu5jwsnbnchbeeu7zcjba`

```js
const args = process.argv.slice(2);
if (args.length !== 4) {
  console.error(`Invalid number of parameters.
Usage: node update.profile.token.js TP_URL PROFILE_ID TP_TOKEN ADO_TOKEN
  TP_URL is an account name, preceded with protocol, e.g. https://your-account.tpondemand.com.
  PROFILE_ID is an identifier of integration profile.
  TP_TOKEN is an access token generated in Targetprocess.
  ADO_TOKEN is a PAT generated in Azure DevOps.
Example: node update.profile.token.js https://your-account.tpondemand.com 87c6199a-bfae-4cba-9bca-043bda7dff4b tp_token ado_token
`);
  process.exit(1);
}

const toolType = "AzureDevOps";
const [account, profileId, tpAdminToken, adoToken] = args;
const url = `${account}/svc/work-sharing-v2/tools/${toolType}/profiles/${profileId}?access_token=${encodeURIComponent(
  tpAdminToken
)}`;

async function updateToken() {
  try {
    const response = await fetch(url);
    console.debug("Profile fetch response", response);

    const profile = await response.json();

    profile.settings.authSettings.token = adoToken;

    await fetch(url, {
      method: "PUT",
      body: JSON.stringify(profile),
    });

    console.log("Successfully updated token");
  } catch (err) {
    console.error("Error found while executing update token script");
    console.error(err);
  }
}

updateToken();
```
