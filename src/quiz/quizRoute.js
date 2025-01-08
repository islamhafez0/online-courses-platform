const express = require('express');
const authController = require('../../middleware/authController');
const authorization = require('../../middleware/authorization');
const quizcontroller = require('../quiz/quizController');

const router = express.Router();

router.use(authController.protect);
router.post('/createQuiz/:courseId/:moduleId?', authorization.authCreateQuiz, quizcontroller.createQuiz); //t
router.patch('/updateQuiz/:quizId', authorization.authUpdateAndDeleteQuiz, quizcontroller.updateQuiz); //t
router.delete('/deleteQuiz/:quizId', authorization.authUpdateAndDeleteQuiz, quizcontroller.deleteQuiz); //t
router.get('/getQuiz', authorization.authGetAllQuiz, quizcontroller.getQuizzes); //t
router.get('/getQuiz/:quizId', authorization.authGetAndSubmitQuiz, quizcontroller.getQuizById); //t
//submit quize answres
router.post('/submitQuiz/:quizId',authorization.authGetAndSubmitQuiz,quizcontroller.validateQuizSubmission);
module.exports = router;
