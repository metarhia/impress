module.exports = function(req, res, next) {
  res.write(JSON.stringify({
    example: 'Middleware handler style',
    url: req.url,
    method: req.method
  }));
  next();
};
