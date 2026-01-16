/**
 * Email Service using Nodemailer with SMTP
 *
 * Provides email sending functionality for:
 * - Password reset emails
 * - Email change verification emails
 * - Admin notifications for new user registrations
 */

import nodemailer from 'nodemailer'
import { logger } from '@/lib/logging/server'

// Environment validation
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASSWORD = process.env.SMTP_PASSWORD
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASSWORD)
}

/**
 * Create nodemailer transporter with Zoho SMTP configuration
 */
function createTransporter() {
  if (!isEmailConfigured()) {
    throw new Error('Email service not configured. Please set SMTP environment variables.')
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  })
}

/**
 * Send password reset email
 *
 * @param email - Recipient email address
 * @param token - Password reset token
 * @param username - Optional username for personalization
 */
export async function sendPasswordResetEmail(email: string, token: string, username?: string): Promise<boolean> {
  try {
    const transporter = createTransporter()
    const resetUrl = `${APP_URL}/reset-password?token=${token}`

    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'Reset Your Password - Astrologer Studio',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🌟 Astrologer Studio</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
            
            <p>Hello${username ? ` ${username}` : ''},</p>
            
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
            
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset Request - Astrologer Studio

Hello${username ? ` ${username}` : ''},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
      `.trim(),
    })

    logger.info(`Password reset email sent to ${email}`)
    return true
  } catch (error) {
    logger.error('Failed to send password reset email:', error)
    return false
  }
}

/**
 * Send email change verification email
 *
 * @param newEmail - New email address to verify
 * @param token - Verification token
 * @param username - Optional username for personalization
 */
export async function sendEmailChangeVerification(
  newEmail: string,
  token: string,
  username?: string,
): Promise<boolean> {
  try {
    const transporter = createTransporter()
    const verifyUrl = `${APP_URL}/verify-email?token=${token}`

    await transporter.sendMail({
      from: SMTP_FROM,
      to: newEmail,
      subject: 'Verify Your New Email - Astrologer Studio',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🌟 Astrologer Studio</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1f2937; margin-top: 0;">Verify Your New Email Address</h2>
            
            <p>Hello${username ? ` ${username}` : ''},</p>
            
            <p>You've requested to change your email address to this one. Click the button below to verify and complete the change:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours.</p>
            
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this email change, please ignore this email or contact support if you're concerned about your account security.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color: #6366f1; word-break: break-all;">${verifyUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Verify Your New Email Address - Astrologer Studio

Hello${username ? ` ${username}` : ''},

You've requested to change your email address to this one. Click the link below to verify and complete the change:

${verifyUrl}

This link will expire in 24 hours.

If you didn't request this email change, please ignore this email or contact support if you're concerned about your account security.
      `.trim(),
    })

    logger.info(`Email change verification sent to ${newEmail}`)
    return true
  } catch (error) {
    logger.error('Failed to send email change verification:', error)
    return false
  }
}

/**
 * Send account verification email for new registrations
 *
 * @param email - Recipient email address
 * @param token - Verification token
 * @param username - Username for personalization
 */
export async function sendAccountVerificationEmail(email: string, token: string, username: string): Promise<boolean> {
  try {
    const transporter = createTransporter()
    const verifyUrl = `${APP_URL}/verify-account?token=${token}`

    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'Verify Your Account - Astrologer Studio',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🌟 Astrologer Studio</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1f2937; margin-top: 0;">Welcome, ${username}!</h2>
            
            <p>Thank you for registering with Astrologer Studio. Please verify your email address to activate your account:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Verify My Account
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours.</p>
            
            <p style="color: #6b7280; font-size: 14px;">If you didn't create this account, you can safely ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color: #6366f1; word-break: break-all;">${verifyUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to Astrologer Studio, ${username}!

Thank you for registering. Please verify your email address to activate your account:

${verifyUrl}

This link will expire in 24 hours.

If you didn't create this account, you can safely ignore this email.
      `.trim(),
    })

    logger.info(`Account verification email sent to ${email}`)
    return true
  } catch (error) {
    logger.error('Failed to send account verification email:', error)
    return false
  }
}

/**
 * Send account deletion confirmation email
 *
 * @param email - Recipient email address
 * @param token - Deletion confirmation token
 * @param username - Optional username for personalization
 */
export async function sendAccountDeletionConfirmation(
  email: string,
  token: string,
  username?: string,
): Promise<boolean> {
  try {
    const transporter = createTransporter()
    const confirmUrl = `${APP_URL}/confirm-account-deletion?token=${token}`

    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'Confirm Account Deletion - Astrologer Studio',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Account Deletion Request</h1>
          </div>
          
          <div style="background: #fef2f2; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #fecaca;">
            <h2 style="color: #991b1b; margin-top: 0;">Confirm Account Deletion</h2>
            
            <p>Hello${username ? ` ${username}` : ''},</p>
            
            <p style="color: #dc2626; font-weight: 600;">You have requested to permanently delete your Astrologer Studio account.</p>
            
            <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b;"><strong>Warning:</strong> This action is irreversible. The following will be permanently deleted:</p>
              <ul style="color: #991b1b; margin: 10px 0;">
                <li>Your profile and account settings</li>
                <li>All saved subjects and birth charts</li>
                <li>All saved calculations and interpretations</li>
                <li>Your subscription (if active) will be cancelled</li>
              </ul>
            </div>
            
            <p>If you are sure you want to delete your account, click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" style="background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Confirm Account Deletion
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
            
            <p style="color: #6b7280; font-size: 14px;"><strong>If you did not request this</strong>, please ignore this email. Your account will remain safe.</p>
            
            <hr style="border: none; border-top: 1px solid #fecaca; margin: 20px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${confirmUrl}" style="color: #dc2626; word-break: break-all;">${confirmUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Account Deletion Request - Astrologer Studio

Hello${username ? ` ${username}` : ''},

You have requested to permanently delete your Astrologer Studio account.

WARNING: This action is irreversible. The following will be permanently deleted:
- Your profile and account settings
- All saved subjects and birth charts
- All saved calculations and interpretations
- Your subscription (if active) will be cancelled

If you are sure you want to delete your account, click the link below:

${confirmUrl}

This link will expire in 1 hour for security reasons.

If you did not request this, please ignore this email. Your account will remain safe.
      `.trim(),
    })

    logger.info(`Account deletion confirmation email sent to ${email}`)
    return true
  } catch (error) {
    logger.error('Failed to send account deletion confirmation email:', error)
    return false
  }
}

