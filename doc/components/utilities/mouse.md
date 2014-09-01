# util/mouse

The `util/mouse` module has been removed from dgrid 0.4. It was introduced to compensate for deficiencies
in the `dojo/mouse` module's handling of event bubbling. The `dojo/mouse` module was improved in Dojo 1.8, so
the functionality previously provided by `dgrid/util/mouse` can now be achieved using `dojo/mouse`.

The `dgrid/util/mouse` module provided the following synthetic events for handling mouse movement in and out of dgrid
rows and cells:

* `enterRow`: mouse moves into a row within the body of a list or grid
* `leaveRow`: mouse moves out of a row within the body of a list or grid
* `enterCell`: mouse moves into a cell within the body of a grid
* `leaveCell`: mouse moves out of a cell within the body of a grid
* `enterHeaderCell`: mouse moves into a cell within the header of a grid
* `leaveHeaderCell`: mouse moves out of a cell within the header of a grid

Equivalent functionality can be achieved using the `dojo/on` and `dojo/mouse` modules
(with `dojo/query` loaded for event delegation):

| Event | `dojo/on` extension event |
| ----- | ------------------------- |
| `enterRow` | `on.selector('.dgrid-content .dgrid-row', mouse.enter)` |
| `leaveRow` | `on.selector('.dgrid-content .dgrid-row', mouse.leave)` |
| `enterCell` | `on.selector('.dgrid-content .dgrid-cell', mouse.enter)` |
| `leaveCell` | `on.selector('.dgrid-content .dgrid-cell', mouse.leave)` |
| `enterHeaderCell` | `on.selector('.dgrid-header .dgrid-cell', mouse.enter)` |
| `leaveHeaderCell` | `on.selector('.dgrid-header .dgrid-cell', mouse.leave)` |

Extension events can be used as indicated in the following example, further
described in the respective section of the
[`dojo/on` Reference Guide](http://dojotoolkit.org/reference-guide/dojo/on.html#extension-events).

```js
require([
    'dojo/on',
    'dojo/mouse',
    'dojo/query'
], function (on, mouse) {
    // Assume we have a Grid instance in the variable `grid`...
    grid.on(on.selector('.dgrid-content .dgrid-row', mouse.enter), function (event) {
        var row = grid.row(event);
        // Do something with `row` here in reaction to when the mouse enters
    });
});
```
