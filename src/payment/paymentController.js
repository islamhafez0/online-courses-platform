// const axios = require('axios');
// const Payment = require('./paymentModel');
// const Course = require('../courses/courseModel');
// const User = require('../users/usersModel');
// const crypto = require('crypto');
// const AppError = require('../../utils/appError');
// const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
// const PAYMOB_INTEGRATION_ID_Online_Card = process.env.PAYMOB_INTEGRATION_ID_Online_Card;
// const PAYMOB_INTEGRATION_ID_Mobile_Wallet = process.env.PAYMOB_INTEGRATION_ID_Mobile_Wallet;
// const SECRET_KEY = process.env.Secret_Key;

// // Utility function to add a delay
// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// // Calculate HMAC for webhook validation
// const calculateHmac = (data, secret) => {
//   const message = Object.values(data).join('');
//   const hash = crypto.createHmac('sha512', secret).update(message).digest('hex');
//   return hash;
// };

// // Initiate Payment
// exports.initiate = async (req, res, next) => {
//   try {
//     const { courseId, customer, currency } = req.body;

//     // Step 1: Find the course
//     const course = await Course.findById(courseId);
//     if (!course) {
//       return next(new AppError('Course not found', 404));
//     }

//     // Step 2: Calculate price with tax and discount
//     const originalPrice = course.price;
//     const discount = course.discount || 0; // Assume discount is stored in the course model
//     const tax = course.tax || 0; // Assume tax is stored in the course model
//     const discountedPrice = originalPrice - (originalPrice * discount) / 100;
//     const totalPrice = discountedPrice + (discountedPrice * tax) / 100;

//     const amountCents = Math.round(totalPrice * 100); // Convert to cents for payment gateway

//     // Step 3: Authenticate with Paymob
//     const authResponse = await axios.post('https://accept.paymob.com/api/auth/tokens', {
//       api_key: PAYMOB_API_KEY,
//     });

//     if (!authResponse.data.token) {
//       return next(new AppError('Failed to authenticate with payment gateway', 500));
//     }

//     const token = authResponse.data.token;

//     await delay(2000);

//     // Step 4: Create an order
//     const orderResponse = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
//       auth_token: token,
//       delivery_needed: false,
//       amount_cents: amountCents,
//       currency,
//       items: [
//         {
//           name: course.title,
//           amount_cents: amountCents,
//           description: 'Payment for course',
//         },
//       ],
//     });

//     if (!orderResponse.data.id) {
//       return next(new AppError('Failed to create order', 500));
//     }

//     const orderId = orderResponse.data.id;

//     // Step 5: Generate payment key
//     const billingData = {
//       apartment: customer.apartment || 'N/A',
//       email: customer.email || 'example@example.com',
//       floor: customer.floor || 'N/A',
//       first_name: customer.first_name || 'John',
//       last_name: customer.last_name || 'Doe',
//       street: customer.street || 'N/A',
//       building: customer.building || 'N/A',
//       phone_number: customer.phone_number || '+201000000000',
//       postal_code: customer.postal_code || '00000',
//       city: customer.city || 'Cairo',
//       country: customer.country || 'EGY',
//       state: customer.state || 'N/A',
//     };

//     const paymentKeyResponse = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
//       auth_token: token,
//       amount_cents: amountCents,
//       expiration: 3600,
//       order_id: orderId,
//       billing_data: billingData,
//       currency,
//       integration_id: PAYMOB_INTEGRATION_ID_Online_Card,
//       metadata: {
//         courseId: course._id.toString(),
//         userId: req.user._id.toString(),
//       },
//     });

//     if (!paymentKeyResponse.data.token) {
//       return next(new AppError('Failed to generate payment key', 500));
//     }

//     const paymentKey = paymentKeyResponse.data.token;

//     // Step 6: Save the payment in the database
//     const newPayment = new Payment({
//       course: course._id,
//       user: req.user._id,
//       orderId: orderId,
//       amount: totalPrice,
//       originalPrice,
//       discount,
//       tax,
//       currency,
//       status: 'pending',
//       billingAddress: {
//         country: customer.country || 'EGY',
//       },
//     });

//     await newPayment.save();

//     res.json({ paymentKey });
//   } catch (error) {
//     console.error('Error initiating payment:', error.message);
//     return next(new AppError('Payment initiation failed', 500));
//   }
// };

// // Payment Webhook
// exports.paymentWebhook = async (req, res) => {
//   try {
//     const data = req.body;
//     const receivedHmac = req.query.hmac;

//     if (!receivedHmac) {
//       return res.status(400).send('Invalid signature');
//     }

//     const calculatedHmac = calculateHmac(data.obj, process.env.HMAC_SECRET);
//     if (receivedHmac !== calculatedHmac) {
//       return res.status(400).send('HMAC validation failed');
//     }

//     const payment = await Payment.findOne({ orderId: data.obj.order.id });
//     if (!payment) {
//       return res.status(404).send('Payment not found');
//     }

