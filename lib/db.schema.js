(function(db) {

	var templates = {

		schema: {
			caption: "string",
			version: "number",
			_other: "{table}"
		},
		
		table: {
			caption:          "string",
			captions:         "object",
			comment:          "string",
			type:             [ "system", "dictionary", "data", "crossreference", "view", "query", "log", "unknown", "set" ],
			multilanguage:    "boolean",
			fields:           "{{field}}",
			compositeIndexes: "{{compositeIndex}}",
			server:           "object",
			client:           "object"
		},

		field: {
			caption:    "string",
			captions:   "object",
			comment:    "string",
			type:       [ "id", "tree", "uid", "guid", "ip", "hash", "int", "float", "str", "char", "date", "time", "datetime", "money", "bool", "text" ],
			size:       "number",
			signed:     "boolean",
			subtype:    [ "html", "uri", "json", "checks", "radios" ],
			nullable:   "boolean",
			hidden:     "boolean",
			readOnly:   "boolean",
			default:    "string",
			defaults:   "object",
			example:    "string",
			examples:   "object",
			primary:    "boolean",
			control:    [ "combobox", "combobox", "autocomplete" ],
			dynamic:    "boolean",
			transform:  [ "upper", "lower", "title", "capitalize", "normal" ],
			lookup:     "{lookup}",
			link:       "{link}",
			master:     "{master}",
			validation: "{validation}",
			index:      "{index}"
		},

		lookup: {
			type:       [ "table", "list", "dictionary", "tag" ],
			dataset:    "string",
			distinct:   "boolean",
			sort:       "boolean",
			key:        "string",
			result:     "string",
			list:       "object",
			dictionary: "object"
		},

		link: {
			dataset: "string",
			key:     "string"
		},

		master: {
			dataset:  "string",
			key:      "string",
			deletion: [ "cascade", "restrict" ]
		},

		validation: {
			continuous: "boolean",
			unique:     "boolean",
			length:     "string",
			value:      "string",
			regEx:      "string",
			message:    "string",
			messages:   "object",
			server:     "object",
			client:     "object"
		},

		index: {
			primary: "boolean",
			unique:  "boolean",
			validationMessage:  "",
			validationMessages: "object",
		},

		compositeIndex: {
			fields: "array",
			unique: "boolean",
			validationMessage:  "string",
			validationMessages: "object",
		}

	};

	db.schema = {};

	// Check relational database schema keywords validity
	//
	db.schema.check = function(databaseSchema, template, path) {
		if (!template) template = 'schema';
		var tpl = templates[template];
		if (!path) path = '';
		var isValid = true;
		for (var key in databaseSchema) {
			var item = databaseSchema[key],
				itemTemplate = tpl[key],
				itemType = typeof(item),
				isItemValid = false,
				itemPath = path+'.'+key;
			if (!itemTemplate) itemTemplate = tpl['_other'];
			if (itemTemplate) {
				if (Array.isArray(itemTemplate)) isItemValid = inArray(itemTemplate, item);
				else if (typeof(itemTemplate) == 'string') {
					if (itemTemplate=='array') isItemValid = Array.isArray(item);
					else {
						itemTemplate = itemTemplate.replace(/}/g,'').split('{');
						/**/ if (itemTemplate.length == 1) isItemValid = (itemType == itemTemplate[0]);
						else if (itemTemplate.length == 2) isItemValid = db.schema.check(item, itemTemplate[1], itemPath);
						else if (itemTemplate.length == 3) {
							for (var hashKey in item) {
								var hashItem = item[hashKey];
								itemPath = path+'.'+key+'.'+hashKey;
								isItemValid = db.schema.check(hashItem, itemTemplate[2], itemPath);
								console.log('Check '+itemPath+': '+(isItemValid ? "valid".green : "error".red));
								isValid = isValid && isItemValid;
							}
							itemPath = null;
						}
					}
				}
			}
			if (itemPath) {
				console.log('Check '+itemPath+': '+(isItemValid ? "valid".green : "error".red));
				isValid = isValid && isItemValid;
			}
		}
		return isValid;
	}

} (global.db = global.db || {}));