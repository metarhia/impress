({
  router({ method, args, verb, headers }) {
    const ip = context.client.ip;
    return { method, args, ip, verb, headers };
  },
});
