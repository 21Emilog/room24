import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, ArrowLeft, Zap, ChevronDown, ChevronUp, MoreVertical, Flag, X, Image, Paperclip, Loader2, Building2, UserPlus, Check, Smile, Reply, Heart, Ban } from 'lucide-react';
import { 
  getMessages, 
  sendMessage, 
  markMessagesAsRead, 
  subscribeToMessages, 
  getQuickReplies, 
  reportUser,
  setTyping,
  subscribeToTyping,
  addReaction,
  removeReaction,
  subscribeToReactions,
  getUserPresence,
  subscribeToPresence,
  updatePresence,
  sendReply,
  REACTION_EMOJIS
} from '../chat';
import { supabase } from '../supabase';
import { getLandlordProperties, addTenant } from '../tenantManagement';

// Emoji picker data
const QUICK_EMOJIS = ['😀', '😂', '❤️', '👍', '🔥', '😍', '🙏', '💯', '🎉', '😊', '🤔', '👀'];

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

function formatSeenTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  // Invite to property state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [landlordProperties, setLandlordProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [invitingToProperty, setInvitingToProperty] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  
  // NEW: Enhanced messaging features
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null); // message id
  const [messageReactions, setMessageReactions] = useState({}); // { messageId: [reactions] }
  const [longPressTimer, setLongPressTimer] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const otherUser = isLandlord ? conversation.renter : conversation.landlord;
  const listing = conversation.listing;

  // Load landlord's properties when invite modal opens
  useEffect(() => {
    if (showInviteModal && isLandlord && landlordProperties.length === 0) {
      const loadProps = async () => {
        setLoadingProperties(true);
        try {
          const props = await getLandlordProperties(currentUserId);
          setLandlordProperties(props);
        } catch (err) {
          console.error('Failed to load properties:', err);
        }
        setLoadingProperties(false);
      };
      loadProps();
    }
  }, [showInviteModal, isLandlord, currentUserId, landlordProperties.length]);

  // Handle inviting the other user to a property
  const handleInviteToProperty = async (property) => {
    if (!otherUser?.id) return;
    setInvitingToProperty(property.id);
    try {
      await addTenant({
        propertyId: property.id,
        tenantId: otherUser.id,
        landlordId: currentUserId,
      });
      setInviteSuccess(property.id);
      // Auto close after success
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Failed to invite tenant:', err);
      alert(err.message || 'Failed to add as tenant');
    }
    setInvitingToProperty(null);
  };

  // Handle image upload
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setShowAttachMenu(false);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `chat/${conversation.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        // Try alternative bucket name
        const { data: data2, error: error2 } = await supabase.storage
          .from('listings')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error2) throw error2;
        
        // Get public URL from listings bucket
        const { data: urlData } = supabase.storage
          .from('listings')
          .getPublicUrl(fileName);
        
        // Send image as message
        await sendMessage(conversation.id, currentUserId, `[Image] ${urlData.publicUrl}`);
      } else {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('chat-images')
          .getPublicUrl(fileName);

        // Send image as message
        await sendMessage(conversation.id, currentUserId, `[Image] ${urlData.publicUrl}`);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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

  // ===========================
  // NEW: Typing indicator
  // ===========================
  const typingTimeoutRef = useRef(null);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!conversation?.id || !currentUserId) return;

    const unsubscribe = subscribeToTyping(conversation.id, currentUserId, (typingUsers) => {
      setIsOtherUserTyping(typingUsers.length > 0);
    });

    return unsubscribe;
  }, [conversation?.id, currentUserId]);

  // Handle typing status
  const handleTyping = useCallback(() => {
    if (!conversation?.id || !currentUserId) return;

    // Set typing
    setTyping(conversation.id, currentUserId, true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(conversation.id, currentUserId, false);
    }, 3000);
  }, [conversation?.id, currentUserId]);

  // Clear typing on unmount
  useEffect(() => {
    return () => {
      if (conversation?.id && currentUserId) {
        setTyping(conversation.id, currentUserId, false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversation?.id, currentUserId]);

  // ===========================
  // NEW: Online presence
  // ===========================
  useEffect(() => {
    if (!otherUser?.id) return;

    // Get initial presence
    getUserPresence(otherUser.id).then(presence => {
      if (presence) {
        setOtherUserOnline(presence.is_online);
        setOtherUserLastSeen(presence.last_seen);
      }
    });

    // Subscribe to presence changes
    const unsubscribe = subscribeToPresence(otherUser.id, (presence) => {
      setOtherUserOnline(presence?.is_online || false);
      setOtherUserLastSeen(presence?.last_seen);
    });

    // Update own presence
    updatePresence(currentUserId, true, conversation.id);

    return () => {
      unsubscribe();
      // Set offline when leaving
      updatePresence(currentUserId, false, null);
    };
  }, [otherUser?.id, currentUserId, conversation?.id]);

  // ===========================
  // NEW: Reactions
  // ===========================
  useEffect(() => {
    if (!conversation?.id) return;

    const unsubscribe = subscribeToReactions(conversation.id, () => {
      // Refresh reactions for all messages
      messages.forEach(async (msg) => {
        if (msg._optimistic) return;
        const { data } = await supabase
          .from('message_reactions')
          .select('*')
          .eq('message_id', msg.id);
        if (data) {
          setMessageReactions(prev => ({ ...prev, [msg.id]: data }));
        }
      });
    });

    return unsubscribe;
  }, [conversation?.id, messages]);

  const handleReaction = async (messageId, emoji) => {
    const existing = messageReactions[messageId]?.find(
      r => r.user_id === currentUserId && r.emoji === emoji
    );

    try {
      if (existing) {
        await removeReaction(messageId, currentUserId, emoji);
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: (prev[messageId] || []).filter(r => r.id !== existing.id)
        }));
      } else {
        const reaction = await addReaction(messageId, currentUserId, emoji);
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: [...(prev[messageId] || []), reaction]
        }));
      }
    } catch (err) {
      console.error('Reaction error:', err);
    }
    setShowReactionPicker(null);
  };

  // ===========================
  // NEW: Reply to message
  // ===========================
  const handleReply = (message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    // Clear typing indicator
    setTyping(conversation.id, currentUserId, false);

    // Add optimistic message with temporary ID
    const tempId = 'temp-' + Date.now();
    const optimisticMessage = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: currentUserId,
      content: content,
      created_at: new Date().toISOString(),
      read: false,
      reply_to_id: replyingTo?.id || null,
      _optimistic: true,
      _replyTo: replyingTo // Keep reference for UI
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setReplyingTo(null);

    try {
      let sent;
      if (replyingTo) {
        sent = await sendReply(conversation.id, currentUserId, content, replyingTo.id);
      } else {
        sent = await sendMessage(conversation.id, currentUserId, content);
      }
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === tempId ? { ...sent, _replyTo: optimisticMessage._replyTo } : m));
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

      {/* Invite to Property Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#c5303c]" />
                Add to Property
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Add <span className="font-semibold text-gray-800 dark:text-gray-200">{otherUser?.display_name}</span> as a tenant to one of your properties:
              </p>
              
              {loadingProperties ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#c5303c]" />
                </div>
              ) : landlordProperties.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No properties yet</p>
                  <p className="text-sm text-gray-400 mt-1">Create a property first in Messages → Properties tab</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {landlordProperties.map((property) => (
                    <button
                      key={property.id}
                      onClick={() => handleInviteToProperty(property)}
                      disabled={invitingToProperty === property.id || inviteSuccess === property.id}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        inviteSuccess === property.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-[#c5303c] hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#c5303c] to-[#E63946] flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{property.name}</p>
                        {property.address && (
                          <p className="text-xs text-gray-500 truncate">{property.address}</p>
                        )}
                      </div>
                      {invitingToProperty === property.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-[#c5303c]" />
                      ) : inviteSuccess === property.id ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 p-4 bg-gradient-to-r from-[#E63946] via-rose-500 to-[#E63946] shadow-xl relative overflow-hidden">
        {/* Animated background shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" style={{ animationTimingFunction: 'ease-in-out' }} />
        
        <button
          onClick={onBack}
          className="relative p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 shadow-inner"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="relative flex items-center gap-3 flex-1 min-w-0">
          <div className="relative group">
            {otherUser?.photo_url ? (
              <img 
                src={otherUser.photo_url} 
                alt={otherUser.display_name} 
                className="w-12 h-12 rounded-xl object-cover border-2 border-white/30 shadow-lg group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shadow-lg group-hover:scale-105 transition-transform duration-200">
                <span className="text-white font-bold text-lg">
                  {otherUser?.display_name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            {/* Online/Offline indicator */}
            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white rounded-full shadow-md transition-colors ${
              otherUserOnline ? 'bg-emerald-400' : 'bg-gray-400'
            }`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate">
              {otherUser?.display_name || 'Unknown User'}
            </h3>
            {/* Status: typing, online, or listing info */}
            {isOtherUserTyping ? (
              <p className="text-sm text-white flex items-center gap-1.5">
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="font-medium">typing...</span>
              </p>
            ) : otherUserOnline ? (
              <p className="text-sm text-emerald-200 font-medium">Online</p>
            ) : listing ? (
              <p className="text-sm text-white/80 truncate">
                {listing.title} • R{listing.price?.toLocaleString()}/mo
              </p>
            ) : otherUserLastSeen ? (
              <p className="text-sm text-white/60">
                Last seen {new Date(otherUserLastSeen).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        </div>

        {/* Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-200 hover:scale-105"
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Menu Dropdown - Rendered outside header to avoid clipping */}
      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
          <div className="fixed right-4 top-16 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            {/* Invite to Property option - only for landlords */}
            {isLandlord && (
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowInviteModal(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700"
              >
                <UserPlus className="w-5 h-5 text-green-600" />
                <div>
                  <span className="font-semibold block">Add to Property</span>
                  <span className="text-xs text-gray-500">Invite as tenant</span>
                </div>
              </button>
            )}
            <button
              onClick={() => {
                setShowMenu(false);
                setShowReportModal(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Flag className="w-5 h-5" />
              <span className="font-semibold">Report User</span>
            </button>
          </div>
        </>
      )}

      {/* Listing Preview (if available) */}
      {listing && (
        <div className="flex-shrink-0 flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-amber-900/20 border-b border-amber-200/50 dark:border-amber-800/30 group cursor-pointer hover:from-amber-100 hover:via-orange-100 hover:to-amber-100 dark:hover:from-amber-900/30 dark:hover:via-orange-900/30 dark:hover:to-amber-900/30 transition-all duration-200">
          {listing.photos?.[0] && (
            <img 
              src={listing.photos[0]} 
              alt={listing.title}
              className="w-16 h-16 rounded-xl object-cover shadow-md ring-2 ring-amber-200/50 dark:ring-amber-800/50 group-hover:scale-105 transition-transform duration-200"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {listing.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1.5 mt-0.5">
              <span className="text-amber-600">📍</span> {listing.location}
            </p>
          </div>
          <div className="text-right bg-white dark:bg-gray-800 px-3 py-2 rounded-xl shadow-sm">
            <p className="text-sm font-bold text-[#E63946]">R{listing.price?.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">per month</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <div className="w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-red-500" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white mb-1">Start the conversation!</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Send a message to connect with {otherUser?.display_name || 'the user'}.</p>
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
              <div key={msg.id} className="mb-1">
                {showTime && (
                  <div className="flex items-center justify-center gap-3 my-4">
                    <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                      {formatMessageTime(msg.created_at)}
                    </span>
                    <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  </div>
                )}
                <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {!isMe && (
                    <div className="flex flex-col items-center mr-1">
                      {showSender && (
                        <>
                          {sender?.photo_url ? (
                            <img src={sender.photo_url} alt={sender.display_name} className="w-8 h-8 rounded-xl object-cover mb-0.5 shadow-md" />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center mb-0.5 shadow-md"
                              style={{ background: getColorFromId(sender?.id) }}
                            >
                              <span className="text-white font-bold text-xs">{sender?.display_name?.[0]?.toUpperCase() || '?'}</span>
                            </div>
                          )}
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold max-w-[70px] truncate text-center">{sender?.display_name}</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Message with reactions and reply */}
                  <div className={`relative max-w-[75%] ${isMe ? 'order-1' : ''}`}>
                    {/* Reply preview */}
                    {(msg.reply_to_id || msg._replyTo) && (
                      <div className={`mb-1 px-3 py-1.5 rounded-lg text-xs truncate ${
                        isMe 
                          ? 'bg-white/20 text-white/80' 
                          : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                      }`}>
                        <Reply className="w-3 h-3 inline mr-1" />
                        {msg._replyTo?.content?.substring(0, 50) || 'Replying to message...'}
                      </div>
                    )}
                    
                    {/* Check if message is an image */}
                    {msg.content?.startsWith('[Image]') ? (
                      <div 
                        className={`relative transition-all duration-300 group ${msg._optimistic ? 'opacity-70 scale-[0.98]' : 'hover:scale-[1.01]'}`}
                        onDoubleClick={() => !msg._optimistic && handleReaction(msg.id, '❤️')}
                      >
                        <img 
                          src={msg.content.replace('[Image] ', '')} 
                          alt="Shared content"
                          className={`rounded-2xl max-w-full max-h-[300px] object-cover shadow-lg cursor-pointer hover:shadow-xl transition-all ${
                            isMe ? 'rounded-br-sm' : 'rounded-bl-sm'
                          }`}
                          onClick={() => window.open(msg.content.replace('[Image] ', ''), '_blank')}
                        />
                        {isMe && !msg._optimistic && (
                          <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                            <span className="text-[10px] text-white/90 font-medium">Sent</span>
                            <svg className="w-3 h-3 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        {msg._optimistic && (
                          <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-1.5">
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        
                        {/* Action buttons for images */}
                        {!msg._optimistic && (
                          <div className={`absolute top-2 ${isMe ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}>
                            <button
                              onClick={() => handleReply(msg)}
                              className="p-1.5 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70"
                            >
                              <Reply className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button
                              onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                              className="p-1.5 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70"
                            >
                              <Heart className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                    <div
                      className={`relative px-4 py-3 transition-all duration-300 group ${
                        isMe
                          ? 'bg-gradient-to-br from-[#E63946] via-rose-500 to-[#c5303c] text-white rounded-2xl rounded-br-sm shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl rounded-bl-sm shadow-md hover:shadow-lg border border-gray-100 dark:border-gray-600'
                      } ${msg._optimistic ? 'opacity-70 scale-[0.98]' : 'hover:scale-[1.01]'}`}
                      style={{ wordBreak: 'break-word' }}
                      onDoubleClick={() => !msg._optimistic && handleReaction(msg.id, '❤️')}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">{msg.content}</p>
                      
                      {/* Delivered indicator for sent messages */}
                      {isMe && !msg._optimistic && (
                        <div className="flex items-center justify-end gap-1 mt-1 -mb-1">
                          <span className="text-[10px] text-white/60 font-medium">Sent</span>
                          <svg className="w-3 h-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {msg._optimistic && (
                        <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md ring-2 ring-red-100 dark:ring-red-900">
                          <div className="w-2.5 h-2.5 border-2 border-[#E63946] border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      
                      {/* Action buttons on hover */}
                      {!msg._optimistic && (
                        <div className={`absolute -top-3 ${isMe ? '-left-12' : '-right-12'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}>
                          <button
                            onClick={() => handleReply(msg)}
                            className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 shadow-md"
                            title="Reply"
                          >
                            <Reply className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                          </button>
                          <button
                            onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                            className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 shadow-md"
                            title="React"
                          >
                            <Smile className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                          </button>
                        </div>
                      )}
                    </div>
                    )}
                    
                    {/* Reactions display */}
                    {messageReactions[msg.id]?.length > 0 && (
                      <div className={`flex gap-0.5 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(
                          messageReactions[msg.id].reduce((acc, r) => {
                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs flex items-center gap-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                          >
                            <span>{emoji}</span>
                            {count > 1 && <span className="text-gray-600 dark:text-gray-300">{count}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Reaction picker */}
                    {showReactionPicker === msg.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowReactionPicker(null)} />
                        <div className={`absolute ${isMe ? 'right-0' : 'left-0'} -top-12 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 px-2 py-1.5 flex gap-1 z-20`}>
                          {REACTION_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-lg transition-transform hover:scale-125"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
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
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
          <button
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
          >
            <span className="flex items-center gap-2">
              <div className="p-1 bg-amber-400 rounded-lg">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              Quick Replies
            </span>
            {showQuickReplies ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </button>
          {showQuickReplies && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickReply(reply)}
                  className="px-3.5 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl border border-amber-200 dark:border-amber-800/50 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md transition-all duration-200 truncate max-w-[200px]"
                >
                  {reply.substring(0, 40)}{reply.length > 40 ? '...' : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Reply Preview */}
      {replyingTo && (
        <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-t border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-1 h-10 bg-blue-500 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Reply className="w-3 h-3" />
                Replying to message
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                {replyingTo.content?.substring(0, 60)}{replyingTo.content?.length > 60 ? '...' : ''}
              </p>
            </div>
            <button
              onClick={cancelReply}
              className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)} />
            <div className="absolute bottom-20 left-4 right-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-20">
              <div className="grid grid-cols-6 gap-2">
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setNewMessage(prev => prev + emoji);
                      setShowEmojiPicker(false);
                      inputRef.current?.focus();
                    }}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-2xl transition-transform hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        
        <div className="flex items-end gap-2">
          {/* Attachment Button */}
          <div className="relative">
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              disabled={uploadingImage}
              className={`p-3.5 rounded-2xl transition-all duration-200 ${
                showAttachMenu 
                  ? 'bg-[#E63946] text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              aria-label="Add attachment"
            >
              {uploadingImage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>

            {/* Attachment Menu */}
            {showAttachMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAttachMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-20 min-w-[160px]">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Image className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Photo</p>
                      <p className="text-xs text-gray-500">Send an image</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Emoji Button */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-3.5 rounded-2xl transition-all duration-200 ${
              showEmojiPicker 
                ? 'bg-amber-500 text-white shadow-lg' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            aria-label="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Message Input */}
          <div className="flex-1 relative group">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={handleKeyDown}
              placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
              rows={1}
              className="w-full resize-none px-5 py-4 bg-gray-100 dark:bg-gray-700 border-2 border-transparent rounded-2xl focus:border-[#E63946] focus:bg-white dark:focus:bg-gray-600 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900/30 focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 shadow-inner"
              style={{ maxHeight: '120px' }}
            />
            {newMessage.length > 0 && (
              <span className={`absolute right-3 bottom-2 text-[10px] font-medium transition-colors ${newMessage.length > 500 ? 'text-red-500' : 'text-gray-400'}`}>
                {newMessage.length}/500
              </span>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className={`p-4 rounded-2xl transition-all duration-300 ${
              newMessage.trim() && !sending
                ? 'bg-gradient-to-br from-[#E63946] to-rose-600 hover:from-[#c5303c] hover:to-rose-700 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:scale-110 active:scale-95'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <Send className={`w-5 h-5 transition-transform ${sending ? 'animate-pulse' : newMessage.trim() ? 'translate-x-0.5 -translate-y-0.5' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
