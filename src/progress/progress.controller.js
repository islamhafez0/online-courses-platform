const { Progress } = require('./models/progressModel'); // Adjust path as necessary

exports.submitQuiz = expressAsyncHandler(async (req, res, next) => {
  const { quizId, userAnswers } = req.body;
  const { userId } = req.user;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    return next(new AppError('Quiz not found', 404));
  }

  const correctAnswers = quiz.questions.map(q => q.correctOption);
  const score = userAnswers.reduce((acc, answer, index) => acc + (answer === correctAnswers[index] ? 1 : 0), 0);

  const totalQuestions = quiz.questions.length;

  // Update or create progress record
  let progress = await Progress.findOne({ student: userId, course: quiz.course });
  if (!progress) {
    progress = new Progress({
      student: userId,
      course: quiz.course,
      quizResults: [],
    });
  }

  progress.quizResults.push({
    quiz: quizId,
    score,
    totalQuestions,
  });

  // Optionally, calculate overall progress
  const completedQuizzes = progress.quizResults.length;
  const totalQuizzes = await Quiz.countDocuments({ course: quiz.course });
  progress.overallProgress = Math.round((completedQuizzes / totalQuizzes) * 100);

  await progress.save();

  res.status(200).json({
    status: 'success',
    data: {
      score,
      totalQuestions,
      overallProgress: progress.overallProgress,
    },
  });
});

///controller for featching grads
exports.getStudentGrades = expressAsyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const { userId } = req.user;

  const progress = await Progress.findOne({ student: userId, course: courseId })
    .populate('quizResults.quiz', 'title')
    .populate('course', 'title');

  if (!progress) {
    return next(new AppError('No progress found for this course', 404));
  }

  res.status(200).json({
    status: 'success',
    data: progress,
  });
});
