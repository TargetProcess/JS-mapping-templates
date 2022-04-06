There are 5 levels for Priority in Jira for each Issue. From "Lowest" to "Highest" with corresponding values:

"1" - "Highest" - This problem will block progress.
"2" - "High" - Serious problem that could block progress.
"3" - "Medium" - Has the potential to affect progress.
"4" - "Low" - Minor problem or easily worked around.
"5" - "Lowest" - Trivial problem with little or no impact on progress.

But in Targetprocess each type of Entity has own Priority level (aka _Business value_).

So we have to write js mapping for each type of Entity

Transformation from Targetprocess Priority to Jira Priority for US:

```js
const mappingTpPrioritiesToJiraNames = {
    'Must Have': 'Highest',
    'Great': 'High',
    'Good': 'Medium',
    'Average': 'Low',
    'Nice To Have': 'Lowest',
};
const tpPriorityName = args.value.changed.name;
const jiraPriorityName = mappingTpPrioritiesToJiraNames[tpPriorityName];

if (!jiraPriorityName) {
    console.warn(`No Priority Mapping settings for TP Priority name: ${tpPriorityName}`);
    return;
}

return {
    value: { name: jiraPriorityName },
    kind: 'Value'
};

```

Transformation from Jira Priority to Targetprocess Priority for Bugs:

```js
const mappingJiraPrioritiesToTpNames = {
    'Highest': 'Must Have',
    'High': 'Great',
    'Medium': 'Good',
    'Low': 'Average',
    'Lowest': 'Nice To Have',
};
const jiraPriorityName = args.value.changed.name;
const tpPriorityName = mappingJiraPrioritiesToTpNames[jiraPriorityName];


if (!tpPriorityName) {
    console.warn(`No Priority Mapping settings for Jira Priority name: ${jiraPriorityName}`);
    return;
}

return {
    value: tpPriorityName,
    kind: 'Value'
};

```

In order to write js mapping for other Entity Types just change values in ``mappingTpPrioritiesToJiraNames`` and ``mappingJiraPrioritiesToTpNames`` objects.
For instance for Bugs it could be
```js
const mappingTpPrioritiesToJiraNames = {
    'Fix ASAP': 'High',
    'Fix If Time': 'Low'
};
```
and

```js
const mappingJiraPrioritiesToTpNames = {
    'Highest': 'Fix ASAP',
    'High': 'Fix ASAP',
    'Medium': 'Fix ASAP',
    'Low': 'Fix If Time',
    'Lowest': 'Fix If Time',
};
```
