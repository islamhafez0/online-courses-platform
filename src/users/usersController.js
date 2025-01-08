const User = require('./usersModel');
const expressAsyncHandler = require('express-async-handler');
const AppError = require('../../utils/appError');
const Course = require('../courses/courseModel');

exports.getAllUsers = expressAsyncHandler(async (req, res, next) => {
  const users = await User.find();
  if (!users || users.length === 0) {
    return next(new AppError('No users found', 404));
  }
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

exports.getUser = expressAsyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    return next(new AppError(`User not found with id: ${id}`, 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.updateUser = expressAsyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  const user = await User.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new AppError(`User not found with id: ${id}`, 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// Delete User
exports.deleteUser = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return next(new AppError(`User not found with id: ${req.params.id}`, 404));
  }
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getCoursesForUser = expressAsyncHandler(async (req, res, next) => {
  const  {userId}  = req.params;

  if (!userId) {
    return res.status(400).json({
      status: 'fail',
      message: 'User ID is required',
    });
  }

  const courses = await Course.find({ enrolledStudents: userId })
    .select('title description duration level language price')
    .populate('instructor', 'name email'); 

  if (courses.length === 0) {
    return res.status(404).json({
      status: 'fail',
      message: 'No courses found for this user',
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      userId,
      courses,
    },
  });
});