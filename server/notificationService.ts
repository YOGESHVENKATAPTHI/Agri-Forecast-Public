import nodemailer from "nodemailer";
import { marked } from "marked";
import { storage } from "./storage";

// Twilio integration
let twilioClient: any = null;
let twilioFromNumber: string | null = null;

async function initTwilio() {
  if (twilioClient) return;
  
  try {
    const twilio = await import("twilio");
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID || "AC736a13641a576094689e97d178952530";
    const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_API_SECRET || "7S2DJX6e1lHBoVDoJWb2l1sLyMMSOUgH"; // Use Auth Token, fallback to API Secret
    const fromNumber = process.env.TWILIO_FROM_NUMBER || "+17815274468";
    
    // Initialize with Account SID and Auth Token (not API Keys)
    twilioClient = twilio.default(accountSid, authToken);
    twilioFromNumber = fromNumber;
    
    console.log("✅ Twilio initialized successfully");
    console.log(`📱 Account SID: ${accountSid}`);
    console.log(`📞 From Number: ${fromNumber}`);
    
    // Test Twilio connection by fetching account info
    try {
      const account = await twilioClient.api.accounts(accountSid).fetch();
      console.log(`✅ Twilio account verified: ${account.friendlyName}`);
      console.log(`💰 Account status: ${account.status}`);
    } catch (testError: any) {
      console.error("❌ Twilio account verification failed:", testError.message);
      console.error("💡 Check your Account SID and Auth Token in Twilio Console");
    }
    
  } catch (error: any) {
    console.error("❌ Error initializing Twilio:", error.message);
  }
}

// Email transporter
let emailTransporter: any = null;

function initEmail() {
  if (emailTransporter) return;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    console.log("Email SMTP not configured - using Gmail fallback");
    // Use Gmail with fallback credentials for development
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'joe1972005@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || 'txyn tjow xnmw fntz'
      },
    });
    console.log("Email transporter initialized with Gmail fallback");
    return;
  }

  emailTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });

  console.log("Email transporter initialized");
}

