'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

interface SessionInfo {
  id: string;
  createdAt: Date;
  lastUpdatedAt: Date;
  messageCount: number;
}

export default function SessionManager() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  // Load sessions from localStorage on component mount
  useEffect(() => {
    // Get current session ID
    const storedSessionId = localStorage.getItem('chatSessionId');
    if (storedSessionId) {
      setCurrentSessionId(storedSessionId);
    }

    // Get all localStorage keys and filter for message session keys
    const allSessions: SessionInfo[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('messages_')) {
        const sessionId = key.replace('messages_', '');
        try {
          const messages = JSON.parse(localStorage.getItem(key) || '[]');
          
          // Get date of the last message or use current date as fallback
          const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
          const lastUpdatedAt = lastMessage ? new Date(lastMessage.timestamp) : new Date();
          const firstMessage = messages.length > 0 ? messages[0] : null;
          const createdAt = firstMessage ? new Date(firstMessage.timestamp) : new Date();
          
          allSessions.push({
            id: sessionId,
            createdAt,
            lastUpdatedAt,
            messageCount: messages.length,
          });
        } catch (error) {
          console.error('Error parsing session data:', error);
        }
      }
    }

    // Sort sessions by last updated date (most recent first)
    allSessions.sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime());
    setSessions(allSessions);
  }, []);

  const createNewSession = () => {
    const newSessionId = uuidv4();
    localStorage.setItem('chatSessionId', newSessionId);
    
    // Add to sessions list
    const newSession: SessionInfo = {
      id: newSessionId,
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      messageCount: 0,
    };
    
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSessionId);
    
    // Redirect to chat page with the new session
    window.location.href = '/chat';
  };

  const switchToSession = (sessionId: string) => {
    localStorage.setItem('chatSessionId', sessionId);
    setCurrentSessionId(sessionId);
    // Redirect to chat page
    window.location.href = '/chat';
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering switchToSession
    
    // Remove session data from localStorage
    localStorage.removeItem(`messages_${sessionId}`);
    
    // Update sessions list
    setSessions(sessions.filter(session => session.id !== sessionId));
    
    // If we're deleting the current session, create a new one
    if (sessionId === currentSessionId) {
      createNewSession();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Your Chat Sessions</h2>
        <button
          onClick={createNewSession}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Start New Chat
        </button>
      </div>
      
      {sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No chat sessions found. Start a new conversation!</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map(session => (
            <li 
              key={session.id}
              onClick={() => switchToSession(session.id)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                session.id === currentSessionId 
                  ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-700' 
                  : 'hover:bg-gray-50 border-gray-200 dark:hover:bg-gray-800 dark:border-gray-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">
                    Session {session.id.slice(0, 8)}...
                    {session.id === currentSessionId && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {session.messageCount} messages • Last updated: {session.lastUpdatedAt.toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete session"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 