
function firstFreeIndex(collection: any[] | object) : number{
    let numIDs : number;
    if(collection instanceof Array){
        numIDs = collection.length;
    } else {
        numIDs = Object.keys(collection).length;
    }
    for(let i = 0; i <= numIDs; i++){
        if(typeof (collection as any)[i] === "undefined"){
            return i;
        }
    }
    return numIDs;
}