/**
 * Send notification email to admin when a new user registers
 *
 * @param username - The new user's username
 * @param email - The new user's email
 * @param authMethod - How the user registered ('email' or 'google')
 * @param subscriptionPlan - The user's subscription plan ('free', 'trial', or 'pro')
 */
export async function sendNewUserEmailNotification(
  username: string,
  email: string,
  authMethod: 'email' | 'google',
  subscriptionPlan: 'free' | 'trial' | 'pro' = 'free',
): Promise<boolean> {
  // Skip if no admin email configured or email service not available
  if (!ADMIN_NOTIFICATION_EMAIL || !isEmailConfigured()) {
    return false
  }

  try {
    const transporter = createTransporter()
    const timestamp = new Date().toLocaleString('it-IT', {
      timeZone: 'Europe/Rome',
      dateStyle: 'full',
      timeStyle: 'medium',
    })

    // Mask email for privacy (show first 2 chars and domain)
    const [localPart, domain] = email.split('@')
    const maskedEmail = localPart && domain ? `${localPart.slice(0, 2)}***@${domain}` : '***@***'

    const authMethodLabel = authMethod === 'google' ? 'Google OAuth' : 'Email'
    const authMethodIcon = authMethod === 'google' ? '🔵' : '📧'

    const subscriptionLabels: Record<string, string> = {
      pro: 'Pro (a pagamento)',
      trial: 'Trial PRO (prova gratuita)',
      free: 'Free',
    }
    const subscriptionIcons: Record<string, string> = {
      pro: '⭐',
      trial: '🎁',
      free: '🆓',
    }
    const subscriptionColors: Record<string, string> = {
      pro: '#f59e0b',
      trial: '#8b5cf6',
      free: '#6b7280',
    }
    const subscriptionLabel = subscriptionLabels[subscriptionPlan] || 'Free'
    const subscriptionIcon = subscriptionIcons[subscriptionPlan] || '🆓'
    const subscriptionColor = subscriptionColors[subscriptionPlan] || '#6b7280'

    await transporter.sendMail({
      from: SMTP_FROM,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `🎉 Nuovo utente registrato: ${username} - Astrologer Studio`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Nuovo Utente Registrato!</h1>
          </div>
          
          <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #bbf7d0;">
            <h2 style="color: #166534; margin-top: 0;">Dettagli Registrazione</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #bbf7d0; font-weight: 600; color: #166534;">Username:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #bbf7d0;">${username}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #bbf7d0; font-weight: 600; color: #166534;">Email:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #bbf7d0;">${maskedEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #bbf7d0; font-weight: 600; color: #166534;">Metodo:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #bbf7d0;">${authMethodIcon} ${authMethodLabel}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #bbf7d0; font-weight: 600; color: #166534;">Piano:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #bbf7d0;"><span style="color: ${subscriptionColor}; font-weight: 600;">${subscriptionIcon} ${subscriptionLabel}</span></td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: 600; color: #166534;">Data:</td>
                <td style="padding: 10px 0;">${timestamp}</td>
              </tr>
            </table>
            
            <div style="text-align: center; margin-top: 25px;">
              <a href="${APP_URL}/admin" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Vai al Pannello Admin
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #bbf7d0; margin: 25px 0;">
            
            <p style="color: #6b7280; font-size: 12px; margin-bottom: 0; text-align: center;">
              Questa email è stata inviata automaticamente da Astrologer Studio.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Nuovo Utente Registrato - Astrologer Studio

Dettagli Registrazione:
- Username: ${username}
- Email: ${maskedEmail}
- Metodo: ${authMethodLabel}
- Piano: ${subscriptionLabel}
- Data: ${timestamp}

Vai al Pannello Admin: ${APP_URL}/admin
      `.trim(),
    })

    logger.info(`New user notification email sent to admin for user: ${username}`)
    return true
  } catch (error) {
    logger.error('Failed to send new user notification email:', error)
    return false
  }
}
