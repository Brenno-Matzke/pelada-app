// Express 4 doesn't forward a rejected promise from an async handler to
// the error middleware on its own — wrap so a thrown/rejected error
// reaches `next(err)` instead of hanging the request.
module.exports = function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
