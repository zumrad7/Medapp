const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendAppointmentConfirmation = async (to, patientName, doctorName, appointmentDate) => {
  const mailOptions = {
    from: `"MedApp Clinic" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: 'Appointment Confirmation - MedApp Clinic',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Appointment Confirmed!</h2>
        <p>Dear ${patientName},</p>
        <p>Your appointment has been successfully scheduled.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Appointment Details:</h3>
          <p><strong>Doctor:</strong> ${doctorName}</p>
          <p><strong>Date & Time:</strong> ${new Date(appointmentDate).toLocaleString()}</p>
          <p><strong>Status:</strong> Confirmed</p>
        </div>
        
        <p>Please arrive 10 minutes before your scheduled time.</p>
        <p>If you need to cancel or reschedule, please contact us at least 24 hours in advance.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 14px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent to:', to);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = {
  sendAppointmentConfirmation
};