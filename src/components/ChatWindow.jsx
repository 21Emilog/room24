import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Zap, ChevronDown, ChevronUp, MoreVertical, Flag, Ban, X } from 'lucide-react';
import { getMessages, sendMessage, markMessagesAsRead, subscribeToMessages, getQuickReplies, reportUser } from '../chat';
import { supabase } from '../supabase';

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

function getColorFromId(id) {
  if (!id) return '#E63946';
  // Simple hash to pick a color
  const colors = ['#E63946', '#1D3557', '#457B9D', '#A8DADC', '#F1FAEE', '#F9C74F', '#90BE6D', '#43AA8B', '#577590'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
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
        // Avoid duplicates - check by ID or content+sender for optimistic messages
        if (prev.some(m => m.id === newMsg.id)) return prev;
        // Check if this is the server response for an optimistic message we sent
        if (prev.some(m => m._optimistic && m.sender_id === newMsg.sender_id && m.content === newMsg.content)) {
          // Replace optimistic message with real one
          return prev.map(m => 
            (m._optimistic && m.sender_id === newMsg.sender_id && m.content === newMsg.content) 
              ? newMsg 
              : m
          );
        }
        return [...prev, newMsg];
      });
      // Mark as read if we receive it
      if (newMsg.sender_id !== currentUserId) {
        markMessagesAsRead(conversation.id, currentUserId);
      }
    });

    return unsubscribe;
  }, [conversation.id, currentUserId]);


  // Only auto-scroll if user is at (or near) the bottom, or if a new message is sent by the user
  const lastMessageCount = useRef(0);
  const lastScrollTop = useRef(0);
  const scrollContainerRef = useRef(null);

  // Fetch sender profiles for all messages (if not present)
  useEffect(() => {
    async function enrichMessages() {
      const missing = messages.filter(m => !m.sender_profile && !m._optimistic);
      if (missing.length === 0) return;
      const ids = [...new Set(missing.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, photo_url')
        .in('id', ids);
      setMessages(prev => prev.map(m => {
        if (m.sender_profile || m._optimistic) return m;
        const prof = profiles?.find(p => p.id === m.sender_id);
        return prof ? { ...m, sender_profile: prof } : m;
      }));
    }
    enrichMessages();

    // Only scroll if user is at bottom or new message is from self
    const container = scrollContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    const newMsg = messages[messages.length - 1];
    const sentByMe = newMsg && newMsg.sender_id === currentUserId;
    if (messages.length > lastMessageCount.current && (isAtBottom || sentByMe)) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
    lastMessageCount.current = messages.length;
  }, [messages, currentUserId]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Add optimistic message with temporary ID
    const tempId = 'temp-' + Date.now();
    const optimisticMessage = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: currentUserId,
      content: content,
      created_at: new Date().toISOString(),
      read: false,
      _optimistic: true
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const sent = await sendMessage(conversation.id, currentUserId, content);
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === tempId ? sent : m));
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message and restore input on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content);
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

  const handleReport = async (reason) => {
    setReportSubmitting(true);
    try {
      await reportUser({
        reportedUserId: otherUser?.id,
        reportedById: currentUserId,
        conversationId: conversation.id,
        reason
      });
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportReason('');
      }, 2000);
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const reportReasons = [
    'Spam or scam',
    'Harassment or abuse',
    'Fake listing',
    'Inappropriate content',
    'Suspicious activity',
    'Other'
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Report/Block Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-500" />
                Report User
              </h3>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                  setReportSuccess(false);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {reportSuccess ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Ban className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">Report Submitted</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Thank you. We'll review this report.
                </p>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Why are you reporting {otherUser?.display_name || 'this user'}?
                </p>
                <div className="space-y-2">
                  {reportReasons.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      disabled={reportSubmitting}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        reportReason === reason
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleReport(reportReason)}
                  disabled={!reportReason || reportSubmitting}
                  className={`w-full mt-4 py-3 rounded-xl font-semibold transition-colors ${
                    reportReason && !reportSubmitting
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
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

        {/* Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowReportModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Flag className="w-4 h-4" />
                  <span className="font-medium">Report Spam</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Listing Preview (if available) */}
      {listing && (
        <div className="flex-shrink-0 flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30">
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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
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
            const showSender = !isMe && (idx === 0 || messages[idx - 1].sender_id !== msg.sender_id);
            const sender = isMe
              ? { display_name: 'You', photo_url: conversation?.renter_id === currentUserId ? conversation?.renter?.photo_url : conversation?.landlord?.photo_url }
              : msg.sender_profile || (msg.sender_id === conversation?.renter_id ? conversation?.renter : conversation?.landlord);

            return (
              <div key={msg.id} className="mb-2">
                {showTime && (
                  <p className="text-xs text-center text-gray-400 dark:text-gray-500 mb-2">
                    {formatMessageTime(msg.created_at)}
                  </p>
                )}
                <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {!isMe && (
                    <div className="flex flex-col items-center mr-1">
                      {showSender && (
                        <>
                          {sender?.photo_url ? (
                            <img src={sender.photo_url} alt={sender.display_name} className="w-7 h-7 rounded-full object-cover mb-0.5 shadow" />
                          ) : (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center mb-0.5 shadow"
                              style={{ background: getColorFromId(sender?.id) }}
                            >
                              <span className="text-white font-semibold text-xs">{sender?.display_name?.[0]?.toUpperCase() || '?'}</span>
                            </div>
                          )}
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium max-w-[70px] truncate text-center">{sender?.display_name}</span>
                        </>
                      )}
                    </div>
                  )}
                  // Helper: get a color from a string (sender id)
                  function getColorFromId(id) {
                    if (!id) return '#E63946';
                    // Simple hash to pick a color
                    const colors = ['#E63946', '#1D3557', '#457B9D', '#A8DADC', '#F1FAEE', '#F9C74F', '#90BE6D', '#43AA8B', '#577590'];
                    let hash = 0;
                    for (let i = 0; i < id.length; i++) {
                      hash = id.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    return colors[Math.abs(hash) % colors.length];
                  }
                  <div
                    className={`relative max-w-[75%] px-4 py-2 rounded-2xl shadow-sm transition-all ${
                      isMe
                        ? 'bg-gradient-to-br from-red-400 to-red-600 text-white rounded-br-md ml-auto'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md'
                    }`}
                    style={{ wordBreak: 'break-word' }}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
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
      <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
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
