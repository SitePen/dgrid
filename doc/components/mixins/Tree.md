# Tree

The Tree mixin enables expansion of rows to display children. 

```js
require([
    "dojo/_base/declare", "dgrid/OnDemandGrid", "dgrid/Tree", "dgrid/Keyboard", "dgrid/Selection"
], function(declare, OnDemandGrid, Tree, Keyboard, Selection){
    var treeGrid = new (declare([OnDemandGrid, Keyboard, Selection, Tree]))({
        collection: myStore,
        columns: [
            // Render expando icon and trigger expansion from first column
            { label: "Name", field: "name", renderExpando: true }),
            { label: "Type", field: "type", sortable: false},
            { label: "Population", field: "population" },
            { label: "Timezone", field: "timezone" }
        ]
    }, "treeGrid");
});
```

## Store Considerations

The Tree mixin expects to operate on a store-backed grid, such as an
[OnDemandGrid](../core-components/OnDemandList-and-OnDemandGrid.md#ondemandgrid) or a grid with the
[Pagination](../extensions/Pagination.md) extension mixed in.

The store connected to the grid is expected to provide a `getChildren(object)`
method to return the children for a given item. `getChildren` should return a
collection as well; dgrid will track and request ranges from it just like it
does for the top level.

The following is a simple example of what a `getChildren` implementation could
look like in an extension to `dstore/Memory`, where hierarchy is indicated
by a `parent` property on child items:

```js
constructor: function(){
    // Save a reference to the original store for use in getChildren()
    this.root = this;
},
getChildren: function(parent, options){
    // Call filter on the original store to avoid the filter looking only for the root objects.
    return this.root.filter({ parent: parent.id });
}
``` 

The store may also (optionally) provide a `mayHaveChildren(object)` method which
returns a boolean indicating whether or not the row can be expanded. If this
is not provided, all items will be rendered with expand icons.

## Additional Column Definition Properties

The Tree mixin supports the following additional column definition properties.

Property | Description
-------- | -----------
`expandOn` | Event(s) to trigger grid expansion; defaults to expanding when an expando icon is clicked, or a cell in the tree column is double-clicked or receives a space key event.
`indentWidth` | Number of pixels to indent each nested level of children; the default is `9`.
`renderExpando` | Boolean or function.  If set to `true`, this column will contain an arrow icon and double-click handler for expanding/collapsing rows.  If set to a function, that function will be called to render the expando icon instead of the default.  **Note:** only one column in the grid should have `renderExpando` set.

## Additional Grid APIs

When the Tree mixin is applied to a column in a grid, the grid is augmented with
the following method.

Property | Description
-------- | -----------
`collapseOnRefresh` | Boolean indicating whether to collapse all parents (essentially "forgetting" expanded state) whenever the grid is refreshed; the default is `false`.
`enableTreeTransitions` | Boolean indicating whether to perform CSS transitions when expanding/collapsing; the default is `true`.  Note that this does not apply to browsers which do not support CSS transitions (e.g. IE < 10).
`expand(row, expand)` | Expands or collapses the row indicated by the given Row object (from `grid.row(target)`) or a `dgrid-row` element. The optional `expand` argument specifies whether the row should be expanded (`true`) or collapsed (`false`); if unspecified, the method toggles the current expanded state of the row.  Returns a promise which resolves after data for the children has been retrieved.
`shouldExpand(row, level, previouslyExpanded)` | Optional function which returns a boolean indicating whether the given row should be expanded when rendered.  The default implementation simply returns the value of `previouslyExpanded`, which denotes whether the row in question was previously expanded before being re-rendered.