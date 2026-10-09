import path from 'node:path';
import nodemailer from 'nodemailer';
import { PASSWORD_RESET_CODE_TTL_MINUTES } from '@/lib/auth';


function parseSmtpSecure(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw new Error('SMTP_SECURE must be true or false.');
}

function getSmtpConfig() {
  const port = Number(getRequiredEnv('SMTP_PORT'));

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a valid positive integer.');
  }

  return {
    host: getRequiredEnv('SMTP_HOST'),
    port,
    secure: parseSmtpSecure(getRequiredEnv('SMTP_SECURE')),
    user: getRequiredEnv('SMTP_USER'),
    pass: getRequiredEnv('SMTP_PASS'),
    from: getRequiredEnv('SMTP_FROM')
  };
}

function createTransporter() {
  const config = getSmtpConfig();

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

export function assertMailerConfig() {
  getSmtpConfig();
}

export async function sendEmail({ to, subject, html, text, attachments }: SendEmailInput) {
  const config = getSmtpConfig();

  return createTransporter().sendMail({
    from: config.from,
    to,
    subject,
    html,
    text,
    attachments
  });
}

import { getRequiredEnv } from '@/lib/utils';

type SendEmailInput = {
  to: string;
  subject: string;
  html?: string;
  text: string;
  attachments?: any[];
};

type PasswordResetCodeEmailInput = {
  to: string;
  code: string;
};

type AccountSuspensionEmailInput = {
  to: string;
  name?: string | null;
  durationLabel?: string;
};

type AccountRestoreEmailInput = {
  to: string;
  name?: string | null;
};

type ScheduleNotificationEmailInput = {
  to: string;
  name?: string | null;
  typeLabel: string;
  title: string;
  dateLabel: string;
  location?: string | null;
  notes?: string | null;
  group?: string | null;
  adviserName?: string | null;
  loginUrl?: string;
};

export async function sendPasswordResetCodeEmail({ to, code }: PasswordResetCodeEmailInput) {
  const subject = 'ThesisTrack Password Reset Code';
  const text = `Hello,

We received a request to reset the password for your ThesisTrack account.

Please use the verification code below to continue resetting your password:

${code}

This code will expire in ${PASSWORD_RESET_CODE_TTL_MINUTES} minutes.

If you did not request a password reset, you can safely ignore this email. Your account password will remain unchanged.

Thank you,
ThesisTrack System`;
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #111827; max-width: 600px;">
      <p>Hello,</p>
      <p>We received a request to reset the password for your ThesisTrack account.</p>
      <p>Please use the verification code below to continue resetting your password:</p>
      <p style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 24px 0;">${code}</p>
      <p>This code will expire in ${PASSWORD_RESET_CODE_TTL_MINUTES} minutes.</p>
      <p>If you did not request a password reset, you can safely ignore this email. Your account password will remain unchanged.</p>
      <p>Thank you,<br><strong>ThesisTrack System</strong></p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

export async function sendAccountSuspensionEmail({ to, name, durationLabel }: AccountSuspensionEmailInput) {
  const displayName = name?.trim() || 'User';
  const durationText = durationLabel ? ` for ${durationLabel}` : '';
  const subject = 'ThesisTrack Account Suspended';
  const text = `Hello ${displayName},

We are writing to inform you that access to your ThesisTrack account has been temporarily suspended${durationText}.

During this period, you may be unable to sign in or use protected portal features.

If you believe this action was made in error, please contact the system administrator for assistance.

Thank you,
ThesisTrack System`;
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #111827; max-width: 600px;">
      <p>Hello ${displayName},</p>
      <p>We are writing to inform you that access to your ThesisTrack account has been temporarily suspended${durationText}.</p>
      <p>During this period, you may be unable to sign in or use protected portal features.</p>
      <p>If you believe this action was made in error, please contact the system administrator for assistance.</p>
      <p>Thank you,<br><strong>ThesisTrack System</strong></p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

export async function sendAccountRestoreEmail({ to, name }: AccountRestoreEmailInput) {
  const displayName = name?.trim() || 'User';
  const subject = 'ThesisTrack Account Restored';
  const text = `Hello ${displayName},

Access to your ThesisTrack account has been restored. You can sign in again using your account credentials.

Thank you,
ThesisTrack System`;
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #111827; max-width: 600px;">
      <p>Hello ${displayName},</p>
      <p>Access to your ThesisTrack account has been restored. You can sign in again using your account credentials.</p>
      <p>Thank you,<br><strong>ThesisTrack System</strong></p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}
export async function sendScheduleNotificationEmail({
  to,
  name,
  typeLabel,
  title,
  dateLabel,
  location,
  notes,
  group,
  adviserName,
  loginUrl
}: ScheduleNotificationEmailInput) {
  const displayName = name?.trim() || 'Student';
  const adviserText = adviserName ? ` by your adviser, ${adviserName},` : ` by your adviser`;
  const subject = `New ${typeLabel} Scheduled`;
  
  let text = `Hello ${displayName},\n\nA new ${typeLabel.toLowerCase()} has been scheduled${adviserText}:\n\nAgenda: ${title}\nDate & Time: ${dateLabel}\n`;
  if (group) text += `Group: ${group}\n`;
  if (location) text += `Location/Link: ${location}\n`;
  if (notes) text += `Notes: ${notes}\n`;
  text += `\nPlease check your ThesisTrack portal for more details.\n\nThank you,\nThesisTrack System`;

  const html = `
    <div style="font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #334155; line-height: 1.5;">
      
      <!-- Logo Header -->
      <div style="max-width: 600px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <img src="https://res.cloudinary.com/dqlajypop/image/upload/v1783766611/thesistrack_system_1_logo.png" alt="ThesisTrack Logo" style="height: 60px; margin-right: 16px; display: block;" />
        <span style="font-size: 24px; color: #0f4c81; font-weight: 800; letter-spacing: -0.02em;">ThesisTrack</span>
      </div>

      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Top Accent Border -->
        <div style="height: 6px; background-color: #0f4c81; border-top-left-radius: 12px; border-top-right-radius: 12px;"></div>
        
        <!-- Body -->
        <div style="padding: 40px 32px; text-align: center;">
          
          <!-- Avatar -->
          <div style="width: 64px; height: 64px; margin: 0 auto 16px; background-color: #0f4c81; border-radius: 50%; color: #ffffff; font-size: 24px; font-weight: bold; line-height: 64px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            ${adviserName ? adviserName.charAt(0).toUpperCase() : 'A'}
          </div>
          
          <h2 style="margin: 0 0 4px; font-size: 22px; color: #0f172a; font-weight: 700; letter-spacing: -0.01em;">
            ${adviserName || 'Your Adviser'}
          </h2>
          <p style="margin: 0 0 32px; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">
            Adviser via ThesisTrack
          </p>
          
          <!-- Event Focus Box -->
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #475569; font-weight: 500;">Scheduled a new ${typeLabel}:</p>
            <p style="margin: 0; font-size: 20px; color: #0f4c81; font-weight: 800; line-height: 1.4; letter-spacing: -0.01em;">${title}</p>
          </div>
          
          <!-- Details Grid -->
          <div style="text-align: left; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; font-size: 14px; color: #334155; margin-bottom: 32px;">
            <div style="margin-bottom: 16px;">
              <strong style="display: block; font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.02em;">Date & Time</strong> 
              <span style="color: #0f172a; font-weight: 600; font-size: 15px;">${dateLabel}</span>
            </div>
            ${group ? `<div style="margin-bottom: 16px;"><strong style="display: block; font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.02em;">Group</strong> <span style="color: #0f172a; font-weight: 600; font-size: 15px;">${group}</span></div>` : ''}
            ${location ? `<div style="margin-bottom: 16px;"><strong style="display: block; font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.02em;">Location / Link</strong> <span style="color: #0f172a; font-weight: 600; font-size: 15px;">${location}</span></div>` : ''}
            ${notes ? `<div><strong style="display: block; font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.02em;">Notes</strong> <span style="color: #475569; font-weight: 500; font-size: 14px; line-height: 1.6;">${notes}</span></div>` : ''}
          </div>
          
          <!-- Action Button -->
          <div style="margin-bottom: 16px;">
            ${loginUrl 
              ? `<a href="${loginUrl}" style="display: inline-block; padding: 14px 36px; background-color: #0f4c81; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(15, 76, 129, 0.2);">Open in ThesisTrack</a>` 
              : `<span style="display: inline-block; padding: 14px 36px; background-color: #0f4c81; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Open in ThesisTrack</span>`}
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="max-width: 600px; margin: 32px auto 0; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
        <p style="margin: 0 0 12px;">This is an automated schedule notification from the ThesisTrack system.</p>
        <p style="margin: 0;">Please do not forward this email to anyone outside your project group.<br>Only authorized members can access the workspace.</p>
      </div>
      
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

type GroupAssignmentEmailInput = {
  to: string;
  name?: string | null;
  adviserName?: string | null;
  groupCode?: string | null;
  projectTitle?: string | null;
  role?: string;
  loginUrl?: string;
};

export async function sendGroupAssignmentEmail({
  to,
  name,
  adviserName,
  groupCode,
  projectTitle,
  role,
  loginUrl
}: GroupAssignmentEmailInput) {
  const displayName = name?.trim() || 'Student';
  const adviserText = adviserName ? ` by your adviser, ${adviserName}.` : ` by an adviser.`;
  const subject = 'You have been assigned to a capstone group';
  
  let text = `Hello ${displayName},\n\nYou have been assigned to a new capstone group${adviserText}\n\n`;
  if (groupCode) text += `Group Code: ${groupCode}\n`;
  if (projectTitle) text += `Project Title: ${projectTitle}\n`;
  if (role) text += `Your Role: ${role}\n`;
  text += `\nPlease log in to the ThesisTrack portal to view your group details.\n\nThank you,\nThesisTrack System`;

  const html = `
    <div style="font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #334155; line-height: 1.5;">
      
      <div style="max-width: 600px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 24px; color: #0f4c81; font-weight: 800; letter-spacing: -0.02em;">ThesisTrack</span>
      </div>

      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <div style="height: 6px; background-color: #0f4c81; border-top-left-radius: 12px; border-top-right-radius: 12px;"></div>
        
        <div style="padding: 40px 32px; text-align: center;">
          <h2 style="margin: 0 0 16px; font-size: 22px; color: #0f172a; font-weight: 700;">
            Group Assignment
          </h2>
          <p style="margin: 0 0 32px; font-size: 16px; color: #475569;">
            Hello ${displayName},<br><br>You have been assigned to a capstone group${adviserText}
          </p>
          
          <div style="text-align: left; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; font-size: 14px; color: #334155; margin-bottom: 32px;">
            ${groupCode ? `<div style="margin-bottom: 16px;"><strong style="display: block; font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Group Code</strong> <span style="color: #0f172a; font-weight: 600; font-size: 15px;">${groupCode}</span></div>` : ''}
            ${projectTitle ? `<div style="margin-bottom: 16px;"><strong style="display: block; font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Project Title</strong> <span style="color: #0f172a; font-weight: 600; font-size: 15px;">${projectTitle}</span></div>` : ''}
            ${role ? `<div><strong style="display: block; font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Your Role</strong> <span style="color: #0f172a; font-weight: 600; font-size: 15px;">${role}</span></div>` : ''}
          </div>
          
          <div style="margin-bottom: 16px;">
            ${loginUrl 
              ? `<a href="${loginUrl}" style="display: inline-block; padding: 14px 36px; background-color: #0f4c81; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">View Workspace</a>` 
              : `<span style="display: inline-block; padding: 14px 36px; background-color: #0f4c81; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Log in to ThesisTrack</span>`}
          </div>
        </div>
      </div>
      
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}
