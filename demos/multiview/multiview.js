define([
	"dgrid/OnDemandGrid",
	"dgrid/Selection",
	"dgrid/Keyboard",
	"dojo/_base/declare",
	"dojo/dom-construct",
	"dojo/on",
	"dojo/query",
	"dojo/store/Memory",
	"dojo/store/Observable",
	"put-selector/put",
	"dojo/text!./resources/description.html"
], function(Grid, Selection, Keyboard, declare, domConstruct, on, query, Memory, Observable, put, descriptionHtml){
	// Render DOM
	var containerNode = put(document.body, "div"),
		switchNode = put("div.controls", "Select View: "),
		tableButton = put(switchNode, "button[type=button]", "Table"),
		detailsButton = put(switchNode, "button[type=button]", "Details"),
		galleryButton = put(switchNode, "button[type=button]", "Gallery"),
		contentNode = put("div.content"),
		gridNode;
	
	put(containerNode, switchNode);
	
	gridNode = put(contentNode, "div#grid.table");
	domConstruct.place(descriptionHtml, contentNode);
	put(containerNode, contentNode);
	
	var grid, store, origRenderRow, expandoListener, expandedNode,
		renderers = {
			gallery: function(obj, options){
				// function used for renderRow for gallery view (large tiled thumbnails)
				var div = put("div");
				div.innerHTML = '<div class="icon" style="background-image:url(resources/' +
					obj.icon + '-128.png);">&nbsp;</div><div class="name">' + obj.name + '</div>';
				return div;
			},
			details: function(obj, options){
				// function used for renderRow for details view (items w/ summary)
				var div = put("div");
				div.innerHTML = '<div class="icon" style="background-image:url(resources/' +
					obj.icon + '-64.png);">&nbsp;</div><div class="name">' +
					obj.name + '</div><div class="summary">' + obj.summary + '</div>';
				return div;
			},
			table: function(obj, options){
				var div = put("div.collapsed", Grid.prototype.renderRow.apply(this, arguments)),
					expando = put(div, "div.expando", obj.summary);
				return div;
			}
		};
	
	function viewClickHandler(view){
		return function(){
			// pause/resume click listener for expando in "table" view
			expandoListener[view === "table" ? "resume" : "pause"]();
			// reset expanded node for table view
			expandedNode = null;
			// update renderRow function
			grid.renderRow = renderers[view];
			// update class on grid domNode
			put(grid.domNode, "!table!gallery!details." + view);
			// only show headers if we're in "table" view
			grid.set("showHeader", view === "table");
			// force redraw of rows
			grid.refresh();
		};
	}
	
	function byId(id) { return document.getElementById(id); }
	
	store = new Memory({ data: [
		{ id: "dojo", name: "Dojo Core", icon: "dojo",
			summary: "Dojo core is a powerful, lightweight library that makes common tasks quicker and easier. Animate elements, manipulate the DOM, and query with easy CSS syntax, all without sacrificing performance."
		}, {
			id: "dijit", name: "Dijit", icon: "dojo",
			summary: "Dijit provides a complete collection of user interface controls based on Dojo, giving you the power to create web applications that are highly optimized for usability, performance, internationalization, accessibility, but above all deliver an incredible user experience."
		}, {
			id: "dgrid", name: "dgrid", icon: "df",
			summary: "A lightweight, mobile-ready, data-driven, modular widget designed for lists and grids."
		}, {
			id: "xstyle", name: "xstyle", icon: "df",
			summary: "CSS framework providing polyfills, extensions, dynamic loading, and selector based DOM manipulation."
		}, {
			id: "put-selector", name: "put-selector", icon: "df",
			summary: "A high-performance, lightweight function for creating and manipulating DOM elements with succinct, elegant, familiar CSS selector-based syntax."
		}
	] });
	
	grid = new Grid({
		columns: [
			{
				label: " ",
				field: "icon",
				sortable: false,
				formatter: function(icon){
					return '<div class="icon" style="background-image:url(resources/' +
						icon + '-32.png);">&nbsp;</div>';
				}
			},
			{ label: "Package", field: "id" },
			{ label: "Name", field: "name" }
		],
		store: store,
		renderRow: renderers.table
	}, "grid");
	
	// store initially-active renderRow as renderer for table view
	renderers.table = grid.renderRow;
	
	// listen for clicks to trigger expand/collapse in table view mode
	expandoListener = on.pausable(grid.domNode, ".dgrid-row:click", function(evt){
		var
			node = grid.row(evt).element,
			collapsed = node.className.indexOf("collapsed") >= 0;
		
		// toggle state of node which was clicked
		put(node, (collapsed ? "!" : ".") + "collapsed");
		
		// if clicked row wasn't expanded, collapse any previously-expanded row
		collapsed && expandedNode && put(expandedNode, ".collapsed");
		
		// if the row clicked was previously expanded, nothing is expanded now
		expandedNode = collapsed ? node : null;
	});
	
	// switch views when buttons are clicked
	tableButton.onclick = viewClickHandler("table");
	detailsButton.onclick = viewClickHandler("details");
	galleryButton.onclick = viewClickHandler("gallery");
});