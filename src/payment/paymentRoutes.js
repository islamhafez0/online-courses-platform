// const express = require('express');
// const paymentConroller = require('./paymentConroller');
// const authController = require('../../middleware/authController');
// const authorization = require('../../middleware/authorization');
// const router = express.Router();

// router.post('/paymob/webhook', paymentConroller.paymentWebhook);
// router.use(authController.protect);

// router.post('/paymob/initiate', paymentConroller.initiate);

// module.exports = router;


// // Public route to initiate payment
// router.post('/paymob/initiate', authController.protect, paymentController.initiatePayment);

// // Webhook route for Paymob to send payment status updates
// router.post('/paymob/webhook', paymentController.paymentWebhook);

// // Admin route to handle payment refunds
// router.post('/paymob/refund/:paymentId', authController.protect, paymentController.refundPayment);

// module.exports = router;
