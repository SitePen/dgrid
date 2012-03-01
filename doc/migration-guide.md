NOTE: this document is in a very early stage, and thus has many gaps.
While some information may be accurate, it should not yet be treated as
definitive or nearly final.

# Comparison of Basic Setup

## Simple programmatic usage

TODOC

## Specifying column layout via HTML

TODOC

## Using views / columnsets

The `dojox/grid` components implement a concept known as "views", which are
represented as separate horizontal regions within a single grid.  This feature
is generally useful for situations where many fields are to be shown, and some
should remain visible while others are able to scroll horizontally.

This capability is also made available in `dgrid` via the ColumnSet mixin.

TODOC: example

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

This is not yet available in dgrid, but an extension implementing this for
basic grids with single-row layouts should be coming soon.

### headerMenu

This is not yet directly available in dgrid, but a Context Menu plugin is planned.
In the interim, it is possible to delegate to the `oncontextmenu` event of
cells or rows in the grid's body or header, to perform custom logic.

### autoHeight

Automatic height can be achieved using `height: auto` in the CSS for a grid's
main DOM node.  There is no direct programmatic support for this.  (This means
there is no built-in support for automatically sizing to a certain number of rows.)

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

Not yet applicable, at least until the Column Reordering extension is implemented.

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