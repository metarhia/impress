module.exports = function(client, callback) {

	var filePath = client.hostDir+client.path+'/test.txt';
	fs.readFile(filePath, 'utf8', function(error, data) {
		client.context.data = { fileContent: data, dataLength: data.length  };
		callback();
	});

}