(function(db) {

	var driver = require('mysql');
	db.drivers.mysql = driver;

	var Introspection = require('./Introspection');

	db.mysql = {};

	// open([{
	//   name: "connectioName",
	//   url: "mongodb://username:password@host1/database",
	//   tables: ['table1', 'table2', ...]
	// },{...more connections...}],
	// function() {
	//   ...callback on all connections established...
	// });
	db.mysql.open = function(connections, callback) {
		var cbCount = connections.length, cbIndex = 0;
		for (var i in connections) {
			var connection = driver.createConnection(connections[i].url);
			connection.on('error', db.mysql.onError);
			db.mysql.upgrade(connection);
			Introspection.init(connection);
			connection.connect();
			db.connections.push(connections[i].name);
			db[connections[i].name] = connection;
			cbIndex++;
			if (cbIndex>=cbCount && callback) callback(null);
		}
	}

	// Writes error messages to log file
	//
	db.mysql.onError = function(err) {
		impress.log.error(JSON.stringify(err));
	}

db.mysql.upgrade = function(connection) {

	// Where clause builder
	//   Example: { id: 5, year: ">2010", price: "100..200", level: "<=3", sn: "*str?", label: "str", code: "(1,2,4,10,11)" }
	//   Returns: "id = 5 AND year > '2010' AND (price BETWEEN '100' AND '200') AND level <= '3' AND sn LIKE '%str_' AND label = 'str' AND code IN (1,2,4,10,11)"
	//
	connection.where = function(where) {
		var dbc = this,
			result = '';
		for (var key in where) {
			var value = where[key],
				clause = key;
			if (typeof(value) === 'number') clause = key+' = '+value;
			else if (typeof(value) === 'string') {
				/**/ if (value.startsWith('>=')) clause = key+' >= '+dbc.escape(value.substring(2));
				else if (value.startsWith('<=')) clause = key+' <= '+dbc.escape(value.substring(2));
				else if (value.startsWith('<>')) clause = key+' <> '+dbc.escape(value.substring(2));
				else if (value.startsWith('>'))  clause = key+' > ' +dbc.escape(value.substring(1));
				else if (value.startsWith('<'))  clause = key+' < ' +dbc.escape(value.substring(1));
				else if (value.startsWith('('))  clause = key+' IN ('+value.substr(1, value.length-2).split(',').map(function(s) { return dbc.escape(parseInt(s)) }).join(',')+')';
				else if (value.indexOf('..') !== -1) {
					value = value.split('..');
					clause = '('+key+' BETWEEN '+dbc.escape(value[0])+' AND '+dbc.escape(value[1])+')';
				} else if ((value.indexOf('*') !== -1) || (value.indexOf('?') !== -1)) {
					value = value.replace('*','%').replace('?','_');
					clause = key+' LIKE '+dbc.escape(value);
				} else clause = key+' = '+dbc.escape(value);
			}
			if (result) result = result+' AND '+clause; else result = clause;
		}
		return result;
	}

	// Record count
	//
	connection.count = function(table, where, callback) {
		var where = this.where(where),
			sql = 'SELECT count(*) FROM ??';
		if (where) sql = sql+' WHERE '+where;
		this.queryValue(sql, [table], function(err, res) {
			callback(err, res);
		});
	}

	// Returns single row as associative array of fields
	//
	connection.queryRow = function(sql, values, callback) {
		this.query(sql, values, function(err, res, fields) {
			if (err) res = false; else res = res[0] ? res[0] : false;
			callback(err, res, fields);
		});
	}

	// Returns single value (scalar)
	//
	connection.queryValue = function(sql, values, callback) {
		this.queryRow(sql, values, function(err, res, fields) {
			if (err) res = false; else res = res[Object.keys(res)[0]];
			callback(err, res, fields);
		});
	}

	// Query returning array of first field values
	//
	connection.queryArray = function(sql, values, callback) {
		this.query(sql, values, function(err, res, fields) {
			var result = [];
			if (err) result = false; else {
				for (var i in res) {
					var row = res[i];
					result.push(row[Object.keys(row)[0]]);
				}
			}
			callback(err, result, fields);
		});
	}

	// Query returning hash (associative array), first field will be array key
	//
	connection.queryHash = function(sql, values, callback) {
		this.query(sql, values, function(err, res, fields) {
			var result = {};
			if (err) result = false; else {
				for (var i in res) {
					var row = res[i];
					result[row[Object.keys(row)[0]]] = row;
				}
			}
			callback(err, result, fields);
		});
	}

	// Query returning key-value array, first field of query will be key and second will be value
	//
	connection.queryKeyValue = function(sql, values, callback) {
		this.query(sql, values, function(err, res, fields) {
			var result = {};
			if (err) result = false; else {
				for (var i in res) {
					var row = res[i];
					result[row[Object.keys(row)[0]]] = row[Object.keys(row)[1]];
				}
			}
			callback(err, result, fields);
		});
	
	}

	// SELECT SQL statement generator
	//
	connection.select = function(table, fields, where, callback) {
		var where = this.where(where);
		this.query('SELECT '+fields+' FROM ?? WHERE '+where, [table], function(err, res) {
			callback(err, res);
		});
	}
	
	// INSERT SQL statement generator
	//   callback(err, id or false)
	//
	connection.insert = function(table, row, callback) {
		var dbc = this;
		dbc.fields(table, function(err, fields) {
			if (!err) {
				fields = Object.keys(fields);
				var rowKeys = Object.keys(row),
					values = [],
					columns = [];
				for (var i in fields) {
					var field = fields[i];
					if (rowKeys.indexOf(field)!=-1) {
						columns.push(field);
						values.push(dbc.escape(row[field]));
					}
				}
				values = values.join(', ');
				columns = columns.join(', ');
				dbc.query('INSERT INTO ?? ('+columns+') VALUES ('+values+')', [table], function(err, res) {
					callback(err, res ? res.insertId : false);
				});
			} else callback(new Error('Error: Table "'+table+'" not found'), false);
		});
	}

	// UPDATE SQL statement generator
	//
	connection.update = function(table, row, callback) {
		var dbc = this;
		dbc.fields(table, function(err, fields) {
			if (!err) {
				var where = '',
					data = [],
					rowKeys = Object.keys(row);
				for (var i in fields) {
					var field = fields[i],
						fieldName = field['Field'];
					if (rowKeys.indexOf(fieldName)!=-1) {
						if (!where && (field['Key']=='PRI' || field['Key']=='UNI')) where = fieldName+'='+dbc.escape(row[fieldName]);
						data.push(fieldName+'='+dbc.escape(row[fieldName]));
					}
				}
				if (where) {
					data = data.join(', ');
					dbc.query('UPDATE ?? SET '+data+' WHERE '+where, [table], function(err, res) {
						callback(err, res ? res.changedRows : false);
					});
				} else callback(new Error('Error: can not insert into "'+table+'" because there is no primary or unique key specified'), false);
			} else callback(new Error('Error: Table "'+table+'" not found'), false);
		});
	}

	// INSERT OR UPDATE SQL statement generator
	//
	connection.upsert = function(table, row, callback) {
		var dbc = this;
		dbc.fields(table, function(err, fields) {
			if (!err) {
				var rowKeys = Object.keys(row),
					uniqueKey = '';
				for (var i in fields) {
					var field = fields[i],
						fieldName = field['Field'];
					if (!uniqueKey && (field['Key']=='PRI' || field['Key']=='UNI') && rowKeys.indexOf(fieldName)!=-1) uniqueKey = fieldName;
				}
				if (rowKeys.indexOf(uniqueKey)!=-1) {
					dbc.queryValue('SELECT count(*) FROM ?? WHERE '+uniqueKey+'='+dbc.escape(row[uniqueKey]), [table], function(err, count) {
						if (count==1) dbc.update(table, row, callback);
						else dbc.insert(table, row, callback);
					});
				} else callback(new Error('Error: can not insert of update table "'+table+'", primary or unique key is not specified'), false);
			} else callback(new Error('Error: Table "'+table+'" not found'), false);
		});
	}

	// DELETE SQL statement generator
	//   callback(err, rowCount or false)
	//
	connection.delete = function(table, where, callback) {
		var where = this.where(where);
		if (where) this.query('DELETE FROM ?? WHERE '+where, [table], function(err, res) {
			callback(err, res ? res.affectedRows : false);
		}); else callback(new Error('Error: can not delete from "'+table+'", because "where" parameter is empty'), false);
	}

}

} (global.db = global.db || {}));