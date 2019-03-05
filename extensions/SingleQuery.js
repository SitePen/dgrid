define([
	'dojo/_base/declare',
	'dojo/dom-construct',
	'../_StoreMixin'
], function (declare, domConstruct, _StoreMixin) {
	return declare(_StoreMixin, {
		// summary:
		//		dgrid mixin which implements the refresh method to
		//		always perform a single query with no start or count
		//		specified, to retrieve all relevant results at once.
		//		Appropriate for grids using memory stores with small
		//		result set sizes.

		refresh: function () {
			var self = this;

			// First defer to List#refresh to clear the grid's
			// previous content
			this.inherited(arguments);

			if (!this._renderedCollection) {
				return;
			}

			return this._trackError(function () {
				var loadingNode = self.loadingNode = domConstruct.create('div', {
					className: 'dgrid-loading',
					innerHTML: self.loadingMessage
				}, self.contentNode);

				var queryResults = self._renderedCollection.fetch();

				queryResults.totalLength.then(function (total) {
					// Record total so it can be retrieved later via get('total')
					self._total = total;

					if (!total) {
						self._insertNoDataNode();
					}
				});

				queryResults.always(function () {
					domConstruct.destroy(loadingNode);
					self.loadingNode = null;
				});

				return self.renderQueryResults(queryResults).then(function (rows) {
					self._emitRefreshComplete();
					return rows;
				});
			});
		},

		renderArray: function () {
			var rows = this.inherited(arguments);

			// Clear _lastCollection which is ordinarily only used for store-less grids
			this._lastCollection = null;

			return rows;
		}
	});
});
