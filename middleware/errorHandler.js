const AppError = require('../utils/appError');

const handelCastErrorDB = err => {
  const message = `Invalid ${err.path}:${err.value}.`;
  return new AppError(message, 400);
};

const handelDuplicateFailedsDB = err => {
  const value = err.errorResponse.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/);
  const duplicateValue = value ? value[0] : 'unknown';
  const message = `Duplicate field value : ${duplicateValue} , please use another value!`;
  return new AppError(message, 400);
};

const handelValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handelJWTError = err => {
  const message = `Invalid Token. Please log in again `;
  return new AppError(message, 401);
};

const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, res) => {
  // if (err.name == 'CastError') err = handelCastErrorDB(err);
  // if (err.code == 11000) err = handelDuplicateFailedsDB(err);
  if (err.name == 'ValidationError') err = handelValidationErrorDB(err);
  if (err.name == 'JsonWebTokenError') err = handelJWTError(err);
  if (err.name === 'TokenExpiredError') err = handleJWTExpiredError();

  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    // stack: err.stack,
  });
};

const sendErrorPro = (err, res) => {
  //opertional, trusted error: send message to client
  if (err.isOPertional) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
    // programming or other unknown error : don't leak error details
  } else {
    console.log(`Error 💥`, err);

    res.status(500).json({
      status: 'error',
      message: 'Somthing went very wrong',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV == 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV == 'production') {
    sendErrorPro(err, res);
  }
  next();
};
