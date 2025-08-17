const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: true, // Allow all origins in production, or specify your domain
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Email transporter configuration
let transporter = null;

// Use environment variables from .env file
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_APP_PASSWORD;
const huggingFaceToken = process.env.HUGGING_FACE_TOKEN;

console.log('Environment check:', {
  hasHuggingFaceToken: !!huggingFaceToken,
  hasEmailUser: !!emailUser,
  hasEmailPassword: !!emailPassword
});

if (emailUser && emailPassword) {
  transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });
  
  // Test email configuration
  transporter.verify((error, success) => {
    if (error) {
      console.log('Email configuration error:', error.message);
    } else {
      console.log('Email server is ready to send messages');
    }
  });
} else {
  console.log('Email credentials missing - email features will be disabled');
}

// Hugging Face API integration
async function summarizeWithHuggingFace(text, customPrompt = '') {
  try {
    console.log('Calling Hugging Face API...');
    
    let processedText = text;
    if (text.length > 4000) {
      processedText = text.substring(0, 4000);
    }
    
    const response = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {
      headers: {
        'Authorization': `Bearer ${huggingFaceToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        inputs: processedText,
        parameters: {
          max_length: 500,
          min_length: 50,
          do_sample: false,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Hugging Face API error: ${response.status} - ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    let summary = result[0]?.summary_text || result[0]?.generated_text || '';

    if (!summary) {
      throw new Error('No summary generated from API');
    }

    // Apply custom prompt formatting
    if (customPrompt.toLowerCase().includes('bullet') || customPrompt.toLowerCase().includes('points')) {
      const sentences = summary.split('.').filter(s => s.trim());
      summary = "Key Points:\n" + sentences.map((sentence) => `• ${sentence.trim()}.`).join('\n');
    } else if (customPrompt.toLowerCase().includes('action')) {
      const sentences = summary.split('.').filter(s => s.trim());
      summary = "Action Items:\n" + sentences.map((sentence, index) => `${index + 1}. ${sentence.trim()}.`).join('\n');
    } else if (customPrompt.toLowerCase().includes('executive')) {
      summary = `Executive Summary:\n\n${summary}`;
    }

    return summary;
  } catch (error) {
    console.error('Hugging Face API error:', error);
    throw error;
  }
}

// Fallback summarization function
function createFallbackSummary(text, customPrompt = '') {
  console.log('Creating fallback summary...');
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const keyPoints = sentences.slice(0, Math.min(5, sentences.length));
  
  let summary = '';
  
  if (customPrompt.toLowerCase().includes('bullet') || customPrompt.toLowerCase().includes('points')) {
    summary = "Key Points:\n" + keyPoints.map((sentence) => `• ${sentence.trim()}.`).join('\n');
  } else if (customPrompt.toLowerCase().includes('action')) {
    summary = "Action Items:\n" + keyPoints.map((sentence, index) => `${index + 1}. ${sentence.trim()}.`).join('\n');
  } else if (customPrompt.toLowerCase().includes('executive')) {
    summary = `Executive Summary:\n\n${keyPoints.join('. ')}.`;
  } else {
    summary = keyPoints.join('. ') + '.';
  }
  
  return summary;
}

// Routes
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Firebase Functions backend is working!',
    env: {
      hasHuggingFaceToken: !!huggingFaceToken,
      hasEmailUser: !!emailUser,
      hasEmailPassword: !!emailPassword,
    },
    timestamp: new Date().toISOString()
  });
});

app.post('/summarize', async (req, res) => {
  try {
    console.log('Received summarize request');
    const { text, customPrompt } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'Text is required' 
      });
    }

    console.log('Text length:', text.length);
    console.log('Custom prompt:', customPrompt);

    let summary;
    let fallback = false;

    try {
      summary = await summarizeWithHuggingFace(text, customPrompt);
    } catch (error) {
      console.log('Hugging Face failed, using fallback...');
      summary = createFallbackSummary(text, customPrompt);
      fallback = true;
    }
    
    res.json({ 
      success: true, 
      summary: summary,
      originalLength: text.length,
      summaryLength: summary.length,
      fallback: fallback
    });
  } catch (error) {
    console.error('Summarization error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate summary',
      details: error.message
    });
  }
});

app.post('/send-email', async (req, res) => {
  try {
    console.log('Received email request');
    
    if (!transporter) {
      return res.status(500).json({ 
        success: false,
        error: 'Email service not configured. Please check your EMAIL_USER and EMAIL_APP_PASSWORD environment variables.'
      });
    }
    
    const { to, subject, body } = req.body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Recipients are required' 
      });
    }

    if (!body || body.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'Email body is required' 
      });
    }

    const mailOptions = {
      from: emailUser,
      to: to.join(','),
      subject: subject || 'Meeting Summary',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            Meeting Summary
          </h2>
          <div style="white-space: pre-wrap; line-height: 1.6; color: #555; background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
            ${body.replace(/\n/g, '<br>')}
          </div>
          <p style="color: #888; font-size: 12px; margin-top: 30px;">
            This summary was generated and sent via AI Meeting Notes Summarizer
          </p>
        </div>
      `
    };

    console.log('Sending email to:', to);
    await transporter.sendMail(mailOptions);
    
    res.json({ 
      success: true, 
      message: 'Email sent successfully',
      recipients: to.length 
    });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send email',
      details: error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Export the API
exports.api = functions.https.onRequest(app);