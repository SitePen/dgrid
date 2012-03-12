This project provides widgets for lists of data, including simple sets of scrolling rows,
grids of data, on-demand lazy-loaded data, and various plugins for additional functionality. 
This project also provides touch scrolling for mobile devices with native style
momentum, bouncing, and scrollbars.

The dgrid project is available under the same dual BSD/AFLv2 license as the Dojo Toolkit.

# Installation

## Automatic Download with CPM

dgrid can be installed via [CPM](https://github.com/kriszyp/cpm)
using the following command:

    cpm install dgrid

## Manual Download

Alternatively, dgrid and its dependencies can be downloaded individually:

* [xstyle](https://github.com/kriszyp/xstyle)
* [put-selector](https://github.com/kriszyp/put-selector)
* [The Dojo Toolkit](http://dojotoolkit.org) SDK version 1.7
    * Out of the DTK components, Dojo core is the only hard dependency for dgrid;
      however, some of the test pages also use components from Dijit, and
      Dojox (namely grid for a comparison test, and mobile for a mobile page).

It is recommended to arrange all dependencies as siblings, resulting in a
directory structure like the following:

* `dgrid`
* `dijit` (optional, dependency of some dgrid tests)
* `dojo`
* `dojox` (optional, dependency of some dgrid tests)
* `put-selector`
* `xstyle`
* `util` (optional, e.g. if pursuing a custom build)

dgrid works best with Dojo 1.7.1 or higher.  As of this writing,
[Dojo 1.7.2](http://download.dojotoolkit.org/release-1.7.2/) is
recommended.

# Components

dgrid's primary components fall into the following top-level modules.

## List

This provides the basic facilities for taking an array of objects and rendering as rows
of HTML in a scrollable area. This will automatically include touch scrolling capabilities
(via the `TouchScroll` module) on mobile devices.

The List can be used to render an array of data. For example:

    require(["dgrid/List"], function(List){
        // attach to a DOM element indicated by its ID
        var list = new List({}, "list");
        // render some data
        list.renderArray(arrayOfData);
    });

### List APIs

The base List class (inherited by all other classes) exposes the following
methods:

* `get(property)`: Returns the value of a given property. Supports custom getter
  implementations via the pattern `_getProperty` (which would map to `get("property")`).
* `set(property, value)`: Sets the value of a given property. Supports custom
  setter implementations via the pattern `_setProperty` (which would map to
  `set("property", ...)`).
* `row(target)`: This will look up the requested row and return a Row object.
  The single parameter may be a DOM event, DOM node, or in the case of store-backed
  components, a data object or its ID.
  The returned Row object has the following properties:
    * `id`: the data object's id
    * `data`: the data object represented by the row
    * `element`: the row's DOM element
* `on(event, listener)`: Basic event listener functionality;
  simply delegates to the top-level DOM element of the List, using standard `dojo/on` behavior.
* `renderArray(array, beforeNode, options)`: This can be called to render an
  array directly into the list.  The `beforeNode` parameter can be used to render
  at a specific point in the list.  Note that when using store-backed components,
  this is called automatically.
* `renderRow(item, options)`: This method can be overridden to provide
  custom rendering logic for rows.  (The Grid module, introduced next, actually
  overrides this method.)
* `removeRow(rowElement, justCleanup)`: This method can be extended/aspected to
  perform cleanup logic when an individual row is removed.
* `set("sort", property, descending)`: This can be called to sort the List by a given
  property; if the second parameter is passed `true`, the sort will be in descending order.
  `get("sort")` can be used to retrieve the current sort options normalized into
  an array of sort criteria (the format expected by stores' `queryOptions`).
  The Grid and OnDemandList modules further extend this functionality.
* `showHeader`: Whether to display the header area; normally `false` for lists
  and `true` for grids.
* `showFooter`: Whether to display the footer area; `false` by default, but
  enabled and used by some extensions (e.g. Pagination).

Lists, as well as all other dgrid components, maintain the following DOM
references:

* `domNode`: The top-level DOM node of the component (much like the `domNode`
  property of Dijit widgets).
* `headerNode`: The DOM node representing the header region; mainly applicable
  to grid components.
* `bodyNode`: The DOM node representing the body region (the area which will
  show rows for each item).
* `contentNode`: The DOM node immediately under the `bodyNode`, which may
  potentially be scrolled to accommodate more content than the component's height
  will allow to fit.
* `footerNode`: A DOM node appearing below the `bodyNode`; initially empty and
  not displayed by default.

## Grid

Grid extends List to provide tabular display of data items, with different fields
arranged into columns.

In addition to the List methods outlined above, Grid also exposes the following:

* `cell(target[, columnId])`: Analogous to the `row` method, but at the `cell`
  level instead.  The `cell` method can look up based on an event or DOM element,
  or alternatively, a data item (or ID thereof) and the ID of a column.
  Returns an object containing the following properties:
    * `row`: a Row object (as would be obtained from the `row` method) for the
      row the cell is within
    * `column`: the column definition object for the column the cell is within
    * `element`: the cell's DOM element
* `column(target)`: Typically analogous to `cell(target).column`, but can
  alternatively accept a column ID directly.
* `styleColumn(columnId, css)`: Programmatically adds styles to a column, by
  injecting a rule into a stylesheet in the document.  Returns a handle with a
  `remove` function, which can be called to later remove the added style rule.

### Specifying grid columns

In the simplest cases, the columns of the grid are defined via the `columns` property.
This property can be a hash (object) or array, containing column definition objects.
When `columns` is an object, each property's key is used as the id of the column, and
each value is the column definition object. When `columns` is an array,
the numeric indices become the column IDs.

For example, we could create a grid like so:

    require(["dgrid/Grid"], function(List){
        var grid = new Grid({
            columns: {
                first: {
                    label: "First Name"
                },
                last: {
                    label: "Last Name"
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
    });

The column definition object may have the following properties (all are optional):

* `field`: The property from the object in the list to display in the
  body of the grid (unless otherwise overridden via the `get` function, explained below).
  In cases where `columns` is passed an object, the key of each property
  represents the field name, and thus this property is normally ommitted.
* `label`: The label to show in the header of the grid.
  Defaults to the value of `field`.
* `className`: A CSS class to assign to the cells in the column.  If unspecified,
  a default class name of the form `field-<field>` is used, where `<field>` is the
  value of the `field` property.
* `id`: The id of the column; normally this is determined automatically
  from the keys or indices in the `columns` object or array.
* `sortable`: Indicates whether or not the grid should allow sorting by
  values in this field, by clicking on the column's header cell.
  Defaults to `true`.
    * Note that it is always possible to programmatically sort a Grid by a given
      field by calling `set("sort", property, descending)` regardless of
      `sortable` status or even visible presence in the Grid altogether.
* `get(item)`: An optional function that, given a data item, will return the
  value to render in the cell.
* `formatter(value)`: An optional function that, given the value to be displayed,
  will return a string of HTML for rendering.
* `renderCell(object, value, node, options)`: An optional function that will be
  called to render the value into the target cell.  It may either
  operate on the passed node directly, or return a node to be placed within it.
  (Note: if `formatter` is specified, `renderCell` is ignored.)
* `renderHeaderCell(node)`: An optional function that will be called to render
  the column's header cell. Like `renderCell`, this may either operate on the
  node directly, or return a node to be placed within it.

Alternatively, a column definition may simply be a string, in which case
the value of the string is interpreted as the label of the column.
Thus, the simplest column structures can be more succinctly written:

    var grid = new Grid({
        columns: {
            first: "First Name",
            last: "Last Name",
            ...
        },
        ...
    }, ...);

The Grid component also supports structures with multiple "sub-rows";
that is, it supports the idea of rendering multiple rows for each data item.
Specification of multiple subrows is very much like specifying columns, except
that one uses the `subRows` property instead of `columns`, and it receives an
array of columns objects/arrays.

Both the `columns` and `subRows` properties can be later reset by using the
central `set` method.

By default, the Grid renders a header, containing cells which display the
label of each column.  This can be disabled by setting `showHeader: false`
in the arguments object to the Grid; it can also be changed later using
`set("showHeader", ...)`.

### Grid Styling

dgrid components are designed to be highly CSS-driven for optimal performance and organization,
so visual styling should be controlled through CSS. The Grid creates classes
based on the column ids and field names with the convention of
`dgrid-column-<column-id>` and `field-<field-name>`.
(If a `className` is specified in the column definition, it is used in place of
`field-<field-name>`.)

For example, you could define a grid and CSS for it like so:

    <style>
        .field-age {
            width: 80px;
        }
        .field-first {
            font-weight: bold;
        }
    </style>
    <script>
        require(["dgrid/Grid"], function(Grid){
            var grid = new Grid({
                columns: {
                    age: "Age",
                    first: "First Name",
                    ...
                }}, ...);
            grid.renderArray(someData);
        });
    </script>

## Specifying Columns via HTML: GridFromHtml

Some developers prefer specifying column layouts in an actual table structure
because it is more convenient or semantically clearer.  dgrid supports this
via the GridFromHtml module.  When using this module, a `table` element should
be specified as the source node for the grid instance; it then scans for `th`
nodes within rows (typically placed inside the `thead`) to determine columns.

Column properties are specified within the `th`, primarily via the
`data-dgrid-column` attribute, which should contain a JavaScript object.
Properties which coincide with standard HTML attributes can also be specified
as such, e.g. `class`, `rowspan`, and `colspan`.  The innerHTML of the `th` is
interpreted as the column's `label` by default.

Note that *unlike* `data-dojo-props`, `data-dgrid-column` requires that you
include the surrounding curly braces around the object - this allows
alternatively specifying a column plugin instead of just a straight-up object.
(Note, however, that referencing column plugins requires that they be exposed
in the global scope, perhaps under a namespace.)

Examples of creating grids from HTML can be found in the
`GridFromHtml.html` and `complex_columns.html` test pages.

It is also possible to specify columnsets (for the `ColumnSet` mixin) via
HTML tables by using the `GridWithColumnSetsFromHtml` module.  ColumnSets are
expressed in HTML via `colgroup` tags.  See the `complex_columns.html` test
page for an example of this as well.

### Using GridFromHtml with the Dojo Parser

Using the parser in Dojo 1.7 with modules designed purely in the AMD format can
be a bit unwieldy, since at this time the parser still expects `data-dojo-type`
values to reference variables accessible from the global context.  While existing
Dojo 1.x components currently continue to expose globals, dgrid does not do so
by default, since it is written purely in AMD format.  Thus, when intending to
parse over dgrid components, it is necessary to expose the components via a
global namespace first.  For example:

    require(["dgrid/GridFromHtml", "dojo/parser", ..., "dojo/domReady!"],
    function(GridFromHtml, parser, ...) {
        window.dgrid = { GridFromHtml: GridFromHtml };
        parser.parse();
    });

This can be seen in practice in some of the test pages, such as
`GridFromHtml.html` and `dijit_layout.html`.

Note that using AMD modules with the Dojo parser should become easier in
Dojo 1.8, which plans to introduce some level of module ID support to the
`data-dojo-type` attribute; see
[Dojo ticket #13778](http://bugs.dojotoolkit.org/ticket/13778).

## OnDemandList

OnDemandList extends List to provide on-demand lazy loading of data as the user
scrolls through the list.  This provides a seamless, intuitive interface for viewing
large sets of data in scalable manner.

OnDemandList inherits the \_StoreMixin module, which implements a basis for
interacting with a [Dojo object store](http://dojotoolkit.org/reference-guide/dojo/store.html)
for querying of data.  At minimum, this implementation expects a store supporting
the `get`, `getIdentity`, and `query` methods.

OnDemandList requires that a store be specified via the `store` property,
and will call the `query` method on the store to retrieve the data to be rendered.
OnDemandList will call `query` with start and count options so as to only retrieve
the necessary objects needed to render the visible rows. As the list or grid is
scrolled, more `query` calls will be made to retrieve additional rows,
and previous rows will be pruned from the DOM as they are scrolled well out of view.

When working with a writable store, for best results, the store should
return query results with an `observe` method, which enables the list to keep
its display up to date with any changes that occur in the store after the items
are rendered.  The [`dojo/store/Observable`](http://dojotoolkit.org/reference-guide/dojo/store/Observable.html)
module can prove useful for adding this functionality.

OnDemandList inherits the following properties and methods from \_StoreMixin:

* `noDataMessage`: An optional message to be displayed when no results are
  returned by a query.
* `loadingMessage`: An optional message to be displayed in the loading node
  which appears when a new page of results is requested.
* `getBeforePut`: if true (the default), any `save` operations will re-fetch
  the item from the store via a `get` call, before applying changes represented by
  dirty data.
* `query`: An object to be passed when issuing store queries, which may contain
  filter criteria.
* `queryOptions`: An object to be passed along with `query` when issuing store
  queries.  Note that the standard `start`, `count`, and `sort` properties
  are already managed by OnDemandList itself.
* `store`: An instance of a `dojo/store` implementation, from which to fetch data.
* `set("query", query[, queryOptions])`: Specifies a new `query` object
  (and optionally, also `queryOptions`) to be used by the list when
  issuing queries to the store.
* `set("store", store[, query[, queryOptions]])`: Specifies a new store
  (and optionally, also `query` and `queryOptions`) for the list to reference.
* `refresh()`: Clears the component and re-requests the initial page of data.
* `renderQuery(query)`: Renders the given query into the list.  Called
  automatically upon refresh.
* `set("sort", property, descending)`: \_StoreMixin's version of this defers
  sorting to the store.
* `updateDirty(id, field, value)`: Updates an entry in the component's dirty
  data hash, to be persisted to the store on the next call to `save()`.
* `save()`: Instructs the list to relay any dirty data back to the store.
  Returns a promise which resolves when all necessary put operations have
  completed successfully (even if the store operates synchronously).
* `revert()`: Clears the dirty data hash without updating the store, and
  refreshes the component.

## OnDemandGrid

This module is simply the composition of Grid and OnDemandList.
For example:

    define(["dgrid/OnDemandGrid"], function(Grid){
        grid = new Grid({
                store: myStore, // a Dojo object store
                columns: [
                    {label: "Column 1", field: "col1", editable: true, sortable: true},
                    {label: "Column 2", field: "col2"},
                    ...
                ]
            }, "grid");
        ...
    });

# Mixins

Mixin modules can be used to add extra functionality to a list or grid.
To use these, simply add the module as a mixin in a `dojo.declare` inheritance chain.
For example, to create a grid based on OnDemandGrid with the
Selection and Keyboard handling mixins, we could do the following:

    define(["dojo/_base/declare", "dgrid/OnDemandGrid", "dgrid/Selection", "dgrid/Keyboard"],
    function(declare, OnDemandGrid, Selection, Keyboard){
        // create a new Grid constructor including some mixins
        var MyGrid = declare([OnDemandGrid, Selection, Keyboard]);
        // instantiate it
        var grid = new MyGrid({
            store: myStore,
            ...
        }, "grid");
        ...
    });

You can also perform inline mixin and instantiation:

    var grid = new (declare([OnDemandGrid, Selection, Keyboard]))({
        store: myStore,
        ...
    }, "grid");

A synopsis of currently available mixins follows.

## ColumnSet

The ColumnSet module provides functionality which divides a grid's columns into
multiple distinct sets, each of which manage their columns' horizontal scrolling
independently.  This makes it possible to keep certain columns in view even while
others are scrolled out of viewing range.

When mixing in ColumnSet, instead of specifying `columns` or `subRows`, one
specifies `columnSets`, which is essentially an array of `subRows`.  For example,
in pseudocode:

    var grid = new (declare([Grid, ColumnSet]))({
        columnSets: [
            // left columnset
            [
                [
                    { /* columnset 1, subrow 1, column 1 */ },
                    { /* columnset 1, subrow 1, column 2 */ }
                ],
                [
                    { /* columnset 1, subrow 2, column 1 */ },
                    { /* columnset 1, subrow 2, column 2 */ }
                ]
            ],
            // right columnset
            [
                [
                    { /* columnset 2, subrow 1, column 1 */ },
                    { /* columnset 2, subrow 1, column 2 */ }
                ],
                [
                    { /* columnset 2, subrow 2, column 1 */ },
                    { /* columnset 2, subrow 2, column 2 */ }
                ]
            ]
        ],
        ...
    }, "grid");

More concrete examples can be found in the `complex_column.html` test page.

## Selection

Adds selection capability to a list or grid. The resulting instance(s) will include
a `selection` property representing the selected items.  This plugin will also
fire batched `dgrid-select` and `dgrid-deselect` events, which will possess a
`rows` property containing an array of Row objects (with `id`, `data`, and
`element`). For example:

    grid = declare([Grid, Selection])({
        selectionMode: "single",
    ...});
    grid.on("dgrid-select", function(event){
        // get the rows that were just selected
        var rows = event.rows;
        // ...
        
        // iterate through all currently-selected items
        for(var id in grid.selection){
            // ...
        }
    });
    grid.on("dgrid-deselect", function(event){
        // get the rows that were just deselected
        var rows = event.rows;
        // ...
    });

The following properties and methods are added by the Selection plugin:

* `selection`: The object containing the IDs of the selected objects.
* `selectionMode`: A string indicating the mode of selection.
  The following values are acceptable:
    * `extended`: The default setting; follows common ctrl and shift key practices for selection
    * `single`: Only allows one row to be selected at a time
    * `multiple`: Similar to `extended`, but normal clicks add selection without
      removing previous selections
    * `none`: Nothing can be selected by user interaction;
      only programmatic selection (or selection via selectors) is allowed
* `deselectOnRefresh`: Determines whether calls to `refresh`
  (including sorts) also clear the current selection; `true` by default.
* `allowSelectAll`: Determines whether the "select-all" action should be
  permitted via a checkbox selector column or the Ctrl/Cmd+A keyboard shortcut;
  defaults to `false`.
* `allowSelect(row)`: Returns a boolean indicating whether the given `row` should
  be selectable; designed to be overridden.
* `select(row[, toRow])`: Programmatically selects a row or range of rows.
* `deselect(row[, toRow])`: Programmatically deselects a row or range of rows.
* `selectAll()`: Programmatically selects all rows in the component. Note that
  only rows that have actually been loaded will be represented in the `selection`
  object.
* `clearSelection()`: Programmatically deselects all rows in the component.
* `isSelected(row)`: Returns `true` if the given row is selected.

The `select`, `deselect`, and `isSelected` methods can be passed any type of
argument acceptable to List's `row` method.

### CellSelection

The CellSelection plugin extends upon the functionality of the Selection plugin
to provide celection at the cell level instead.  Some key differences include:

* The `selection` object now stores a hash of hashes, where the outer hash is
  keyed by item ID and the inner hash is keyed by column ID.
* The `dgrid-selected` and `dgrid-deselected` events still fire, but include a
  `cells` property containing an array of cell objects, rather than a `rows`
  property.
* Whereas Selection's `select`, `deselect`, and `isSelected` methods look up the
  passed argument via List's `row` method, CellSelection looks it up via Grid's
  `cell` method.
* The `allowSelect` method is passed a cell object instead of a row object.

## Keyboard

This mixin adds keyboard handling functionality.
The arrow keys can be used to navigate the focus across cells and rows,
providing accessibility and ease of use.  The page up and page down keys
may also be used for faster navigation, traversing the number of rows specified
in the `pageSkip` property of the instance.

When used with grids, this mixin references the `cellNavigation` property of
the grid instance, to determine whether keyboard navigation and focus should
operate at the individual cell level (`true`, the default) or at the row level
(`false`).

# Column Plugins

Column plugin modules define plugins designed for individual columns of a grid.
Each of these modules returns a function (*not* a constructor); the function is
designed to be passed a column definition object (and possibly other arguments),
yielding a (modified) column definition object.

For example, to create a column structure where the first column has a
tree expander and the second column has a checkbox editor, we could do this:

    require(["dgrid/OnDemandGrid", "dgrid/tree", "dgrid/editor"],
    function(Grid, tree, editor){
        var grid = new Grid({
            store: myHierarchicalStore, // a Dojo object store
            columns: [
                // first column will have a tree expander:
                tree({label: "Name", field: "name"}),
                // second column will render with a checkbox: 
                editor({label: "A CheckBox", field: "bool"}, "checkbox"),
                // just a normal column:
                {label: "Type", field: "type"},
                ...
            ]
        }, "grid");
    });

A synopsis of currently available column plugins follows.

## editor

The editor plugin provides the ability to render editor controls within cells
for a column.  When used in conjunction with a store-backed grid such as an
OnDemandGrid, edited fields are directly correlated with the dirty state of the grid;
changes can then be saved back to the store based on edits performed in the grid.

The editor plugin recognizes the following additional properties on the column
definition object:

* `editor`: Either a string or a Dijit widget constructor, specifying what type
  of standard HTML input or widget to use, respectively.
* `editOn`: A string containing the event (or multiple events, comma-separated)
  upon which the editor should activate.  If unspecified, editors are always
  displayed in this column's cells.
* `editorArgs`: An object containing input attributes or widget arguments.  For
  HTML inputs, the object will have its key/value pairs applied as node attributes
  via `put-selector`; for widgets, the object will be passed to the widget constructor.
* `autoSave`: If `true`, the grid's `save` method will be called as soon as a
  change is detected in an editor in this column.  Defaults to `false`.
* `dismissOnEnter`: By default, pressing enter will store the current
  value in the grid's dirty data hash.  This can be undesirable particularly for
  textarea editors; setting this property to `false` will disable the behavior.

For convenience, the `editor` and `editOn` properties may also be specified as
the second and third arguments to the `editor` column plugin function.
For example, both of the following would result in an editor which presents a
text field when a cell in the column is double-clicked:

    // long version, everything in column def object
    editor({
        editor: "text",
        editOn: "dblclick",
        /* rest of column definition here... */
    })
    
    // shorthand version, editor and editOn as arguments
    editor({ /* rest of column definition here... */ }, "text", "dblclick")

For examples of editor in use, see the various `editor` test pages,
as well as the `GridFromHtml_editors` test page for declarative examples.

### Recommendations for the editOn property

If attempting to trigger an editor on focus (to accommodate
keyboard and mouse), it is highly recommended to use dgrid's custom event,
`dgrid-cellfocusin` instead of `focus`, to avoid confusion of events.  Note
that this requires also mixing the Keyboard module into the Grid constructor.

If touch input is a concern for activating editors, the easiest solution is to
use the `click` event, which browsers on touch devices tend to normalize to
fire on taps as well.  If a different event is desired for desktop browsers,
it is possible to do something like the following:

    require(
        ["dgrid/OnDemandGrid", "dgrid/editor", "dojo/has" /*, ... */],
        function(Grid, editor, has /*, ... */){
            var columns = [
                /* ... more columns here ... */
                editor({ name: "name", label: "Editable Name" }, "text",
                    has("touch") ? "click" : "dblclick")
            ];
            /* ... create grid here ... */
        }
    );

There are also a couple of useful simple gesture implementations available in the
`util/touch` module, namely `tap` and `dbltap`.

## tree

The tree plugin enables expansion of rows to display children.
It expects to operate on a store-backed grid such as an OnDemandGrid, whose
store is expected to provide a `getChildren(object, options)` method to return
the children for each object.  Note that for best results, `getChildren` should
return results with an `observe` function as well, so that changes to children
can also be reflected as they occur.

The store may also (optionally) provide a `mayHaveChildren(object)` method
which returns a boolean indicating whether or not the row can be expanded.

When the tree plugin is applied to a column, the parent grid is augmented with
an `expand(row, expand)` method, which can be used to programmatically expand or
collapse a row, given a row object (from `grid.row(target)`) or a `dgrid-row`
element.  The optional second parameter specifies whether the row should be
expanded (`true`) or collapsed (`false`); if unspecified, the method toggles
the current expanded state of the row.

## selector

Used in conjunction with the Selection mixin, the selector plugin dedicates a
column to the purpose of rendering a selector component, providing alternate
means for selecting and deselecting rows in a grid.

The selector plugin supports the following additional column definition property:

* `selectorType`: Specifies the type of selector component to use.  Defaults to
  `checkbox`, but `radio` may also be specified, as a more appropriate choice for
  grids in `single` selection mode.

Alternatively, `selectorType` may be specified as the second argument to
the `selector` function instead of including it within the column definition.

Note that a selector column can be used to allow selection even in a grid where
`selectionMode` is set to `none`, in which case the controls in the selector
column will be the only means by which a user may select or deselect rows.

Also note that selector inputs will be disabled for rows for which `allowSelect`
returns `false`.

# Extensions

The following are additional mixins which dwell outside dgrid's core feature set.
Extensions live in the `extensions` subdirectory; their tests and
css/image resources also live under respective `test/extensions` and
`css/extensions` subdirectories.

## ColumnReorder

The ColumnReorder extension adds the ability to reorder the columns of a grid
via drag'n'drop operations on column headers.  Note that currently this is
only supported for simple column layouts involving a single sub-row and no
columnsets.

This extension supports an additional `reorderable` property in column definitions;
if explicitly set to `false`, that particular column's header node will not be
treated as a viable DnD item.

## ColumnResizer

The ColumnResizer extension can be used to add column resizing functionality
(accessible via mouse or touch drag).

## ColumnHider

The ColumnHider extension adds the ability to dynamically hide or show columns
in a grid without the need to fully reset its layout.  Note, however, that
this is only fully supported for cases of simple, single-row column layouts.

This extension adds a menu accessible from the top right corner of the grid
(represented by a "+" mark); it will open on click, presenting checkboxes for
each column in the grid.  These can be checked or unchecked to show or hide
individual columns, respectively.

The ColumnHider module adds support for the following column definition properties:

* `hidden`: If `true`, the column in question will be initially hidden, but can
  be shown by opening the menu and checking its box.
* `unhidable`: If `true`, the column in question will not be listed in the
  menu, denying access to toggle its appearance.  This can be particularly
  useful for a selector column which should always be shown, for example.

## Pagination

In contrast to the OnDemandList and OnDemandGrid modules, the Pagination
extension implements classic discrete paging controls.  It displays a certain
number of results at a given time, and provides a footer area with controls
to switch between pages.

**Note:** the Pagination extension should be mixed into List or Grid, **not**
one of the OnDemand constructors, since those contain their own virtual scrolling
logic.  Internally, Pagination inherits from the same \_StoreMixin module
inherited by the OnDemand prototypes for common integration with `dojo/store`.

### Properties

The Pagination extension exposes the following properties, which can be specified
in the arguments object passed to the constructor:

* `rowsPerPage`: Number of items to show on a given page. Default: `10`
* `previousNextArrows`: Whether to show arrows which go to the previous/next
  pages when clicked. Default: `true`
* `firstLastArrows`: Whether to show arrows which jump to the first/last pages
  when clicked. Default: `false`
* `pagingLinks`: If a positive number is specified, renders a sequence of
  page numbers around the current page, and for the first and last pages.  The
  number specified indicates how many "neighbors" of the current page are rendered
  in *each* direction.  If `0` is specified, no page number sequence is rendered.
  Default: `2`
* `pagingTextBox`: Whether to show a textbox in place of the current page
  indicator, to allow immediately jumping to a specific page. Default: `false`
* `pageSizeOptions`: An optional array specifying choices to present for the
  `rowsPerPage` property in a drop-down. If unspecified or empty, no drop-down
  is displayed.

## DnD

The DnD plugin can be used to add row drag'n'drop functionality.

### Requirements

The DnD extension assumes usage of a store-backed component, most commonly an
OnDemandGrid instance.

The store should be order-aware, supporting the `options.before` parameter
on `add()` and `put()` calls to properly respond to DnD operations.

Additionally, if the store supports a `copy` method, it will be called for
DnD copy operations within the same list/grid (since a `put` would normally
relocate the item).

### Properties

The DnD extension exposes the following properties, which can be specified in
the arguments object passed to the constructor:

* `dndSourceType`: String specifying the type of DnD items to host and accept.
  Defaults to `dgrid-row`.
* `dndParams`: Object to be passed as the second argument to the DnD Source
  constructor.  Note that the `accept` DnD parameter is set to match
  `dndSourceType` by default, but this may be overridden.
* `dndConstructor`: Constructor from which to instantiate the DnD Source for
  the grid.  This defaults to the `GridSource` constructor defined and exposed
  by the DnD module itself.  It is recommended to only override this value with
  a constructor which extends `GridSource`.

# Themes/Skins

dgrid automatically loads the necessary structural CSS to work properly using
xstyle's css module.  However, to make the component far more visually attractive
and interesting, it is common to also apply one of the the included skins.
There are various CSS files under the `css/skins` directory which can be used
to skin the dgrid to a particular look and feel.

## Grid Structure for custom CSS Styling

dgrid's appearance is designed to be styled and customized via CSS.
Many of the classes involved can be discovered by simply looking at elements in
your browser developer tools of choice.
Perhaps the most important classes are the `field-<fieldname>` and `dgrid-column-<id>`
classes assigned to each cell in grids, which allow for per-column styling.

The following class names are used by dgrid and can be referenced from CSS:

* `dgrid`: Applied to each dgrid list or grid at the top-level element
* `dgrid-header`: Applied to the element which contains the header area
* `dgrid-scroller`: Applied to the element responsible for scrolling the data content
* `dgrid-content`: Applied to the element inside of the scroller area,
  which holds all the data contents
* `dgrid-row`: Applied to each row element
* `dgrid-row-even`: Applied to each even row element
* `dgrid-row-odd`: Applied to each odd row element
  Applying a different color to alternating rows can help visually distinguish individual items.
* `dgrid-selected`: Applied to selected rows or cells
* `dgrid-cell`: Applied to each cell element
* `dgrid-cell-padding`: Applied to each cell element, or to an
  inner element within the cell in older versions of non-quirks mode IE to
  properly apply padding to keep the padding within the box measurements
  (box-sizing is preferred by the grid).
* `dgrid-focus`: Applied to the element (cell or row) with the focus (for keyboard based navigation)
* `dgrid-expando-icon`: Applied to the expando icon on tree nodes
* `dgrid-header-scroll`: Applied to the node in the top right corner of a Grid,
  above the vertical scrollbar

The following generic class names are also available for generic skinning
(following the jQuery ThemeRoller convention):

* `ui-widget-content`: Applied to each dgrid list or grid at the top element
* `ui-widget-header`: Applied to the element that contains the header rendering
* `ui-state-default`: Applied to each row element
* `ui-state-active`: Applied to selected rows or cells
* `ui-state-highlight`: Applied to a row for a short time when the contents are change (or it is newly created)

# Limitations

## Use with the Legacy Loader API

Using `dgrid/List` without first loading `dgrid.css` will not work when using the
legacy `dojo.require` method due to an asynchronously-resolving plugin dependency.
To use `dgrid/List` with `dojo.require`, make sure you have
`<link rel="stylesheet" href="path/to/dgrid.css">` in your `<head>` before loading `dgrid/List`.

This also applies for stylesheets loaded by specific mixins (such as `dgrid/ColumnSet`)
or extensions (such as `dgrid/extensions/ColumnResizer`).

## Reuse of Column Definitions

Reusing a single column definition object between multiple grids (e.g.
`var cols = {}, gridA = new Grid({ columns: cols }), gridB = new Grid({ columns: cols })`)
is *not* supported, and will not function properly. Always create a fresh `columns`
object for every grid you instantiate.