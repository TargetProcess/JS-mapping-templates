## Dynamic Mapping for Tags from Ado to Targetprocess

### Tp -> Ado

```
const value = args.value.changed

if(value !== null && value !== undefined){
    const tags = value.split(',').map(t => t.trim())
    return {
        kind: 'Value',
        value: tags.join('; ')
    }
}
```


### Ado -> Tp

```
const value = args.value.changed

if(value !== null && value !== undefined) {
    const tags = value.split(';').map(t => t.trim())
    return {
        kind: 'Value',
        value: tags.join(', ')
    }
}
```
