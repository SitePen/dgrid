This document outlines changes since 0.3.0.  For older changelogs, see the
[dgrid wiki](https://github.com/SitePen/dgrid/wiki).

# 0.3.2

## Significant changes

* The `TouchScroll` module has undergone significant changes and improvements:
    * uses CSS3 `translate3d` to take advantage of hardware acceleration
        * a `util/has-css3` module has been added with has-feature tests to
          detect CSS3 features to be used by `TouchScroll`
    * implements increased tension and bounce-back beyond edges
    * displays scrollbars as appropriate while scrolling
    * exposes `scrollTo` and `getScrollPosition` methods to allow manipulation
      and retrieval of scroll information; updates have been made to dgrid
      components where necessary to leverage these
    * allows configuring how many touches are necessary to activate scrolling,
      via the `touchesToScroll` property
* The `Keyboard` mixin now defines `focus` and `focusHeader` methods, for
  programmatically focusing a row or cell (depending on the value of the
  `cellNavigation` setting). (#130)
* The `ColumnSet` mixin now defines a `styleColumnSet` method, which is
  analogous to Grid's `styleColumn` method, but instead adds a style rule for
  the class on nodes containing the entire columnset contents for a row.
* `_StoreMixin` (used by `OnDemandList` and the `Pagination` extension) now
  includes a reference to the grid instance in emitted `dgrid-error` events
  (via a `grid` property on the `error` object).
* It is now possible to initialize or later set CSS classes on a dgrid component's
  top DOM node via `"class"` or `className`. (#183)
* The `tree` column plugin now supports a `collapseOnRefresh` property in the
  column definition; if set to `true`, it will cause all parent rows to render
  collapsed whenever the grid is refreshed, rather than remembering their
  previous state.
* The `tree` column plugin now supports a `allowDuplicates` property in the
  column definition; this can be set to `true` to allow for cases where the same
  item may appear under multiple parents in the tree.  Note however that it
  limits the capabilities of the `row` method to the top level only. (#147)
* The `DnD` extension now supports specifying a `getObjectDndType` function, for
  customizing the DnD type reported for each item rendered.
* The `ColumnHider` extension has undergone some refactoring to make it more
  extensible and to provide a public API for toggling the hidden state of a
  column, via the `toggleColumnHiddenState(columnId)` method.
* The `ColumnReorder` extension has been refactored to allow reordering of
  columns within the same subrow or columnset in more complex column structures,
  in addition to the previous ability to reorder columns in simple single-row
  structures.
* A `CompoundColumns` extension has been added, which allows defining column
  structures which include additional spanning header cells describing the
  contents beneath.

## Other changes and fixes

* The `ColumnSet` mixin now behaves properly when calling
  `set("columnSets", ...)`. (#202)
* The `Selection` mixin will now properly reset `_lastSelected` when
  `clearSelection` is called. (#175)
* The `Selection` mixin will now wait until `mouseup` when handling mouse events
  on targets that are already selected. (#251)
* The `tree` column plugin's `expand` function will no longer be called at all
  in reaction to events on rows which report no children.
* `Grid`: calls to `cell` with a falsy `columnId` value now work properly. (#198)
* Fixed an issue with dgrid instances not reacting correctly to window resize.
* Fixed an issue affecting odd/even row classes on in-place updates. (#269)
* Fixed a rendering issue involving confusion of preload node dimensions. (#161)
* Fixed an issue causing `tree` level indentation to render improperly when used
  with the `Pagination` extension.
* Fixed a deprecated API call in `_StoreMixin`. (#272)
* Improved logic in `OnDemandList` to properly account for lists with displays
  which tile items using `display: inline-block`.
* The `DnD` extension can now drag non-root tree items *in Dojo 1.8 only* by
  passing `allowNested: true` to the source via `dndParams`. (#68)
* The `DnD` extension now behaves better with regard to synchronizing with
  dgrid's `Selection` mixin, and also with regard to dragging when some selected
  nodes are no longer in the DOM. (#185, #246)
* The `DnD` extension now adds CSS to adequately override spurious styles which
  can leak in from dijit.css in Dojo 1.8. (#255)
* The `ColumnHider` extension now supports setting `hidden` and `unhidable`
  together, resulting in the column being hidden and not being present in the
  popup menu (but it can still be shown programmatically). (#199)
* The `ColumnHider` extension now behaves appropriately for columns with no
  `label` defined. (#244)
* Several accessibility issues have been addressed, including fixes to the
  roles reported by certain elements, and labels added to the Pagination
  extension's controls. (Fixes partly attributed to #273)
* The non-standard `colsetid` attribute assigned to nodes by the `ColumnSet`
  mixin has been replaced with the `data-dgrid-column-set-id` attribute.
* A number of protected members in the ColumnHider extension have been renamed:
    * `_toggleColumnState` has been replaced by `_setColumnHiddenState` and the
      public API `toggleColumnHiddenState` mentioned above
    * `_toggleHiderMenu` has been renamed to `_toggleColumnHiderMenu`
    * `_columnStyleRules` has been renamed to `_columnHiderRules`

# 0.3.1

## Significant changes

* Column plugins can now define the following functions on column definitions,
  providing more opportune timing for initialization and tear-down:
    * `init`, which will be executed at the time the grid's column configuration
      is (re-)applied
    * `destroy`, which will be executed when the grid is destroyed, as well as
      before a new column configuration is applied
* The `tree` plugin now supports the following column definition properties:
    * `shouldExpand(row, level, previouslyExpanded)`, a function providing for
      conditional automatic expansion of parent rows (#141)
    * `indentWidth`, an integer specifying the size (in pixels) of each level's
      indent (note that the default is now `9`, though it was previously `19`)
    * `renderExpando()`, a function which can replace the default logic for
      rendering the expando node (the arrow next to the content of each cell)
* The `editor` plugin now augments the grid instance with an `edit(cell)` method
  which can be used to programmatically activate the editor in a given cell.
* A `util/mouse` module has been added, which exposes simulated events for
  the mouse entering and leaving grid rows and cells. (#165)
* A `package.js` has been added in order to streamline the build process.
  `package.json` has been updated to reflect the presence of `package.js` and
  reference the latest versions of xstyle and put-selector, each of which now
  have a `package.js` of their own.

## Other Fixes

* Mouse events for expanding/collapsing rows in tree grids should be a bit more
  reliable. (#112)
* Rows expanded in a tree grid which has been started up but is currently hidden
  will now be rendered properly when re-shown. (#140)
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