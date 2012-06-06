This document outlines changes since 0.3.0.  For older changelogs, see the
[dgrid wiki](https://github.com/SitePen/dgrid/wiki).

# 0.3.1 (in progress)

## Significant changes

* Column plugins can now define an `init` function on column definitions, which
  will be executed at the time the grid's column configuration is applied;
  previously the earliest place a column plugin could really execute code was in
  the first `renderCell` call, but this could be obtuse, or even too late for
  some things.
* The `tree` plugin now supports a `shouldExpand(row, level, previouslyExpanded)`
  function on the column definition, providing for conditional automatic
  expansion of parent rows. (#141)
* The `editor` plugin now augments the grid instance with an `edit(cell)` method
  which can be used to programmatically activate the editor in a given cell.
* A `util/mouse` module has been added, which exposes simulated events for
  the mouse entering and leaving grid rows and cells. (#165)
* A `package.js` has been added (and `package.json` has been updated to reference
  it in its `dojoBuild` property) in order to streamline the build process;
  the same has been done for xstyle and put-selector.

## Other Fixes

* Mouse events for expanding/collapsing rows in tree grids should be a bit more
  reliable. (#112)
* Rows expanded in a tree grid which has been started but is currently hidden
  will now show up properly when re-shown. (#140)
* The `tree` and `editor` plugins can now both be used on the same column, by
  wrapping `editor` with `tree`. (#144)
* `sortable` now defaults to `false` for columns where `field` is `"_item"`
  or entirely unspecified (in which case there's nothing to sort by anyway).
  (#149)
* The `Pagination` extension now behaves appropriately with empty result sets.
  (#173)
* The `ColumnHider` extension now iterates over `subRows` rather than `columns`,
  making it a bit more reliable in general. (#164)
* A couple of issues with the `DijitRegistry` extension were identified and
  fixed. (#146, thanks jdohert)