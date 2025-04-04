'use client';

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  sessionId: string;
  isLoading?: boolean;
}

export default function Chat() {
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or retrieve session ID
  useEffect(() => {
    // Check if we have a session ID in localStorage
    const storedSessionId = localStorage.getItem('chatSessionId');
    
    if (storedSessionId) {
      setSessionId(storedSessionId);
      // Load messages for this session
      const storedMessages = localStorage.getItem(`messages_${storedSessionId}`);
      if (storedMessages) {
        try {
          // Parse stored messages and convert string timestamps back to Date objects
          const parsedMessages = JSON.parse(storedMessages).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(parsedMessages);
        } catch (error) {
          console.error('Error parsing stored messages:', error);
        }
      }
    } else {
      // Create a new session ID
      const newSessionId = uuidv4();
      setSessionId(newSessionId);
      localStorage.setItem('chatSessionId', newSessionId);
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      localStorage.setItem(`messages_${sessionId}`, JSON.stringify(messages));
    }
  }, [messages, sessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessageToAPI = (userInput: string, loadingMessageId: string, retryAttempt = 0) => {
    fetch('https://n8n.atendimentomed.com.br/webhook/casa-na-serra', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userInput,
        session_id: sessionId
      }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        // Reset retry count on success
        setRetryCount(0);
        
        // Remove loading message
        setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
        
        // Check if response is an array of paragraphs
        if (Array.isArray(data) && data.length > 0) {
          // Add each paragraph as a separate complete message with a 2 second delay between them
          data.forEach((item, index) => {
            if (item.paragraph) {
              const displayDelay = index * 2000; // 2 second delay between messages
              
              setTimeout(() => {
                const messageContent = item.paragraph.trim();
                setMessages(prev => [...prev, {
                  id: `${Date.now()}-${index}`,
                  content: messageContent, // Show full content immediately
                  sender: 'bot',
                  timestamp: new Date(),
                  sessionId: sessionId,
                }]);
              }, displayDelay);
            }
          });
        } else {
          // Fallback for unexpected response format
          const messageContent = data.response || 'Thank you for your message.';
          setMessages(prev => [...prev, {
            id: (Date.now() + 2).toString(),
            content: messageContent, // Show full content immediately
            sender: 'bot',
            timestamp: new Date(),
            sessionId: sessionId,
          }]);
        }
      })
      .catch(error => {
        console.error('Error sending message:', error);
        
        // Try to reconnect if we haven't exceeded max retries
        if (retryAttempt < MAX_RETRIES) {
          // Update loading message to show retry attempt
          setMessages((prev) => 
            prev.map(msg => 
              msg.id === loadingMessageId 
                ? { ...msg, content: `Reconnecting (attempt ${retryAttempt + 1}/${MAX_RETRIES})...` }
                : msg
            )
          );
          
          // Exponential backoff delay
          const delay = Math.min(1000 * Math.pow(2, retryAttempt), 10000);
          setTimeout(() => {
            sendMessageToAPI(userInput, loadingMessageId, retryAttempt + 1);
          }, delay);
          
          setRetryCount(retryAttempt + 1);
        } else {
          // Max retries exceeded, show error message
          setRetryCount(0);
          setMessages((prev) => 
            prev.filter(msg => msg.id !== loadingMessageId).concat({
              id: (Date.now() + 2).toString(),
              content: 'Sorry, there was an error connecting to the server. Please check your internet connection and try again.',
              sender: 'bot',
              timestamp: new Date(),
              sessionId: sessionId,
            })
          );
        }
      })
      .finally(() => {
        if (retryAttempt === MAX_RETRIES || retryAttempt === 0) {
          setIsSubmitting(false);
        }
      });
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || !sessionId || isSubmitting) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
      sessionId: sessionId,
    };
    
    // Save the message the user typed before clearing the input
    const userInput = inputValue;
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    
    // Add loading message
    const loadingMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = {
      id: loadingMessageId,
      content: '',
      sender: 'bot',
      timestamp: new Date(),
      sessionId: sessionId,
      isLoading: true,
    };
    
    setMessages((prev) => [...prev, loadingMessage]);
    setIsSubmitting(true);
    
    // Send message to API with retry mechanism
    sendMessageToAPI(userInput, loadingMessageId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Function to reset/clear the current chat session
  const startNewSession = () => {
    // Create a new session ID
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    localStorage.setItem('chatSessionId', newSessionId);
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full min-h-screen w-full mx-auto border border-gray-200 rounded-lg shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chat</h2>
        <div className="flex items-center">
          <button 
            onClick={startNewSession}
            className="flex items-center bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-md mr-3 transition-colors"
            title="Start new chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Chat</span>
          </button>
          <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p>No messages yet. Start the conversation!</p>
              <p className="text-xs mt-2">Session ID: {sessionId.slice(0, 8)}...</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex mb-4 ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                }`}
              >
                {message.isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span>{message.content}</span>
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}
                <p className={`text-xs mt-1 ${
                  message.sender === 'user'
                    ? 'text-blue-100'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-end">
          <textarea
            className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Type your message..."
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
          <button
            className={`ml-2 rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isSubmitting 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            onClick={handleSendMessage}
            disabled={isSubmitting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
} 