(client, callback) => {
  console.log('/over before inherited');
  client.inherited(() => {
    console.log('/over after inherited');
    callback();
  });
}
