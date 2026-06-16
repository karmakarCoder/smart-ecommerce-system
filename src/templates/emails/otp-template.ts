interface OtpTemplateProps {
  name: string;
  otp: string;
  expiryMinutes?: number;
}

export function getOtpEmailTemplate({ name, otp, expiryMinutes = 15 }: OtpTemplateProps): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Account</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
          color: #334155;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          table-layout: fixed;
          background-color: #f8fafc;
          padding: 40px 0;
        }
        .container {
          max-width: 520px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          overflow: hidden;
        }
        .header {
          background-color: #2563eb;
          padding: 32px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.025em;
        }
        .content {
          padding: 40px 32px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin-top: 0;
          margin-bottom: 12px;
        }
        .text {
          font-size: 15px;
          line-height: 1.6;
          color: #64748b;
          margin: 0 0 28px 0;
        }
        .otp-container {
          background-color: #f1f5f9;
          border-radius: 8px;
          padding: 18px;
          text-align: center;
          margin-bottom: 28px;
          border: 1px dashed #cbd5e1;
        }
        .otp-code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 32px;
          font-weight: 700;
          letter-spacing: 6px;
          color: #1e293b;
          margin: 0;
        }
        .footer {
          padding: 0 32px 32px 32px;
          text-align: center;
        }
        .divider {
          border: 0;
          border-top: 1px solid #e2e8f0;
          margin-bottom: 24px;
        }
        .footer-text {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1>Secure Authentication</h1>
          </div>
          <div class="content">
            <p class="greeting">Hello ${name || 'there'},</p>
            <p class="text">Thank you for creating an account with us. To verify your email address, please use the secure One-Time Password (OTP) provided below. Note that this code is temporary and security-locked.</p>
            
            <div class="otp-container">
              <p class="otp-code">${otp}</p>
            </div>
            
            <p class="text" style="margin-bottom: 0;">This security credential expires in <strong>${expiryMinutes} minutes</strong>. If you did not initiate this registration request, please disregard this notification.</p>
          </div>
          <div class="footer">
            <hr class="divider">
            <p class="footer-text">This is an automated operational transmission message. Please do not reply directly to this mailbox system address.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}