const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('./paymentModel');
const Course = require('../courses/courseModel');
const User = require('../users/usersModel');
const crypto = require('crypto');
const AppError = require('../../utils/appError');
const expressAsyncHandler = require('express-async-handler');

// Utility function to add a delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Calculate HMAC for webhook validation (Paymob)
const calculateHmac = (data, secret) => {
  const message = Object.values(data).join('');
  const hash = crypto.createHmac('sha512', secret).update(message).digest('hex');
  return hash;
};

// Common payment initiation logic
const initiatePaymentProcess = async (courseId, customer, currency, paymentGateway, discount = 0, tax = 0) => {
  // Step 1: Find the course
  const course = await Course.findById(courseId);
  if (!course) {
    throw new AppError('Course not found', 404);
  }

  // Step 2: Calculate price with tax and discount
  const originalPrice = course.price;
  const discountedPrice = originalPrice - (originalPrice * discount) / 100;
  const totalPrice = discountedPrice + (discountedPrice * tax) / 100;
  const amountCents = Math.round(totalPrice * 100); // Convert to cents for payment gateway

  // Step 3: Save the payment in the database
  const newPayment = new Payment({
    course: course._id,
    user: customer._id,
    amount: totalPrice,
    originalPrice,
    discount,
    tax,
    currency,
    status: 'pending',
    billingAddress: {
      country: customer.country || 'EGY',
    },
  });
  await newPayment.save();

  // Step 4: Return the payment details and amount
  return { course, amountCents, newPayment };
};

// Paymob Payment
const paymobPayment = async (course, amountCents, customer, currency) => {
  const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;

  // Authenticate with Paymob
  const authResponse = await axios.post('https://accept.paymob.com/api/auth/tokens', { api_key: PAYMOB_API_KEY });
  const token = authResponse.data.token;

  if (!token) {
    throw new AppError('Failed to authenticate with payment gateway', 500);
  }

  await delay(2000);

  // Create an order
  const orderResponse = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
    auth_token: token,
    delivery_needed: false,
    amount_cents: amountCents,
    currency,
    items: [
      {
        name: course.title,
        amount_cents: amountCents,
        description: 'Payment for course',
      },
    ],
  });

  if (!orderResponse.data.id) {
    throw new AppError('Failed to create order', 500);
  }

  // Generate payment key
  const billingData = {
    apartment: customer.apartment || 'N/A',
    email: customer.email || 'example@example.com',
    phone_number: customer.phone_number || '+201000000000',
    city: customer.city || 'Cairo',
    country: customer.country || 'EGY',
  };

  const paymentKeyResponse = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
    auth_token: token,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: orderResponse.data.id,
    billing_data: billingData,
    currency,
    integration_id: process.env.PAYMOB_INTEGRATION_ID_Online_Card,
    metadata: {
      courseId: course._id.toString(),
      userId: customer._id.toString(),
    },
  });

  if (!paymentKeyResponse.data.token) {
    throw new AppError('Failed to generate payment key', 500);
  }

  return paymentKeyResponse.data.token;
};

// Stripe Payment
const stripePayment = async (course, amountCents, currency, customer) => {
  // Create a PaymentIntent with Stripe
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amountCents),
    currency,
    metadata: {
      courseId: course._id.toString(),
      userId: customer._id.toString(),
    },
  });

  return paymentIntent.client_secret;
};

// Initiate Payment
exports.initiatePayment = expressAsyncHandler(async (req, res, next) => {
  const { courseId, customer, currency = 'usd', discount = 0, tax = 0, gateway } = req.body;

  try {
    // Common payment process
    const { course, amountCents, newPayment } = await initiatePaymentProcess(
      courseId,
      customer,
      currency,
      gateway,
      discount,
      tax,
    );

    // Handle payment gateway-specific payment
    let paymentKey;
    if (gateway === 'paymob') {
      paymentKey = await paymobPayment(course, amountCents, customer, currency);
    } else if (gateway === 'stripe') {
      paymentKey = await stripePayment(course, amountCents, currency, customer);
    } else {
      throw new AppError('Unsupported payment gateway', 400);
    }

    res.status(200).json({ status: 'success', paymentKey });
  } catch (error) {
    console.error('Payment initiation error:', error.message);
    next(new AppError('Payment initiation failed', 500));
  }
});
exports.paymentWebhook = async (req, res) => {
  try {
    const data = req.body;
    const receivedHmac = req.query.hmac;

    if (!receivedHmac) {
      return res.status(400).send('Invalid signature');
    }

    const calculatedHmac = calculateHmac(data.obj, process.env.HMAC_SECRET);
    if (receivedHmac !== calculatedHmac) {
      return res.status(400).send('HMAC validation failed');
    }

    const payment = await Payment.findOne({ orderId: data.obj.order.id });
    if (!payment) {
      return res.status(404).send('Payment not found');
    }

    payment.status = data.obj.success ? 'completed' : 'failed';
    payment.hmac = calculatedHmac;
    await payment.save();

    if (data.obj.success) {
      const user = await User.findById(payment.user);
      if (user) {
        user.subscribedCourses.push(payment.course);
        await user.save();
      }
    }

    res.status(200).send('Payment received');
  } catch (error) {
    console.error('Payment webhook error:', error.message);
    res.status(500).send('Internal Server Error');
  }
};
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

exports.listPayments = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { user: req.user._id };
    const payments = await Payment.find(query);
    res.status(200).json({
      status: 'success',
      results: payments.length,
      data: { payments },
    });
  } catch (error) {
    next(new AppError('Failed to list payments', 500));
  }
};

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
