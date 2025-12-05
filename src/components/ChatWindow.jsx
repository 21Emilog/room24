import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { getMessages, sendMessage, markMessagesAsRead, subscribeToMessages, getQuickReplies } from '../chat';

function formatMessageTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday ' + date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-ZA', { weekday: 'short' }) + ' ' + 
           date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) + ' ' +
         date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatWindow({ 
  conversation, 
  currentUserId, 
  onBack,
  isLandlord = false 
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const otherUser = isLandlord ? conversation.renter : conversation.landlord;
  const listing = conversation.listing;

  // Load messages
  useEffect(() => {
    async function loadMessages() {
      setLoading(true);
      const msgs = await getMessages(conversation.id);
      setMessages(msgs);
      setLoading(false);
      
      // Mark as read
      await markMessagesAsRead(conversation.id, currentUserId);
    }
    loadMessages();
  }, [conversation.id, currentUserId]);

  // Subscribe to new messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages(conversation.id, (newMsg) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      // Mark as read if we receive it
      if (newMsg.sender_id !== currentUserId) {
        markMessagesAsRead(conversation.id, currentUserId);
      }
    });

    return unsubscribe;
  }, [conversation.id, currentUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const sent = await sendMessage(conversation.id, currentUserId, content);
      setMessages(prev => [...prev, sent]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(content); // Restore on error
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (reply) => {
    setNewMessage(reply);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  };

  const quickReplies = isLandlord ? getQuickReplies(currentUserId) : [];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {otherUser?.photo_url ? (
            <img 
              src={otherUser.photo_url} 
              alt={otherUser.display_name} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <span className="text-red-600 dark:text-red-300 font-semibold">
                {otherUser?.display_name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {otherUser?.display_name || 'Unknown User'}
            </h3>
            {listing && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                Re: {listing.title} • R{listing.price?.toLocaleString()}/mo
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Listing Preview (if available) */}
      {listing && (
        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30">
          {listing.photos?.[0] && (
            <img 
              src={listing.photos[0]} 
              alt={listing.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {listing.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {listing.location}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No messages yet.</p>
            <p className="text-sm mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUserId;
            const showTime = idx === 0 || 
              new Date(msg.created_at) - new Date(messages[idx - 1].created_at) > 5 * 60 * 1000;

            return (
              <div key={msg.id}>
                {showTime && (
                  <p className="text-xs text-center text-gray-400 dark:text-gray-500 mb-2">
                    {formatMessageTime(msg.created_at)}
                  </p>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                      isMe
                        ? 'bg-red-500 text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies (for landlords) */}
      {isLandlord && quickReplies.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Quick Replies
            </span>
            {showQuickReplies ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
          {showQuickReplies && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickReply(reply)}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors truncate max-w-[200px]"
                >
                  {reply.substring(0, 40)}{reply.length > 40 ? '...' : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-2xl focus:ring-2 focus:ring-red-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className={`p-3 rounded-full transition-all ${
              newMessage.trim() && !sending
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <Send className={`w-5 h-5 ${sending ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
