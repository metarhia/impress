module.exports = {
	name:       "C1",
	cookie:     "node",
	strategy:   "single",
	workers:    os.cpus().length-1,
	nagle:      false,
	gcInterval: 0,
}