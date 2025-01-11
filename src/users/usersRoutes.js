const express = require('express');
const userController = require('.//usersController');
const authController = require('../../middleware/authController');
const authorization = require('../../middleware/authorization');

const router = express.Router();

router.get('/:id', userController.getUser); //T
router.post('/signUp', authController.signUp); //T
router.post('/logIn', authController.logIn); //T

router.use(authController.protect);
router.post('/logout', authController.protect, authController.logout);
router.post('/forgotpassword', authController.forgotPassword);
router.post('/resetpassword', authController.resetPassword);

router.use(authController.protect, authorization.restrictTo('admin', 'student'));
router.get('/', userController.getAllUsers); //T
router.get('/getUser/:id', userController.getUser); //T
router.patch('/updateUser/:id', userController.updateUser); //T
router.delete('/deleteUser/:id', userController.deleteUser); //T

//git cources for user
router.get('/userCources/:userId', userController.getCoursesForUser);
module.exports = router;
