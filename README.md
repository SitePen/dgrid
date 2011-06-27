This project provides widgets for lists of data, including simple sets of scrolling rows,
grids of data, on-demand lazy-loaded data, and various plugins for additional functionality. 
This project also provides touch scrolling
for mobile devices with native style momentum, bouncing, and scrollbars. To use this package,
install with <a href="https://github.com/kriszyp/cpm">CPM</a>:
<pre>
cpm install d-list
</pre>
Or download it along with it's dependencies, which are <a href="https://github.com/kriszyp/xstyle">xstyle</a>
and <a href="http://dojotoolkit.org">dojo</a>. 

The components are broken down into the following top level widget modules:

<h2>List</h2>
This provides the basic facilities for taking an array of objects and rendering as rows
of HTML in a scrollable area. This will automatically include touch scrolling (via TouchScroll module)
capabilities on mobile devices. The List can be used to render an array of data. For example:
<pre>
define(["d-list/List"], function(List){
	// attach to a DOM id
	var list = new List({}, "list"); 
	// render some data
	list.renderArray(arrayOfData);
	... 
</pre>
See the <a href="doc/api.html?d-list/doc/List">API viewer for a list methods available on the List component</a>.

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
define(["d-list/Grid"], function(List){
	var grid = new Grid({
		columns: {
			first: {
				name: "First Name",
				sortable: true
			},
			last: {
				name: "Last Name",
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

The d-list components are designed to be highly CSS driven for optimal performance and organization, so visual styling should be controlled
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
define(["d-list/Grid"], function(Grid){
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
See the <a href="doc/api.html?d-list/doc/Grid">API viewer for a list methods available on the List component</a> (make sure to download the project to view this link, it is not available from github).

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
define(["d-list/OnDemandGrid"], function(Grid){
	// attach to a DOM id
	grid = new Grid({
			store: myStore, // a Dojo object store
			columns: [ // define the columns
				{name: 'Column 1', field: 'col1', editable: true, sortable: true},
				{name: 'Column 2', field: 'col2'},
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
* renderRow(value, options) - This can be overriden to provide a custom rendering of each row

<h1>Plugins</h1>
The following modules can be used as plugins to add extra functionality to a Grid. To use
these, simply add the module as a mixin. For example, to create a grid based on 
OnDemandGrid with the selection and keyboard handling plugins, we could do:
<pre>
define(["dojo", "d-list/OnDemandGrid", "d-list/Selection", "d-list/Keyboard"], function(dojo, Grid, Selection, Keyboard){
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
plugin will also cause "select" and "deselect" events to be fired. For example:
<pre>
grid = dojo.declare([Grid, Selection])({
	selectionMode: "single",
	...});
grid.on("select", function(event){
	// get the row that was just selected
	var row = grid.row(event);
	for(var id in grid.selection){
		if(grid.selection[id] === true){
			// iterate through all selected items
		}
	}
});
grid.on("deselect", function(event){
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
create a columns where the first column has a tree expander and the second column has
a checkbox, we could do:
<pre>
define(["d-list/OnDemandGrid", "d-list/Tree", "d-list/Editor"], function(Grid, Tree, Editor){
	grid = new Grid({
			store: myHierarchicalStore, // a Dojo object store
			columns: [ // define the columns
				// first column will have a tree expander:
				Tree({name:'Name', field:'name'}),
				// second column will render with a checkbox: 
				Editor({name: 'A CheckBox', field: 'bool'}, "checkbox"),
				// just a normal column:
				{name:'Type', field:'type'},
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
also use one of the the included skins/themes. There is a claro.css, tundra.css, soria.css, and nihilo.css theme
files in the css/skins directory that can be used to skin the d-list to a particular
look and feel.

<h2>Grid Structure for custom CSS Styling</h2>
The d-list is designed to be styled and customized through CSS. Many of these classes
can be discovered by simply looking at elements in your debugger and see the class names
and applied CSS rules. As mentioned above, perhaps the most important class is the column-<id>
assigned to each cell in grids which allow for per column styling. The following class 
names are used by the d-list and can be referenced from CSS:
<ul>
<li>d-list - Applied to each d-list list or grid at the top element</li>
<li>d-list-header - Applied to the element that contains the header rendering</li>
<li>d-list-scroller - Applied to the element that holds the scrolling contents</li>
<li>d-list-content - Applied to the element inside of the scrolling that holds all the data contents</li>
<li>d-list-row - Applied to each row element</li>
<li>d-list-row-even - Applied to each even row element</li>
<li>d-list-row-odd - Applied to each even row element. Applying a different color to the odd (vs even) rows can be use help the rows visually stand out.</li>
<li>d-list-selected - Applied to selected rows or cells</li>
<li>d-list-cell - Applied to each cell element</li>
<li>d-list-cell-padding - This is applied to each cell element or to an inner element within the cell in older versions of non-quirks mode IE to properly apply padding to keep the padding within the box measurements (box-sizing is preferred by the grid).</li>
</ul>
The following generic class names are also available for generic skinning (follows the jQuery themeroller convention):
<ul>
<li>ui-widget-content - Applied to each d-list list or grid at the top element</li>
<li>ui-widget-header - Applied to the element that contains the header rendering</li>
<li>ui-state-default - Applied to each row element</li>
<li>ui-state-active - Applied to selected rows or cells</li>
</ul>
 