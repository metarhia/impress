(function(db) {

	db.schema.mysql = {};
	
	var crlf = "\r\n",
		cmnt = "-- "
		line = cmnt+Array(50).join("-")+crlf;

	var fieldTypes = {
		id:       { type: "bigint", signed: false, nullable: false },
		tree:     { type: "bigint", signed: false, nullable: true },
		uid:      { type: "bigint", signed: false },
		guid:     { type: "binary", size: 16, signed: false },
		ip:       { type: "int", signed: false },
		hash:     { type: "binary", size: 32, signed: false },
		int:      { type: "int",    size: 10 },
		float:    { type: "double" },
		str:      { type: "varchar" },
		char:     { type: "char" },
		date:     { type: "date" },
		time:     { type: "time" },
		datetime: { type: "timestamp" },
		money:    { type: "decimal", size: "10,2" },
		bool:     { type: "bool" },
		text:     { type: "text" },
	};

	// Generate relational database schema for MySQL
	//
	db.schema.mysql.generateScript = function(databaseSchema, consoleOutput) {
		var validationResult = db.schema.validate(databaseSchema, consoleOutput),
			sqlScript = line+cmnt+databaseSchema.caption+crlf+cmnt+'Version: '+databaseSchema.version+crlf+line+crlf;
		if (consoleOutput) console.log('Schema validation: '+(validationResult.valid ? "OK".green : "Error".red));
		if (validationResult.valid) {
			for (var tableName in databaseSchema) {
				if (tableName != 'caption' && tableName != 'version') {
					var table = databaseSchema[tableName],
						fieldsDef = '',
						fieldNameMaxLength = 0,
						primaryKey = [],
						primaryFieldDef = '',
						fieldIndex = 1,
						indexes = [];
					sqlScript += "CREATE TABLE "+tableName+" ("+crlf;
					for (fieldName in table.fields) fieldNameMaxLength = Math.max(fieldNameMaxLength, fieldName.length);
					for (fieldName in table.fields) {
						var field = table.fields[fieldName],
							fieldDef = '',
							fieldType = fieldTypes[field.type];
						for (var fieldAttribute in fieldType) if (!(fieldAttribute in field)) field[fieldAttribute] = fieldType[fieldAttribute];
						fieldDef = fieldType.type;
						if ("size" in field) fieldDef += "("+field.size+")";
						fieldDef += " ";
						if (("signed" in field) && !field.signed) fieldDef += "unsigned ";
						if (("nullable" in field) && !field.nullable) fieldDef += "NOT NULL ";
						if (field.default) fieldDef += 'DEFAULT "'+field.default+'" ';
						if (field.comment) fieldDef += 'COMMENT "'+field.comment+'" ';
						if (fieldDef.length>0) fieldDef = fieldDef.slice(0, -1);
						if (field.primary || (fieldIndex == 1 && inArray(["id", "uid"], field.type))) primaryKey.push(fieldName);
						if (field.index) {
							if (field.index.unique) indexes.push('CREATE UNIQUE INDEX ak'+tableName+fieldName+' ON '+tableName+' ('+fieldName+');');
							else indexes.push('CREATE INDEX idx'+tableName+fieldName+' ON '+tableName+' ('+fieldName+');');
						}
							
						/*
						primary
						lookup:     "{lookup}",
						link:       "{link}",
						master:     "{master}",
						validation: "{validation}",
						index:      "{index}"
						*/
						fieldsDef += "  "+fieldName.rpad(' ', fieldNameMaxLength+1)+" "+fieldDef+","+crlf;
						if (fieldIndex == 1) primaryFieldDef = fieldDef;
						fieldIndex++;
					}
					if (fieldsDef.length>3) fieldsDef = fieldsDef.slice(0, -3)+crlf;
					sqlScript += fieldsDef+");"+crlf+crlf;
					if (table.comment) sqlScript += 'ALTER TABLE '+tableName+' COMMENT = "'+table.comment+'";'+crlf+crlf;
					if (primaryKey.length>0) sqlScript += 'ALTER TABLE '+tableName+' ADD CONSTRAINT pk'+tableName+' PRIMARY KEY ('+primaryKey.join(', ')+');'+crlf;
					if (primaryKey.length==1) sqlScript += 'ALTER TABLE '+tableName+' CHANGE '+primaryKey[0]+' '+primaryKey[0]+' '+primaryFieldDef+' auto_increment;'+crlf+crlf;

					// ALTER TABLE _Server ADD CONSTRAINT fkServerParent FOREIGN KEY (ParentServerId) REFERENCES _Server (ServerId) ON DELETE RESTRICT;

					if (indexes.length>0) sqlScript += indexes.join(crlf)+crlf+crlf;
				}
			}
		} else {
			console.log('Errors:');
			console.dir(validationResult.errors);
		}
		return sqlScript;
	}

} (global.db = global.db || {}));