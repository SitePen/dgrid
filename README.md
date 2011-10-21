This project provides widgets for lists of data, including simple sets of scrolling rows,
grids of data, on-demand lazy-loaded data, and various plugins for additional functionality. 
This project also provides touch scrolling
for mobile devices with native style momentum, bouncing, and scrollbars. To use this package,
install with <a href="https://github.com/kriszyp/cpm">CPM</a>:
<pre>
cpm install dgrid
</pre>
Or download it along with it's dependencies, which are <a href="https://github.com/kriszyp/xstyle">xstyle</a>, <a href="https://github.com/kriszyp/put-selector">put-selector</a> 
and <a href="http://dojotoolkit.org">dojo</a> (make sure to download the project to view this link, it is not available from GitHub). 

The components are broken down into the following top level widget modules:

<h2>List</h2>
This provides the basic facilities for taking an array of objects and rendering as rows
of HTML in a scrollable area. This will automatically include touch scrolling (via TouchScroll module)
capabilities on mobile devices. The List can be used to render an array of data. For example:
<pre>
define(["dgrid/List"], function(List){
	// attach to a DOM id
	var list = new List({}, "list"); 
	// render some data
	list.renderArray(arrayOfData);
	... 
</pre>
See the <a href="doc/api.html?dgrid/doc/List">API viewer for a list methods available on the List component</a>.

<h2>Grid</h2>
This extends List to provide tabular display of data in columns. The grid component will
provide a header for each column that corresponds to columns within the scrollable
grid of data. The columns of the grid are defined by using columns property. The columns
property should have an object or array of each column definition objects. For each 
property in the columns object the property key is used as the 
id of the column and each value is the column definition object. If the columns value is an
array then the property keys are the numeric index. The column definition object
may have the following properties (all our optional):

* field - This is the property from the object in the list to display in the body of the grid. 
This defaults to the id of the column (if no get() function is provided).
* name - This is the label to show in the header of the grid.
This defaults to the id of the column.
* sortable - This indicates whether or not you can sort on this column/field.
* get - This can be a function that will retrieve the value to display from the object in the list.
* formatter - This can be a function that will convert the value to a string/HTML for rendering.
* renderCell - This can be a function that will be called to render the value into the target &lt;td> for each cell.
* renderHeaderCell - This can be a function that will be called to render the value into the target &lt;th> for the columns header.
* className - A DOM/CSS class to assign to the cells in the column. 
* id - This is the id of the column (normally this comes from the property keys in columns object or array). 

For example, we could create a grid with columns like:
<pre>
define(["dgrid/Grid"], function(List){
	var grid = new Grid({
		columns: {
			first: {
				label: "First Name",
				sortable: true
			},
			last: {
				label: "Last Name",
				sortable: true
			},
			age: {
				get: function(object){
					return (new Date().getTime() - object.birthDate.getTime()) / 31536000000;
				}
			}
		}
	}, "grid"); // attach to a DOM id 
	// render some data
	grid.renderArray(arrayOfData);
	... 
</pre>
The column definition may alternately simply be a string, in which case it the value of the string is interpreted as
the name of the column. We can more succinctly write simple columns:
<pre>
	var grid = new Grid({
		columns: {
			first: "First Name",
			last: "Last Name",
			...
		}
</pre> 

dgrid components are designed to be highly CSS-driven for optimal performance and organization, so visual styling should be controlled
through CSS. The grid creates classes based on the column ids (or if you provided a className property) with
the convention of "column-<column-id>". For example, you could define a grid and CSS like:
<pre>
&lt;style>
.column-age {
	width: 80px;
}
.column-first {
	font-weight: bold;
}
&lt;/style>
&lt;script>
define(["dgrid/Grid"], function(Grid){
	grid = new Grid({
			columns: [ // define the columns
				age: "Age",
				first: "First Name",
				...
			]});
	grid.renderArray(someData);
&lt;/script>
</pre>
The Grid class also provides a styleColumn(colId, css) method to programmatically
style a column.
See the <a href="doc/api.html?dgrid/doc/Grid">API viewer for a list methods available on the List component</a> (make sure to download the project to view this link, it is not available from GitHub).

<h2>OnDemandList</h2>
This extends List to provide on-demand lazy loading or paging of data as the user
scrolls through the list and connects to a Dojo data store for querying of data. 
This provides a seamless, intuitive interface for viewing large sets of data in scalable way.
This also provides sorting delegation to the store. The OnDemandList requires a store
property, and will call the query() method on the store to retrieve the data to be rendered.
OnDemandList will can query() with start and count properties so as to only retrieve
the necessary objects needed to render the visible rows. As the grid is scrolled, more
query() calls will be made to retrieve additional rows. This class provides the following
properties/methods:

* renderQuery(query) - This will render the given query into the list.
* sort(property, descending) - This will sort the list by the given property. The OnDemandList 
performs this by calling store.query() with the sort attribute with the provided parameters.  
* sortOrder - This holds the current sort order.

<h2>OnDemandGrid</h2>
The composition of Grid and OnDemandList. It simply the composition of Grid and OnDemandList.
For example:
<pre>
define(["dgrid/OnDemandGrid"], function(Grid){
	// attach to a DOM id
	grid = new Grid({
			store: myStore, // a Dojo object store
			columns: [ // define the columns
				{label: 'Column 1', field: 'col1', editable: true, sortable: true},
				{label: 'Column 2', field: 'col2'},
				...
			]
		}, "grid");	... 
</pre>

<h3>More List API</h3>
The base List class (inherited by all other classes) also has the following methods:

* row(value) - This will lookup the requested row and return a Row object. The single
parameter may be an DOM event, DOM node, data object id, or data object. The Row
object has the following properties:
<ul>
<li>id - The data object id</li>
<li>element - The row DOM element</li>
<li>data - The data object</li>
</ul>
* on(event, listener) - Basic event listener functionality, just delegates to the DOM element using standard dojo/on behavior.    
* renderArray(array, beforeNode) - This can be called to render an array. The beforeNode parameter can be used to render at a specific place in the list.
* renderRow(value, options) - This can be overridden to provide a custom rendering of each row

<h1>Plugins</h1>
The following modules can be used as plugins to add extra functionality to a Grid. To use
these, simply add the module as a mixin. For example, to create a grid based on 
OnDemandGrid with the selection and keyboard handling plugins, we could do:
<pre>
define(["dojo", "dgrid/OnDemandGrid", "dgrid/Selection", "dgrid/Keyboard"], function(dojo, Grid, Selection, Keyboard){
	// create a grid based on plugins
	MyGrid = dojo.declare([Grid, Selection, Keyboard]);
	// instantiate it
	grid = new MyGrid({
		store: myStore,
		...
	}, "grid");
</pre>
You can also do inline mixin and instantiation:
<pre>
	grid = dojo.declare([Grid, Selection, Keyboard])({
		store: myStore,
		...
	}, "grid");
</pre>
Below are the plugins that are available:

<h2>Selection</h2>
Adds selection capability to a List/Grid. The list instance will include a selection property
with an a Stateful (instance of dojo.Stateful) that represents the selected items. This
plugin will also cause "dgrid-select" and "dgrid-deselect" events to be fired. For example:
<pre>
grid = dojo.declare([Grid, Selection])({
	selectionMode: "single",
	...});
grid.on("dgrid-select", function(event){
	// get the row that was just selected
	var row = grid.row(event);
	for(var id in grid.selection){
		if(grid.selection[id] === true){
			// iterate through all selected items
		}
	}
});
grid.on("dgrid-deselect", function(event){
	var row = grid.row(event);
	// row was just deselected 
});
</pre>
The following properties and methods are added by the Selection plugin:

* selection - The object containing the ids of the selected objects.
* selectionMode - A string indicating the mode of selection. The following values are acceptable:
<ul>
<li>multiple - This is the default setting, and follows common ctrl and shift key practices for selection</li>
<li>single - This only allows one row to be selected at a time</li>
<li>extended - This is similar to multiple but normal clicks add selection without removing previous selections</li>
<li>none - Nothing can be selected by user interaction, only programmatic selection is allowed</li>
</ul>
* select(id) - Programmatically select a row (by object id)
* deselect(id) - Programmatically deselect a row (by object id)

<h2>Keyboard</h2>
This plugin adds keyboard handling functionality. The cursor keys can be used to navigate the focus
across cells and rows, providing accessibility and ease of use.


<h1>Column Plugins</h1>
The following modules are plugins designed for specific columns of cells. This plugins are
used by creating an instance and using it was a column in the columns. For example, to 
create a column set where the first column has a tree expander and the second column has
a checkbox, we could do:
<pre>
define(["dgrid/OnDemandGrid", "dgrid/Tree", "dgrid/Editor"], function(Grid, Tree, Editor){
	grid = new Grid({
			store: myHierarchicalStore, // a Dojo object store
			columns: [ // define the columns
				// first column will have a tree expander:
				Tree({label:'Name', field:'name'}),
				// second column will render with a checkbox: 
				Editor({label: 'A CheckBox', field: 'bool'}, "checkbox"),
				// just a normal column:
				{label:'Type', field:'type'},
				...
			]
		}, "grid");	... 
</pre>

<h2>Tree</h2>  
Provides expansion of rows to display children. The store is expected to provide a 
getChildren(object, options) method to return the children for each object. The store
may also (optionally) provide a mayHaveChildren(object) method that returns a 
boolean indicating whether or not the row can be expanded.

<h2>TextBox</h2>
This provides editing capability of text data in cells in the column. This is simply an Editor with the text input that shows on double click. 

<h2>CheckBox</h2>
Renders boolean values with a checkbox that can be checked and unchecked to indicate and
edit the value.

<h2>ColumnResizer</h2>
The ColumnResizer plugin from <a href="https://github.com/kriszyp/grid-2.0/tree/simple-plugin/gridx/modules">https://github.com/kriszyp/grid-2.0/tree/simple-plugin/gridx/modules</a> *need to update path
can be used to add column resizing (via dragging) functionality.

<h2>DnD</h2>
The DnD plugin can be used to add row drag n' drop functionality. The store should be order-aware and 
support the options.before parameter on put() calls to properly respond to drag n' drop
operations.

<h1>Themes/Skins</h1>
The dgrid automatically loads the necessary structural CSS to work properly. However, you can
also use one of the the included skins/themes. There are claro.css, tundra.css, soria.css, and nihilo.css theme
files in the css/skins directory that can be used to skin the dgrid to a particular
look and feel.

<h2>Grid Structure for custom CSS Styling</h2>
dgrid is designed to be styled and customized through CSS. Many of these classes
can be discovered by simply looking at elements in your debugger. 
Perhaps the most important class is the column-<id>
assigned to each cell in grids which allow for per column styling. The following class 
names are used by the dgrid and can be referenced from CSS:
<ul>
<li>dgrid - Applied to each dgrid list or grid at the top element</li>
<li>dgrid-header - Applied to the element that contains the header rendering</li>
<li>dgrid-scroller - Applied to the element that holds the scrolling contents</li>
<li>dgrid-content - Applied to the element inside of the scrolling that holds all the data contents</li>
<li>dgrid-row - Applied to each row element</li>
<li>dgrid-row-even - Applied to each even row element</li>
<li>dgrid-row-odd - Applied to each even row element. Applying a different color to the odd (vs even) rows can be use help the rows visually stand out.</li>
<li>dgrid-selected - Applied to selected rows or cells</li>
<li>dgrid-cell - Applied to each cell element</li>
<li>dgrid-cell-padding - Applied to each cell element or to an inner element within the cell in older versions of non-quirks mode IE to properly apply padding to keep the padding within the box measurements (box-sizing is preferred by the grid).</li>
<li>dgrid-focus - Applied to the element (cell or row) with the focus (for keyboard based navigation)</li>
<li>dgrid-expando-icon - Applied to the expando icon on tree nodes</li>
<li>dgrid-header-scroll - Applied to the node in the top right corner over the top of the scrollbar</li>
</ul>
The following generic class names are also available for generic skinning (follows the jQuery ThemeRoller convention):
<ul>
<li>ui-widget-content - Applied to each dgrid list or grid at the top element</li>
<li>ui-widget-header - Applied to the element that contains the header rendering</li>
<li>ui-state-default - Applied to each row element</li>
<li>ui-state-active - Applied to selected rows or cells</li>
<li>ui-state-highlight - Applied to a row for a short time when the contents are change (or it is newly created)</li>
</ul>
 
