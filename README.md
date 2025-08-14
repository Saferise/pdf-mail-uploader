# Gmail Report Processor - PDF Attachment Extractor

A Node.js application that connects to your Gmail account via IMAP and automatically saves PDF attachments from emails with "report" in the subject line to a designated folder.

## Features

- 📧 Connects to Gmail via IMAP (secure connection)
- 🔍 Monitors emails with "report" in the subject line
- 📄 Automatically extracts and saves PDF attachments
- 📁 Organizes PDFs in the `all-reports` folder with timestamped filenames
- ⏰ Periodic email checking (configurable interval)
- 📖 Marks processed emails as read
- 📝 Comprehensive logging
- ⚙️ Configurable settings

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up Gmail App Password (see Configuration section)

## Configuration

### Step 1: Gmail App Password Setup

**IMPORTANT**: You must create a Gmail App Password to use this application:

1. **Enable 2-Factor Authentication** on your Gmail account:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification if not already enabled

2. **Generate an App Password**:
   - Go to [App Passwords](https://support.google.com/accounts/answer/185833)
   - Select "Mail" as the app
   - Copy the generated 16-character password

3. **Set the App Password**:
   ```bash
   export GMAIL_APP_PASSWORD="your_16_character_app_password"
   ```

### Step 2: Environment Variables

The application can be configured through environment variables:

- `GMAIL_USER`: Your Gmail address (default: fadiyassin381@gmail.com)
- `GMAIL_APP_PASSWORD`: Your Gmail App Password (REQUIRED)
- `POLL_INTERVAL`: Check interval in milliseconds (default: 30000 = 30 seconds)
- `MARK_AS_READ`: Mark processed emails as read (default: true)
- `REPORTS_FOLDER`: Folder to save PDF reports (default: ./all-reports)
- `LOG_LEVEL`: Logging level (default: info)

## Usage

### Start the Gmail Processor

```bash
# Set your Gmail App Password first
export GMAIL_APP_PASSWORD="your_app_password_here"

# Start the processor
npm start

# Development (with auto-restart)
npm run dev
```

### How It Works

The processor will:

1. Connect to your Gmail account via IMAP
2. Check for unread emails every 30 seconds (configurable)
3. Look for emails with "report" in the subject (case-insensitive)
4. Extract PDF attachments from qualifying emails
5. Save PDFs to the `all-reports` folder with descriptive filenames
6. Mark processed emails as read (optional)

### Filename Format

Saved PDFs follow this naming convention:
```
{timestamp}_{sender}_{original-filename}.pdf
```

Example: `2024-01-15T10-30-45-123Z_john_doe_example_com_monthly-report.pdf`

## Testing

To test the application:

1. **Start the processor** with your Gmail credentials
2. **Send a test email** to your Gmail account (`fadiyassin381@gmail.com`) with:
   - Subject containing "report" (e.g., "Monthly Report", "Sales Report")
   - A PDF attachment
3. **Wait up to 30 seconds** for the processor to check for new emails
4. **Check the `all-reports` folder** for the saved PDF

### Example Test Email

Send an email to `fadiyassin381@gmail.com` with:
- **Subject**: "Weekly Sales Report"
- **Attachment**: Any PDF file
- **From**: Any email address

The processor will automatically detect and save the PDF.

## Logs

The server creates detailed logs in the `logs/` directory:
- `combined.log`: All log messages
- `error.log`: Error messages only
- Console output: Real-time colored output

## File Structure

```
Mail-Server-NJ/
├── server.js          # Main Gmail processor
├── gmailClient.js     # Gmail IMAP client
├── emailProcessor.js  # Email parsing and PDF extraction
├── logger.js          # Logging configuration
├── config.js          # Configuration management
├── package.json       # Dependencies and scripts
├── all-reports/       # Saved PDF reports (created automatically)
└── logs/             # Log files (created automatically)
```

## Requirements

- Node.js 14+
- Gmail account with 2-Factor Authentication enabled
- Gmail App Password

## Troubleshooting

### Common Issues

1. **"Invalid credentials" error**:
   - Make sure you're using an App Password, not your regular Gmail password
   - Ensure 2-Factor Authentication is enabled
   - Double-check the App Password (16 characters, no spaces)

2. **"Connection timeout" error**:
   - Check your internet connection
   - Verify Gmail IMAP is enabled in your account settings

3. **No emails being processed**:
   - Make sure emails have "report" in the subject line
   - Check that emails are unread
   - Look at the logs for detailed information

## Security Note

This application uses secure IMAP connection to Gmail. Your App Password is used only for authentication and is not stored permanently. For additional security:
- Store the App Password in environment variables, not in code
- Use a dedicated Gmail account for this purpose if possible
- Regularly rotate your App Passwords
- Monitor the application logs for any unusual activity
