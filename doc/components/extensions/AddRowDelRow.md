# AddRowDelRow
The AddRowDelRow component adds two new related funcionalities:
A ➕ button on the header to create a new, empty row at the end of the table.
A ❌ button on each body row to remove that row.

## How to use
This is a simple mixin with no required setup or dependencies.
The only attention point is that the remove row violates the packaging and calls the `remove()` method directly on the store.  
So in the rare case the `grid.collection` is a not a `dstore` object this may be a issue which must be handled.

## Example
```js
require([
    'dojo/_base/declare',
    'dojo/dom',
    'dojo/on', 
    'dstore/Memory',
    'dgrid/OnDemandGrid',
    'dgrid/Selection',
    'dgrid/Editor',
    'dgrid/extensions/AddRowDelRow',
    'dojo/domReady!'
], function(declare, dom, on, Memory, OnDemandGrid, Selection, Editor, AddRowDelRow) {
  var store = new Memory();
  var grid = new (declare([OnDemandGrid, Selection, Editor, AddRowDelRow]))({
      collection: store,
        columns: {
            col1: {
                editor: 'text'
            },
            col2: {
                editor: 'checkbox'
            }
        }
  }, 'grid');

  grid.startup();
  grid.addRow({col1: "value1a", col2: false});
  grid.addRow({col1: "value1b", col2: true});
  grid.addRow({col1: "value1c", col2: false});
```
## Result

| col1 | col2 | ➕ |  
| --- | --- | --- |  
| value1a | ☐ | ❌ |  
| value1b | ☑ | ❌ |  
| value1c | ☐ | ❌ |  
