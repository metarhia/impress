(function(impress) {

	impress.security.user = impress.security.user.override(function(user) {
		user = this.inherited(user);
		user.userId = user._id;
		delete user._id;
		return user;
	});

	impress.security.createDataStructures = function(callback) {
		console.log('Impress'.bold.green+' installing initial data structures to MongoDB...'.green);
		var rl = impress.readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});
		rl.question("Delete stored sessions and users if any? [y/n]: ", function(answer) {
			rl.close();
			if (answer == 'y') {
				var steps = [
					function(callback) {
						impress.security.db.sessions.remove({}, function(err, collection) {
							console.log('  impress.'.green+'sessions'.bold.green+' ... deleted'.green);
							callback();
						});
					},
					function(callback) {
						impress.security.db.users.remove({}, function(err, collection) {
							console.log('  impress.'.green+'users'.bold.green+' ... deleted'.green);
							callback();
						});
					},
					function(callback) {
						impress.security.db.groups.remove({}, function(err, collection) {
							console.log('  impress.'.green+'groups'.bold.green+' ... deleted'.green);
							console.log('Creating indexes: '.green)
							callback();
						});
					},
					function(callback) {
						impress.security.db.users.createIndex( { login: 1 }, { unique: true }, callback);
					},
					function(callback) {
						impress.security.db.sessions.createIndex( { sid: 1 }, { unique: true }, callback);
					},
					function(callback) {
						impress.security.db.groups.createIndex( { name: 1 }, { unique: true }, callback);
					},
					function(callback) {
						impress.security.db.indexInformation(function(err, indexes) {
							console.dir({ indexes: indexes });
							callback();
						});
					},
					function(callback) {
						impress.security.db.groups.insert([ { name: "users" }, { name: "admins" }, { name: "employees" } ], callback);
					}
				];
				impress.async.series(steps, function(err, results) {
					console.log('Done!'.bold.green);
					process.exit(0);
				});
			} else {
				console.log('Bye!'.green);
				process.exit(0);
			}
		});
	}

	impress.security.dropDataStructures = function(callback) {
		if (callback) callback();
	}

	impress.security.emptyDataStructures = function(callback) {
		if (callback) callback();
	}

	// Register user, return true/false
	//   http post should contain "Email" and "Password" fields
	//   callback(err, user)
	//
	impress.security.register = function(client, callback) {
		impress.security.getUser(client.fields.Email, function(err, user) {
			if (!user) {
				impress.security.db.users.insert({
					login: client.fields.Email,
					password: client.fields.Password,
					group: "users"
				}, function(err, users) {
					var user = users[0];
					if (user) {
						if (impress.sendPassword) impress.sendPassword(client.req.filds.Email);
						client.startSession();

						impress.users[user._id] = user;
						impress.sessions[client.session].userId = user._id;
					}
					if (callback) callback(null, user);
				});
			} else if (callback) callback(new Error("Email already registered"), user);
		});
	}

	// Get user record from database
	//   callback(user)
	// 
	impress.security.getUser = function(login, callback) {
		impress.security.db.users.findOne({ login: login }, function(err, node) {
			if (node) callback(err, impress.security.user(node));
			else callback(err, null);
		});
	}

	// Get user record from database
	//   callback(user)
	// 
	impress.security.getUserById = function(userId, callback) {
		impress.security.db.users.findOne({ _id: userId }, function(err, node) {
			callback(err, impress.security.user(node));
		});
	}

	// Restore session if available
	//   callback(err, session)
	//
	impress.security.restorePersistentSession = function(sid, callback) {
		impress.security.db.sessions.findOne({ sid: sid }, function(err, session) {
			if (session) {
				var userId = session.userId;
				delete session._id;
				impress.sessions[sid] = session;
				if (userId) {
					if (impress.users[userId]) {
						impress.users[userId].sessions.push(sid);
						callback(null, session);
					} else {
						impress.security.getUserById(userId, function(err, node) {
							if (node) {
								var user = impress.security.user(node);
								user.sessions.push(sid);
								impress.users[userId] = user;
							} else {
								delete impress.sessions[sid].userId;
								impress.sessions[sid].sessionModified = true;
							}
							callback(null, session);
						});
					}
				} else callback(null, session);
			} else callback(new Error("Session not found"));
		});
	}

	impress.security.savePersistentSession = function(sid, callback) {
		var session = impress.sessions[sid];
		if (session) {
			var sessionCreated = session.sessionCreated,
				sessionModified = session.sessionModified;
			delete session.sessionCreated;
			delete session.sessionModified;
			session.sid = sid;
			if (sessionCreated) impress.security.db.sessions.insert(session, function(err) {
				session.sessionCreated = false;
				session.sessionModified = false;
				callback();
			}); else if (sessionModified) impress.security.db.sessions.update({ sid: sid }, session,  function(err) {
				session.sessionCreated = false;
				session.sessionModified = false;
				callback();
			}); else callback();
		} else callback();
	}

	impress.security.deletePersistentSession = function(sid, callback) {
		impress.security.db.sessions.remove({ sid: sid }, true, function(err) {
			if (callback) callback();
		});
	};

} (global.impress = global.impress || {}));