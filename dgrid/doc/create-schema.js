define([], function(){
var create;
return create = {
	Object: function(description, properties){
		var schema = {
			description: description,
			properties: {},
			methods: {},
			type: "object",
			events: function(events){
				for(var i in events){
					schema.events[i] = events[i];
				}
			}
		};
		for(var i in properties){
			if(properties[i].type == "function"){
				schema.methods[i] = properties[i];
			}else{
				schema.properties[i] = properties[i];
			}
		}	
		return schema;
	},
	Hash: function(description, additionalProperties){
		return {
			description: description,
			additionalProperties: additionalProperties
		};
	},
	Method: function(description, args, returns){
		var schema = {
			type: "function",
			description: description,
			returns: returns
		};
		var parameters = schema.parameters = [];
		for(var i in args){
			var arg = args[i];
			arg.name = i;
			parameters.push(arg);
		}
		return schema;
	},
	Constructor: function(extend, description, instances){
		if(typeof extend == "string"){
			var args = description;
			description = extend;
			extend = null;
		}
		var schema = create.Object(description, instances);
		schema.constructor = true;
		schema.type = "function";
		schema.parameters = args;
		if(extend){
			schema["extends"] = extend;
		}
		schema.toString = function(){
			return this.name;
		}
		return schema;
	},
	String: function(description, defaultValue){
		return {
			type: "string",
			"default": defaultValue,
			description: description
		};
	},
	Number: function(description, defaultValue){
		return {
			type: "number",
			"default": defaultValue,
			description: description
		};
	},
	Boolean: function(description, defaultValue){
		return {
			type: "boolean",
			"default": defaultValue,
			description: description
		};
	},
	Array: function(description, items){
		return {
			type: "array",
			description: description,
			items: items
		};
	},
	Union: function(types, description, items){
		return {
			type: types,
			description: description
		};
	}
};	
});