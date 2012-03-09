This guide aims to detail functionality in dgrid primarily from the perspective
of `dojox/grid` features.  While the contents of this guide will thus be of
greatest interest to existing users of `dojox/grid`, the information presented
herein should be generally helpful to all dgrid users.

# Comparison of Basic Setup

## Simple programmatic usage

Given the following programmatic example using `dojox/grid`...

    require(["dojox/grid/DataGrid", "dojo/store/Memory", "dojo/data/ObjectStore",
        "dojo/domReady!"],
    function(DataGrid, Memory, ObjectStore){
        var memoryStore = new Memory({data: [
            // data here...
        ]});
        var objectStore = new ObjectStore({ objectStore: memoryStore });
        
        var grid = new DataGrid({
            structure: [
                { field: "id", name: "ID", width: "10%" },
                { field: "name", name: "Name", width: "20%" },
                { field: "description", name: "Description", width: "70%" }
            ],
            store: objectStore
        }, "grid");
        grid.startup();
    });

A result similar to the above example could be achieved using dgrid with the
following styles...

    #dgrid .field-id {
        width: 10%;
    }
    #dgrid .field-name {
        width: 20%;
    }
    #dgrid .field-description {
        width: 70%;
    }

...and the following JavaScript...

    require(["dgrid/OnDemandGrid", "dgrid/Keyboard", "dgrid/Selection",
        "dojo/_base/declare", "dojo/store/Memory", "dojo/domReady!"],
    function(OnDemandGrid, Keyboard, Selection, declare, Memory){
        var memoryStore = new Memory({data: [
            // data here...
        ]});
        
        var grid = new declare([OnDemandGrid, Keyboard, Selection])({
            columns: {
                id: { label: "ID" },
                name: { label: "Name" },
                description: { label: "Description" }
            },
            store: memoryStore
        }, "grid");
        // dgrid will call startup for you if the node appears to be in flow
    });

There are a few key differences worth pointing out:

* Whereas `dojox/grid` expects styles to be specified within the column definition
  to be eventually applied inline to all cells in the column, dgrid lets CSS do
  the talking whenever possible for purposes of layout and appearance.  This
  allows for better separation between visual and functional concerns.
* `dojox/grid` operates with stores implementing the earlier `dojo/data` APIs;
  in order to use it with a store instance implementing the `dojo/store` APIs,
  the store must first be wrapped using the `dojo/data/ObjectStore` module.
  On the other hand, dgrid communicates with `dojo/store` APIs out of the box.
  (Conversely, however, if you *do* need to work with a `dojo/data` store, you
  would then have to pass it through the `dojo/store/DataStore` wrapper in order
  for dgrid to work with it.)
* Note that in the dgrid version of the example, the Selection and Keyboard
  modules are required and mixed into the constructor to be instantiated, in
  order to enable those pieces of functionality which are baked-in by default
  in `dojox/grid` components.
* Also note that the dgrid example's structure is a bit more concise, taking
  advantage of the ability to provide simple column arrangements via an object
  hash instead of an array, in which case the object's keys double as the
  columns' `field` values (i.e., which store item properties the columns represent).

## Programmatic usage, with sub-rows

Assuming the same context as the examples in the previous section, here is a
contrived example demonstrating use of sub-rows in `dojox/grid`...

    var grid = new DataGrid({
        structure: [
            [
                { field: "id", name: "ID", width: "10%" },
                { field: "name", name: "Name", width: "20%" }
            ],
            [
                { field: "description", name: "Description", width: "70%", colSpan: 2 }
            ]
        ],
        store: objectStore
    }, "grid");
    grid.startup();

...and the equivalent, using dgrid...
(again assuming the same context as the previous example)

    var grid = new declare([OnDemandGrid, Keyboard, Selection])({
        subRows: [
            [
                { field: "id", label: "ID" },
                { field: "name", label: "Name" }
            ],
            [
                { field: "description", label: "Description", colSpan: 2 }
            ]
        ],
        store: memoryStore
    }, "grid");

