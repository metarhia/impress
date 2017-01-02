(client, callback) => {
  application.leak = application.leak || [];
  const n = 1024 * Math.round(1024);
  application.leak.push(
    new Array(n).join('Hello node.js, Hello Impress Application Server ')
  );
  callback({ memory: process.memoryUsage() });
}
