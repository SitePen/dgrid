This project provides widgets for lists of data, including simple sets of scrolling rows,
tables of data, on-demand lazy-loaded data, and various plugins for additional functionality. 
This project also provides touch scrolling
for mobile devices with native style momentum, bouncing, and scrollbars. The 
components are broken down into the following top level widget modules:

<h2>List</h2>
This provides the basic facilities for taking an array of objects and rendering as rows
of HTML in a scrollable area. This will automatically include touch scrolling (via TouchScroll module)
capabilities on mobile devices. The List can be used to render an array of data. For example:
<pre>
define(["d-list/List"], function(List){
	// attach to a DOM id
	list = new List({}, "list"); 
	// render some data
	list.renderCollection(arrayOfData);
	... 
</pre>

<h2>Table</h2>
This extends List to provide tabular display of data in columns. The component will
provide a header for each column that corresponds to columns within the scrollable
grid of data. The columns of the table are defined by using layout property. The layout
property should have an array of each column definition objects. The column definition object
may have the following properties (all our optional):

* field - This is the property from the object in the list to display in the body of the table.
* name - This is the label to show in the header of the table.
* sortable - This indicates whether or not you can sort on this column/field.
* editable - This indicates whether or not to allow editing of the value (defaults to using the TextEdit plugin)
* get - This can be a function that will retrieve the value to display from the object in the list.
* formatter - This can be a function that will convert the value to a string/HTML for rendering.
* renderCell - This can be a function that will be called to render the value into the target &lt;td> for each cell.
* className - A DOM/CSS class to assign to the cells in the column. 

The d-list components are designed to be highly CSS driven for optimal performance and organization, so visual styling should be controlled
through CSS. The table creates classes based fields (or if you provided a className property) with
the convention of "field-<field-name>". For example, you could define a table and CSS like:
<pre>
&lt;style>
.field-age {
	width: 80px;
}
.field-name {
	font-weight: bold;
}
&lt;/style>
&lt;script>
define(["d-list/Table"], function(Table){
	table = new Table({
			layout: [ // define the columns
				{name: 'Age', field: 'age'},
				{name: 'Name', field: 'name'},
				...
			]});
	table.renderCollection(someData);
&lt;/script>
</pre>
<h2>OnDemandList</h2>
This extends List to provide on-demand lazy loading or paging of data as the user
scrolls through the list and connects to a Dojo data store for querying of data. 
This provides a seamless, intuitive interface for viewing large sets of data in scalable way.
This also provides sorting delegation to the store. The OnDemandList requires a store
property, and will call the query() method on the store to retrieve the data to be rendered.
OnDemandList will can query() with start and count properties so as to only retrieve
the necessary objects needed to render the visible rows. As the table is scrolled, more
query() calls will be made to retrieve additional rows.

<h2>OnDemandTable</h2>
The composition of Table and OnDemandList. It is nothing more than Table.extend(OnDemandList).
For example:
<pre>
define(["d-list/OnDemandTable"], function(Table){
	// attach to a DOM id
	table = new Table({
			store: myStore, // a Dojo object store
			layout: [ // define the columns
				{name: 'Column 1', field: 'col1', editable: true, sortable: true},
				{name: 'Column 2', field: 'col2'},
				...
			]
		}, "table");	... 
</pre>

<h3>More List API</h3>
The List class also has the following methods:

* row(value) - This will lookup the requested row and return a Row object. The single
parameter may be an DOM event, DOM node, data object id, or data object. The Row
object has the following properties:
** id - The data object id
** element - The row DOM element
** data - The data object
* on(event, listener) - Basic event listener functionality, just delegates to the DOM element using standard dojo/listen behavior.    
* renderCollection(array, beforeNode) - This can be called to render an array. The beforeNode parameter can be used to render at a specific place in the list.
* renderRow(value, options) - This can be overriden to provide a custom rendering of each row

<h1>Plugins</h1>
The following modules can be used as plugins to add extra functionality to a Table. To use
these, simply add the module as a mixin. For example, to create a grid based on 
OnDemandTable with the selection and keyboard handling plugins, we could do:
<pre>
define(["dojo", "d-list/OnDemandTable", "d-list/Selection", "d-list/Keyboard"], function(dojo, Table, Selection, Keyboard){
	// create a table based on plugins
	MyTable = dojo.declare([Table, Selection, Keyboard]);
	// instantiate it
	table = new MyTable({
		store: myStore,
		...
	}, "table");
</pre>
You can also do inline mixin and instantiation:
<pre>
	table = dojo.declare([Table, Selection, Keyboard])({
		store: myStore,
		...
	}, "table");
</pre>
Below are the plugins that are available:

<h2>Selection</h2>
Adds selection capability to a List/Table. The list instance will include a selection property
with an a Stateful (instance of dojo.Stateful) that represents the selected items. This
plugin will also cause "select" and "deselect" events to be fired. For example:
<pre>
table = dojo.declare([Table, Selection])({
	selectionMode: "single",
	...});
table.on("select", function(event){
	// get the row that was just selected
	var row = table.row(event);
	for(var id in table.selection){
		if(table.selection[id] === true){
			// iterate through all selected items
		}
	}
});
table.on("deselect", function(event){
	var row = table.row(event);
	// row was just deselected 
});
</pre>
The following properties and methods are added by the Selection plugin:

* selection - The object containing the ids of the selected objects.
* selectionMode - A string indicating the mode of selection. The following values are acceptable:
** multiple - This is the default setting, and follows common ctrl and shift key practices for selection
** single - This only allows one row to be selected at a time
** extended - This is similar to multiple but normal clicks add selection without removing previous selections
** none - Nothing can be selected by user interaction, only programmatic selection is allowed.
* select(id) - Programmatically select a row (by object id)
* deselect(id) - Programmatically deselect a row (by object id)

<h2>Keyboard</h2>
This plugin adds keyboard handling functionality. The cursor keys can be used to navigate the focus
across cells and rows, providing accessibility and ease of use.


<h1>Column Plugins</h1>
The following modules are plugins designed for specific columns of cells. This plugins are
used by creating an instance and using it was a column in the layout. For example, to 
create a layout where the first column has a tree expander and the second column has
a checkbox, we could do:
<pre>
define(["d-list/OnDemandTable", "d-list/Tree", "d-list/CheckBox"], function(Table, Tree, CheckBox){
	table = new Table({
			store: myHierarchicalStore, // a Dojo object store
			layout: [ // define the columns
				// first column will have a tree expander:
				new Tree({name:'Name', field:'name'}),
				// second column will render with a checkbox: 
				new CheckBox({name: 'A CheckBox', field: 'bool'}),
				// just a normal column:
				{name:'Type', field:'type'},
				...
			]
		}, "table");	... 
</pre>

<h2>Tree</h2>  
Provides expansion of rows to display children. The store is expected to provide a 
getChildren(object, options) method to return the children for each object. The store
may also (optionally) provide a mayHaveChildren(object) method that returns a 
boolean indicating whether or not the row can be expanded.

<h2>TextEdit</h2>
Provides editing capability of text data in cells in the column. Changing a value will trigger
a store.put(updatedObject) call.

<h2>CheckBox</h2>
Renders boolean values with a checkbox that can be checked and unchecked to indicate
edit the value.

<h2>grid-2.0/gridx/ColumnResizer</h2>
The ColumnResizer plugin from https://github.com/kriszyp/grid-2.0/tree/simple-plugin/gridx/modules
can be used to add column resizing (via dragging) functionality.

<h2>grid-2.0/gridx/dnd/Row</h2>
The dnd/Row plugin from https://github.com/kriszyp/grid-2.0/tree/simple-plugin/gridx/modules/dnd
can be used to add row drag n' drop functionality. The store should be order-aware and 
support the options.before parameter on put() calls to properly respond to drag n' drop
operations.

<h1>Themes/Skins</h1>
The d-list automatically loads the necessary structural CSS to work properly. However, you can
also use one of the the included skins/themes. There is a tundra.css and claro.css theme
files in the css directory that can be used to included to skin the d-list to a particular
look and feel.

<h2>Table Structure for custom CSS Styling</h2>
TODO: Document the classes and structure. For now, looking at this in your debugger
should get you by.