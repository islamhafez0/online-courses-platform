// const mongoose = require('mongoose');

// const paymentSchema = new mongoose.Schema({
//   course: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Course',
//     required: true,
//   },
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   orderId: String,
//   amount: Number,
//   currency: String,
//   customer: Object,
//   status: Boolean,
//   hmac: Striag,
//   createdAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model('Payment', paymentSchema);


// const mongoose = require('mongoose');

// const paymentSchema = new mongoose.Schema({
//   course: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Course',
//     required: true,
//   },
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   orderId: {
//     type: String,
//     required: true,
//   },
//   amount: {
//     type: Number,
//     required: true,
//   },
//   currency: {
//     type: String,
//     required: true,
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'completed', 'failed', 'refunded'],
//     default: 'pending',
//   },
//   paymentMethod: {
//     type: String,
//     enum: ['credit_card', 'paypal', 'mobile_wallet'],
//     required: true,
//   },
//   hmac: {
//     type: String,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// module.exports = mongoose.model('Payment', paymentSchema);
