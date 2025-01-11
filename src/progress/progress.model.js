const progressSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    quizResults: [
      {
        quiz: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Quiz',
          required: true,
        },
        score: {
          type: Number,
          required: true,
        },
        totalQuestions: {
          type: Number,
          required: true,
        },
        submittedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    overallProgress: {
      type: Number, // Percentage of completion
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports.Progress = mongoose.model('Progress', progressSchema);
