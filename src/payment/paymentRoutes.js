const express = require('express');
const paymentController = require('./paymentController');
const authController = require('../../middleware/authController');
const authorization = require('../../middleware/authorization');

const router = express.Router();

// Protect all routes
router.use(authController.protect);
console.log(
  'test',
  paymentController.initiatePayment,
  paymentController.refundPayment,
  paymentController.paymentWebhook,
  paymentController.getPaymentStatus,
  paymentController.listPayments,
);
// Initiate a payment
router.post('/initiate', paymentController.initiatePayment);

// Handle Stripe webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.paymentWebhook);

// Get payment status
router.get('/:paymentId', authorization.authPayment, paymentController.getPaymentStatus); // This should point to a valid function

// List all payments (admin or user-specific)
router.get('/', authorization.authPayment, paymentController.listPayments); // This should point to a valid function

// Refund a payment (admin only)
router.post('/:paymentId/refund', authorization.restrictTo('admin'), paymentController.refundPayment);

module.exports = router;
