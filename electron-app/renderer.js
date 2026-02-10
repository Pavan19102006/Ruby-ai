// Ruby AI Desktop - Renderer Script

let serverUrl = 'https://ruby-ai.onrender.com';
let currentConversationId = null;
let pendingScreenshot = null;
let isLoading = false;

// DOM Elements
const messagesContainer = document.getElementById('messages');
const welcomeScreen = document.getElementById('welcome');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const captureBtn = document.getElementById('captureBtn');
const screenshotPreview = document.getElementById('screenshotPreview');
const screenshotImg = document.getElementById('screenshotImg');
const removeScreenshot = document.getElementById('removeScreenshot');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const hideBtn = document.getElementById('hideBtn');
const newChatBtn = document.getElementById('newChatBtn');

// Initialize
async function init() {
  // Get server URL from main process
  serverUrl = await window.electronAPI.getServerUrl();

  // Check server status
  checkServerStatus();
  setInterval(checkServerStatus, 30000);

  // Listen for screenshots from main process
  window.electronAPI.onScreenshotCaptured((screenshot) => {
    setScreenshot(screenshot);
  });
}

// Check if server is online
async function checkServerStatus() {
  try {
    const response = await fetch(`${serverUrl}/api/conversations`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    if (response.ok) {
      statusDot.classList.remove('offline');
      statusText.textContent = 'Online';
    } else {
      throw new Error('Server error');
    }
  } catch (error) {
    statusDot.classList.add('offline');
    statusText.textContent = 'Offline';
  }
}

// Set screenshot preview
function setScreenshot(dataUrl) {
  pendingScreenshot = dataUrl;
  screenshotImg.src = dataUrl;
  screenshotPreview.style.display = 'flex';
  messageInput.focus();
}

// Clear screenshot
function clearScreenshot() {
  pendingScreenshot = null;
  screenshotPreview.style.display = 'none';
  screenshotImg.src = '';
}

// Capture screenshot
async function captureScreenshot() {
  const screenshot = await window.electronAPI.captureScreenshot();
  if (screenshot) {
    setScreenshot(screenshot);
  }
}

// Create a new conversation
async function createConversation(title) {
  try {
    console.log('Creating conversation:', title);
    const response = await fetch(`${serverUrl}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.slice(0, 50) })
    });
    const data = await response.json();
    console.log('Conversation created:', data);
    return data.id;
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return null;
  }
}

// Send message
async function sendMessage() {
  const content = messageInput.value.trim();
  if (!content && !pendingScreenshot) return;
  if (isLoading) return;

  // Hide welcome screen
  welcomeScreen.style.display = 'none';

  // Create conversation if needed
  if (!currentConversationId) {
    currentConversationId = await createConversation(content || 'Screenshot Analysis');
    if (!currentConversationId) {
      addMessage('assistant', 'Failed to connect to server. Make sure Ruby AI is running on localhost:3000');
      return;
    }
  }

  // Add user message to UI
  const messageContent = pendingScreenshot
    ? `[Screenshot attached]\n${content}`
    : content;
  addMessage('user', messageContent, pendingScreenshot);

  // Clear input
  messageInput.value = '';
  const screenshot = pendingScreenshot;
  clearScreenshot();

  // Show loading
  isLoading = true;
  const loadingEl = addLoading();

  try {
    // Send to API
    console.log('Sending message to:', `${serverUrl}/api/conversations/${currentConversationId}/messages`);
    console.log('Payload:', { content: content || 'What\'s in this screenshot?', imageDataUrl: screenshot ? '[base64 image]' : null });

    const response = await fetch(`${serverUrl}/api/conversations/${currentConversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: content || 'What\'s in this screenshot?',
        ...(screenshot && { imageDataUrl: screenshot })
      })
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      loadingEl.remove();
      isLoading = false;
      addMessage('assistant', 'Error: ' + errorText);
      return;
    }

    // Remove loading
    loadingEl.remove();
    isLoading = false;

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = '';
    let messageEl = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      console.log('Received chunk:', chunk.substring(0, 100));
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            console.log('Parsed data:', data);
            if (data.content) {
              assistantMessage += data.content;
              if (!messageEl) {
                messageEl = addMessage('assistant', assistantMessage);
              } else {
                updateMessageContent(messageEl, assistantMessage);
              }
              // Auto scroll
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            if (data.error) {
              console.error('Stream error:', data.error);
              addMessage('assistant', 'Error: ' + data.error);
            }
          } catch (e) {
            console.log('Parse error for line:', line, e);
            // Ignore parse errors
          }
        }
      }
    }

    // If no message was received, show error
    if (!assistantMessage) {
      addMessage('assistant', 'No response received. Please try again.');
    }
  } catch (error) {
    loadingEl.remove();
    isLoading = false;
    addMessage('assistant', 'Failed to get response. Is the server running?');
  }
}

