define(["doh", "require", "./_StoreMixin" ], function(doh, require){
	doh.register("create-destroy", require.toUrl("./create-destroy.html"));
	doh.register("addCssRule", require.toUrl("./addCssRule.html"));
	doh.register("stores", require.toUrl("./stores.html"));
	doh.register("removeRow", require.toUrl("./removeRow.html"));
});
