const Quiz = require('./quizModel');
const Course = require('../courses/courseModel');
const expressAsyncHandler = require('express-async-handler');
const AppError = require('../../utils/appError');

/**
 * Create a new quiz for a module or course.
 */

exports.createQuiz = expressAsyncHandler(async (req, res, next) => {
  const { courseId, moduleId } = req.params;
  const { title, description, questions } = req.body;

  if (!moduleId && !courseId) {
    return next(new AppError('Quiz must belong to either a course or a module', 400));
  }
  // check if this course containe this module.

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('This course not found', 400));
  }

  if (moduleId) {
    const module = course.modules.id(moduleId);
    if (!module) {
      return next(new AppError('This module not found into this course', 400));
    }
  }

  const newQuiz = new Quiz({
    title,
    description,
    questions,
    module: moduleId || undefined,
    course: courseId || undefined,
  });

  const savedQuiz = await newQuiz.save();
  res.status(201).json({
    status: 'success',
    data: savedQuiz,
  });
});

/**
 * Get all quizzes filtering for a specific module or course.
 */
exports.getQuizzes = expressAsyncHandler(async (req, res, next) => {
  const { courseId , moduleId } = req.query;

  let filter = {};
  if (moduleId) filter.module = moduleId;
  if (courseId) filter.course = courseId;

  const quizzes = await Quiz.find(filter).populate('module', 'title').populate('course', 'title');

  if (!quizzes || quizzes.length === 0) {
    return next(new AppError('No quizzes found', 404));
  }

  res.status(200).json({
    status: 'success',
    results: quizzes.length,
    data: quizzes,
  });
});

/**
 * Get a specific quiz by its ID.
 */
exports.getQuizById = expressAsyncHandler(async (req, res, next) => {
  const { quizId } = req.params;

  const quiz = await Quiz.findById(quizId).populate('module', 'title').populate('course', 'title');
  if (!quiz) {
    return next(new AppError('Quiz not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: quiz,
  });
});

/**
 * Update a quiz by its ID.
 */
exports.updateQuiz = expressAsyncHandler(async (req, res, next) => {
  const { quizId } = req.params;
  const updates = req.body;

  const updatedQuiz = await Quiz.findByIdAndUpdate(quizId, updates, {
    new: true,
    runValidators: true,
  });

  if (!updatedQuiz) {
    return next(new AppError('Quiz not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: updatedQuiz,
  });
});

/**
 * Delete a quiz by its ID.
 */
exports.deleteQuiz = expressAsyncHandler(async (req, res, next) => {
  const { quizId } = req.params;

  const deletedQuiz = await Quiz.findByIdAndDelete(quizId);
  if (!deletedQuiz) {
    return next(new AppError('Quiz not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

/**
 * Validate a quiz submission by comparing user answers to the correct options.
 */

exports.validateQuizSubmission = expressAsyncHandler(async (req, res, next) => {
  const { quizId } = req.params;
  const { userAnswers } = req.body; // Array of user answers

  // Validate request body
  if (!Array.isArray(userAnswers)) {
    return next(new AppError('Invalid format for userAnswers. It must be an array.', 400));
  }

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    return next(new AppError('Quiz not found', 404));
  }

  if (userAnswers.length !== quiz.questions.length) {
    return next(
      new AppError(
        `The number of answers provided (${userAnswers.length}) does not match the number of questions (${quiz.questions.length}).`,
        400
      )
    );
  }

  // Process the results
  const correctAnswers = quiz.questions.map((q) => q.correctOption);
  const results = quiz.questions.map((question, index) => {
    const isCorrect = userAnswers[index] === correctAnswers[index];
    return {
      question: question.questionText,
      userAnswer: userAnswers[index],
      correctAnswer: correctAnswers[index],
      isCorrect,
    };
  });

  // Calculate the score
  const score = results.filter((result) => result.isCorrect).length;

  // Send the response
  res.status(200).json({
    status: 'success',
    data: {
      score,
      totalQuestions: quiz.questions.length,
      results,
    },
  });
});

