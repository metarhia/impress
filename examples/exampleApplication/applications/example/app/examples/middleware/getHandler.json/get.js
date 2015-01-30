module.exports = function(req, res, next) {
  res.write(api.stringify({
    example: 'Middleware handler style',
    url: req.url,
    method: req.method
  }));
  next();
};
