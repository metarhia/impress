module.exports = function(client, callback) {

	var filePath = client.hostDir+client.path+'/test.txt';
	fs.readFile(filePath, 'utf8', function(error, data) {
		callback({ fileContent: data, dataLength: data.length });
	});

}