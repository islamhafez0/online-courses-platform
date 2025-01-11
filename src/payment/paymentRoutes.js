// const express = require('express');

// const paymentController = require('./paymentController');
// const authController = require('../auth/authController'); // Assuming you have an authentication controller for protecting routes

// const router = express.Router();

// // Protect all routes
// router.use(authController.protect);

// // Initiate Payment
// router.post('/initiate', paymentController.initiate);

// // Payment Webhook (Callback from Paymob)
// router.post('/webhook', paymentController.paymentWebhook);

// // Get Payment Status
// router.get('/:paymentId/status', paymentController.getPaymentStatus);

// // List All Payments (Admin or User-Specific)
// router.get('/', paymentController.listPayments);

// // Cancel Payment
// router.patch('/:paymentId/cancel', paymentController.cancelPayment);

// // Refund Payment
// router.patch('/:paymentId/refund', paymentController.refundPayment);

// module.exports = router;
const express = require('express');
const paymentController = require('./paymentController');
const authController = require('../../middleware/authController');
const authorization = require('../../middleware/authorization');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Initiate a payment
router.post('/initiate', paymentController.initiatePayment);

// Handle Stripe webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.paymentWebhook);

// // Get payment status0
router.get('/:paymentId',authorization.authPayment,paymentController.getPaymentStatus);

// List all payments (admin or user-specific)
router.get('/', authorization.authPayment, paymentController.listPayments);

// Refund a payment (admin only)
router.post('/:paymentId/refund', authorization.restrictTo('admin'), paymentController.refundPayment);

module.exports = router;
