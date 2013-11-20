require('impress');

// Place here other initialization code
impress.init({
	master: function() {
    	// to be executed after Impress master (or single) process initialization
	},
	worker: function() {
    	// to be executed after worker process initialization
	},
	instance: function() {
    	// to be executed after any (master or worker) process instance initialization
	}
});