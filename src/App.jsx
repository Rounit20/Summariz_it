import React, { useState } from 'react';
import { Upload, FileText, Send, Edit3, Share2, Loader2, CheckCircle, AlertCircle, Users, Clock, Star } from 'lucide-react';

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [summary, setSummary] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'success', 'error', 'info'

  // Backend URL - Update this if your backend runs on a different port
  // Change this line:
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // This will use Firebase Functions
  : 'http://localhost:5000/api';

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  // Test backend connection
  const testBackendConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/test`);
      const data = await response.json();
      if (data.message) {
        showMessage('Backend connection successful!', 'success');
        console.log('Backend test response:', data);
      }
    } catch (error) {
      showMessage('Backend connection failed. Make sure the server is running on port 5000.', 'error');
      console.error('Backend test error:', error);
    }
  };

  // API call to generate summary
  const generateSummary = async () => {
    if (!transcript.trim()) {
      showMessage('Please upload or enter a transcript first.', 'error');
      return;
    }

    setIsGenerating(true);
    setSummary('');
    setEditedSummary('');

    try {
      console.log('Sending request to backend...');
      const response = await fetch(`${API_BASE_URL}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: transcript,
          customPrompt: customPrompt
        }),
      });

      const data = await response.json();
      console.log('Backend response:', data);

      if (data.success) {
        setSummary(data.summary);
        setEditedSummary(data.summary);
        showMessage(
          data.fallback 
            ? 'Summary generated using fallback method.' 
            : 'Summary generated successfully!', 
          'success'
        );
      } else {
        throw new Error(data.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      showMessage('Failed to generate summary. Please check if the backend server is running on port 5000.', 'error');
    }

    setIsGenerating(false);
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'text/plain') {
      showMessage('Please upload a valid text file (.txt)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showMessage('File size should be less than 5MB', 'error');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTranscript(e.target.result);
        showMessage(`File "${file.name}" uploaded successfully!`, 'success');
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('File upload error:', error);
      showMessage('Failed to read file. Please try again.', 'error');
    }
  };

  // Send email
  const sendEmail = async () => {
    if (!emailRecipients.trim() || !editedSummary.trim()) {
      showMessage('Please enter recipients and ensure summary is available.', 'error');
      return;
    }

    // Validate email format
    const emails = emailRecipients.split(',').map(email => email.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      showMessage(`Invalid email addresses: ${invalidEmails.join(', ')}`, 'error');
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(`${API_BASE_URL}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emails,
          subject: 'Meeting Summary - Generated Report',
          body: editedSummary,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage(`Summary sent successfully to ${data.recipients} recipient(s)!`, 'success');
        setShowEmailForm(false);
        setEmailRecipients('');
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      showMessage('Failed to send email. Please check your email configuration and backend server.', 'error');
    }

    setIsSending(false);
  };

  const clearAll = () => {
    setTranscript('');
    setCustomPrompt('');
    setSummary('');
    setEditedSummary('');
    setEmailRecipients('');
    setShowEmailForm(false);
    setMessage('');
  };

  const getMessageIcon = () => {
    switch (messageType) {
      case 'success': return <CheckCircle className="h-5 w-5" />;
      case 'error': return <AlertCircle className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getMessageColor = () => {
    switch (messageType) {
      case 'success': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'error': return 'bg-red-50 text-red-800 border-red-200';
      default: return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl mb-6 shadow-xl">
            <Users className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4">
            Meeting Notes Summarizer
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Transform your meeting transcripts into professional summaries and share them effortlessly with your team
          </p>
          
          {/* Connection Status */}
          <div className="mt-8 flex items-center justify-center gap-6">
            {/* <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-gray-200">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 font-medium">Backend: localhost:5000</span>
            </div> */}
            <button
              onClick={testBackendConnection}
              className="px-6 py-2 bg-white/80 backdrop-blur-sm text-blue-700 rounded-full hover:bg-white hover:shadow-md transition-all duration-200 font-medium border border-blue-100"
            >
              Test Connection
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-xl mb-8 border flex items-center gap-3 backdrop-blur-sm shadow-sm ${getMessageColor()}`}>
            {getMessageIcon()}
            <span className="font-medium">{message}</span>
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Upload className="h-6 w-6 text-blue-600" />
                Input Transcript
              </h2>

              {/* File Upload */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Upload Document
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-50 file:to-indigo-50 file:text-blue-700 hover:file:from-blue-100 hover:file:to-indigo-100 file:cursor-pointer cursor-pointer file:transition-all file:duration-200"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Supports .txt files up to 5MB
                </p>
              </div>

              {/* Text Input */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Or Enter Transcript Directly
                </label>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical text-gray-900 bg-white/90 backdrop-blur-sm placeholder-gray-400 transition-all duration-200"
                  placeholder="Paste your meeting transcript here...

Example: 'The team discussed the quarterly goals and decided to focus on three main areas: customer acquisition, product development, and team expansion. John will lead the customer acquisition efforts, Sarah will handle product development, and Mike will work on hiring new team members. The deadline for initial plans is next Friday.'"
                />
                <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {transcript.length} characters
                  </span>
                  {transcript && (
                    <button
                      onClick={() => setTranscript('')}
                      className="text-red-500 hover:text-red-700 font-medium transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Summary Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white/90 backdrop-blur-sm placeholder-gray-400 transition-all duration-200"
                  placeholder="e.g., 'Create executive summary with bullet points' or 'Highlight action items and decisions'"
                />
                
                {/* Preset Options */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    'Executive summary with key points',
                    'Action items and next steps',
                    'Decisions and outcomes',
                    'Bullet points for leadership'
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setCustomPrompt(preset)}
                      className="text-xs px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 border border-gray-200 font-medium"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex gap-3">
                <button
                  onClick={generateSummary}
                  disabled={isGenerating || !transcript.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Star className="h-5 w-5" />
                      Generate Summary
                    </>
                  )}
                </button>
                {(transcript || summary) && (
                  <button
                    onClick={clearAll}
                    className="px-6 py-2 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Output */}
          <div className="space-y-8">
            {summary ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <Edit3 className="h-6 w-6 text-green-600" />
                  Generated Summary
                </h2>
                
                <textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  rows={15}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-vertical bg-white/90 backdrop-blur-sm text-gray-900 transition-all duration-200"
                  placeholder="Your generated summary will appear here and can be edited..."
                />
                
                <div className="flex justify-between items-center text-xs text-gray-500 mt-3">
                  <span>{editedSummary.length} characters</span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Auto-generated • Editable
                  </span>
                </div>
                
                {/* Share Button */}
                <div className="mt-6">
                  <button
                    onClick={() => setShowEmailForm(!showEmailForm)}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center gap-2 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    <Share2 className="h-5 w-5" />
                    Share via Email
                  </button>
                </div>

                {/* Email Form */}
                {showEmailForm && (
                  <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Send className="h-5 w-5 text-blue-600" />
                      Share Summary
                    </h3>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Email Recipients (comma-separated)
                    </label>
                    <input
                      type="email"
                      multiple
                      value={emailRecipients}
                      onChange={(e) => setEmailRecipients(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 text-gray-900 bg-white/90 backdrop-blur-sm transition-all duration-200"
                      placeholder="john@company.com, sarah@company.com, team@company.com"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={sendEmail}
                        disabled={isSending || !emailRecipients.trim()}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold transition-all duration-200"
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Send Summary
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowEmailForm(false)}
                        className="px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-white/80 transition-all duration-200 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                  <FileText className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">
                  Ready to Generate
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Upload a transcript or enter meeting notes to get started with intelligent summarization
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 bg-white/40 backdrop-blur-sm rounded-2xl border border-gray-100 p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">1. Upload Content</h4>
              <p className="text-sm text-gray-600">Upload transcript files or paste meeting notes directly into the editor</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Star className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">2. Generate Summary</h4>
              <p className="text-sm text-gray-600">Advanced algorithms create professional summaries with customizable instructions</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Share2 className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">3. Share Results</h4>
              <p className="text-sm text-gray-600">Edit summaries and share them via email with formatted HTML output</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Powered by Advanced Language Processing • Built with React & Node.js
          </p>
        </div>
      </div>
    </div>
  );
}