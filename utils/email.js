const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // create a transporter (server which sends email)

  //etc gmail
  // const transporter = nodemailer.createTransport({
  //     service: 'Gmail',
  //     auth: {
  //         user: process.env.EMAIL_USERNAME,
  //         password: process.env.EMAIL_PASSWORD
  //     }
  //     //activate `less secure app` option in gmail
  // })

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // define the email options

  const mailOptions = {
    from: 'Bilal <a@a.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html:
  };

  // send email

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
