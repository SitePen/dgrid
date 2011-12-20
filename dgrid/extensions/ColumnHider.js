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
		bodyListener; // references pausable event handler for body mousedown
	
	function getColumnIdFromCheckbox(cb, grid){
		// given one of the checkboxes from the hider menu,
		// return the id of the corresponding column.
		// (e.g. gridIDhere-hider-menu-check-colIDhere -> colIDhere)
		return cb.id.substr(grid.id.length + 18);
	}
	
	return declare([], {
		hiderMenuNode: null,		// the menu to show/hide columns
		hiderToggleNode: null,		// the toggler to open the menu
		hiderMenuOpened: false,		// current state of the menu
		_columnStyleRules: null,	// private map to hold the return of column.setStyle
		
		renderHeader: function(){
			var grid = this,
				hiderMenuNode = this.hiderMenuNode,
				hiderToggleNode = this.hiderToggleNode,
				id, col, div, checkId;
			
			this.inherited(arguments);
			
			if(!hiderMenuNode){ // first run
				// assume that if this plugin is used, then columns are hidable.
				// create the toggle node.
				hiderToggleNode = this.hiderToggleNode =
					put(this.headerScrollNode, "div.dgrid-hider-toggle.dgrid-cell-padding", "+");
				
				this._listeners.push(listen(hiderToggleNode, "click", function(e){
					grid._toggleHiderMenu(e);
				}));
	
				// create the column list, with checkboxes.
				hiderMenuNode = this.hiderMenuNode =
					put("div#dgrid-hider-menu-" + this.id + ".dgrid-hider-menu");
				
				// make sure our menu is initially hidden, then attach to the document.
				hiderMenuNode.style.display = "none";
				put(this.domNode, hiderMenuNode);
				
				// hook up delegated listener for modifications to checkboxes
				this._listeners.push(listen(hiderMenuNode,
					".dgrid-hider-menu-check:" + (has("ie") < 9 ? "click" : "change"),
					function(e){
						grid._toggleColumnState(e);
					}
				));
				this._listeners.push(listen(hiderMenuNode, "mousedown", function(e){
					// stop click events from propagating here, so that we can simply
					// track body clicks for hide without having to drill-up to check
					e.stopPropagation();
				}));
				
				// hook up top-level mousedown listener if it hasn't been yet
				if(!bodyListener){
					bodyListener = listen.pausable(document.body, "mousedown", function(e){
						// If an event reaches this listener, the menu is open,
						// but a click occurred outside, so close the dropdown.
						activeGrid && activeGrid._toggleHiderMenu(e);
					});
					bodyListener.pause(); // pause initially; will resume when menu opens
				}
			}else{ // subsequent run
				// remove active rules, and clear out the menu (to be repopulated)
				for (id in this._columnStyleRules){
					this._columnStyleRules[id].remove();
				}
				hiderMenuNode.innerHTML = "";
			}
			
			this._columnStyleRules = {};

			// populate menu with checkboxes/labels based on current columns
			for(id in this.columns){
				col = this.columns[id];
				// allow cols to opt out of the hider (specifically for selector col)
				if (col.unhidable) continue;
				
				// create the HTML for each column selector.
				div = put(hiderMenuNode, "div.dgrid-hider-menu-row");
				checkId = grid.domNode.id + "-hider-menu-check-" + id;
				// create label and checkbox via innerHTML to make old IEs behave
				div.innerHTML = '<input type="checkbox" id="' + checkId +
					'" class="dgrid-hider-menu-check hider-menu-check-' + id +
					'"><label class="dgrid-hider-menu-label hider-menu-label-' + id +
					'" for="' + checkId + '">' + col.label.replace(/</g, "&lt;") +
					'</label>';
				
				if(col.hidden){
					// hidden state is true; hide the column
					this._columnStyleRules[id] = grid.styleColumn(id, "display: none");
				}else{
					// hidden state is false; checkbox should be initially checked
					div.firstChild.checked = true;
				}
			}
		},
		
		isColumnHidden: function(id){
			// summary:
			//		Convenience method to determine current hidden state of a column
			return !!this._columnStyleRules[id];
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

		_toggleColumnState: function(e){
			//	show or hide the given column
			var id = getColumnIdFromCheckbox(e.target, this);
			if(this._columnStyleRules[id]){
				this._columnStyleRules[id].remove();
				delete this._columnStyleRules[id];
			} else {
				this._columnStyleRules[id] = this.styleColumn(id, "display: none;");
			}
			// emit event to notify of column state change
			listen.emit(this.domNode, "dgrid-columnstatechange", {
				column: this.columns[id],
				hidden: !e.target.checked
			});

			//	adjust the size of the header
			this.resize();
		}
	});
});
