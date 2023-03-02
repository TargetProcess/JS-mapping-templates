You can use this mapping to transform an entity collection in Targetprocess to a string in Jira.
Represents entity collection as coma separated names in jira text field.

Transformation from Targetprocess to Jira:
```js
if (args.value.changed && args.value.changed.length) {
    const resultString = 'Tasks:\n' + args.value.changed.map(i => i.name).join('\n')
    return {
        kind: 'Value',
        value: resultString
    }
} else {
    const api = context.getService('targetprocess/api/v2')
    const entity = await api.getByIdAsync(args.sourceEntity.entityType, parseInt(args.sourceEntity.sourceId), {
        select: `${args.sourceField.id}`
    })

    if (entity && entity.items && entity.items.length) {
        const resultString = 'Tasks:\n' + entity.items.map(i => i.name).join('\n')
        return {
            kind: 'Value',
            value: resultString
        }
    }
}