//     payment.status = data.obj.success ? 'completed' : 'failed';
//     payment.hmac = calculatedHmac;
//     await payment.save();

//     if (data.obj.success) {
//       const user = await User.findById(payment.user);
//       if (user) {
//         user.subscribedCourses.push(payment.course);
//         await user.save();
//       }
//     }

//     res.status(200).send('Payment received');
//   } catch (error) {
//     console.error('Payment webhook error:', error.message);
//     res.status(500).send('Internal Server Error');
//   }
// };

// // Get Payment Status
// exports.getPaymentStatus = async (req, res, next) => {
//   try {
//     const { paymentId } = req.params;
//     const payment = await Payment.findById(paymentId);
//     if (!payment) {
//       return next(new AppError('Payment not found', 404));
//     }
//     res.status(200).json({
//       status: 'success',
//       data: { payment },
//     });
//   } catch (error) {
//     next(new AppError('Failed to retrieve payment status', 500));
//   }
// };

// // List All Payments
// exports.listPayments = async (req, res, next) => {
//   try {
//     const query = req.user.role === 'admin' ? {} : { user: req.user._id };
//     const payments = await Payment.find(query);
//     res.status(200).json({
//       status: 'success',
//       results: payments.length,
//       data: { payments },
//     });
//   } catch (error) {
//     next(new AppError('Failed to list payments', 500));
//   }
// };

// // Refund Payment
// exports.refundPayment = async (req, res, next) => {
//   try {
//     const { paymentId } = req.params;
//     const payment = await Payment.findById(paymentId);
//     if (!payment || payment.status !== 'completed') {
//       return next(new AppError('Only completed payments can be refunded', 400));
//     }

//     const refundResponse = await axios.post('https://accept.paymob.com/api/acceptance/refund_transaction', {
//       auth_token: process.env.PAYMOB_API_KEY,
//       transaction_id: payment.orderId,
//       amount_cents: payment.amount * 100,
//     });

//     if (!refundResponse.data.success) {
//       return next(new AppError('Failed to process refund with Paymob', 500));
//     }

//     payment.status = 'refunded';
//     await payment.save();

//     res.status(200).json({
//       status: 'success',
//       message: 'Payment successfully refunded',
//     });
//   } catch (error) {
//     next(new AppError('Failed to process refund', 500));
//   }
// };
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('./paymentModel');
const Course = require('../courses/courseModel');
const User = require('../users/usersModel');
const AppError = require('../../utils/appError');
const expressAsyncHandler = require('express-async-handler');

// Initiate Payment
exports.initiatePayment = expressAsyncHandler(async (req, res, next) => {
  const { courseId, currency = 'usd', tax = 0, discount = 0 } = req.body;

  // Find the course
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Calculate pricing
  const originalPrice = course.price;
  const discountedPrice = originalPrice - (originalPrice * discount) / 100;
  const totalPrice = discountedPrice + (discountedPrice * tax) / 100;

  // Create a PaymentIntent with Stripe
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(totalPrice * 100), // Convert to smallest currency unit
    currency: currency,
    metadata: {
      courseId: course._id.toString(),
      userId: req.user._id.toString(),
    },
  });

  // Save payment record in the database
  const newPayment = await Payment.create({
    course: course._id,
    user: req.user._id,
    amount: totalPrice,
    originalPrice,
    discount,
    tax,
    currency: 'DUS',
    status: 'pending',
    stripePaymentIntentId: paymentIntent.id,
    stripeCustomerId: req.user._id || null, // Ensure Stripe Customer ID is stored for the user
  });
  await newPayment.save();

  res.status(200).json({
    status: 'success',
    clientSecret: paymentIntent.client_secret,
  });
});

// Handle Stripe Webhook
exports.paymentWebhook = expressAsyncHandler(async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const payment = await Payment.findOne({ orderId: paymentIntent.id });
        if (payment) {
          payment.status = 'completed';
          await payment.save();

          // Enroll user in the course
          const user = await User.findById(payment.user);
          if (user) {
            user.enrolledCourses.push(payment.course);
            await user.save();
          }
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const payment = await Payment.findOne({ orderId: paymentIntent.id });
        if (payment) {
          payment.status = 'failed';
          await payment.save();
        }
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Get Payment Status
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId).populate('course user');
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { payment },
    });
  } catch (error) {
    next(new AppError('Failed to retrieve payment status', 500));
  }
};

// List Payments
exports.listPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find().populate('course user');
    res.status(200).json({
      status: 'success',
      results: payments.length,
      data: { payments },
    });
  } catch (error) {
    next(new AppError('Failed to list payments', 500));
  }
};

// Refund Payment
exports.refundPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status !== 'completed') {
      return next(new AppError('Only completed payments can be refunded', 400));
    }

    const refund = await stripe.refunds.create({
      payment_intent: payment.orderId,
    });

    if (refund.status === 'succeeded') {
      payment.status = 'refunded';
      await payment.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Payment successfully refunded',
    });
  } catch (error) {
    next(new AppError('Failed to process refund', 500));
  }
};
