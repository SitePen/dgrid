define(["dojo/_base/declare", "dojo/has", "dojo/on", "dojo/query", "dojo/dom", "put-selector/put", "dojo/NodeList-dom", "xstyle/css!../css/extensions/ColumnHider.css"], 
	function(declare, has, listen, query, dom, put){
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
	
	var activeGrid, // references grid for which the menu is currently open
		bodyListener = listen.pausable(document.body, "mousedown", function(e){
			// If an event reaches this listener, the menu is open,
			// but a click occurred outside, so close the dropdown.
			activeGrid && activeGrid._toggleHiderMenu(e);
		});
	
	function getColumnIdFromCheckbox(cb, grid){
		// given one of the checkboxes from the hider menu,
		// return the id of the corresponding column.
		// (e.g. gridIDhere-hider-menu-check-colIDhere -> colIDhere)
		return cb.id.substr(grid.id.length + 18);
	}
	
	return declare([], {
		hiderMenuNode: null,		//	the menu to show/hide columns
		hiderToggleNode: null,		//	the toggler to open the menu
		hiderMenuOpened: false,		//	current state of the menu
		hideState: null,			//	dictionary of current columns state
		_columnStyleRules: null,	//	private map to hold the return of column.setStyle
		postCreate: function(){
			this.inherited(arguments);
			var grid = this;
			this.hideState = {};
			this._columnStyleRules = {};

			//	assume that if this plugin is used, then columns are hidable.
			//	create the toggle node.
			this.hiderToggleNode = put(this.headerScrollNode, "div.dgrid-hider-toggle.dgrid-cell-padding", "+");
			this.hiderToggleNode.setAttribute("title", "Click here to show or hide columns.");
			this._listeners.push(listen(this.hiderToggleNode, "click", function(e){
				grid._toggleHiderMenu(e);
			}));

			//	create the column list, with checkboxes.
			this.hiderMenuNode = put("div#dgrid-hider-menu-" + this.id + ".dgrid-hider-menu");
			for(var id in this.columns){
				var col = this.columns[id];

				// create the HTML for each column selector.
				var div = put(".dgrid-hider-menu-row");
				var checkId = grid.domNode.id + "-hider-menu-check-" + id;
				// insert checkbox inside of label to make IE < 8 behave properly
				var label = put(div, "label.dgrid-hider-menu-label.hider-menu-label-" + id, col.label);
				var check = put(label.firstChild, "-input.dgrid-hider-menu-check.hider-menu-check-" + id + "#" + checkId + "[type=checkbox]");
				if(has("ie") < 9){
					this._listeners.push(listen(check, "click", function(e){
						grid._toggleColumnState(grid, e);
					}));
				} else {
					this._listeners.push(listen(check, "change", function(e){
						grid._toggleColumnState(grid, e);
					}));
				}

				//	track our state
				this.hideState[id] = ("hidden" in col) && col.hidden;
				check.checked = !this.hideState[id];

				//	attach our row
				put(this.hiderMenuNode, div);

				//	if our state is true, go hide the column.
				if(this.hideState[id]){
					this._columnStyleRules[id] = grid.styleColumn(id, "display: none");
				}
			}
			listen(this.hiderMenuNode, "mousedown", function(evt){
				// stop click events from propagating here, so that we can simply
				// track body clicks for hide without having to drill-up to check
				evt.stopPropagation();
			});
			//	make sure our menu is initially hidden, then attach to the document.
			this.hiderMenuNode.style.display = "none";
			put(grid.domNode, this.hiderMenuNode);
			
			//	adjust the header if needed
			grid.resize();

			//	attach a listener to the document body to close the menu
			var self = this;
		},
		
		_toggleHiderMenu: function(){
			var hidden = this.hiderMenuOpened; // reflects hidden state after toggle
			// show or hide the hider menu
			this.hiderMenuNode.style.display = (hidden ? "none" : "");
			// pause or resume the listener for clicks outside the menu
			bodyListener[hidden ? "pause" : "resume"]();
			// update activeGrid appropriately
			activeGrid = hidden ? null : this;
			// toggle the instance property
			this.hiderMenuOpened = !hidden;
		},

		_toggleColumnState: function(grid, e){
			//	show or hide the given column
			var id = getColumnIdFromCheckbox(e.target, this);
			grid.hideState[id] = !e.target.checked;
			if(grid._columnStyleRules[id]){
				grid._columnStyleRules[id].remove();
				delete grid._columnStyleRules[id];
			} else {
				grid._columnStyleRules[id] = grid.styleColumn(id, "display: none;");
			}
			// emit event to notify of column state change
			listen.emit(grid.domNode, "dgrid-columnstatechange", {
				column: grid.columns[id],
				hidden: !e.target.checked
			});

			//	adjust the size of the header
			grid.resize();
		}
	});
});
