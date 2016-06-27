console.log(api.colors.green(api.colors.bold('Impress Security database setup')));

var rl = api.readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Delete stored data and recreate default structures? [y/n]: ', function(answer) {
  rl.close();
  if (answer === 'y') application.security.createDataStructures(function() {});
});
