define(["dojo/has", "put-selector/put", "xstyle/css!./css/dgrid.css"], function(has, put){
	// dgrid's feature detection
	function getScrollbarSize(node, dimension){
		// Used by has tests for scrollbar width/height
		var body = document.body,
			size;
		
		put(body, node, ".dgrid-scrollbar-measure");
		size = node["offset" + dimension] - node["client" + dimension];
		
		put(node, "!dgrid-scrollbar-measure");
		body.removeChild(node);
		
		return size;
	}
	has.add("dom-scrollbar-width", function(global, doc, element){
		return getScrollbarSize(element, "Width");
	});
	has.add("dom-scrollbar-height", function(global, doc, element){
		return getScrollbarSize(element, "Height");
	});
	// our best guess to determine if only touch is available, and we won't
	// end up ruining native scrollbars
	has.add("only-touch", function(){
		return has("touch") && has("dom-scrollbar-width") === 0;
	});
	return has;
});