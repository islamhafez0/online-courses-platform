const express = require('express');
const router = express.Router();
const discussionController = require('./discussionController');
const authController = require('../../middleware/authController');
const authorization=require('../../middleware/authorization')



router.use(authController.protect);
router.post('/createDisuccsion/:lessonId',authorization.authDiscussion, discussionController.createDiscussionforLesson);//T
router.get('/',authorization.restrictTo('admin') ,discussionController.getAllDiscussions);//T
router.get('/getDiscussion/:lessonId',authorization.authDiscussion, discussionController.getDiscussionsForLesson);//T
router.delete('/deleteDiscussion/:discussionId',authorization.restrictTo('admin', 'instructor') ,discussionController.deleteDiscussion);//T
router.post('/replytodiscussion/:discussionId',authorization.authReplyOrLike, discussionController.addReplyToDiscussion);
router.post('/like/:discussionId',authorization.authReplyOrLike, discussionController.likeOrUnlikeDiscussion);

module.exports = router;
