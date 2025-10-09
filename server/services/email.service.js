import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
dotenv.config();

// const transporter = nodemailer.createTransport({
//   // service: "gmail",
//   // auth: {
//   //   user: process.env.EMAIL_USER,
//   //   pass: process.env.EMAIL_PASS,
//   // },

//   // host: "smtp.sendgrid.net",
//   // port: 587,
//   // auth: {
//   //   user: process.env.EMAIL_USER,
//   //   pass: process.env.SENDGRID_API_KEY,
//   // },
// });
// transporter.verify((error, success) => {
//   if (error) console.log("Gmail services connection failed.");
//   else console.log("Gmail configured properly and ready to send email.");
// });

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendOtpToEmail = async (email, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #075e54;">🔐 CONNEXA Verification</h2>
      
      <p>Hi there,</p>
      
      <p>Your one-time password (OTP) to verify your CONNEXA  account is:</p>
      
      <h1 style="background: #e0f7fa; color: #000; padding: 10px 20px; display: inline-block; border-radius: 5px; letter-spacing: 2px;">
        ${otp}
      </h1>

      <p><strong>This OTP is valid for the next 5 minutes.</strong> Please do not share this code with anyone.</p>

      <p>If you didn’t request this OTP, please ignore this email.</p>

      <p style="margin-top: 20px;">Thanks & Regards,<br/>CONNEXA Web Security Team</p>

      <hr style="margin: 30px 0;" />

      <small style="color: #777;">This is an automated message. Please do not reply.</small>
    </div>
  `;

  // await transporter.sendMail({
  //   from: `CONNEXA web <${process.env.EMAIL_USER}`,
  //   to: email,
  //   subject: "Your Connexa Verification Code.",
  //   html,
  // });

  const message = {
    from: `CONNEXA web <${process.env.EMAIL_USER}`,
    to: email,
    subject: "Your Connexa Verification Code.",
    html,
  };

  sgMail
    .send(message)
    .then(() =>
      console.log("Gmail configured properly and ready to send email.")
    )
    .catch(console.log("Gmail services connection failed."));
};

export default sendOtpToEmail;
