const Course = require('../courses/courseModel');
const Discussion = require('./discussionModel');
const AppError = require('../../utils/appError');
const expressAsyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../users/usersModel');

// Create a new discussion
exports.createDiscussionforLesson = expressAsyncHandler(async (req, res, next) => {
  const { lessonId } = req.params;
  const { title, content } = req.body;

  if (!title || !content) {
    return next(new AppError('Title and Content are required', 400));
  }

  // Find the course that contains the lesson
  const course = await Course.findOne({
    'modules.lessons._id': lessonId,
  });

  if (!course) {
    return next(new AppError('Course or Lesson not found', 404));
  }

  // Find the lesson
  const lesson = course.modules.flatMap(module => module.lessons).find(lesson => lesson._id.toString() === lessonId);

  if (!lesson) {
    return next(new AppError('Lesson not found within the course', 404));
  }

  // Create a new discussion
  const discussion = await Discussion.create({
    belong: req.user._id, // Ensure req.user is set up by auth middleware
    title,
    content,
  });

  // Add the discussion ID to the lesson's discussions array
  lesson.disucssion.push(discussion._id);

  // Save the updated course
  await course.save();

  res.status(201).json({
    status: 'success',
    data: discussion,
  });
});
//delete
exports.deleteDiscussion = expressAsyncHandler(async (req, res, next) => {
  const { discussionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(discussionId)) {
    return next(new AppError('Invalid discussion ID format', 400));
  }

  // Find the discussion to be deleted
  const discussion = await Discussion.findById(discussionId);

  if (!discussion) {
    return next(new AppError('Discussion not found', 404));
  }

  // Remove the discussion from all lessons and courses
  await Course.updateMany(
    { 'modules.lessons.disucssion': discussionId }, //Filter
    { $pull: { 'modules.$[].lessons.$[lesson].disucssion': discussionId } }, //update
    { arrayFilters: [{ 'lesson.disucssion': discussionId }] },
  );

  // Delete the discussion
  await Discussion.findByIdAndDelete(discussionId);

  res.status(204).json({
    status: 'success',
    message: 'Discussion deleted successfully',
  });
});

exports.getAllDiscussions = expressAsyncHandler(async (req, res, next) => {
  // Fetch all discussions and populate the necessary fields
  const discussions = await Discussion.find()
    .populate({
      path: 'belong', // Populate the 'belong' field with User details
      select: 'userName', // Include the username of the user who created the discussion
    })
    .populate({
      path: 'replies.user', // Populate the user field within each reply
      select: 'username', // Include the username of the user who replied
    });

  res.status(200).json({
    status: 'success',
    results: discussions.length,
    data: discussions.map(discussion => ({
      _id: discussion._id,
      title: discussion.title,
      content: discussion.content,
      belong: {
        _id: discussion.belong._id,
        username: discussion.belong.userName,
      },
      replies: discussion.replies.map(reply => ({
        _id: reply._id,
        content: reply.content,
        createdAt: reply.createdAt,
        user: {
          _id: reply.user._id,
          username: reply.user.username,
        },
      })),
      likes: discussion.likes,
      likedBy: discussion.likedBy,
    })),
  });
});

// Get discussions for a specific lesson
exports.getDiscussionsForLesson = expressAsyncHandler(async (req, res, next) => {
  const { lessonId } = req.params;

  // Validate the lesson ID format
  if (!mongoose.Types.ObjectId.isValid(lessonId)) {
    return next(new AppError('Invalid lesson ID format', 400));
  }

  // Find the course that contains the lesson
  const course = await Course.findOne({
    'modules.lessons._id': lessonId,
  }).populate({
    path: 'modules.lessons.disucssion',
    populate: {
      path: 'belong',
      select: 'userName',
    },
    select: 'title content replies likes likedBy createdAt updatedAt', // Fields to include from discussions
  });

  if (!course) {
    return next(new AppError('Course or Lesson not found', 404));
  }

  // Find the lesson
  const lesson = course.modules.flatMap(module => module.lessons).find(lesson => lesson._id.toString() === lessonId);

  if (!lesson) {
    return next(new AppError('Lesson not found within the course', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      discussions: lesson.disucssion.map(discussion => ({
        _id: discussion._id,
        title: discussion.title,
        content: discussion.content,
        createdBy: discussion.belong ? discussion.belong.userName : 'Unknown User', // Add username
        replies: discussion.replies,
        likes: discussion.likes,
        likedBy: discussion.likedBy,
        createdAt: discussion.createdAt,
        updatedAt: discussion.updatedAt,
      })),
    },
  });
});

// Add a reply to a discussion
exports.addReplyToDiscussion = expressAsyncHandler(async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const { content } = req.body;

    // Find the discussion
    const discussion = await Discussion.findById(discussionId)

    if (!discussion) {
      return next(new AppError('Discussion not found', 404));
    }

    // Add the reply
    discussion.replies.push({
      user: req.user._id,
      content,
    });

    // Save the updated discussion
    await discussion.save();

    res.status(201).json({
      status: 'success',
      data: discussion,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});
// Like a discussion
exports.likeOrUnlikeDiscussion = expressAsyncHandler(async (req, res, next) => {
  const { discussionId } = req.params;
  const userId = req.user._id;

  // Find the discussion
  const discussion = await Discussion.findById(discussionId);
  if (!discussion) {
    return next(new AppError('Discussion not found', 404));
  }

  // Check if the user has already liked the discussion
  const userIndex = discussion.likedBy.indexOf(userId);

  if (userIndex > -1) {
    // User has liked befor , so remove the like
    discussion.likedBy.splice(userIndex, 1); //remove like
    discussion.likes -= 1; // mins liks one
  } else {
    // User has not liked the discussion, so add the like
    discussion.likedBy.push(userId);
    discussion.likes += 1;
  }

  // Save the updated discussion
  await discussion.save();
  const updatedDiscussion = await Discussion.findById(discussionId).populate({
    path:'likedBy',
    select:'role userName'
  });
  res.status(200).json({
    status: 'success',
    data: {
      _id: updatedDiscussion._id,
      title: updatedDiscussion.title,
      content: updatedDiscussion.content,
      likes: updatedDiscussion.likes,
      likedBy: updatedDiscussion.likedBy.map(user => ({
        _id: user._id,
        userName: user.userName,
        role: user.role,
    }))
  },
  })
});
