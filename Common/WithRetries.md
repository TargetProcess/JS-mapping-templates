## Js mapping with retires

```
try{
    // do some error-prone logic here 

    return {
        kind: "Value",
        value: 'some value'
    }
}catch(e){
    // Do retry in case of error. You can apply some additional logic to do retries only in case of specific errors.
    return {
        kind: "Retry"
    }
}
```