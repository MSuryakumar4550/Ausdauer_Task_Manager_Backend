const nodemailer = require('nodemailer');

/**
 * ==================================================================================
 * AUSDAUER EMAIL SERVICE - DUAL ENGINE (VERSION 3.3.0)
 * ==================================================================================
 * CAPABILITIES:
 * 1. CALENDAR HANDSHAKE: Sends .ics files for mission deadlines.
 * 2. OTP TRANSMISSION: Sends 6-digit security codes for password recovery.
 * 3. SECURITY: Requires "App Password" via process.env.EMAIL_PASS.
 * ==================================================================================
 */

// 1. Setup the Central Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

// @desc    Engine 1: Send Task Calendar Invite
const sendCalendarInvite = async (userEmail, task) => {
  try {
    const cleanDate = (date) => new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ausdauer//Missions v1.0//EN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${task._id}@ausdauer.com`,
      `DTSTAMP:${cleanDate(new Date())}`,
      `DTSTART:${cleanDate(task.deadline)}`,
      `DTEND:${cleanDate(task.deadline)}`,
      `SUMMARY:Mission Deadline: ${task.title}`,
      `DESCRIPTION:${task.description}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const mailOptions = {
      from: '"Ausdauer Command" <no-reply@ausdauer.com>',
      to: userEmail,
      subject: `New Mission Assigned: ${task.title}`,
      text: `You have received a new assignment: ${task.title}.\nTarget Completion: ${new Date(task.deadline).toLocaleString()}`,
      icalEvent: {
        filename: 'mission.ics',
        method: 'request',
        content: icsContent,
      },
    };

    await transporter.sendMail(mailOptions);
    console.log(`[MAIL] Calendar link transmitted to ${userEmail}`);
  } catch (error) {
    console.error('[MAIL ERROR] Calendar sync failed:', error.message);
  }
};

// @desc    Engine 2: Send Security OTP
const sendOTPEmail = async (userEmail, otp) => {
  try {
    const mailOptions = {
      from: '"Ausdauer Security" <no-reply@ausdauer.com>',
      to: userEmail,
      subject: 'Security Alert: Your Login Code',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; border: 1px solid #eee; padding: 20px; border-radius: 15px;">
          <h2 style="color: #1D546C; text-transform: uppercase; letter-spacing: 2px;">Identity Verification</h2>
          <p style="color: #666;">Use the following 6-digit code to access your terminal. This code will expire in <strong>10 minutes</strong>.</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; border-radius: 10px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #000;">${otp}</span>
          </div>
          <p style="font-size: 10px; color: #999; font-style: italic;">If you did not request this code, please ignore this transmission.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[MAIL] Security OTP transmitted to ${userEmail}`);
  } catch (error) {
    console.error('[MAIL ERROR] OTP transmission failed:', error.message);
  }
};

module.exports = { sendCalendarInvite, sendOTPEmail };