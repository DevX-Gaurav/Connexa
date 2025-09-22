import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();
const accoundSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

const client = twilio(accoundSid, authToken);

/* send otp to phone number. */
const sendOtpToPhoneNumber = async (phoneNumber) => {
  try {
    console.log(`Sending otp to PH: ${phoneNumber}.`);
    if (!phoneNumber) throw new Error("Phone number is required.");
    const response = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });
    console.log("Otp Response: ", response);
    return response;
  } catch (error) {
    console.log(`error is ${error}`);
    throw new Error("Failed to send otp.");
  }
};

/* verify phone otp. */
const verifyPhoneOtp = async (phoneNumber, otp) => {
  try {
    console.log(`otp is: ${otp}.`);
    console.log(`PH: ${phoneNumber}.`);

    const response = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: phoneNumber,
        code: otp,
      });
    console.log(` Otp response.`, response);
    return response;
  } catch (error) {
    console.log(`error is ${error}`);
    throw new Error("Otp verification failed.");
  }
};

export { sendOtpToPhoneNumber, verifyPhoneOtp };