Notice that `subRows` is now defined instead of `columns`.  The `columns`
property of dgrid components is usable *only* for simple cases involving a
single sub-row.

Also notice that each item in the top-level `subRows` array is itself another
array, containing an object for each column.  In this case, `field` must be
specified in each column definition object, since there is no longer an
object hash in order to infer field names from keys.

## Using views / columnsets

The `dojox/grid` components implement a concept known as "views", which are
represented as separate horizontal regions within a single grid.  This feature
is generally useful for situations where many fields are to be shown, and some
should remain visible while others are able to scroll horizontally.

This capability is also available in dgrid, via the ColumnSet mixin.

For instance, continuing in the vein of the examples in the previous two
sections, the following `dojox/grid` structure with multiple views...

    var grid = new DataGrid({
        structure: [
            { // first view
                width: "10%",
                cells: [
                    { field: "id", name: "ID", width: "auto" }
                ]
            },
            [ // second view
                [
                    { field: "name", name: "Name", width: "20%" },
                    { field: "description", name: "Description", width: "80%" }
                ]
            ]
        ],
        store: objectStore
    }, "grid");
    grid.startup();

...could be represented in dgrid, using the following CSS...

    #dgrid .dgrid-column-set-0 {
        width: 10%;
    }
    #dgrid .field-name {
        width: 20%;
    }
    #dgrid .field-description {
        width: 80%;
    }

...and the following JavaScript...
(require call included, to demonstrate additional dependency)

    require(["dgrid/OnDemandGrid", "dgrid/ColumnSet", "dgrid/Keyboard", "dgrid/Selection",
        "dojo/_base/declare", "dojo/store/Memory", "dojo/domReady!"],
    function(OnDemandGrid, ColumnSet, Keyboard, Selection, declare, Memory){
        // ... create memoryStore here ...
        
        var grid = new declare([OnDemandGrid, ColumnSet, Keyboard, Selection])({
            columnSets: [
                [ // first columnSet
                    [
                        { field: "id", label: "ID" }
                    ]
                ],
                [ // second columnSet
                    [
                        { field: "name", label: "Name" },
                        { field: "description", label: "Description" }
                    ]
                ]
            ],
            store: memoryStore
        }, "grid");
    });

## Specifying column layout via HTML

While programmatic creation of grids is highly encouraged, dgrid does allow for
declarative specification of grid layouts via a `table` element, somewhat along
the same lines of `dojox/grid`.

In the case of dgrid, this ability is not baked in by default, but is instead
exposed primarily by the GridFromHtml module, which adds table-scanning
capabilities atop the OnDemandGrid constructor.

Note that unlike `dojox/grid`, which is *only* capable of reading declarative
layouts through the use of `dojo/parser`, dgrid is also capable of creating
instances programmatically while referencing a `table` node from which to read
a declarative layout.  For the purposes of the examples below, use of parser
will be assumed, in order to allow comparison between `dojox/grid` and dgrid
usage.

For instance, the following declarative `dojox/grid` layout...

    <table id="grid" data-dojo-type="dojox.grid.DataGrid"
        data-dojo-props="store: objectStore">
        <thead>
            <tr>
                <th field="id" width="10%">ID</th>
                <th field="name" width="20%">Name</th>
                <th field="description" width="70%">Description</th>
            </tr>
        </thead>
    </table>

...could be achieved declaratively using dgrid as follows...

    <table id="grid" data-dojo-type="dgrid.CustomGrid"
        data-dojo-props="store: memoryStore">
        <thead>
            <tr>
                <th data-dgrid-column="{ field: 'id' }">ID</th>
                <th data-dgrid-column="{ field: 'name' }">Name</th>
                <th data-dgrid-column="{ field: 'description' }">Description</th>
            </tr>
        </thead>
    </table>

