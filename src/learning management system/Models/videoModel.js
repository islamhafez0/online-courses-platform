const mongoose = require('mongoose');

const videoFileSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
    },
    duration: {
      type: Number, // Duration in seconds
      required: true,
    },
    size: {
      type: Number, // File size in bytes
    },
    format: {
      type: String,
    },
    url: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // User who uploaded the video
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('VideoFile', videoFileSchema);

//

exports.uploadVideo = expressAsyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No video uploaded', 400));
  }

  const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'video', type: 'authenticated' });

  // Create a new VideoFile document
  const video = await VideoFile.create({
    title: req.body.title || 'Untitled Video',
    publicId: result.public_id,
    duration: req.body.duration || 0, // Ideally, this should be retrieved from the video metadata
    size: result.bytes,
    format: result.format,
    url: result.secure_url,
    createdBy: req.user._id, // Assuming the user is authenticated
  });

  res.status(201).json({
    status: 'success',
    message: 'Video uploaded successfully!',
    data: video,
  });
});

//////////////////////////////
exports.createLesson = expressAsyncHandler(async (req, res, next) => {
  const { courseId, moduleId } = req.params;
  const { title, duration, order, videoId } = req.body; // videoId references the VideoFile document

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  const module = course.modules.id(moduleId);
  if (!module) {
    return next(new AppError('Module not found', 404));
  }

  module.lessons.push({ title, duration, video: videoId, order });
  const updatedCourse = await course.save();

  res.status(201).json(updatedCourse);
});
//////////////////////////////////////////
exports.getLesson = expressAsyncHandler(async (req, res, next) => {
  const { courseId, moduleId, lessonId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  const module = course.modules.id(moduleId);
  if (!module) {
    return next(new AppError('Module not found', 404));
  }

  const lesson = module.lessons.id(lessonId).populate('video'); // Populate video details
  if (!lesson) {
    return next(new AppError('Lesson not found', 404));
  }

  if (!req.user.subscribedCourses.includes(courseId)) {
    return next(new AppError('You are not subscribed to this course', 403));
  }

  res.status(200).json({
    status: 'success',
    data: lesson,
  });
});
