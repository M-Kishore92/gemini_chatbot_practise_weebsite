// Gemini AI Chatbot - Main JavaScript File

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiBtn = document.getElementById('save-api-btn');
const testApiBtn = document.getElementById('test-api-btn');
const apiStatus = document.getElementById('api-status');
const typingIndicator = document.getElementById('typing-indicator');
const clearChatBtn = document.getElementById('clear-chat');
const exampleBtn = document.getElementById('example-btn');
const toggleApiVisibility = document.getElementById('toggle-api-visibility');
const exportChatBtn = document.getElementById('export-chat-btn');

// State variables
let apiKey = '';
let chatHistory = [];
let isApiConnected = false;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadApiKey();
    setupEventListeners();
    updateUIState();
});

// Load API key from local storage
function loadApiKey() {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        apiKey = savedKey;
        apiKeyInput.value = savedKey;
        testApiConnection(); // Test connection on load
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Send message on button click
    sendBtn.addEventListener('click', sendMessage);
    
    // Send message on Enter key
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Save API key
    saveApiBtn.addEventListener('click', saveApiKey);
    
    // Test API connection
    testApiBtn.addEventListener('click', testApiConnection);
    
    // Clear chat
    clearChatBtn.addEventListener('click', clearChat);
    
    // Example question
    exampleBtn.addEventListener('click', () => {
        const examples = [
            "Explain quantum computing in simple terms",
            "Write a Python function to reverse a string",
            "What are the benefits of renewable energy?",
            "How does machine learning work?",
            "Tell me a fun fact about space"
        ];
        const randomExample = examples[Math.floor(Math.random() * examples.length)];
        userInput.value = randomExample;
        userInput.focus();
    });
    
    // Toggle API key visibility
    toggleApiVisibility.addEventListener('click', () => {
        const type = apiKeyInput.getAttribute('type');
        apiKeyInput.setAttribute('type', type === 'password' ? 'text' : 'password');
        toggleApiVisibility.innerHTML = type === 'password' ? 
            '<i class="fas fa-eye-slash"></i>' : 
            '<i class="fas fa-eye"></i>';
    });
    
    // Export chat
    exportChatBtn.addEventListener('click', exportChat);
}

// Save API key to local storage
function saveApiKey() {
    const key = apiKeyInput.value.trim();
    
    if (!key) {
        showNotification('Please enter your API key', 'error');
        return;
    }
    
    apiKey = key;
    localStorage.setItem('gemini_api_key', key);
    showNotification('API key saved successfully!', 'success');
    
    // Test connection after saving
    testApiConnection();
}

// Test API connection
async function testApiConnection() {
    if (!apiKey) {
        showNotification('Please save your API key first', 'error');
        return;
    }
    
    updateApiStatus('connecting', 'Testing connection...');
    showTypingIndicator();
    
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Hello! Respond with a short greeting."
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const reply = data.candidates[0].content.parts[0].text;
        
        updateApiStatus('connected', 'API Connected');
        isApiConnected = true;
        showNotification('API connection successful!', 'success');
        
        // Add test message to chat
        addMessage("Hello! This is Gemini AI. How can I help you today?", 'bot');
        
    } catch (error) {
        console.error('API Test Error:', error);
        updateApiStatus('error', 'Connection Failed');
        isApiConnected = false;
        showNotification(`Connection failed: ${error.message}`, 'error');
    } finally {
        hideTypingIndicator();
        updateUIState();
    }
}

// Send message to Gemini API
async function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message) {
        showNotification('Please enter a message', 'error');
        return;
    }
    
    if (!isApiConnected) {
        showNotification('Please connect your API key first', 'error');
        return;
    }
    
    // Add user message to chat
    addMessage(message, 'user');
    userInput.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Add to chat history
    chatHistory.push({
        role: 'user',
        parts: [{ text: message }]
    });
    
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: chatHistory.slice(-10), // Send last 10 messages for context
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }
        
        const data = await response.json();
        const reply = data.candidates[0].content.parts[0].text;
        
        // Add bot response to chat
        addMessage(reply, 'bot');
        
        // Add to chat history
        chatHistory.push({
            role: 'model',
            parts: [{ text: reply }]
        });
        
        // Limit chat history to prevent token overflow
        if (chatHistory.length > 20) {
            chatHistory = chatHistory.slice(-20);
        }
        
    } catch (error) {
        console.error('Chat Error:', error);
        addMessage(`Sorry, I encountered an error: ${error.message}. Please check your API key and try again.`, 'bot');
        showNotification('Error sending message', 'error');
    } finally {
        hideTypingIndicator();
        userInput.focus();
    }
}

