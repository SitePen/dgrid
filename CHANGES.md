Release notes are now maintained on the GitHub repository's
[releases page](https://github.com/SitePen/dgrid/releases).

# dev-0.4

The following is a rough list of changes, to be outlined more presentably later.

* dgrid now interacts with the dstore API rather than the dojo/store API
* dgrid now requires Dojo 1.8 at minimum (since that is also dstore's minimum requirement)
* Split out store-specific code from `List#renderArray` to
  `_StoreMixin#renderQueryResults`, which always returns a promise
* Removed observer tracking logic and workarounds now irrelevant with dstore
  (this includes removal of the `cleanEmptyObservers` flag)
* Removed `results` property from `dgrid-refresh-complete` event
* Removed `grid` property from error attached to `dgrid-error` event
  (use `grid` property directly on event instead)
* Replaced `List#newRow(...)` with `List#highlightRow(row[, delay])`
  (i.e. the equivalent of `newRow` is to call `insertRow` then `highlightRow`)
* Moved `Grid.defaultRenderCell` to prototype as `_defaultRenderCell` (#375)
* `Editor` is now a mixin (with a capital E), activated by presence of the `editor` column definition property
* `Editor` now supports `autoSelect` property for columns using textbox-based inputs
* `Selector` is now a mixin (with a capital S), activated by presence of the `selector` column definition property
* `Tree` is now a mixin (with a capital T), activated by presence of the `renderExpando` column definition property
* Some `Tree` properties have been moved from the column definition to instance-level,
  including `collapseOnRefresh`, `treeIndentWidth` (formerly `indentWidth`), `shouldExpand`,
  and `enableTreeTransitions` (formerly `enableTransitions`)
* Desupported `Selector`'s `disabled` property (use `Selection#allowSelect` instead)
* Desupported `Tree`'s `allowDupilcates` property (ensure unique IDs instead)
* Added `options.keepCurrentPage` to `Pagination#refresh`
* Removed deprecated functions marked for removal in 0.4; most of these have had
  `set(...)` equivalents for a long time already
* Removed `dgrid/util/mouse` module (made redundant by `dojo/mouse` improvements in Dojo 1.8)
