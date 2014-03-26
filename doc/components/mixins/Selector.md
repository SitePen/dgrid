Used in conjunction with the [Selection](Selection.md) mixin, the Selector mixin dedicates
a column to the purpose of rendering a selector component, providing alternate
means for selecting and deselecting rows in a grid.

```js
require([
    "dojo/_base/declare", "dgrid/OnDemandGrid", "dgrid/Selection", "dgrid/Selector"
], function(declare, OnDemandGrid, Selection, Selector){
    var grid = new (declare([OnDemandGrid, Selection, Selector]))({
        store: myStore,
        selectionMode: "single",
        columns: {
            col1: { label: "Select", selector: "radio" },
            col2: "Column 2"
        }
    }, "grid");
    // ...
});
```
A selector column can be used to allow selection even in a grid where `selectionMode` is set to `none`, in which case
the controls in the selector column will be the only means by which a user may select or deselect rows.

## Usage 

The Selector mixin looks for a `selector` property in each column definition and if found, the cell values in that
column are replaced with selector components.

Property | Description
-------- | -----------
`selector` | Specifies the type of selector component to use.  Set to `true` or `"checkbox"` for a checkbox that allows muliple rows to be selected, but use `"radio"` if you would like only one row selected at a time.

The value of `selector` may also be a function that renders the selector input component.
```js
require([
    "dojo/_base/declare", "dgrid/Grid", "dgrid/Selection", "dgrid/Selector"
], function(declare, Grid, Selection, Selector){
    var grid = new (declare([Grid, Selection, Selector]))({
        columns: {
            col1: {
            		label: "Select",
            		selector: function (column, value, cell, object) {
            			var inputNode;
            			// ... render an input component ...
                        return inputNode;
            		}
            	  },
            col2: "Column 2"
        }
    }, "grid");
    // ...
});
```
Selector function parameters:

Parameter | Description
-------- | -----------
`column` | The selector's column definition.
`value` | The cell's value.
`cell` | The cell's DOM node.
`object` | The row's data object.

A custom selector function must return an input component's DOM node.

If you would like to augment the default input component, call the grid's `_defaultRenderSelectorInput` function to
construct the component first and then make your modifications to the returned DOM node.
```js
require([
    "dojo/_base/declare", "dojo/dom-class", "dgrid/Grid", "dgrid/Selection", "dgrid/Selector"
], function(declare, domClass, Grid, Selection, Selector){
    var grid = new (declare([Grid, Selection, Selector]))({
        columns: {
            col1: {
            		label: "Select",
            		selector: function (column, value, cell, object) {
            			var inputNode = column.grid._defaultRenderSelectorInput(column, value, cell, object);
            			domClass.add(inputNode, "mySelectorClass");
                        return inputNode;
            		}
            	  },
            col2: "Column 2"
        }
    }, "grid");
    // ...
});
```