// Helper function to format phone number
function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If empty, return original
  if (cleaned.length === 0) return phoneNumber;

  // If the original started with +, keep it
  if (phoneNumber.startsWith('+')) {
    return `+${cleaned}`;
  }

  // If it starts with 00, replace with +
  if (phoneNumber.startsWith('00')) {
    return `+${cleaned.substring(2)}`;
  }

  // For all other cases, assume the user provided the country code or it's a local number
  // We'll just prepend + to ensure E.164 format compliance
  // Note: Users should ideally provide the country code (e.g., 91 for India, 1 for US)
  return `+${cleaned}`;
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
  await initTwilio();

  if (!twilioClient || !twilioFromNumber) {
    console.error("❌ Twilio not initialized");
    return false;
  }

  try {
    // Format the phone number properly
    const formattedNumber = formatPhoneNumber(to);
    console.log(`📱 Attempting to send SMS to: ${formattedNumber}`);
    
    // Enhanced phone number validation
    const digitCount = formattedNumber.replace(/\D/g, '').length;
    
    // Basic E.164 validation (min 8 digits, max 15 digits)
    if (digitCount < 8 || digitCount > 15) {
      console.error(`❌ Invalid phone number: contains ${digitCount} digits (expected 8-15). Number: ${formattedNumber}`);
      return false;
    }

    // Check for specific country formats that are commonly problematic
    if (formattedNumber.startsWith('+91')) {
      // Indian numbers should have exactly 10 digits after +91
      const indiaDigits = formattedNumber.substring(3);
      if (indiaDigits.length !== 10 || !/^\d{10}$/.test(indiaDigits)) {
        console.error(`❌ Invalid Indian phone number: +91 should be followed by exactly 10 digits. Got: ${formattedNumber}`);
        console.error(`💡 Please update your phone number in profile. Example: +919876543210`);
        return false;
      }
    }

    // Check for incomplete numbers (contains X or other placeholder characters)
    if (/[^+\d]/.test(formattedNumber)) {
      console.error(`❌ Phone number contains invalid characters: ${formattedNumber}`);
      console.error(`💡 Phone number should only contain digits and +. Please update your phone number in profile.`);
      return false;
    }

    console.log(`📝 Message content: ${message.substring(0, 100)}...`);
    console.log(`📞 From number: ${twilioFromNumber}`);
    
    // Check if it's a supported region (India in this case)
    if (!formattedNumber.startsWith('+91')) {
      console.warn(`⚠️ Phone number ${formattedNumber} is not from India (+91). Please enable the corresponding region in Twilio Console.`);
      console.warn(`💡 To enable regions: Twilio Console → Messaging → Settings → Geo Permissions`);
    }

    const messageResponse = await twilioClient.messages.create({
      body: message,
      from: twilioFromNumber,
      to: formattedNumber,
    });
    
    // Log detailed response information
    console.log(`✅ SMS API Response:`);
    console.log(`   Message SID: ${messageResponse.sid}`);
    console.log(`   Status: ${messageResponse.status}`);
    console.log(`   Direction: ${messageResponse.direction}`);
    console.log(`   Error Code: ${messageResponse.errorCode || 'None'}`);
    console.log(`   Error Message: ${messageResponse.errorMessage || 'None'}`);
    
    // Check for common issues
    if (messageResponse.status === 'failed') {
      console.error(`❌ SMS failed to send:`);
      console.error(`   Error Code: ${messageResponse.errorCode}`);
      console.error(`   Error Message: ${messageResponse.errorMessage}`);
      return false;
    }
    
    if (messageResponse.status === 'undelivered') {
      console.error(`❌ SMS undelivered:`);
      console.error(`   Possible reasons: Invalid number, carrier issues, or blocked`);
      return false;
    }
    
    // Status could be: queued, sending, sent, delivered, failed, undelivered
    console.log(`✅ SMS queued/sent successfully to ${formattedNumber}`);
    console.log(`💡 Note: If message status is 'queued' or 'sent', delivery may take a few minutes`);
    
    // Check message status after a short delay to catch carrier blocks
    setTimeout(async () => {
      try {
        const statusCheck = await checkSMSStatus(messageResponse.sid);
        if (statusCheck && statusCheck.errorCode) {
          console.error(`🚨 SMS Delivery Issue Detected:`);
          console.error(`   Message SID: ${statusCheck.sid}`);
          console.error(`   Error Code: ${statusCheck.errorCode}`);
          console.error(`   Error Message: ${statusCheck.errorMessage}`);
          
          // Provide specific solutions for common error codes
          if (statusCheck.errorCode === '30044') {
            console.error(`💡 Error 30044 Solutions:`);
            console.error(`   - Message blocked by carrier (Jio/Airtel/Vodafone)`);
            console.error(`   - Try shorter, simpler message content`);
            console.error(`   - Avoid words like 'forecast', 'alert', 'urgent'`);
            console.error(`   - Consider using a different Twilio phone number`);
          } else if (statusCheck.errorCode === '30006') {
            console.error(`💡 Error 30006 Solutions:`);
            console.error(`   - Invalid destination number format`);
            console.error(`   - Verify phone number: ${formattedNumber}`);
          }
        }
      } catch (error: any) {
        console.warn(`⚠️ Could not check SMS status: ${error?.message || 'Unknown error'}`);
      }
    }, 10000); // Check after 10 seconds
    
    return true;
  } catch (error: any) {
    console.error("❌ Error sending SMS:", error.message);
    console.error("❌ Full error:", error);
    
    // Provide specific guidance based on error type
    if (error.message.includes('Permission to send an SMS has not been enabled')) {
      console.error(`🚫 Region not enabled in Twilio. Please enable the region for number: ${to}`);
      console.error(`💡 Solution: Go to Twilio Console → Messaging → Settings → Geo Permissions and enable the required region`);
    } else if (error.message.includes('The number') && error.message.includes('is not a valid phone number')) {
      console.error(`🚫 Invalid phone number format: ${to}`);
      console.error(`💡 Use format: +919876543210 for Indian numbers`);
    } else if (error.message.includes('Account not authorized')) {
      console.error(`🚫 Account authorization issue`);
      console.error(`💡 Check your Twilio Account SID and Auth Token`);
    } else if (error.message.includes('Trial account')) {
      console.error(`🚫 Trial account restriction`);
      console.error(`💡 Add the phone number to verified numbers in Twilio Console or upgrade account`);
    }
    
    return false;
  }
}

