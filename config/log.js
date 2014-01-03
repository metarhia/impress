// Server logs configuration

module.exports = {
	keepDays:      10,      // Delete files after N days
	writeInterval: "3s",    // Flush log to disk interval (milliseconds)
	writeBuffer:   64*1024, // Buffer size 64kb
	fileTypes: [            // List of log files set
		"access",
		"error",
		"debug",
		"slow"
	]
}