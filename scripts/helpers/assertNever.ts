
// Externally-visible signature, used for type-checking
function assertNever(arg: never) : never;

// Implementation signatore, what's called at runtime
function assertNever(arg: any){
    console.error(arg);
    throw new Error(`assertNever failed for value ${arg}!`)
}