// Create carrier-friendly SMS message (to avoid blocking)
function createCarrierFriendlyMessage(title: string, message: string): string {
  // Remove problematic words that trigger spam filters
  const problematicWords = ['forecast', 'alert', 'urgent', 'warning', 'emergency', 'critical', 'severe'];
  let cleanTitle = title;
  let cleanMessage = message;
  
  problematicWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    cleanTitle = cleanTitle.replace(regex, '');
    cleanMessage = cleanMessage.replace(regex, '');
  });
  
  // Truncate message to avoid long AI content (carriers block long messages)
  const maxLength = 160; // Standard SMS length
  let combinedMessage = `${cleanTitle.trim()}: ${cleanMessage.trim()}`;
  
  if (combinedMessage.length > maxLength) {
    const titleLength = cleanTitle.length + 2; // +2 for ": "
    const availableMessageLength = maxLength - titleLength;
    cleanMessage = cleanMessage.substring(0, availableMessageLength - 3) + '...';
    combinedMessage = `${cleanTitle.trim()}: ${cleanMessage}`;
  }
  
  return combinedMessage.trim();
}

// Function to check SMS delivery status
export async function checkSMSStatus(messageSid: string): Promise<any> {
  await initTwilio();
  
  if (!twilioClient) {
    console.error("❌ Twilio not initialized");
    return null;
  }
  
  try {
    const message = await twilioClient.messages(messageSid).fetch();
    console.log(`📱 SMS Status Check for ${messageSid}:`);
    console.log(`   Status: ${message.status}`);
    console.log(`   Error Code: ${message.errorCode || 'None'}`);
    console.log(`   Error Message: ${message.errorMessage || 'None'}`);
    console.log(`   Date Created: ${message.dateCreated}`);
    console.log(`   Date Sent: ${message.dateSent || 'Not sent yet'}`);
    console.log(`   Price: ${message.price || 'N/A'} ${message.priceUnit || ''}`);
    
    return message;
  } catch (error: any) {
    console.error("❌ Error checking SMS status:", error.message);
    return null;
  }
}

export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  initEmail();

  if (!emailTransporter) {
    console.error("Email transporter not initialized");
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_USER || 'joe1972005@gmail.com',
      to,
      subject,
      text,
      html: html || `<p>${text.replace(/\n/g, "<br>")}</p>`,
    };
    
    console.log(`📧 Sending email to ${to} with subject: ${subject}`);
    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
    return true;
  } catch (error: any) {
    console.error("❌ Error sending email:", error.message);
    console.error("Email error details:", error);
    return false;
  }
}

// Enhanced email function for crop recommendations with rich formatting
export async function sendCropRecommendationEmail(
  userId: string, 
  cropName: string, 
  reasoning: string, 
  detailedPlan?: string,
  landId?: number | null
): Promise<boolean> {
  return sendPredictionEmail(userId, `Crop Recommendation: ${cropName}`, `**Reasoning:**\n${reasoning}\n\n**Detailed Plan:**\n${detailedPlan || 'No detailed plan available.'}`, landId);
}

// Helper to process LaTeX in markdown before passing to marked
function processLatex(text: string): string {
  // Replace block math $$...$$ with a div class="math-block"
  let processed = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, p1) => {
    return `<div class="math-block">${p1.trim()}</div>`;
  });
  
  // Replace inline math $...$ with span class="math-inline"
  processed = processed.replace(/\$([^$]+)\$/g, (match, p1) => {
    return `<span class="math-inline">${p1.trim()}</span>`;
  });
  
  return processed;
}

// Helper to strip markdown for SMS
function stripMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
    .replace(/#{1,6}\s/g, '') // Headers
    .replace(/`{3}[\s\S]*?`{3}/g, '[Code Block]') // Code blocks
    .replace(/`(.+?)`/g, '$1') // Inline code
    .replace(/\$\$[\s\S]*?\$\$/g, '[Math Formula]') // Block math
    .replace(/\$.+?\$/g, '[Math]') // Inline math
    .replace(/^\s*[-+*]\s/gm, '• ') // Lists
    .replace(/\n{3,}/g, '\n\n') // Excessive newlines
    .trim();
}

