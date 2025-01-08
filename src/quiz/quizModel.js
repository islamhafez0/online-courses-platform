const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    questions: [
      {
        questionText: {
          type: String,
          required: true,
        },
        options: [
          {
            type: String,
            required: true,
          },
        ],
        correctOption: {
          type: Number,
          required: true,
        },
      },
    ],
    module: {
      type: mongoose.Schema.Types.ObjectId,
      // ref:'Module'
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
  },
  { timestamps: true },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;
