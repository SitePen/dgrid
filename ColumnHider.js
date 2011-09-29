define(["dojo/_base/declare", "dojo/on", "dojo/query", "dojo/dom", "put-selector/put", "dojo/dom-class", "dojo/_base/html", "dojo/NodeList-dom"], 
	function(declare, listen, query, dom, put, cls){
/*
 *	Column Hider plugin for dgrid
 *	v.1.0.0
 *	TRT 2011-09-28
 *
 *	A dGrid plugin that attaches a menu to a dgrid, along with a way of opening it,
 *	that will allow you to show and hide columns.  A few caveats:
 *
 *	1. Menu placement is entirely based on CSS definitions.
 *	2. If you want columns initially hidden, you must add "hidden: true" to your
 *		column definition.
 *	3. This has NOT been tested with the ColumnSets plugin; if you are trying to
 *		do multi-row records, this will probably not work for you.
 *	4. Column show/hide is controlled via straight up HTML checkboxes.  If you 
 *		are looking for something more fancy, you'll probably need to use this
 *		definition as a template to write your own plugin.
 *
 */ 
	return declare([], {
		hiderMenuNode: null,		//	the menu to show/hide columns
		hiderToggleNode: null,		//	the toggler to open the menu
		hiderMenuOpened: false,		//	current state of the menu
		hideState: null,			//	dictionary of current columns state
		postCreate: function(){
			this.inherited(arguments);
			var grid = this;
			this.hideState = {};

			//	assume that if this plugin is used, then columns are hidable.
			//	create the toggle node.
			var scrollerNode = query("#" + grid.domNode.id + " .dgrid-header-scroll")[0];
			this.hiderToggleNode = put(scrollerNode, "div.dgrid-hider-toggle", "+");
			this.hiderToggleNode.setAttribute("title", "Click here to show or hide columns.");
			listen(scrollerNode, "mousedown", function(e){
				grid._toggleHiderMenu(e);
			});

			//	create the column list, with checkboxes.
			this.hiderMenuNode = put("div.dgrid-hider-menu");
			for(var id in this.columns){
				var col = this.columns[id];

				// create the HTML for each column selector.
				var div = put(".dgrid-hider-menu-row");
				var check = put(div, "input.dgrid-hider-menu-check.hider-menu-check-" + id + "#" + grid.domNode.id + "-hider-check-" + id + "[type=checkbox]");
				put(div, "label.dgrid-hider-menu-label.hider-menu-label-" + id, col.label);
				listen(check, "change", function(e){
					grid._toggleColumnState(grid, e);
				});

				//	track our state
				this.hideState[id] = ("hidden" in col) && col.hidden;
				check.checked = !this.hideState[id];

				//	attach our row
				put(this.hiderMenuNode, div);

				//	if our state is true, go hide the column.
				if(this.hideState[id]){
					grid.styleColumn(id, "display: none");
				}
			}
			//	make sure our menu is initially hidden, then attach to the document.
			this.hiderMenuNode.style.display = "none";
			put(grid.domNode, this.hiderMenuNode);
		},

		_toggleHiderMenu: function(e){
			//	show or hide the hider menu
			this.hiderMenuNode.style.display = (this.hiderMenuOpened ? "none" : "");
			this.hiderMenuOpened = !this.hiderMenuOpened;
		},

		_toggleColumnState: function(grid, e){
			//	show or hide the given column
			var id = e.target.id.split("-").pop();
			grid.styleColumn(id, "display: " + (e.target.checked?"table-cell":"none"));
			grid.hideState[id] = e.target.checked;
		}
	});
});
