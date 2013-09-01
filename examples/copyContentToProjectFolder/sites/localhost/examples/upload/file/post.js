module.exports = function(req, res, callback) {
	console.dir({files:req.impress.files});
	callback();
}