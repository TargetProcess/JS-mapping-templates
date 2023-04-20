## Tags to Labels

### TP to Jira

```js
const tags = args.value.changed;

const arrayTags = tags.split(/\s*,\s*/);

if (arrayTags.length) {
    return {
        kind:'Value',
        value:arrayTags.map(v=> v.replace(/ /g,'\u02CD'))
    }
}
```

### Jira to TP

```js
const cv = args.value.changed;
return {
    kind:'Value',
    value:cv.map(v=> v.replace(/\u02CD/g,' ')).join(', ')
}
```

### Comparator

```js

function normalizeTag(value) {
  return value.trim().toLowerCase()
}

function normalizeTagArray(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeTag)
  }
  if (typeof value === 'string' && value) {
    return value.split(',').map(tag => normalizeTag(tag))
  }
  return []
}

const sourceArray = normalizeTagArray(args.sourceFieldValue.toolValue)
const targetArray = normalizeTagArray(args.targetFieldValue.toolValue).map(v => v.replace(/\u02CD/g, ' '))

return sourceArray.length === targetArray.length && sourceArray.every(sv => targetArray.includes(sv))

```