// Add message to UI
function addMessage(role, content, imageUrl = null) {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${role}`;

  const avatar = role === 'assistant'
    ? '<img src="assets/ruby-icon.jpg" alt="Ruby AI">'
    : '👤';

  let imageHtml = '';
  if (imageUrl && role === 'user') {
    imageHtml = `<img class="message-image" src="${imageUrl}" alt="Screenshot">`;
  }

  // Remove [Screenshot attached] prefix for display
  const displayContent = content.replace('[Screenshot attached]\n', '');

  // Parse markdown for assistant messages
  const formattedContent = role === 'assistant'
    ? parseMarkdown(displayContent)
    : escapeHtml(displayContent);

  messageEl.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      ${imageHtml}
      ${formattedContent}
    </div>
  `;

  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return messageEl;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Parse markdown to HTML
function parseMarkdown(text) {
  // First, extract and protect code blocks
  const codeBlocks = [];
  let processedText = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, language, code) => {
    const index = codeBlocks.length;
    codeBlocks.push({ language: language || 'code', code: code.trim() });
    return `%%CODEBLOCK${index}%%`;
  });

  // Escape HTML in the remaining text
  processedText = escapeHtml(processedText);

  // Now process other markdown

  // Bold text **text** or __text__
  processedText = processedText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  processedText = processedText.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic text *text* or _text_
  processedText = processedText.replace(/\*(.+?)\*/g, '<em>$1</em>');
  processedText = processedText.replace(/_(.+?)_/g, '<em>$1</em>');

  // Inline code `code`
  processedText = processedText.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headers
  processedText = processedText.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  processedText = processedText.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  processedText = processedText.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bullet points
  processedText = processedText.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
  processedText = processedText.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Numbered lists
  processedText = processedText.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Line breaks (double newline = paragraph)
  processedText = processedText.replace(/\n\n/g, '</p><p>');
  processedText = processedText.replace(/\n/g, '<br>');

  // Wrap in paragraph if not already wrapped
  if (!processedText.startsWith('<')) {
    processedText = '<p>' + processedText + '</p>';
  }

  // Restore code blocks with syntax highlighting
  codeBlocks.forEach((block, index) => {
    const codeHtml = `
      <div class="code-block">
        <div class="code-header">
          <span class="code-language">${block.language}</span>
          <button class="copy-btn" onclick="copyCode(this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          </button>
        </div>
        <pre><code class="language-${block.language}">${escapeHtml(block.code)}</code></pre>
      </div>
    `;
    processedText = processedText.replace(`%%CODEBLOCK${index}%%`, codeHtml);
  });

  return processedText;
}

// Copy code to clipboard
function copyCode(button) {
  const codeBlock = button.closest('.code-block');
  const code = codeBlock.querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const originalText = button.innerHTML;
    button.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Copied!
    `;
    button.style.color = '#22c55e';
    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.color = '';
    }, 2000);
  });
}

// Update message content with markdown parsing
function updateMessageContent(messageEl, content) {
  const contentEl = messageEl.querySelector('.message-content');
  contentEl.innerHTML = parseMarkdown(content);
}

// Add loading indicator
function addLoading() {
  const loadingEl = document.createElement('div');
  loadingEl.className = 'message assistant';
  loadingEl.innerHTML = `
    <div class="message-avatar"><img src="assets/ruby-icon.jpg" alt="Ruby AI"></div>
    <div class="loading">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
  messagesContainer.appendChild(loadingEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return loadingEl;
}

// Reset chat
function resetChat() {
  currentConversationId = null;
  messagesContainer.innerHTML = '';
  messagesContainer.appendChild(welcomeScreen);
  welcomeScreen.style.display = 'flex';
  clearScreenshot();
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

captureBtn.addEventListener('click', captureScreenshot);

removeScreenshot.addEventListener('click', clearScreenshot);

hideBtn.addEventListener('click', () => {
  window.electronAPI.hideWindow();
});

newChatBtn.addEventListener('click', resetChat);

// Initialize
init();
