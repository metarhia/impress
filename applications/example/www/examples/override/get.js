(client, callback) => {
  console.debug('/over before inherited');
  client.inherited(() => {
    console.debug('/over after inherited');
    callback();
  });
}
