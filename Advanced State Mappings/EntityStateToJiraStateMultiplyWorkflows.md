UseCase:
Mulitply teams are using different workflows, for each of the teams the state mapping should be define explicitly.

## Transformation from Jira to Targetprocess:

```js
const workSharing = context.getService("workSharing/v2")
const tpApi = workSharing.getProxy(args.targetTool);

//Team Names should be specified here
const CIAM_TEAM = 'CIAM Release Train 1';
const DIGITAL_COMERCE = 'Digital | Commerce';
const DSL = 'DSL'
const CUSTOMER_MARKETING_TEAM = 'Customer & Marketing';
const FOX_LPRO_TEAM = 'FOX LPRO';

let mapping = null;

//api query to get Team Name and possible mapping.
const assignable = await tpApi.getAsync(`api/v2/${args.targetEntity.entityType}/${args.targetEntity.sourceId}?select={assignedTeams.select(Team.Name) as teamName, id,name,entityState.workflow.entityStates.select({id,name,isInitial,isPlanned,isFinal}) as possibleStates}`)

if (!(assignable && assignable.items && assignable.items[0] && assignable.items[0].possibleStates && assignable.items[0].teamName.length)) {
    return undefined
}

const transitions = new Map(
    assignable.items[0].possibleStates.map(({ id, name, isInitial, isFinal, isPlanned }) => [
        name.toUpperCase(),
        {
            sourceId: id.toString(),
            name,
            isInitial,
            isFinal,
            isPlanned
        }
    ])
)

// mapping configuration for eahc of the teams:
const DIGITAL_COMERCE_entityStateToStatusMap  = new Map(
    [    
	    ['To Do', 'New'],
        ['Design', 'Setting Up'],
        ['Ready for Development', 'Ready for Development'],
        ['In Development', 'In Development'],
        ['Development Done', 'In Development'],
        ['Ready for QA', 'In Development'],
        ['In QA', 'In Development'],
        ['Blocked', 'In Development'],
        ['Awaiting Feedback', 'In Development'],
        ['QA passed', 'In Development'],
        ['Ready for Preprod', 'In Development'],
        ['Preprod Release', 'Development Done'],
        ['Preprod Testing', 'Development Done'],
        ['Ready for Release', 'Development Done'],
        ['Production', 'Completed']

    ]
    .map(mapping => [mapping[0].toUpperCase(), transitions.get(mapping[1].toUpperCase())])
)

const CIAM_TEAM_entityStateToStatusMap  = new Map(
    [    
	    ['To Do', 'New'],
        ['Design', 'Setting Up'],
        ['Ready for Development', 'Ready for Development'],
        ['In Development', 'In Development'],
        ['Development Done', 'In Development'],
        ['Ready for QA', 'In Development'],
        ['In QA', 'In Development'],
        ['Blocked', 'In Development'],
        ['Awaiting Feedback', 'In Development'],
        ['QA passed', 'In Development'],
        ['Ready for Preprod', 'In Development'],
        ['Preprod Release', 'Development Done'],
        ['Preprod Testing', 'Development Done'],
        ['Ready for Release', 'Development Done'],
        ['Production', 'Completed']

    ]
    .map(mapping => [mapping[0].toUpperCase(), transitions.get(mapping[1].toUpperCase())])
)

const CUSTOMER_MARKETING_TEAM_entityStateToStatusMap  = new Map(
    [    
	    ['To Do', 'New'],
        ['Design', 'Setting Up'],
        ['Ready for Development', 'Ready for Development'],
        ['In Development', 'In Development'],
        ['Development Done', 'In Development'],
        ['Ready for QA', 'In Development'],
        ['In QA', 'In Development'],
        ['Blocked', 'In Development'],
        ['Awaiting Feedback', 'In Development'],
        ['QA passed', 'In Development'],
        ['Ready for Preprod', 'In Development'],
        ['Preprod Release', 'Development Done'],
        ['Preprod Testing', 'Development Done'],
        ['Ready for Release', 'Development Done'],
        ['Production', 'Completed']

    ]
    .map(mapping => [mapping[0].toUpperCase(), transitions.get(mapping[1].toUpperCase())])
)

const DSL_entityStateToStatusMap  = new Map(
    [    
	    ['To Do', 'New'],
        ['Design', 'Setting Up'],
        ['Ready for Development', 'Ready for Development'],
        ['In Development', 'In Development'],
        ['Development Done', 'In Development'],
        ['Ready for QA', 'In Development'],
        ['In QA', 'In Development'],
        ['Blocked', 'In Development'],
        ['Awaiting Feedback', 'In Development'],
        ['QA passed', 'In Development'],
        ['Ready for Preprod', 'In Development'],
        ['Preprod Release', 'Development Done'],
        ['Preprod Testing', 'Development Done'],
        ['Ready for Release', 'Development Done'],
        ['Production', 'Completed']

    ]
    .map(mapping => [mapping[0].toUpperCase(), transitions.get(mapping[1].toUpperCase())])
)

const FOX_LPRO_TEAM_entityStateToStatusMap  = new Map(
    [    
	    ['To Do', 'New'],
        ['Design', 'Setting Up'],
        ['Ready for Development', 'Ready for Development'],
        ['In Development', 'In Development'],
        ['Development Done', 'In Development'],
        ['Ready for QA', 'In Development'],
        ['In QA', 'In Development'],
        ['Blocked', 'In Development'],
        ['Awaiting Feedback', 'In Development'],
        ['QA passed', 'In Development'],
        ['Ready for Preprod', 'In Development'],
        ['Preprod Release', 'Development Done'],
        ['Preprod Testing', 'Development Done'],
        ['Ready for Release', 'Development Done'],
        ['Production', 'Completed']

    ]
    .map(mapping => [mapping[0].toUpperCase(), transitions.get(mapping[1].toUpperCase())])
)

switch(assignable.items[0].teamName[0].toUpperCase()) {
  case CIAM_TEAM.toUpperCase():
    mapping = CIAM_TEAM_entityStateToStatusMap;
    break;
   case DIGITAL_COMERCE.toUpperCase():
   mapping = DIGITAL_COMERCE_entityStateToStatusMap;
   break;
   case DSL.toUpperCase():
   mapping = DSL_entityStateToStatusMap;
   break;
   case CUSTOMER_MARKETING_TEAM.toUpperCase():
   mapping = CUSTOMER_MARKETING_TEAM_entityStateToStatusMap;
   break;
   case FOX_LPRO_TEAM.toUpperCase():
   mapping = FOX_LPRO_TEAM_entityStateToStatusMap;
   break;
}

const status = (args.value.changed.name || '').toUpperCase()
if (!mapping) {return undefined};
const result = mapping.has(status)
    ? {
        kind: 'Value',
        value: mapping.get(status)
    }
    : undefined

return result

```

