const express = require('express');
const courseController = require('./courseController');
const authController = require('../../middleware/authController');
const authorization = require('../../middleware/authorization');
const upload = require('../../utils/multer-config');
const uploadVideo = upload('videos', 'video', 'mp4');

const router = express.Router();

router.use(authController.protect);



router.get(
  '/getLesson/course/:courseId/module/:moduleId/lesson/:lessonId',
  authorization.authLessons,
  courseController.getLesson,
); //t
router.get('/filter', courseController.filterCourse); //t

//course
router.route('/').get(courseController.getAllCourses); //t
router.post('/initCourse', authorization.restrictTo('admin', 'instructor'), courseController.initCourse); //t
router.patch('/updateCourse/:courseId', authorization.authCourses, courseController.updateCourse); //t
router.delete('/deleteCourse/:courseId', authorization.authCourses, courseController.deleteCourse); //t
//module
router.post('/createModuleForCourse/:courseId', authorization.authCourses, courseController.createModuleForCourse); //t
router.patch(
  '/updateModuleForCourse/:courseId/module/:moduleId',
  authorization.authCourses,
  courseController.updateModuleForCourse,
); //t
router.delete(
  '/deleteModuleForCourse/:courseId/module/:moduleId',
  authorization.authCourses,
  courseController.deleteModuleForCourse,
); //t

//lesson
router.post(
  '/createLesson/course/:courseId/module/:moduleId',
  authorization.authCourses,
  uploadVideo.single('video'),
  courseController.createLesson,
); //t
router.patch(
  '/updateLesson/course/:courseId/module/:moduleId/lesson/:lessonId',
  authorization.authCourses,
  uploadVideo.single('video'),
  courseController.updateLesson,
); //t
router.delete(
  '/deleteLesson/course/:courseId/module/:moduleId/lesson/:lessonId',
  authorization.authCourses,
  courseController.deleteLesson,
); //t
router
  .route('/upload')
  .post(authorization.restrictTo('admin', 'instructor'), uploadVideo.single('video'), courseController.uploadVideo); //t

module.exports = router;
