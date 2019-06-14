(client, callback) => {

  application.stateTest = (
    application.stateTest || { counter: 0, addresses: [] }
  );
  application.stateTest.counter++;

  const st = application.stateTest;
  const ip = client.req.connection.remoteAddress;
  if (!st.addresses.includes(ip)) {
    st.addresses.push(ip);
  }
  callback(null, st);

}
