(client, callback) => {
  res.write(JSON.stringify({
    example: 'Middleware handler style',
    url: req.url,
    method: req.method
  }));
  next();
}