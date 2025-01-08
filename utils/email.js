const nodemailer = require('nodemailer');

const sendEmail = async options => {
  // 1) Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // 2) Define the email options
  const mailOptions = {
    from: process.env.SENDER_EMAIL,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // 3) Actually send the email
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(error);
  }
};

module.exports = sendEmail;
