define(["./Editor"], function(Editor){

return function(column, editOn){
    // summary:
    //      Add a column with text editing capability
    return Editor(column, "text", editOn || "dblclick");
}
});