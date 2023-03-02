Sometimes you want have different values in Jira and Targetprocess. Here is example of mapping one customer asked as to do.
He wanted have Jira issue key as prefix in Targetprocess Name and pure summary in Jira.
Transformation from Targetprocess name to Jira summary:

```js
// define prefix
const prefix = `SNOM (${args.targetEntity.sourceId}) `
let newValue = args.value.changed
// Check if name starts with prefix
if(newValue.startsWith(prefix)){
// If yes. Remove prefix when transfer value to Jira
    newValue = newValue.replace(prefix, '')
}
return {kind: 'Value', value: newValue}

```

Transformation from Jira summary to Targetprocess name:

```js
// define prefix
const prefix = `SNOM (${args.sourceEntity.sourceId})`
let newValue = args.value.changed
// check if summary starts with prefix
if(!newValue.startsWith(prefix)){
    // if it is not start from prefix, add prefix when transfering value to Targetprocess
    newValue = `${prefix} ${newValue}`
}
return {kind: 'Value', value: newValue}

```