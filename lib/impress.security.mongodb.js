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
				db.impress.sessions.remove({}, function(err, collection) {
					console.log('  impress.'.green+'sessions'.bold.green+' ... deleted'.green);
					db.impress.users.remove({}, function(err, collection) {
						console.log('  impress.'.green+'users'.bold.green+' ... deleted'.green);
						console.log('Creating indexes: '.green)
						db.impress.users.createIndex( { login: 1 }, { unique: true }, function() {
							db.impress.sessions.createIndex( { sid: 1 }, { unique: true }, function() {
								db.impress.indexInformation(function(err, indexes) {
									console.dir({ indexes: indexes });
									console.log('Done!'.bold.green);
									process.exit(0);
								});
							});
						});
					});
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
	impress.security.register = function(req, res, callback) {
		impress.security.getUser(req.post.Email, function(err, user) {
			if (!user) {
				db.impress.users.insert({
					login: req.post.Email,
					password: req.post.Password
				}, function(err, users) {
					var user = users[0];
					if (user) {
						if (impress.sendPassword) impress.sendPassword(req.post.Email);
						impress.startSession(req, res);

						impress.users[user._id] = user;
						impress.sessions[req.impress.session].userId = user._id;
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
		db.impress.users.findOne({ login: login }, function(err, node) {
			if (node) callback(err, impress.security.user(node));
			else callback(err, null);
		});
	}

	// Get user record from database
	//   callback(user)
	// 
	impress.security.getUserById = function(userId, callback) {
		db.impress.users.findOne({ _id: userId }, function(err, node) {
			callback(err, impress.security.user(node));
		});
	}

	// Restore session if available
	//   callback(err, session)
	//
	impress.security.restorePersistentSession = function(sid, callback) {
		db.impress.sessions.findOne({ sid: sid }, function(err, session) {
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
			//var node = global.clone(session);
			var sessionCreated = session.sessionCreated,
				sessionModified = session.sessionModified;
			delete session.sessionCreated;
			delete session.sessionModified;
			session.sid = sid;
			if (sessionCreated) db.impress.sessions.insert(session, function(err) {
				session.sessionCreated = false;
				session.sessionModified = false;
				callback();
			}); else if (sessionModified) db.impress.sessions.update({ sid: sid }, session,  function(err) {
				session.sessionCreated = false;
				session.sessionModified = false;
				callback();
			}); else callback();
		} else callback();
	}

	impress.security.deletePersistentSession = function(sid, callback) {
		if (callback) callback();
	};

} (global.impress = global.impress || {}));