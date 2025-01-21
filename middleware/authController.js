const jwt = require('jsonwebtoken');
const promisify = require('util').promisify;
const User = require('../src/users/usersModel');
const expressAsyncHandler = require('express-async-handler');
const sendEmail = require('../utils/email');

const signToken = id =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 60 * 1000),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  const token = signToken(user._id);
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;
  res.status(statusCode).json({ status: 'success', token, data: { user } });
};

//Register
exports.signUp = expressAsyncHandler(async (req, res, next) => {
  if (req.body.password !== req.body.passwordConfirm) {
    return res.status(400).json({
      status: 'fail',
      message: 'Passwords do not match',
    });
  }
  const user = await User.create({
    userName: req.body.userName,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createSendToken(user, 201, res);
  // send welcom email
  await sendEmail({
    email: req.body.email,
    subject: 'Welcome to EduHub 👨‍🎓',
    text: `Welcome to EduHub website. Your account has been created with email id :${req.body.email} ❤`,
  });
});
//Login
exports.logIn = expressAsyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide email and password',
    });
  }
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return res.status(401).json({
      status: 'fail',
      message: 'Incorrect email or password',
    });
  }
  createSendToken(user, 200, res);
});
//logout

exports.logout = expressAsyncHandler(async (req, res) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in!',
      });
    }
    // Decode the token without verifying to extract its payload
    const decoded = jwt.decode(token);
    if (!decoded) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid token!',
      });
    }

    // Create a new token with the same payload but an expired time
    const expiredToken = jwt.sign(
      { id: decoded.id },
      process.env.JWT_SECRET,
      { expiresIn: '1s' }, // Immediate expiration
    );

    // Set the expired token in the cookie
    res.cookie('jwt', expiredToken, {
      expires: new Date(Date.now() + 1000), // Cookie expires in 1 second
      httpOnly: true,
      sameSite: 'strict',
    });

    return res.status(200).json({
      status: 'success',
      message: 'You have been logged out!',
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong during logout!',
    });
  }
});

exports.protect = expressAsyncHandler(async (req, res, next) => {
  let token;
  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return res.status(401).json({
      status: 'fail',
      message: 'You are not logged in! Please log in to get access',
    });
  }
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return res.status(401).json({
      status: 'fail',
      message: 'The user belonging to this token does no longer exist',
    });
  }

  req.user = currentUser;
  next();
});

exports.forgotPassword = expressAsyncHandler(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const { email } = req.body.email;
  if (!email) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide your email',
    });
  }
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate otp code to reset password
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  user.resetOtp = otp;
  user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email

  try {
    await sendEmail({
      email: user.email,
      subject: 'Changed password',
      text: `Your code for resetting your password is : ${otp} . \n 
              Use this Code to procced with resetting your password`,
    });
    res.status(200).json({
      status: 'success',
      message: `Your code sent to:${user.email}`,
    });
  } catch (err) {
    user.resetOtp = undefined;
    user.resetOtpExpireAt = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('There was an error sending the email. Try again later!'), 500);
  }
});

exports.resetPassword = expressAsyncHandler(async (req, res, next) => {
  //1)Get user based on otp
  const otp = req.body.otp;

  const user = await User.findOne({
    resetOtp: otp,
    resetOtpExpireAt: { $gt: Date.now() },
  });

  //2)if token has not expired, and ther is user.set the new password
  if (!user) {
    return next(new AppError('Verification code has invalid or has expired', 400));
  }

  //3)Update Password

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.resetOtp = undefined;
  user.resetOtpExpireAt = undefined;

  await user.save();

  //4) login user , send jwt
  createSendToken(user, 200, res);
});

exports.updatePassword = expressAsyncHandler(async (req, res, next) => {
  //1) Get User from collection
  const user = await User.findById(req.params.id).select(`+password`);
  //2) check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError(`Your current password is wrong.`, 401));
  }
  //3) I so,update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4)log user in , send Password
  createSendToken(user, 200, res);
});
