define(['./List', './Grid', './OnDemandList', './OnDemandGrid', './Editor', './Tree', './Selection', './Keyboard'], 
function(List, Grid, OnDemandList, OnDemandGrid, Editor, Tree, Selection, Keyboard){
	return {
		description: "The d-list package provides modules for data-drive lists and grids",
		modules: {
			List: List,
			Grid: Grid,
			OnDemandList: OnDemandList,
			OnDemandGrid: OnDemandGrid,
			Editor: Editor,
			Tree: Tree,
			Selection: Selection,
			Keyboard: Keyboard
		}
	};});