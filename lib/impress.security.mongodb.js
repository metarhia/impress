"use strict";

(function(impress) {

	impress.security.user = impress.security.user.override(function(user) {
		user = this.inherited(user);
		user.userId = user._id;
		delete user._id;
		return user;
	});

	// 
	impress.security.hasDb = function(application) {
		var result = application.databases && application.databases.security;
		if (!result) console.log('No securiy database configured');
		return result;
	};

	impress.security.createDataStructures = function(application, callback) {
		console.log('Impress'.bold.green+' installing initial data structures to MongoDB...'.green);
		var rl = impress.readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});
		if (impress.security.hasDb(application)) {
			rl.question("Delete stored sessions and users if any? [y/n]: ", function(answer) {
				rl.close();
				if (answer == 'y') {
					var steps = [
						function(callback) {
							application.databases.security.sessions.remove({}, function(err, collection) {
								console.log('  impress.'.green+'sessions'.bold.green+' ... deleted'.green);
								callback();
							});
						},
						function(callback) {
							application.databases.security.users.remove({}, function(err, collection) {
								console.log('  impress.'.green+'users'.bold.green+' ... deleted'.green);
								callback();
							});
						},
						function(callback) {
							application.databases.security.groups.remove({}, function(err, collection) {
								console.log('  impress.'.green+'groups'.bold.green+' ... deleted'.green);
								console.log('Creating indexes: '.green);
								callback();
							});
						},
						function(callback) {
							application.databases.security.users.createIndex( { login: 1 }, { unique: true }, callback);
						},
						function(callback) {
							application.databases.security.sessions.createIndex( { sid: 1 }, { unique: true }, callback);
						},
						function(callback) {
							application.databases.security.groups.createIndex( { name: 1 }, { unique: true }, callback);
						},
						function(callback) {
							application.databases.security.indexInformation(function(err, indexes) {
								console.dir({ indexes: indexes });
								callback();
							});
						},
						function(callback) {
							application.databases.security.groups.insert([ { name: "users" }, { name: "admins" }, { name: "employees" } ], callback);
						}
					];
					impress.async.series(steps, function(err, results) {
						console.log('Done!'.bold.green);
					});
				} else console.log('Bye!'.green);
			});
		}
	};

	impress.security.dropDataStructures = function(application, callback) {
		if (callback) callback();
	};

	impress.security.emptyDataStructures = function(application, callback) {
		if (callback) callback();
	};

	// Register user, return true/false
	//   http post should contain "Email" and "Password" fields
	//   callback(err, user)
	//
	impress.security.register = function(client, callback) {
		impress.security.getUser(client, client.fields.Email, function(err, user) {
			if (!user) {
				if (impress.security.hasDb(client.application)) {
					client.application.databases.security.users.insert({
						login: client.fields.Email,
						password: client.fields.Password,
						group: "users"
					}, function(err, users) {
						var user = users[0];
						if (user) {
							// if (impress.sendPassword) impress.sendPassword(client.filds.Email);
							client.startSession();
							client.application.users[user._id] = user;
							client.application.sessions[client.session].userId = user._id;
						}
						if (callback) callback(null, user);
					});
				} else callback();
			} else if (callback) callback(new Error("Email already registered"), user);
		});
	};

	// Get user record from database
	//   callback(user)
	// 
	impress.security.getUser = function(client, login, callback) {
		if (impress.security.hasDb(client.application)) {
			client.application.databases.security.users.findOne({ login: login }, function(err, node) {
				if (node) callback(err, impress.security.user(node));
				else callback(err, null);
			});
		} else callback();
	};

	// Get user record from database
	//   callback(user)
	// 
	impress.security.getUserById = function(client, userId, callback) {
		if (impress.security.hasDb(client.application)) {
			client.application.databases.security.users.findOne({ _id: userId }, function(err, node) {
				callback(err, impress.security.user(node));
			});
		} else callback();
	};

	// Restore session if available
	//   callback(err, session)
	//
	impress.security.restorePersistentSession = function(client, sid, callback) {
		if (impress.security.hasDb(client.application)) {
			client.application.databases.security.sessions.findOne({ sid: sid }, function(err, session) {
				if (session) {
					var userId = session.userId;
					delete session._id;
					client.application.sessions[sid] = session;
					if (userId) {
						if (client.application.users[userId]) {
							client.application.users[userId].sessions.push(sid);
							callback(null, session);
						} else {
							impress.security.getUserById(client, userId, function(err, node) {
								if (node) {
									var user = impress.security.user(node);
									user.sessions.push(sid);
									client.application.users[userId] = user;
								} else {
									delete client.application.sessions[sid].userId;
									client.application.sessions[sid].sessionModified = true;
								}
								callback(null, session);
							});
						}
					} else callback(null, session);
				} else callback(new Error("Session not found"));
			});
		} else callback(new Error("No database for security subsystem found"));
	};

	impress.security.savePersistentSession = function(client, sid, callback) {
		if (impress.security.hasDb(client.application)) {
			var session = client.application.sessions[sid];
			if (session) {
				var sessionCreated = session.sessionCreated,
					sessionModified = session.sessionModified;
				delete session.sessionCreated;
				delete session.sessionModified;
				session.sid = sid;
				if (sessionCreated) client.application.databases.security.sessions.insert(session, function(err) {
					session.sessionCreated = false;
					session.sessionModified = false;
					callback();
				}); else if (sessionModified) client.application.databases.security.sessions.update({ sid: sid }, session,  function(err) {
					session.sessionCreated = false;
					session.sessionModified = false;
					callback();
				}); else callback();
			} else callback();
		} else callback();
	};

	impress.security.deletePersistentSession = function(client, sid, callback) {
		if (impress.security.hasDb(client.application)) {
			client.application.databases.security.sessions.remove({ sid: sid }, true, function(err) {
				if (callback) callback();
			});
		} else callback();
	};

} (global.impress = global.impress || {}));