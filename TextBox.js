define(["./Editor"], function(Editor){

return function(column){
    // summary:
    //      Add a column with text editing capability
    return Editor(column, "text", "dblclick");
}
});