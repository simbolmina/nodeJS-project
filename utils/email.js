const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

//we created an email class here. We will create email objects with this and then send them. When we pass a user and url into this class we can send email them using same options created inside class. for example sendWelcome is one of these mails.
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split('')[0];
    this.url = url;
    // this.from = `Bilal ARKAN <${process.env.EMAIL_FROM}>`;
    this.from = `Bilal ARKAN <iletisim@filozofunyolu.com>`;
  }
  //this creates different transports for different envoraintments (production or development)
  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // sendgrid
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  //send the actual email. this function takes a template and subject and create html mail\ then sends it.
  async send(template, subject) {
    //1-render html based on a pug template
    //this code will take pug template and render it into a html
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      //this options to personalize sent mails.
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    //2- define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html),
      //some people prefer plain text, so we add text version of html mail. this also helps to increase read rate.
    };

    // 3- create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    //send a welcome message using send() method inside this class
    await this.send('Welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send('passwordReset', 'Reset your password (valid for 10min)');
  }
};

//first version just for reset password.
// const sendEmail = async (options) => {
//   create a transporter (server which sends email)

//   etc gmail
//   const transporter = nodemailer.createTransport({
//       service: 'Gmail',
//       auth: {
//           user: process.env.EMAIL_USERNAME,
//           password: process.env.EMAIL_PASSWORD
//       }
//       //activate `less secure app` option in gmail
//   })

//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });

//   define the email options

//   const mailOptions = {
//     from: 'Bilal ARKAN<admin@example.com>',
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//     // html:
//   };

//   send email

//   await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;
