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
                messageEl.querySelector('.message-content').textContent = assistantMessage;
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
  
  const avatar = role === 'assistant' ? '💎' : '👤';
  
  let imageHtml = '';
  if (imageUrl && role === 'user') {
    imageHtml = `<img class="message-image" src="${imageUrl}" alt="Screenshot">`;
  }
  
  // Remove [Screenshot attached] prefix for display
  const displayContent = content.replace('[Screenshot attached]\n', '');
  
  messageEl.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      ${imageHtml}
      ${displayContent}
    </div>
  `;
  
  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  return messageEl;
}

// Add loading indicator
function addLoading() {
  const loadingEl = document.createElement('div');
  loadingEl.className = 'message assistant';
  loadingEl.innerHTML = `
    <div class="message-avatar">💎</div>
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
