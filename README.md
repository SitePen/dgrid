This project provides widgets for lists of data, including simple sets of scrolling rows,
tables of data, on-demand lazy-loaded data. This project also provides touch scrolling
for mobile devices with native style momentum, bouncing, and scrollbars. The 
components are broken down into the following top level widget modules:

<h2>List</h2>
This provides the basic facilities for taking an array of objects and rendering as rows
of HTML in a scrollable area. This will automatically include touch scrolling (via TouchScroll module)
capabilities on mobile devices.

<h2>Table</h2>
This extends List to provide tabular display of data in columns. The component will
provide a header for each column that corresponds to columns within the scrollable
grid of data.

<h2>OnDemandList</h2>
This extends List to provide on-demand lazy loading or paging of data as the user
scrolls through the list and connects to a Dojo data store for querying of data. 
This provides a seamless, intuitive interface for viewing large sets of data in scalable way.
This also provides sorting delegation to the store.

<h2>OnDemandTable</h2>
The composition of Table and OnDemandList. It is nothing more than Table.extend(OnDemandList).

<h2>Selection</h2>
Adds selection capability to a List/Table.

The following modules are components that can be used as columns for a Table:

<h2>Tree</h2>  
Provides expansion of rows to display children.

<h2>TextEdit</h2>
Provides editing capability of cells in the column.