...provided the following script is used...

    require(["dgrid/GridFromHtml", "dgrid/Keyboard", "dgrid/Selection",
        "dojo/store/Memory", "dojo/_base/declare", "dojo/parser", "dojo/domReady!"],
    function(GridFromHtml, Keyboard, Selection, Memory, declare, parser){
        var memoryStore = window.memoryStore = new Memory({data: [
            // ... data here ...
        ]});
        
        // Globally expose a Grid constructor including the mixins we want.
        window.dgrid = {
            CustomGrid: declare([GridFromHtml, Keyboard, Selection])
        };
        
        // Parse the markup after exposing the global.
        parser.parse();
    });

Notice that rather than specifying individual non-standard attributes inside the
`th` elements, declarative layout specification with dgrid centers primarily
around a data-attribute named `data-dgrid-column`.  This attribute receives a
string representation of a JavaScript object, which will ultimately become the
basis for the column definition.  (It operates much like `data-dojo-props`,
except that the surrounding curly braces must be included.)

Note that some properties which have standard equivalents, such as `colspan` and
`rowspan`, can be specified directly as HTML attributes in the element instead.
Additionally, the innerHTML of the `th` becomes the column's label.

The script block above demonstrates the main catch to using dgrid declaratively
with `dojo/parser`: since the modules in the dgrid package are written to be
pure AMD, they do not expose globals, which means whatever constructors are to
be used need to be exposed manually.  Furthermore, rather than simply exposing
the GridFromHtml constructor, the above example exposes a custom-declared
constructor which mixes in desired functionality.

Note that if column plugins are to be employed, these will also need to be
similarly globally exposed.  Column plugins may be specified in the column
definitions of declarative grid layouts within the `data-dgrid-column` attribute;
for example:

    <th data-dgrid-column="dgrid.Editor({ field: 'name', editOn: 'dblclick' })">Name</th>

### Column Layout via HTML with views / columnsets
    
While both `dojox/grid` and dgrid also enable declarative creation
of grids with multiple views/columnsets, in dgrid's case this is again separated
to its own module, GridWithColumnSetsFromHtml.  This separation exists due to
the significant amount of additional code necessary to resolve columnsets from
the representative markup, combined with the relative rarity of cases calling
for the additional functionality.

As a quick example, here is what a simple declarative grid with two views could
look like with `dojox/grid`...

    <table id="grid" data-dojo-type="dojox.grid.DataGrid"
        data-dojo-props="store: objectStore">
        <colgroup span="1" width="10%"></colgroup>
        <colgroup span="2"></colgroup>
        <thead>
            <tr>
                <th field="id" width="auto">ID</th>
                <th field="name" width="20%">Name</th>
                <th field="description" width="80%">Description</th>
            </tr>
        </thead>
    </table>

...and here is the equivalent, using dgrid...
(this assumes the same styles are in play as the earlier programmatic ColumnSet
example)

    <table id="grid" data-dojo-type="dgrid.CustomGrid"
        data-dojo-props="store: memoryStore">
        <colgroup span="1"></colgroup>
        <colgroup span="2"></colgroup>
        <thead>
            <tr>
                <th data-dgrid-column="{ field: 'id' }">ID</th>
                <th data-dgrid-column="{ field: 'name' }">Name</th>
                <th data-dgrid-column="{ field: 'description' }">Description</th>
            </tr>
        </thead>
    </table>

# Working with Events

