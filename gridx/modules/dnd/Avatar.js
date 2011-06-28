define(['dojo', 'dojo/dnd/Avatar'], function(dojo, Avatar){

return dojo.declare([Avatar], {
	construct: function(manager){
		// summary:
		//		constructor function;
		//		it is separate so it can be (dynamically) overwritten in case of need
		this.isA11y = dojo.hasClass(dojo.body(), "dijit_a11y");
		
		var a = dojo.create("table", {
				"border": "0",
				"cellspacing": "0",
				"class": "dojoxGridxDndAvatar",
				"style": {
					position: "absolute",
					zIndex: "1999",
					margin: "0px"
				}
			}),
			source = this.manager.source,
			b = dojo.create("tbody", null, a),
			tr = dojo.create("tr", null, b),
			td = dojo.create("td", {
				"class": "dojoxGridxDnDIcon"
			}, tr);
		if(this.isA11y){
			dojo.create("span", {
				"id" : "a11yIcon",
				"innerHTML" : this.manager.copy ? '+' : "<"
			}, td);
		}
		td = dojo.create("td", {
			"class" : "dojoxGridxDnDItemIcon " + this._getIconClass()
		}, tr);
		td = dojo.create("td", null, tr);
		dojo.create("span", {
			"class": "dojoxGridxDnDItemCount",
			"innerHTML": this._generateText()
		}, td);
		// we have to set the opacity on IE only after the node is live
		dojo.style(tr, {
			"opacity": 0.9
		});
		this.node = a;
	},
	_getIconClass: function(){
		var info = this.manager._dndInfo;
		return ['dojoxGridxDnDIcon', info.type, info.count === 1 ? 'Single' : 'Multi'].join('');
	},
	_generateText: function(){
		// summary:
		//		generates a proper text to reflect copying or moving of items
		return "(" + this.manager._dndInfo.count + ")";
	}
});
});
