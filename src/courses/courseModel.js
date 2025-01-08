const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    disucssion: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Discussion',
      },
    ],
    duration: {
      type: Number,
      required: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    lessons: [lessonSchema],
  },
  {
    timestamps: true,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      required: true,
    },
    modules: [moduleSchema],
    categories: {
      type: [String],
    },
    tags: {
      type: [String],
    },
    price: {
      type: Number,
      required: true,
    },
    ratings: {
      type: Number,
    },
    language: {
      type: String,
      required: true,
    },
    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

courseSchema.post('save', async function () {
  const course = this;

  if (course.modules.length > 0) {
    const totalDuration = course.modules.reduce((courseTotal, module) => {
      const moduleDuration = module.lessons.reduce((moduleTotal, lesson) => moduleTotal + lesson.duration, 0);
      return courseTotal + moduleDuration;
    }, 0);

    if (course.duration !== totalDuration) {
      course.duration = totalDuration;
      await course.save();
    }
  }
});

const Course = mongoose.model('Course', courseSchema);

module.exports= Course;