## Transformation from Targetprocess to Jira:

```js
const workSharing = context.getService("workSharing/v2")
const targetProcessApi = context.getService("targetprocess/api/v2")
const assignableId = args.sourceEntity.sourceId;

let mapping = null;

//Team Names should be specified here
const CIAM_TEAM = 'CIAM Release Train 1';
const DIGITAL_COMERCE = 'Digital | Commerce';
const DSL = 'DSL';
const CUSTOMER_MARKETING_TEAM = 'Customer & Marketing';
const FOX_LPRO_TEAM = 'FOX LPRO';

// mapping configuration for eahc of the teams:
const CIAM_TEAM_entityStateToStatusMap = new Map(
    [
        ['New', 'To Do'],
        ['Setting Up', 'To Do'],
        ['Needs Acceptance Criteria', 'To Do'],
        ['In Design', 'To Do'],
        ['Ready for PI', 'To Do'],
        ['Ready for Development', 'Ready for Development'],
        ['In Development', 'In Development'],
        ['Development Done', 'Development Done'],
        ['Completed', 'Production']


    ]
        .map(mapping => [mapping[0].toUpperCase(), mapping[1]])
)

const DIGITAL_COMERCE_entityStateToStatusMap = new Map(
    [
        ['New', 'To Do'],
        ['Setting Up', 'To Do'],
        ['Needs Acceptance Criteria', 'To Do'],
        ['In Design', 'To Do'],
        ['Ready for PI', 'To Do'],
        ['Ready for Development', 'Ready for Development'],
        ['In Development', 'In Development'],
        ['Development Done', 'Development Done'],
        ['Completed', 'Production']


    ]
        .map(mapping => [mapping[0].toUpperCase(), mapping[1]])
)

const DSL_entityStateToStatusMap= new Map(
    [
        ['New', 'To Do'],
        ['Setting Up', 'To Do'],
        ['Needs Acceptance Criteria', 'To Do'],
        ['In Design', 'To Do'],
        ['Ready for PI', 'To Do'],
        ['Ready for Development', 'Ready for Development'],
        ['In Development', 'In Development'],
        ['Development Done', 'Development Done'],
        ['Completed', 'Production']


    ]
        .map(mapping => [mapping[0].toUpperCase(), mapping[1]])
)


const CUSTOMER_MARKETING_TEAM_entityStateToStatusMap = new Map(
    [
        ['New', 'To Do'],
        ['Setting Up', 'To Do'],
        ['Needs Acceptance Criteria', 'To Do'],
        ['In Design', 'To Do'],
        ['Ready for PI', 'To Do'],
        ['Ready for Development', 'Ready for Development'],
        ['In Development', 'In Development'],
        ['Development Done', 'Development Done'],
        ['Completed', 'Production']


    ]
        .map(mapping => [mapping[0].toUpperCase(), mapping[1]])
)

const FOX_LPRO_TEAM_entityStateToStatusMap = new Map(
    [
        ['New', 'To Do'],
        ['Setting Up', 'To Do'],
        ['Needs Acceptance Criteria', 'To Do'],
        ['In Design', 'To Do'],
        ['Ready for PI', 'To Do'],
        ['Ready for Development', 'Ready for Development'],
        ['In Development', 'In Development'],
        ['Development Done', 'Development Done'],
        ['Completed', 'Production']


    ]
        .map(mapping => [mapping[0].toUpperCase(), mapping[1]])
)


const [teamAssignment] = await targetProcessApi.queryAsync(`TeamAssignments`,{
    select:`Team.Name`,
    where:`Assignable.id==${assignableId}`
});


if (!teamAssignment) {return undefined}

switch(teamAssignment.toUpperCase()) {
  case CIAM_TEAM.toUpperCase():
    mapping = CIAM_TEAM_entityStateToStatusMap;
    break;
   case DIGITAL_COMERCE.toUpperCase():
   mapping = DIGITAL_COMERCE_entityStateToStatusMap;
   break;
   case DSL.toUpperCase():
   mapping = DSL_entityStateToStatusMap;
   break;
   case CUSTOMER_MARKETING_TEAM.toUpperCase():
   mapping = CUSTOMER_MARKETING_TEAM_entityStateToStatusMap;
   break;
   case FOX_LPRO_TEAM.toUpperCase():
   mapping = FOX_LPRO_TEAM_entityStateToStatusMap;
   break;
}

if (!mapping) {return undefined}
const targetStatus = mapping.get((args.value.changed.Name || '').toUpperCase())
if (targetStatus) {
    return {
        kind: 'Value',
        value: targetStatus
    }
}

```

