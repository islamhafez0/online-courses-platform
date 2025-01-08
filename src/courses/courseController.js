const Course= require('./courseModel');
const expressAsyncHandler = require('express-async-handler');
const AppError = require('../../utils/appError');
const ApIFeatures = require('../../utils/apiFeauters');
const cloudinary = require('cloudinary').v2;

/**
 * Utility: Generates a signed, authenticated URL for a video stored in Cloudinary.
 * The URL expires after 1 hour.
 */
const generateSignedUrl = publicId => {
  const options = {
    resource_type: 'video',
    type: 'authenticated',
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1-hour expiry
  };
  return cloudinary.url(publicId, options);
};

/* =========================
   Video Upload Handling
   ========================= */

/**
 * Uploads a video to Cloudinary and returns its URL.
 */
exports.uploadVideo = expressAsyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No video uploaded', 400));
  }
  // Uploading the video to Cloudinary
  const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'video', type: 'authenticated' });

  // Generate a signed URL for accessing the uploaded video
  const signedUrl = generateSignedUrl(result.public_id);
  res.status(200).json({
    status: 'success',
    message: 'Video uploaded successfully!',
    videoUrl: signedUrl,
  });
});

/* =========================
   Course Management
   ========================= */
/**
 * Fetches all courses with optional filtering by category, tag, or instructor.
 * and i can use it for filter course
 */

exports.getAllCourses = expressAsyncHandler(async (req, res, next) => {
  const { category, tag, instructorId } = req.query;
  let filter = {};

  if (category) filter.categories = category;
  if (tag) filter.tags = tag;
  if (instructorId) filter.instructor = instructorId;

  const courses = await Course.find(filter).populate('instructor', 'userName email');
  if (!courses || courses.length === 0) {
    return next(new AppError('No courses found', 404));
  }

  res.status(200).json({
    status: 'success',
    results: courses.length,
    data: {
      courses,
    },
  });
});

/**
 * Creates a new course with optional modules and lessons.
 */
exports.initCourse = expressAsyncHandler(async (req, res, next) => {
  const { title, description, instructor,level,duration,language, categories, tags, price } = req.body;

  const newCourse = new Course({
    title,
    description,
    instructor,
    duration,
    level,
    language,
    categories,
    tags,
    price,
  });

  const savedCourse = await newCourse.save();
  res.status(201).json(savedCourse);
});

/**
 * Updates an existing course by its ID.
 */
exports.updateCourse = expressAsyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const updates = req.body;

  const updatedCourse = await Course.findByIdAndUpdate(courseId, updates, {
    new: true,
    runValidators: true,
  });

  if (!updatedCourse) {
    return next(new AppError('Course not found', 404));
  }

  res.status(200).json(updatedCourse);
});

/**
 * Deletes a course by its ID.
 */
exports.deleteCourse = expressAsyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const course = await Course.findByIdAndDelete(courseId);
  if (!course) {
    return next(new AppError(`Course not found with id: ${req.params.id}`, 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});




/* =========================
   Module Management
   ========================= */

/**
 * Adds a new module (section) to a specific course.
 */
exports.createModuleForCourse = expressAsyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const { title, order, lessons } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  course.modules.push({ title, order, lessons });
  const updatedCourse = await course.save();
  res.status(201).json(updatedCourse);
});

//update module to a specific course
exports.updateModuleForCourse = expressAsyncHandler(async (req, res, next) => {
  const { courseId, moduleId } = req.params;
  const { title, order, lessons } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  const module = course.modules.id(moduleId);
  if (!module) {
    return next(new AppError('Module not found', 404));
  }

  if (title !== undefined) module.title = title;
  if (order !== undefined) module.order = order;
  if (lessons !== undefined) module.lessons = lessons;

  // Save the updated course
  const updatedCourse = await course.save();

  res.status(200).json({
    status: 'success',
    data: updatedCourse,
  });
});
//delete module to a specific course
exports.deleteModuleForCourse = expressAsyncHandler(async (req, res, next) => {
  const { courseId, moduleId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  const module = course.modules.id(moduleId);
  if (!module) {
    return next(new AppError('Module not found', 404));
  }
  // Remove the module
  course.modules.pull(moduleId);

  const updatedCourse = await course.save();
  res.status(200).json({
    status: 'success',
    message: 'module deleted successfully',
    data: updatedCourse,
  });
});

/* =========================
   Lesson Management
   ========================= */

/**
 * Adds a new lesson to a specific module in a course.
 */
exports.createLesson = expressAsyncHandler(async (req, res, next) => {
  const { courseId, moduleId } = req.params;
  const { title, duration, order } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  const module = course.modules.id(moduleId);
  if (!module) {
    return next(new AppError('Module not found', 404));
  }

  if (!req.file) {
    return next(new AppError('No video uploaded', 400));
  }

  const publicId = req.file.filename; // Cloudinary public ID
  module.lessons.push({ title, duration, videoUrl: publicId, order });
  const updatedCourse = await course.save();

  res.status(201).json(updatedCourse);
});

/**
 * Retrieves a specific lesson by its ID and provides a signed video URL.
 *
 */

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

  const lesson = module.lessons.id(lessonId);
  if (!lesson) {
    return next(new AppError('Lesson not found', 404));
  }

  // Ensure the user is subscribed to the course
  if (req.user.role=="student" && !req.user.subscribedCourses.includes(courseId)) {
    return next(new AppError('You are not subscribed to this course', 403));
  }

  const signedUrl = generateSignedUrl(lesson.videoUrl);
  res.status(200).json({
    ...lesson.toObject(),
    signedUrl,
  });
});

/**
 * Updates a lesson in a specific module of a course.
 */
exports.updateLesson = expressAsyncHandler(async (req, res, next) => {
  const { courseId, moduleId, lessonId } = req.params;
  const { title, duration, order } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  const module = course.modules.id(moduleId);
  if (!module) {
    return next(new AppError('Module not found', 404));
  }

  const lesson = module.lessons.id(lessonId);
  if (!lesson) {
    return next(new AppError('Lesson not found', 404));
  }

  //update
  if (title !== undefined) lesson.title = title;
  if (duration !== undefined) lesson.duration = duration;
  if (order !== undefined) lesson.order = order;

  // If there's a new video file, update the videoUrl
  if (req.file) {
    const publicId = req.file.filename; // Cloudinary public ID
    console.log(publicId);
    lesson.videoUrl = publicId;
  }

  const updatedCourse = await course.save();

  res.status(200).json({
    status: 'success',
    message: 'Lesson updated successfully',
    data: updatedCourse,
  });
});

/**
 * Deletes a lesson from a specific module in a course.
 */
exports.deleteLesson = expressAsyncHandler(async (req, res, next) => {
  const { courseId, moduleId, lessonId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  const module = course.modules.id(moduleId);
  if (!module) {
    return next(new AppError('Module not found', 404));
  }

  const lesson = module.lessons.id(lessonId);
  if (!lesson) {
    return next(new AppError('Lesson not found', 404));
  }

  // Remove the lesson
  module.lessons.pull(lessonId);

  const updatedCourse = await course.save();

  res.status(200).json({
    status: 'success',
    message: 'Lesson deleted successfully',
    data: updatedCourse,
  });
});

/* =========================
   Filtering and Searching
   ========================= */

/**
 * Fetches courses filtered
 */
exports.filterCourse = expressAsyncHandler(async (req, res, next) => {
  //execute filter
  const feature = new ApIFeatures(Course.find(), req.query).filter().sort().limitFields().paginate();
  const docs = await feature.query;
  res.status(200).json({
    status: 'sucess',
    data: {
      data: docs,
    },
  });
});
