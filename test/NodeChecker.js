define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred", "dojo/has", "dojo/aspect"],
function(declare, lang, Deferred, has, aspect){

return declare([], {
	// summary: Checks that rows, preloads and loading nodes of OnDemandLists are all in the correct places;
	//      that is they have the correct rowIndex, rowCount, offsetTop and offsetHeight.
	//      Apart from logging errors to the console, the extension has no visible presence.

	// Set this to false when testing lists where the rows' heights vary to avoid spurious errors
	rowsHaveEqualHeight: true,

	// Set false to disable checking
	nodeCheckerEnabled: true,

	// If true, the code will pause execution if it detects a problem
	breakOnError: false,

	startup: function(){
		this.inherited(arguments);
		var self = this;

		aspect.after(this.store, "query", function(result){
			Deferred.when(result, lang.hitch(self, "checkNodes", "Pre rendering rows"));
			return result;
		});
		aspect.after(this, "renderArray", function(rows){
			Deferred.when(rows, function(){
				// Disable height checks because at this point the loading node has rowCount == 0,
				// but still has a height, which would trigger an error
				self.checkNodes("Post rendering rows", false);

				if (self._processScroll && !self._delLoadingNodeTimeout){
					self._delLoadingNodeTimeout = setTimeout(function(){
						delete self._delLoadingNodeTimeout;
						self.checkNodes("Post deleting loading node");
					}, 0);
				}
			});
			return rows;
		});
		if (this._processScroll){
			aspect.before(this, "_processScroll", lang.hitch(this, "checkNodes", "Pre scroll"));
			aspect.after(this, "_processScroll", lang.hitch(this, "checkNodes", "Post scroll"), true);
		}
	},

	// summary: Checks all of the rows and other nodes.
	//      when: Adds a short description to any errors to help distinguish when/where they occurred
	checkNodes: function(/*String?*/ when, checkNodeHeights){
		if (!this.nodeCheckerEnabled){
			return;
		}
		if (arguments.length < 2){
			checkNodeHeights = this.rowsHaveEqualHeight;
		}
		var rowDelta,
			error = false,
			errorHeader = this.id + ": " + when + " errors:";

		function outputErrorHeader( /* Number? */ rowDelta){
			if (rowDelta != null && has("ie") && rowDelta < 1){
				console.warn("(Probably spurious - difference less than 1 row) " + errorHeader);
			} else if (rowDelta != null && has("ie") == 8 && (when == "Pre scroll" || when == "Post scroll")) {
				console.warn("(Probably spurious - IE8 scrolling) " + errorHeader);
			} else if (rowDelta != null && has("ie")) {
				console.warn("(Possibly spurious - IE height calculation) " + errorHeader);
			} else {
				console.error(errorHeader);
			}

			error = true;
		}

		// Make sure that we haven't accidentally removed our preload
		for (var seenBody = false, node = this.preload && this.preload.node; !seenBody && node; node = node.parentNode){
			seenBody = node.tagName == "BODY";
		}
		if (this.preload && !seenBody){
			outputErrorHeader();
			console.log("Prenode no longer part of document");
		}

		var expectedIdx = 0;
		for (var curr = this.contentNode.firstChild; curr && !error; curr = curr.nextSibling){
			if (curr.rowCount){
				if (curr.rowIndex != null && expectedIdx != curr.rowIndex){
					outputErrorHeader();
					console.log("rowIndex not in sequence: " + curr.rowIndex + " (expecting " + expectedIdx + ") " +
						(curr.id ? "#" + curr.id + " " : "") + curr.className);
					console.log(curr);
				}
				// We're looking for logic errors which are not browser-specific. IE for whatever reason
				// sometimes falls outside our tolerances - if the errors don't happen in FF/Chrome it's
				// probably just IE being silly and we don't have to worry about it (it's not user-perceptible).
				// IE8 likes to give us strange offsetHeights during scrolling - if the are no errors on other
				// browsers or at other times (eg rendering) it's safe to ignore.
				if (checkNodeHeights && (rowDelta = Math.abs(curr.offsetHeight / this.rowHeight - curr.rowCount)) > 0.95){
					outputErrorHeader(rowDelta);
					console.log("Wrong height: " + curr.offsetHeight + " [" + curr.offsetHeight / this.rowHeight + "] (expecting " +
						curr.rowCount * this.rowHeight + " [" + curr.rowCount + "]) " + (curr.id ? "#" + curr.id + " " : "") +
						curr.className);
					console.log(curr);
				}
			}
			// See above comment
			if (checkNodeHeights && curr.rowCount !== 0 && curr.rowIndex != null &&
					(rowDelta = Math.abs(curr.offsetTop / this.rowHeight - curr.rowIndex)) > 0.95){
				outputErrorHeader(rowDelta);
				console.log("Wrong position: " + curr.offsetTop + " [" + curr.offsetTop / this.rowHeight + "] (expecting " +
					curr.rowIndex * this.rowHeight + " [" + curr.rowIndex + "]) " + (curr.id ? "#" + curr.id + " " : "") +
					curr.className);
				console.log(curr);
			}
			if (error && this.breakOnError){
				debugger;
			}
			expectedIdx += curr.rowCount == null ? 1 : curr.rowCount;
		}
	}
});
});