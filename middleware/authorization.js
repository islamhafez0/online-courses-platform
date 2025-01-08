const { default: mongoose } = require('mongoose');
const Course= require('../src/courses/courseModel');
const Discussion = require('../src/disuccsion/discussionModel');
const AppError = require('../utils/appError');
const Quiz = require('../src/quiz/quizModel');

exports.authCourses = async (req, res, next) => {
  const user = req.user;
  const { courseId } = req.params;
  console.log(req.user);
  if (!user) {
    return next(new AppError('User authentication failed', 401));
  }

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    return next(new AppError('Valid courseId must be provided', 400));
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  if (user.role === 'admin' || (user.role === 'instructor' && course.instructor.equals(user._id))) {
    req.course = course; // Attach course to the request for further use
    return next();
  }

  return next(new AppError('You do not have permission to perform this action', 403));
};
exports.authLessons = async (req, res, next) => {
  const user = req.user;

  const { courseId } = req.params;

  if (!user) {
    return next(new AppError('User authentication failed', 401));
  }

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    return next(new AppError('Valid courseId must be provided', 400));
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check if the user is an admin, the instructor of the course, or an enrolled student
  if (
    user.role === 'admin' ||
    (user.role === 'instructor' && course.instructor.equals(user._id)) ||
    (user.role === 'student' && course.enrolledStudents.includes(user._id))
  ) {
    return next();
  }

  return next(new AppError('You do not have permission to access lessons for this course', 403));
};
exports.authDiscussion = async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next(new AppError('User authentication failed', 401));
  }

  const { lessonId } = req.params;

  if (!lessonId) {
    return next(new AppError('Lesson ID is required', 400));
  }

  // Find the course that contains the lesson
  const course = await Course.findOne({ 'modules.lessons._id': lessonId });

  if (!course) {
    return next(new AppError('Course or Lesson not found', 404));
  }

  // Check permissions based on role and enrollment
  if (
    user.role === 'admin' ||
    (user.role === 'instructor' && course.instructor.equals(user._id)) ||
    (user.role === 'student' && course.enrolledStudents.includes(user._id))
  ) {
    return next(); // User is authorized to post a discussion
  }

  return next(new AppError('You do not have permission to perform this action', 403));
};
exports.authReplyOrLike = async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next(new AppError('User authentication failed', 401));
  }

  const { discussionId } = req.params;

  if (!discussionId) {
    return next(new AppError('Discussion ID is required', 400));
  }

  // Validate discussion ID format
  if (!mongoose.Types.ObjectId.isValid(discussionId)) {
    return next(new AppError('Invalid discussion ID format', 400));
  }

  // Find the discussion and its related course
  const discussion = await Discussion.findById(discussionId);

  if (!discussion) {
    return next(new AppError('Discussion not found', 404));
  }

  const course = await Course.findOne({
    'modules.lessons.disucssion': discussionId,
  });

  if (!course) {
    return next(new AppError('Course or Lesson related to the discussion not found', 404));
  }

  // Check permissions based on role and enrollment
  if (
    user.role === 'admin' ||
    (user.role === 'instructor' && course.instructor.equals(user._id)) ||
    (user.role === 'student' && course.enrolledStudents.includes(user._id))
  ) {
    return next(); // User is authorized to reply to the discussion
  }

  return next(new AppError('You do not have permission to interact with this discussion', 403));
};
exports.authCreateQuiz = async (req, res, next) => {
  const user = req.user;
  if (!user) {
    return next(new AppError('User authentication failed', 401));
  }

  const { courseId, moduleId } = req.params;
  if (!moduleId && !courseId) {
    return next(new AppError('Quiz must belong to a either a course or a module', 400));
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('This course not found', 400));
  }

  if (moduleId) {
    const module = await course.modules.id(moduleId);
    if (!module) {
      return next(new AppError('This module not found into this course', 400));
    }
  }

  if (user.role === 'admin' || (user.role === 'instructor' && course.instructor.equals(user._id))) {
    return next(); // User is authorized to post a discussion
  }
  return next(new AppError('You do not have permission to perform this action', 403));
};
exports.authUpdateAndDeleteQuiz = async (req, res, next) => {
  const user = req.user;
  if (!user) {
    return next(new AppError('User authentication failed', 401));
  }
  const { quizId } = req.params;

  if (!quizId) {
    return next(new AppError('Quiz must provide', 400));
  }

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    return next(new AppError('Quiz dont find', 400));
  }

  const course = await Course.findById(quiz.course);
  if (!course) {
    return next(new AppError('Quiz does not belong to any course', 400));
  }

  if (user.role === 'admin' || (user.role === 'instructor' && course.instructor.equals(user._id))) {
    return next(); // User is authorized to post a discussion
  }

  return next(new AppError('You do not have permission to perform this action', 403));
};
exports.authGetAllQuiz = async (req, res, next) => {
  const user = req.user;
  if (!user) {
    return next(new AppError('User authentication failed', 401));
  }
  const { courseId, moduleId } = req.query;

  if (!moduleId && !courseId) {
    return next(new AppError('Quiz must belong to either  a course or a module', 400));
  }

  if (courseId && moduleId) {
    const course = await Course.findById(courseId);
    if (!course) {
      return next(new AppError('course not fonnd', 400));
    }

    const coursem = await Course.findOne({ 'modules._id': moduleId });
    if (!coursem) {
      return next(new AppError('module dont find into a course', 400));
    }

    if (
      user.role === 'admin' ||
      (user.role === 'instructor' && course.instructor.equals(user._id)) ||
      (user.role === 'student' && course.enrolledStudents.includes(user._id))
    ) {
      return next(); // User is authorized to post a discussion
    }
  } else if (courseId) {
    const course = await Course.findById(courseId);
    if (!course) {
      return next(new AppError('course dont find', 400));
    }
    if (
      user.role === 'admin' ||
      (user.role === 'instructor' && course.instructor.equals(user._id)) ||
      (user.role === 'student' && course.enrolledStudents.includes(user._id))
    ) {
      return next(); // User is authorized to post a discussion
    }
  }
  return next(new AppError('You do not have permission to perform this action', 403));
};
exports.authGetAndSubmitQuiz = async (req, res, next) => {
  const user = req.user;
  if (!user) {
    return next(new AppError('User authentication failed', 401));
  }
  const { quizId } = req.params;

  if (!quizId) {
    return next(new AppError('Quiz must provide', 400));
  }

  const quiz =await Quiz.findById(quizId);
  if (!quiz) {
    return next(new AppError('Quiz dont find', 400));
  }

  const course = await Course.findById(quiz.course);
  if (!course) {
    return next(new AppError('This course not found', 400));
  }

  if (
    user.role === 'admin' ||
    (user.role === 'instructor' && course.instructor.equals(user._id)) ||
    (user.role === 'student' && course.enrolledStudents.includes(user._id))
  ) {
    return next(); // User is authorized to post a discussion
  }

  return next(new AppError('You do not have permission to perform this action', 403));
};

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action',
      });
    }
    next();
  };
