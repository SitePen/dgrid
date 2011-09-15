NOTE: this document is in a very early stage, and thus has many gaps.
While some information may be accurate, it should not yet be treated as
definitive or nearly final.

# Comparison of Basic Setup

TODOC (incl. usage of `GridFromHtml` or `GridWithColumnSetsFromHtml` for declarative)

# API Mappings / Equivalents

The following sections enumerate dojox grid features
(compiled mainly from the DataGrid reference guide page),
with explanations on how `dgrid` implements equivalents.

## "View" -> "ColumnSet"

## Events

TODO: document how one can easily listen for row/header mouse events.
(Also, can we come up with equivalents to on...ContextMenu events?)

TODO: consider alternatives to how dojox grid decorates events - for simple
stuff like the `grid` property, I suppose hitching or even the scope chain
may be enough, but what about e.g. which cell/row was clicked/hovered/etc?
Should we still decorate events?

## dojox.grid properties

### sortInfo

TODOC (probably won't be supported the same way, but we probably should have a way to initially set sort.)

### rowSelector / indirect selection

dgrid does not feature a direct analog for the `rowSelector` property.

However, it does have functional equivalents to the indirect selection
features found in the `_CheckBoxSelector` / `_RadioButtonSelector` view types
and the EnhancedGrid's IndirectSelection plugin.

TODOC: details (IIRC this uses the `Editor` plugin)

### selectionMode

dgrid supports this, with the same options, when the `Selection` grid plugin is in use.

### columnReordering

TODO: Column DnD plugin

### headerMenu

TODO: Context Menu plugin

### autoHeight

Not supported.  TODO: Do we want to? (Is this a can of worms?)

### autoWidth

Not supported.  TODO: Do we want to? (Maybe as part of ColumnResizer?)

### initialWidth

Not supported.  Width (and height) should be dictated by CSS.

### singleClickEdit

Supported via `Editor` cell plugin configuration.
(TODO: confirm and add details)

### loadingMessage, errorMessage

These do not exist in dgrid.  TODO: plugin?

### selectable

This is not exposed as a distinct option, but is automatically managed
by the `Selection` plugin.  Standard browser selection is disabled when a
`selectionMode` other than `none` is in use.
Otherwise, selection operates as normal.

### formatterScope

Not supported. (TODO: should it be?)

### updateDelay

Not supported. (TODO: verify)

TODO: assuming this is talking about debouncing update notifications, this
sounds like a good idea and something we might want to consider supporting.

### escapeHTMLInData

Not supported.

TODO: determine what dgrid's behavior should be in this regard.
We are probably not escaping at all right now; should we be by default?

## Cell Definition options

### field

Supported by dgrid, including the special `"_item"` value from 1.4+ dojox grid.

### fields

Doesn't make much sense as implemented in dojox grid to begin with;
not supported by dgrid.

Recommendation: use `field: "_item"` instead.

### width

Use CSS with `.field-<fieldname>` selectors.

### cellType

The `Editor` cell plugin provies a rough equivalent to this.
Its `editor` property accepts either a widget constructor or a string indicating
a native HTML input type.

### options

N/A (specific to `cellType` when set to `dojox.grid.cells.Select`)

TODO: spell out equivalent
(`Editor` with `dijit.form.Select` with `options` property?)

### editable

N/A - "editability" is determined by usage (or lack thereof) of the `Editor`
cell plugin.

### draggable

TODO: I have no idea what this does in dojox grid.

### formatter

dgrid supports formatter functions, but doesn't support returning a widget.

dgrid also has `renderCell`, which is expected to return a DOM node.  This could
ostensibly be used for displaying widgets.  For editing purposes, the
`Editor` plugin should be used.

### get

Supported by dgrid.

### hidden

There is currently no direct analog to this, short of resetting the layout
of the grid and refreshing.

(TODO: confirm this; also test what happens by simply using CSS display;
if that doesn't work, this might be a low-priority enhancement...)

## DataGrid methods

### getItem(rowIndex)

TODOC

### getItemIndex(item)

TODOC (if we do or intend to support this)

### setStore

TODOC

### setQuery

TODOC

### setItems

This is arguably not meant to be publicly used on `dojox.grid` components.
Regardless, it is probably analogous to `renderArray` in dgrid components.

### filter

TODOC (need to be clear on what role this plays in DataGrid first)

### sort

dgrid components have a `sort` method which takes two arguments:
the name of the field to sort by, and a flag as to whether to sort descending
(defaults to `false`).

Like the `sort` method in `dojox.grid` components, this can even be called to sort
columns that ordinarily wouldn't be sortable via the UI.

### canSort

`dojox.grid` components refer to this method when a sort request is initiated
via the UI.  dgrid does not have such a method; instead, it relies on the
`sortable` property of the particular column.

### removeSelectedRows

TODOC (Probably not necessary to have a direct analog, but we should be able
to document how to do this.)
