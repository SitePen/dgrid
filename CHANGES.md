# Significant Changes

## post-0.2.0

### Editor

#### widgetArgs is now editorArgs

The `widgetArgs` property supported in the column definition by the Editor
plugin has been renamed to `editorArgs` to be agnostic as to whether the
editor is a widget or a standard input, leaving the door open for usage with
standard HTML input types.

#### Usage of editorArgs as a function

The `editorArgs` property, like `widgetArgs` before it, can be specified
as an object or a function returning an object; however, due to refactoring
of the Editor plugin, that function no longer receives a store item for a
particular row.  This is because the editor is no longer always instantiated
for every use; in cases where `editOn` is specified, only one instance is
ever created.

Instead of a store item, `editorArgs` is now passed the column definition.

#### `dgrid-datachange` event: cell added, rowId deprecated

The `dgrid-datachange` event emitted by the Editor column plugin now includes
a `cell` property, which contains the same data retrievable via
`grid.cell(event)`.  Since `grid.cell` is already called in the relevant
Editor code, it is exposed directly on the event to avoid forcing developers
to perform the same lookup again on the other end.

Since it is possible to get cell and row information from this property,
the previously-exposed `rowId` property of the `dgrid-datachange` event is
now deprecated and will be removed in the beta release.