export async function sendPredictionSMS(
  userId: string,
  title: string,
  message: string,
  landId?: number | null
): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user || !user.phoneNumber) return false;

    let landName = "";
    if (landId) {
      const land = await storage.getLandAreaById(landId);
      if (land) landName = land.name;
    }

    // Format for SMS: Title + Land + Stripped Message
    const cleanMessage = stripMarkdown(message);
    const smsContent = createCarrierFriendlyMessage(
      `${title}${landName ? ` (${landName})` : ''}`, 
      cleanMessage
    );

    return await sendSMS(user.phoneNumber, smsContent);
  } catch (error: any) {
    console.error("Error sending prediction SMS:", error.message);
    return false;
  }
}

export async function sendPredictionEmail(
  userId: string,
  title: string,
  message: string,
  landId?: number | null
): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user || !user.email) return false;

    let landName = "";
    let landAddress = "";
    if (landId) {
      const land = await storage.getLandAreaById(landId);
      if (land) {
        landName = land.name;
        landAddress = land.address || `${land.latitude}, ${land.longitude}`;
      }
    }

    // Process LaTeX and Markdown
    const contentWithLatex = processLatex(message);
    const htmlContent = await marked.parse(contentWithLatex);
    
    // Determine header color and icon based on title
    let headerColor = "#4f46e5"; // Default Indigo
    let headerIcon = "📢";
    
    if (title.toLowerCase().includes("weather")) {
      headerColor = "#0ea5e9"; // Sky Blue
      headerIcon = "🌤️";
    } else if (title.toLowerCase().includes("drought")) {
      headerColor = "#d97706"; // Amber/Orange
      headerIcon = "🌵";
    } else if (title.toLowerCase().includes("crop")) {
      headerColor = "#16a34a"; // Green
      headerIcon = "🌱";
    } else if (title.toLowerCase().includes("alert") || title.toLowerCase().includes("warning")) {
      headerColor = "#dc2626"; // Red
      headerIcon = "⚠️";
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 800px; margin: 0 auto; padding: 0; background-color: #f3f4f6; }
          .container { background-color: #ffffff; border-radius: 8px; overflow: hidden; margin: 20px auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { background-color: ${headerColor}; color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
          .land-badge { background-color: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 9999px; font-size: 14px; margin-top: 10px; display: inline-block; }
          .content { padding: 30px 20px; }
          
          /* Markdown Styles */
          h1, h2, h3 { color: #111827; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; }
          h1 { font-size: 1.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
          h2 { font-size: 1.25em; }
          p { margin-bottom: 1em; }
          ul, ol { margin-bottom: 1em; padding-left: 1.5em; }
          li { margin-bottom: 0.5em; }
          strong { color: #111827; font-weight: 600; }
          blockquote { border-left: 4px solid ${headerColor}; background-color: #f9fafb; padding: 1em; margin: 1em 0; font-style: italic; color: #4b5563; }
          code { background-color: #f3f4f6; padding: 0.2em 0.4em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.9em; color: #ef4444; }
          pre { background-color: #1f2937; color: #f9fafb; padding: 1em; border-radius: 8px; overflow-x: auto; margin: 1em 0; }
          pre code { background-color: transparent; color: inherit; padding: 0; }
          table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.95em; }
          th { background-color: #f9fafb; font-weight: 600; text-align: left; padding: 0.75em; border-bottom: 2px solid #e5e7eb; }
          td { padding: 0.75em; border-bottom: 1px solid #e5e7eb; }
          tr:last-child td { border-bottom: none; }
          a { color: ${headerColor}; text-decoration: none; font-weight: 500; }
          a:hover { text-decoration: underline; }
          hr { border: 0; border-top: 1px solid #e5e7eb; margin: 2em 0; }
          
          /* Math/LaTeX Styles */
          .math-block { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; font-family: 'Times New Roman', serif; font-style: italic; text-align: center; margin: 1em 0; color: #334155; }
          .math-inline { font-family: 'Times New Roman', serif; font-style: italic; color: #334155; background-color: #f1f5f9; padding: 0 4px; border-radius: 3px; }

          .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
          .action-button { display: inline-block; background-color: ${headerColor}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 20px; }
          .action-button:hover { background-color: #000000; color: white; text-decoration: none; opacity: 0.9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${headerIcon} ${title}</h1>
            ${landName ? `<div class="land-badge">📍 ${landName} (${landAddress})</div>` : ''}
          </div>
          
          <div class="content">
            ${htmlContent}
            
            <div style="text-align: center;">
              <a href="https://agri-forecast-7g7m.onrender.com/predictions" class="action-button">View Full Analysis</a>
            </div>
          </div>
          
          <div class="footer">
            <p>Generated by <strong>AgriPredict</strong> - Your AI Agricultural Assistant</p>
            <p>This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendEmail(user.email, title, stripMarkdown(message), emailHtml);
  } catch (error: any) {
    console.error("Error sending prediction email:", error.message);
    return false;
  }
}

export async function sendEnhancedNotification(
  userId: string,
  type: 'weather' | 'crop' | 'drought',
  data: any,
  landId?: number | null
): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return;

    // Prepare content based on type
    let title = "";
    let message = "";

    if (type === 'weather') {
      title = `Weather Update: ${data.title}`;
      message = `
**Severity:** ${data.severity}
**Confidence:** ${data.confidence}%

${data.description}

## Analysis
${data.data?.analysis || 'No detailed analysis available.'}
      `;
    } else if (type === 'crop') {
      title = `Crop Recommendation: ${data.cropName}`;
      message = `
**Confidence:** ${data.confidence}%

## Reasoning
${data.reasoning}

## Detailed Plan
${data.detailedPlan}
      `;
    } else if (type === 'drought') {
      title = `Drought Alert: ${data.riskLevel}`;
      message = `
**Probability:** ${data.probability}%
**Timeframe:** ${data.timeframe}

## Analysis
${data.analysis}

## Recommendations
${data.recommendations?.immediate?.map((r: string) => `- ${r}`).join('\n') || ''}
      `;
    }

    // Send Email
    if (user.email && user.emailNotifications) {
      await sendPredictionEmail(userId, title, message, landId);
    }

    // SMS is now manual only - removed automatic sending
    // if (user.phoneNumber && user.smsNotifications) {
    //   await sendPredictionSMS(userId, title, message, landId);
    // }

  } catch (error) {
    console.error("Error sending enhanced notification:", error);
  }
}

// Send SMS manually (only when user clicks send button)
export async function sendManualSMS(
  userId: string, 
  title: string, 
  message: string, 
  landId?: number | null
): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return false;

    // Check if SMS is enabled for this user
    if (!user.smsNotifications) {
      console.error("SMS notifications disabled for user");
      return false;
    }

    // Use the shared prediction SMS function which handles formatting and markdown stripping
    return await sendPredictionSMS(userId, title, message, landId);
  } catch (error: any) {
    console.error("Error sending manual SMS:", error.message);
    return false;
  }
}



// Legacy function for backward compatibility - only sends email automatically
export async function sendWeatherAlert(
  userId: string, 
  title: string, 
  message: string, 
  landId?: number | null
): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return;

    // Enhanced message with land information
    let enhancedMessage = message;
    if (landId) {
      const land = await storage.getLandAreaById(landId);
      if (land) {
        const address = land.address ? land.address.split(',').slice(0, 2).join(', ') : `${land.latitude}, ${land.longitude}`;
        enhancedMessage = `Land: ${land.name} (${address})\n\n${message}`;
      }
    }

    // Save notification to database
    const notificationData: any = {
      userId,
      type: "email",
      subject: title,
      message: enhancedMessage,
      status: "pending",
    };
    await storage.saveNotification(notificationData);

    // Only send email automatically - SMS is manual only
    if (user.email) {
      const sent = await sendPredictionEmail(userId, title, message, landId);
      if (sent) {
        console.log(`Prediction email sent to ${user.email}`);
      }
    }

    // Send SMS if enabled
    if (user.phoneNumber && user.smsNotifications) {
      const sent = await sendPredictionSMS(userId, title, message, landId);
      if (sent) {
        console.log(`Prediction SMS sent to ${user.phoneNumber}`);
      }
    }
  } catch (error: any) {
    console.error("Error sending weather alert:", error.message);
  }
}
