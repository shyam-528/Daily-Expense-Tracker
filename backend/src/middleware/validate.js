// express-validator result helper -> uniform 422 responses.
const { validationResult } = require('express-validator');
const { HttpError } = require('./errors');

function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError(
        422,
        'Validation failed',
        errors.array().map((e) => ({ field: e.path, message: e.msg }))
      )
    );
  }
  next();
}

module.exports = validate;
