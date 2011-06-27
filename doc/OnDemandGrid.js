define(["./create-schema", "./OnDemandList", "./Grid"], 
function(create, OnDemandList, Grid){
	with(create){
	return Constructor([OnDemandList, Grid], 
		"The OnDemandGrid module combines the store-driven virtual capabilities of the OnDemandList with the tabular data view of the Grid");
	}
});