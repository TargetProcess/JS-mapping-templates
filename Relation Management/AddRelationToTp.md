Here is an example how to set relation in Targetprocess from JavaScript field mapping. In this particular example we add Bug with id 102 to the Bugs collection of current entity.

``` javascript
return {
    kind: "RelationAdded",
    relation: {
        sourceId: "102",
        entityType: "bug",
        relationType: "hierarchy",
        propertyName: "Bugs"
    }
}
```

In case we need to set several relation, we could return an array of them:

``` javascript
return [{
    kind: "RelationAdded",
    relation: {
        sourceId: "102",
        entityType: "bug",
        relationType: "hierarchy",
        propertyName: "Bugs"
    }
},{
    kind: "RelationAdded",
    relation: {
        sourceId: "103",
        entityType: "bug",
        relationType: "hierarchy",
        propertyName: "Bugs"
    }
}]
```