// Add message to chat UI
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message mb-6`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
            <i class="fas fa-${sender === 'user' ? 'user' : 'robot'} ${sender === 'user' ? 'text-blue-500' : 'text-green-500'}"></i>
            <span class="font-bold ${sender === 'user' ? 'text-blue-400' : 'text-green-400'}">${sender === 'user' ? 'You' : 'Gemini AI'}</span>
            <span class="text-xs text-gray-400">${time}</span>
        </div>
        <p class="${sender === 'user' ? 'text-white' : 'text-gray-200'}">${formatMessage(text)}</p>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format message with basic markdown
function formatMessage(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
        .replace(/\n/g, '<br>');
}

// Update API status display
function updateApiStatus(status, message) {
    const icon = apiStatus.querySelector('i');
    apiStatus.querySelector('span').textContent = message;
    
    apiStatus.className = 'flex items-center gap-2 px-4 py-2 rounded-full';
    
    switch(status) {
        case 'connected':
            apiStatus.classList.add('bg-green-900/30', 'text-green-300');
            icon.className = 'fas fa-circle text-xs';
            icon.style.color = '#10b981';
            break;
        case 'connecting':
            apiStatus.classList.add('bg-yellow-900/30', 'text-yellow-300', 'pulse');
            icon.className = 'fas fa-circle text-xs';
            icon.style.color = '#f59e0b';
            break;
        case 'error':
            apiStatus.classList.add('bg-red-900/30', 'text-red-300');
            icon.className = 'fas fa-circle text-xs';
            icon.style.color = '#ef4444';
            break;
        default:
            apiStatus.classList.add('bg-blue-900/30', 'text-blue-300');
            icon.className = 'fas fa-circle text-xs';
            icon.style.color = '#3b82f6';
    }
}

// Show/hide typing indicator
function showTypingIndicator() {
    typingIndicator.classList.remove('hidden');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    typingIndicator.classList.add('hidden');
}

// Clear chat history
function clearChat() {
    if (confirm('Are you sure you want to clear the chat?')) {
        chatMessages.innerHTML = `
            <div class="message bot-message mb-6">
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-robot text-green-500"></i>
                    <span class="font-bold text-green-400">Gemini AI</span>
                    <span class="text-xs text-gray-400">Just now</span>
                </div>
                <p class="text-gray-200">
                    Hello! I'm your Gemini AI assistant. How can I help you today?
                </p>
            </div>
        `;
        chatHistory = [];
        showNotification('Chat cleared', 'success');
    }
}

// Export chat as text file
function exportChat() {
    const messages = Array.from(chatMessages.querySelectorAll('.message'));
    let chatText = 'Gemini AI Chat Export\n' + '='.repeat(50) + '\n\n';
    
    messages.forEach(msg => {
        const sender = msg.classList.contains('user-message') ? 'You' : 'Gemini AI';
        const text = msg.querySelector('p').textContent;
        const time = msg.querySelector('.text-xs').textContent;
        
        chatText += `[${time}] ${sender}:\n${text}\n\n`;
    });
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Chat exported successfully', 'success');
}

// Update UI state based on connection status
function updateUIState() {
    if (isApiConnected) {
        userInput.disabled = false;
        sendBtn.disabled = false;
        testApiBtn.disabled = false;
        userInput.placeholder = "Type your message here...";
    } else {
        userInput.disabled = true;
        sendBtn.disabled = true;
        testApiBtn.disabled = false;
        userInput.placeholder = "Please connect API key first";
    }
}

// Show notification
function showNotification(message, type) {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transform transition-transform duration-300 ${
        type === 'success' ? 'bg-green-900 text-green-100 border border-green-700' :
        type === 'error' ? 'bg-red-900 text-red-100 border border-red-700' :
        'bg-blue-900 text-blue-100 border border-blue-700'
    }`;
    
    notification.innerHTML = `
        <div class="flex items-center gap-3">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize custom styles
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .inline-code {
            background: rgba(0,0,0,0.3);
            padding: 0.2rem 0.4rem;
            border-radius: 0.25rem;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        .notification {
            animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
    </style>
`);