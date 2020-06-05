import * as nodemailer from "nodemailer";

export const sendEmail = async (recipient: string, url: string) => {
  const testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });

  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: "Airbnb <airbnb@abb.com>", // sender address
    to: `Recipient <${recipient}>`, // list of receivers
    subject: "Confirm", // Subject line
    text: "Hello,", // plain text body
    html: `<html>
              <body>
              <a href="${url}"></a>
              </body>
           </html>`,
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
};
