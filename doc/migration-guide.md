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

TODOC

# Working with Events

TODOC: grid.on, use w/ dojo/on, etc.

TODOC: row and cell methods

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

dgrid supports this property via the Selection mixin.  It recognizes the same
values supported by `dojox/grid` components (`none`, `single`, `multiple`, and
`extended`, the latter being the default).

### columnReordering

Setting this `dojox/grid` property to `true` allows reordering of columns
in grids with basic structures via drag'n'drop operations on column header cells.

This feature is available in dgrid via the ColumnReorder extension.

### headerMenu

This is not yet directly available in dgrid, but a Context Menu plugin is planned.
In the interim, it is possible to delegate to the `oncontextmenu` event of
cells or rows in the grid's body or header, to perform custom logic.

### autoHeight

Automatic height can be achieved using `height: auto` in the CSS for a grid's
main DOM node.  There is no direct programmatic support for this.  (This means
there is no built-in support for automatically sizing to a certain number of rows.)

An example of an auto-height grid can be found in the `autoheight.html` test page.

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

This is not exposed as a distinct option, but is automatically managed
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