`dojox/grid` and dgrid take significantly different approaches to hooking up
events.  `dojox/grid` provides a wide selection of stub methods which
can be connected to in order to react to many common events on cells, or
specifically on only header or body cells.  The
[Working with Grids](http://dojotoolkit.org/documentation/tutorials/1.7/working_grid/)
tutorial gives an idea of what kinds of events are supported by `dojox/grid`.

On the other hand, dgrid leaves it up to the developer as to which events are
at all worth listening for.  This results in generally far less overhead, since
listeners are hooked up only for events of interest; at the same time, it
still allows for the same range of event listeners as `dojox/grid`.

## Listening for events with dojo/on and grid.on

The [`dojo/on`](http://dojotoolkit.org/reference-guide/dojo/on.html) module,
new to Dojo 1.7, provides a concise yet powerful API for registering listeners,
especially for DOM events.  Listening for events of interest on a dgrid component
is very straightforward using `dojo/on`; furthermore, dgrid components possess
an `on` method, which is equivalent to calling `dojo/on` passing the
component's top-level DOM node as the target.

Using the event delegation features of `dojo/on`, it is possible to listen for
all manner of events.  For example, to listen for right-clicks on rows in the
grid's body (equivalent to `onRowContextMenu` in `dojox/grid`):

    grid.on(".dgrid-row:contextmenu", function(evt){ /* ... */ });

Or, to listen to clicks on individual header cells (equivalent to
`onHeaderCellClick` in `dojox/grid`):

    grid.on(".dgrid-header .dgrid-cell:click", function(evt){ /* ... */ });

In summary, pretty much any combination desired can be achieved by using
event delegation with selectors based on the `dgrid-header`, `dgrid-row`, and
`dgrid-cell` CSS classes as necessary.

## Getting information from events

Hooking up a handler to events of interest is only half the battle; naturally,
the intent is to then do something interesting within the handler.  Generally
this requires information about the row or cell from which the event was triggered.

`dojox/grid` components generally attach any useful information directly to
the event object received by the handler callback.  While dgrid does this in
some cases, the most commonly-sought information is retrievable by passing the
event object itself to the instance's `row` or `cell` method.  These methods
are particularly powerful, in that they are capable of returning information
about a row or cell, simply given a row/cell node or any child thereof, or an
event which originated from such a node.  The `row` method is also capable
of looking up via a store item or ID.

As a quick example, here is a comparison logging the name property
of an item whose row was clicked, using `dojox/grid`...

    grid.connect(grid, "onRowClick", function(evt){
        var item = grid.getItem(evt.rowIndex);
        // don't forget to use store.getValue, since dojox/grid uses a dojo/data store
        console.log("Clicked item with name: " +
            grid.store.getValue(item, "name"));
    });

...and using dgrid...

    grid.on(".dgrid-row:click", function(evt){
        var item = grid.row(evt).data;
        console.log("Clicked item with name: " + item.name);
    });

# API Equivalents

The following sections enumerate `dojox/grid` features, and provide information
on equivalent functionality available in dgrid.

## dojox/grid properties

### sortInfo

The way in which dgrid represents current sort order is significantly different
than `dojox/grid`.  dgrid stores the current sort options, as they would be
passed via a store's `queryOptions`, in the `sortOrder` property.

### rowSelector and indirect selection

Indirect selection is available in dgrid via the Selector column plugin.  This
achieves similar effects to the DataGrid's `_CheckBoxSelector` and
`_RadioButtonSelector` view types, and EnhancedGrid's IndirectSelection plugin.

dgrid does not feature a direct analog to the `rowSelector` property.

### selectionMode

dgrid supports this property via the Selection and CellSelection mixins.
It recognizes the same values supported by `dojox/grid` components
(`none`, `single`, `multiple`, and `extended`, the latter being the default).

### keepSelection

This is roughly the inverse equivalent to the `deselectOnRefresh` property
supported by dgrid's Selection (and CellSelection) mixin.  Both `dojox/grid`
and dgrid default to *not* maintaining selection between refreshes, sorts, etc.

### columnReordering

Setting this `dojox/grid` property to `true` allows reordering of columns
in grids with basic structures via drag'n'drop operations on column header cells.

This feature is available in dgrid via the ColumnReorder extension.

### headerMenu and other context menu scenarios

dgrid does not directly offer context menu functionality via an extension, but
it is easily possible to delegate to the `contextmenu` event of
cells or rows in the grid's body or header, to perform custom logic.  Here are
the basic steps one would need to follow:

* An event handler listening for `contextmenu` events against a particular selector;
  for example:
    * `.dgrid-header:contextmenu` for a general header context menu
    * `.dgrid-row:contextmenu` for a general body context menu
    * `.dgrid-header .field-foo:contextmenu` for a context menu for a specific header cell
    * `.dgrid-content .field-foo:contextmenu` for a context menu for body cells in
      a particular column
* within the event handler:
    * A call to `preventDefault` on the event object, to stop the default
      browser context menu from displaying.
    * A call to `grid.row()` or `grid.cell()` to retrieve information on the
      pertinent row or cell.  If the menu is intended to apply to selected items,
      `grid.selection` can be checked for entries, and then `grid.row()` can be
      called with the IDs found.
    * If `dijit/Menu` is being used, it unfortunately does not provide any
      directly-accessible public API for simply opening the menu around the mouse,
      as it is normally expected to be pre-attached to nodes; however, depending
      on use-case, attaching it to an entire section of the grid may be inappropriate.
      In such a case, the menu can be directly opened within a `contextmenu`
      event handler, by calling `_scheduleOpen(this, null, { x: evt.pageX, y: evt.pageY }`.

### autoHeight

Automatic height can be achieved using `height: auto` in the CSS for a grid's
main DOM node.  There is no direct programmatic support for this.  (This means
there is no built-in support for automatically sizing to a certain number of rows.)

Examples of an auto-height grid can be found in the `autoheight.html` and
`extensions/Pagination.html` test pages.

### autoWidth

Not supported.

### initialWidth

Not supported.  Width (and height) should be dictated via CSS.

### singleClickEdit

The effect of the `singleClickEdit` property can be achieved by specifying
`editOn: "click"` in a column definition passed to the Editor column plugin
function.  (Alternatively, `dojox/grid`'s default double-click behavior can be
achieved by specifying `editOn: "dblclick"` instead.)

### loadingMessage, noDataMessage, errorMessage

Store-backed grid instances support `loadingMessage` and `noDataMessage`.
There is currently no direct support for an error message, but when a
store-related error occurs within dgrid's own logic, it will emit a `dgrid-error`
event.  If an error occurs when `grid.save()` is called directly, it will throw
an error or reject a promise, depending on whether the store in use is
synchronous or asynchronous.

### selectable

This is not exposed as a distinct option in dgrid, but is automatically managed
by the `Selection` plugin.  Standard browser selection is disabled when a
`selectionMode` other than `none` is in use.
Otherwise, text selection operates as normal.

### formatterScope

dgrid does not directly support this.  If you need to set the context that a
formatter function runs in, pass it through `hitch` before assigning it to the
column definition object.

### updateDelay

dgrid does not support this, as it is generally not applicable, due to the
difference in how dgrid components update from observed store changes.

### escapeHTMLInData

Not supported.  By default, dgrid components will escape HTML in data, as it
should generally be devoid of HTML in most cases, and presence of HTML in data
might suggest a cross-site scripting attempt.

The `formatter` or `renderCell` functions in the column definition may be
overridden to explicitly render data as received, in cases where that is truly
desired.

## Column Definitions

Whereas `dojox/grid` always expects cell definitions to be specified via a
`structure` property, dgrid expects one of the following properties to be specified:

* `columns`: an array or object hash, for simple single-row grid configurations
* `subRows`: an array of arrays, for grid configurations with multiple sub-rows per item
* `columnSets` (only when the ColumnSet mixin is in use): a nested array for
  grid configurations containing distinct horizontal regions of one or more rows
  (analogous to multiple views in a `dojox/grid` instance)

The following subsections outline how features of `dojox/grid` cell definitions
are available in dgrid column definitions.

### field

Supported by dgrid, including the special `"_item"` value supported by
`dojox/grid` in Dojo >= 1.4.

Also note that dgrid also supports specifying `columns` as an object hash instead
of an array, in which case the key of each property is interpreted as the `field`.

### fields

Not supported by dgrid.  If a compound value is desired, define a custom `get`
function in a column definition.

### width

Use CSS with `.field-<fieldname>` selectors.  (Note that if any value is
specified via the `className` property of the column definition object, it
takes the place of `.field-<fieldname>`.)

### cellType, widgetClass

The Editor column plugin provies capabilities equivalent to these properties.
It accepts an `editor` property, which can be either a widget constructor or a
string indicating a native HTML input type.

### options

Not directly applicable; in `dojox/grid` this applies only to cell definitions
where `cellType` is set to `dojox.grid.cells.Select`.

The Editor column plugin does not currently offer support for standard HTML
select components; however, similar behavior can be achieved using the
`dijit/form/Select` widget as the `editor`, and specifying `options` for the
widget within the `editorArgs` property of the column definition object.

### editable

Not applicable; "editability" is determined by usage (or lack thereof) of the
Editor column plugin.

### draggable

Only applicable to `dojox/grid` instances with `columnReordering` set to `true`,
the `draggable` property determines whether a particular column can be
reordered via drag'n'drop.

The ColumnReorder dgrid extension provides an equivalent via the `reorderable`
column definition property.  It defaults to `true`, but if set explicitly to
`false`, the given column's header node will not be registered as a DnD item.

### formatter

dgrid supports formatter functions, but doesn't support returning a widget from
them.

dgrid also has `renderCell`, which is expected to return a DOM node.  This could
ostensibly be used for displaying widgets (and the Editor column plugin does
exactly this).

Note that for cell editing purposes, use of the Editor column plugin is highly
encouraged.

### get

dgrid supports the `get` function on column definitions; however, note that it
only receives one parameter: the object for the item represented by the current
row being rendered.  (dgrid generally has no concept of row index, since
row identities are generally far more meaningful.)

### hidden

The `hidden` property on column definitions is only supported by the
ColumnHider extension.  Otherwise, columns would ordinarily be suppressed simply
by excluding them from the `columns`, `subRows` or `columnSets` property outright.

## DataGrid methods

### getItem(rowIndex), getItemIndex(item)

These are somewhat inapplicable, since again, dgrid components do not put any
emphasis on index in terms of order of appearance in the component.

On the other hand, when dealing with events on nodes in a list or grid, it is
possible to retrieve the associated item via the `data` property of the object
returned by the `row` or `cell` functions.  These functions can look up based on
a variety of argument types, including a child node of the target row/cell, or
an event object which fired on such a node.

### setStore

Store-backed dgrid components support this via
`set("store", store[, query[, queryOptions]])`.

### setQuery

Store-backed dgrid components support this via
`set("query", query[, queryOptions])`.

### setItems

While it is unclear what exact purpose this serves in `dojox/grid/DataGrid`, and
whether or not it is truly intended to be public, it is probably analogous to
calling `renderArray` directly on a dgrid component.  Note, however, that
generally `renderArray` is not expected to be called directly on store-backed
instances.

### filter

This is likely closest in behavior to the `refresh` method on dgrid components.

### sort

dgrid components have a `sort` method which takes two arguments:
the name of the field to sort by, and a flag as to whether to sort descending
(defaults to `false`).

Like the `sort` method in `dojox/grid` components, this can even be called to sort
columns that ordinarily wouldn't be sortable via the UI.

### canSort

`dojox/grid` components refer to this method when a sort request is initiated
via the UI.  dgrid does not have such a method; instead, it relies on the
`sortable` property of each column definition (which defaults to `true`).

### removeSelectedRows

dgrid has no direct analog to this method, but the same effect can be achieved
on a store-backed, Selection-enabled list or grid instance as follows:

    for(var id in grid.selection){
        grid.store.remove(id);
    }