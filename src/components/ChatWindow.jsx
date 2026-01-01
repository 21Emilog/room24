import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, ArrowLeft, Zap, ChevronDown, ChevronUp, MoreVertical, Flag, X, Image, Paperclip, Loader2, Building2, UserPlus, Check, Smile, Reply, Heart, Ban, MessageCircle, Mic, CheckCheck, Clock, Sparkles, Trash2 } from 'lucide-react';
import { 
  getMessages, 
  sendMessage, 
  markMessagesAsReadWithTimestamp, 
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
  sendVoiceMessage,
  deleteMessageForMe,
  deleteMessageForEveryone
} from '../chat';
import { supabase } from '../supabase';
import { getLandlordProperties, addTenant } from '../tenantManagement';
import { VoiceRecorder, formatDuration } from '../utils/voiceRecorder';

// Emoji picker data
const QUICK_EMOJIS = ['😀', '😂', '❤️', '👍', '🔥', '😍', '🙏', '💯', '🎉', '😊', '🤔', '👀', '🥳', '😎', '🤩', '💪'];

// Reaction emojis
const REACTION_EMOJI_LIST = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🙏'];

// Quick questions for renters to ask landlords
const RENTER_QUICK_QUESTIONS = [
  "Is this room still available?",
  "When can I come view the place?",
  "Are water & electricity included?",
  "Is WiFi included in the rent?",
  "What's the deposit amount?",
  "Are pets allowed?",
  "Is parking available?",
  "What date can I move in?",
  "Is it safe around there?",
  "Are there any other tenants?"
];

// Format last seen time to human-readable string
function formatLastSeen(lastSeenDate) {
  if (!lastSeenDate) return null;
  
  const now = new Date();
  const lastSeen = new Date(lastSeenDate);
  const diffMs = now - lastSeen;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  // Just now (less than 1 minute)
  if (diffMins < 1) {
    return 'just now';
  }
  
  // Minutes ago (1-59 minutes)
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  // Hours ago (1-23 hours) - same day
  if (diffHours < 24 && lastSeen.getDate() === now.getDate()) {
    return `today at ${lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (lastSeen.getDate() === yesterday.getDate() && 
      lastSeen.getMonth() === yesterday.getMonth() && 
      lastSeen.getFullYear() === yesterday.getFullYear()) {
    return `yesterday at ${lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // This week (2-6 days ago)
  if (diffDays < 7) {
    const dayName = lastSeen.toLocaleDateString([], { weekday: 'long' });
    return `${dayName} at ${lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // More than a week ago - show date
  return lastSeen.toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Greeting based on time of day
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️ Good morning';
  if (hour < 17) return '🌤️ Good afternoon';
  return '🌙 Good evening';
}

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

// formatSeenTime - kept for future use with read receipts
// function formatSeenTime(dateString) {
//   if (!dateString) return '';
//   const date = new Date(dateString);
//   return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
// }

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
  isLandlord = false,
  onViewListing = null
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
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingError, setRecordingError] = useState(null);
  const [sendingVoice, setSendingVoice] = useState(false);
  
  // Message delete state
  const [showDeleteModal, setShowDeleteModal] = useState(null); // message object
  const [deletingMessage, setDeletingMessage] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const voiceRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);

  // Determine other user based on who the current user is in this conversation
  // (not based on user type, but on conversation participants)
  const otherUser = conversation.renter_id === currentUserId 
    ? conversation.landlord 
    : conversation.renter;
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
      const { error } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        // Try alternative bucket name
        const { error: error2 } = await supabase.storage
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
      
      // Mark as read with timestamp for "Seen" feature
      await markMessagesAsReadWithTimestamp(conversation.id, currentUserId);
    }
    loadMessages();
  }, [conversation.id, currentUserId]);

  // Subscribe to new messages and read status updates
  useEffect(() => {
    const unsubscribe = subscribeToMessages(
      conversation.id, 
      // Handle new messages
      (newMsg) => {
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
        // Mark as read with timestamp if we receive it
        if (newMsg.sender_id !== currentUserId) {
          markMessagesAsReadWithTimestamp(conversation.id, currentUserId);
        }
      },
      // Handle message updates (read status changes)
      (updatedMsg) => {
        setMessages(prev => 
          prev.map(m => m.id === updatedMsg.id ? { ...m, read: updatedMsg.read, read_at: updatedMsg.read_at } : m)
        );
      }
    );

    return unsubscribe;
  }, [conversation.id, currentUserId]);


  // Only auto-scroll if user is at (or near) the bottom, or if a new message is sent by the user
  const lastMessageCount = useRef(0);
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
  // NEW: Online presence with heartbeat
  // ===========================
  
  // Helper to check if user is truly online (last_seen within 2 minutes)
  const isUserTrulyOnline = useCallback((presence) => {
    if (!presence || !presence.is_online) return false;
    if (!presence.last_seen) return false;
    
    const lastSeen = new Date(presence.last_seen);
    const now = new Date();
    const diffMs = now - lastSeen;
    const diffMins = diffMs / 60000;
    
    // If last_seen is more than 2 minutes ago, consider offline
    // (heartbeat runs every 30 seconds, so 2 min gives buffer)
    return diffMins < 2;
  }, []);
  
  useEffect(() => {
    if (!otherUser?.id || !currentUserId) return;

    // Get initial presence
    getUserPresence(otherUser.id).then(presence => {
      if (presence) {
        setOtherUserOnline(isUserTrulyOnline(presence));
        setOtherUserLastSeen(presence.last_seen);
      }
    });

    // Subscribe to presence changes
    const unsubscribe = subscribeToPresence(otherUser.id, (presence) => {
      setOtherUserOnline(isUserTrulyOnline(presence));
      setOtherUserLastSeen(presence?.last_seen);
    });
    
    // Also check every 30 seconds if user is still "truly" online
    const checkInterval = setInterval(() => {
      getUserPresence(otherUser.id).then(presence => {
        if (presence) {
          setOtherUserOnline(isUserTrulyOnline(presence));
          setOtherUserLastSeen(presence.last_seen);
        }
      });
    }, 30000);

    // Update own presence immediately
    updatePresence(currentUserId, true, conversation?.id);

    // Heartbeat: update presence every 30 seconds to stay "online"
    const heartbeatInterval = setInterval(() => {
      updatePresence(currentUserId, true, conversation?.id);
    }, 30000);

    // Handle page visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence(currentUserId, false, null);
      } else {
        updatePresence(currentUserId, true, conversation?.id);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle before unload
    const handleBeforeUnload = () => {
      updatePresence(currentUserId, false, null);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribe();
      clearInterval(heartbeatInterval);
      clearInterval(checkInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Set offline when leaving
      updatePresence(currentUserId, false, null);
    };
  }, [otherUser?.id, currentUserId, conversation?.id, isUserTrulyOnline]);

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

  // ===========================
  // NEW: Delete message handlers
  // ===========================
  const handleDeleteForMe = async () => {
    if (!showDeleteModal) return;
    setDeletingMessage(true);
    try {
      await deleteMessageForMe(showDeleteModal.id, currentUserId);
      // Remove from local state
      setMessages(prev => prev.filter(m => m.id !== showDeleteModal.id));
      setShowDeleteModal(null);
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Failed to delete message');
    }
    setDeletingMessage(false);
  };

  const handleDeleteForEveryone = async () => {
    if (!showDeleteModal) return;
    setDeletingMessage(true);
    try {
      await deleteMessageForEveryone(showDeleteModal.id, currentUserId);
      // Update in local state
      setMessages(prev => prev.map(m => 
        m.id === showDeleteModal.id 
          ? { ...m, content: '🚫 This message was deleted', message_type: 'deleted', voice_url: null }
          : m
      ));
      setShowDeleteModal(null);
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Failed to delete message');
    }
    setDeletingMessage(false);
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

  // Voice recording functions
  const handleStartRecording = async () => {
    try {
      setRecordingError(null);
      
      if (!VoiceRecorder.isSupported()) {
        setRecordingError('Your browser does not support voice recording');
        return;
      }

      if (!voiceRecorderRef.current) {
        voiceRecorderRef.current = new VoiceRecorder();
      }

      await voiceRecorderRef.current.startRecording();
      setIsRecording(true);
      setRecordingDuration(0);

      // Update duration every 100ms
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 0.1);
      }, 100);
    } catch (error) {
      console.error('Error starting recording:', error);
      setRecordingError(error.message);
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      setIsRecording(false);
      const result = await voiceRecorderRef.current.stopRecording();
      
      if (!result || result.duration < 1) {
        setRecordingError('Recording too short. Minimum 1 second required.');
        setRecordingDuration(0);
        return;
      }

      // Send voice message
      setSendingVoice(true);
      setRecordingError(null);

      const message = await sendVoiceMessage(
        conversation.id,
        currentUserId,
        result.blob,
        result.duration
      );

      setMessages(prev => [...prev, message]);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Error sending voice message:', error);
      setRecordingError('Failed to send voice message. Please try again.');
      setRecordingDuration(0);
    } finally {
      setSendingVoice(false);
    }
  };

  const handleCancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    
    setIsRecording(false);
    setRecordingDuration(0);
    setRecordingError(null);
    
    if (voiceRecorderRef.current) {
      voiceRecorderRef.current.cancelRecording();
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
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 overflow-hidden">
      {/* Custom CSS for animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        @keyframes message-in {
          0% { opacity: 0; transform: translateY(10px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes send-fly {
          0% { transform: translateX(0) translateY(0) rotate(0deg); }
          50% { transform: translateX(5px) translateY(-5px) rotate(-10deg); }
          100% { transform: translateX(0) translateY(0) rotate(0deg); }
        }
        .message-bubble { animation: message-in 0.25s ease-out; }
        .typing-dot-1 { animation: typing-dot 1.4s ease-in-out infinite; }
        .typing-dot-2 { animation: typing-dot 1.4s ease-in-out 0.2s infinite; }
        .typing-dot-3 { animation: typing-dot 1.4s ease-in-out 0.4s infinite; }
      `}</style>
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

      {/* Delete Message Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Delete Message
              </h3>
              <button
                onClick={() => setShowDeleteModal(null)}
                disabled={deletingMessage}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4">
              {/* Message Preview */}
              <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {showDeleteModal.content?.startsWith('[Image]') 
                    ? '📷 Photo'
                    : showDeleteModal.message_type === 'voice'
                    ? '🎤 Voice message'
                    : showDeleteModal.content?.substring(0, 100)}
                </p>
              </div>
              
              <div className="space-y-2">
                {/* Delete for Me - always available */}
                <button
                  onClick={handleDeleteForMe}
                  disabled={deletingMessage}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">Delete for me</p>
                    <p className="text-xs text-gray-500">This message will be removed from your chat only</p>
                  </div>
                  {deletingMessage && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
                </button>
                
                {/* Delete for Everyone - only if sender */}
                {showDeleteModal.sender_id === currentUserId && (
                  <button
                    onClick={handleDeleteForEveryone}
                    disabled={deletingMessage}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-red-600 dark:text-red-400">Delete for everyone</p>
                      <p className="text-xs text-gray-500">This message will be deleted for all participants</p>
                    </div>
                    {deletingMessage && <Loader2 className="w-5 h-5 animate-spin text-red-400" />}
                  </button>
                )}
              </div>
              
              <button
                onClick={() => setShowDeleteModal(null)}
                disabled={deletingMessage}
                className="w-full mt-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
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

      {/* Header - Glass morphism style */}
      <div className="flex-shrink-0 flex items-center gap-3 p-4 bg-gradient-to-r from-[#E63946] via-rose-500 to-pink-500 shadow-2xl relative overflow-hidden">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent" style={{ animation: 'shimmer 3s ease-in-out infinite' }} />
        {/* Glass reflection */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
        
        <button
          onClick={onBack}
          className="relative p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl transition-all duration-300 hover:scale-110 active:scale-90 shadow-lg shadow-black/10 border border-white/20"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5 text-white drop-shadow-sm" />
        </button>
        
        <div className="relative flex items-center gap-3 flex-1 min-w-0">
          <div className="relative group">
            {otherUser?.photo_url ? (
              <img 
                src={otherUser.photo_url} 
                alt={otherUser.display_name} 
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/40 shadow-xl group-hover:scale-105 transition-all duration-300"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-md flex items-center justify-center ring-2 ring-white/30 shadow-xl group-hover:scale-105 transition-all duration-300">
                <span className="text-white font-bold text-lg drop-shadow-sm">
                  {otherUser?.display_name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            {/* Online/Offline indicator with pulse effect */}
            <div className="absolute -bottom-0.5 -right-0.5">
              {otherUserOnline && (
                <span className="absolute inset-0 w-4 h-4 bg-emerald-400 rounded-full" style={{ animation: 'pulse-ring 1.5s ease-out infinite' }} />
              )}
              <div className={`relative w-4 h-4 border-2 border-white rounded-full shadow-lg transition-all duration-300 ${
                otherUserOnline ? 'bg-emerald-400' : 'bg-gray-400'
              }`} />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate text-lg drop-shadow-sm">
              {otherUser?.display_name || 'Unknown User'}
            </h3>
            {/* Status: typing, online, last seen, or listing info */}
            {isOtherUserTyping ? (
              <div className="flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-white/90 rounded-full typing-dot-1" />
                  <span className="w-2 h-2 bg-white/90 rounded-full typing-dot-2" />
                  <span className="w-2 h-2 bg-white/90 rounded-full typing-dot-3" />
                </span>
                <span className="text-sm text-white/90 font-medium">typing...</span>
              </div>
            ) : otherUserOnline ? (
              <p className="text-sm text-emerald-200 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full" style={{ animation: 'float 2s ease-in-out infinite' }} />
                Active now
              </p>
            ) : otherUserLastSeen ? (
              <p className="text-sm text-white/70 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Last seen {formatLastSeen(otherUserLastSeen)}
              </p>
            ) : listing ? (
              <p className="text-sm text-white/80 truncate font-medium">
                💬 {listing.title}
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

      {/* Listing Preview Card (if available) - Premium Design */}
      {listing && (
        <div 
          onClick={() => {
            if (onViewListing && listing) {
              onViewListing(listing);
            }
          }}
          className="flex-shrink-0 mx-3 mt-3 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/30 dark:from-gray-800 dark:via-amber-900/10 dark:to-orange-900/10 rounded-3xl border border-amber-200/60 dark:border-amber-800/40 shadow-xl shadow-amber-500/10 overflow-hidden group cursor-pointer hover:shadow-2xl hover:scale-[1.01] transition-all duration-300">
          {/* Photo Banner */}
          {listing.photos?.[0] && (
            <div className="relative h-28 overflow-hidden">
              <img 
                src={listing.photos[0]} 
                alt={listing.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              {/* Price Badge */}
              <div className="absolute top-3 right-3 bg-gradient-to-br from-[#E63946] to-rose-600 px-4 py-2 rounded-xl shadow-lg shadow-red-500/40">
                <p className="text-lg font-bold text-white">R{listing.price?.toLocaleString()}</p>
                <p className="text-[10px] text-white/80 font-medium text-center">/month</p>
              </div>
              
              {/* Status Badge */}
              {listing.status === 'available' && (
                <div className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-lg">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  Available
                </div>
              )}
              
              {/* Title Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-bold text-white text-lg truncate drop-shadow-lg">
                  {listing.title}
                </p>
                <p className="text-sm text-white/90 truncate flex items-center gap-1.5">
                  <span>📍</span> {listing.location}
                </p>
              </div>
            </div>
          )}
          
          {/* Quick Info Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/50 border-t border-amber-100 dark:border-amber-800/30">
            <div className="flex items-center gap-3">
              {listing.amenities?.slice(0, 3).map((amenity, i) => (
                <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg font-medium">
                  {amenity === 'WiFi' ? '📶' : amenity === 'Parking' ? '🚗' : amenity === 'Kitchen' ? '🍳' : '✓'} {amenity}
                </span>
              ))}
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              View Details →
            </span>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-4">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-red-100 dark:border-red-900/30 rounded-full" />
              <div className="absolute inset-0 w-14 h-14 border-4 border-transparent border-t-[#E63946] rounded-full animate-spin" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            {/* Animated illustration */}
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-red-100 via-rose-100 to-pink-100 dark:from-red-900/30 dark:via-rose-900/30 dark:to-pink-900/30 rounded-3xl flex items-center justify-center shadow-xl" style={{ animation: 'float 3s ease-in-out infinite' }}>
                <MessageCircle className="w-12 h-12 text-[#E63946]" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg" style={{ animation: 'float 3s ease-in-out infinite', animationDelay: '0.5s' }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{getGreeting()}!</h3>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Start your conversation</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[260px]">
              Say hi to {otherUser?.display_name?.split(' ')[0] || 'them'} and ask about the room! 👋
            </p>
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
            const isLastInGroup = idx === messages.length - 1 || messages[idx + 1]?.sender_id !== msg.sender_id;

            return (
              <div key={msg.id} className="message-bubble">
                {showTime && (
                  <div className="flex items-center justify-center gap-3 my-5">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
                    <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 px-4 py-1.5 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm">
                      {formatMessageTime(msg.created_at)}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
                  </div>
                )}
                <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} ${!isLastInGroup ? 'mb-0.5' : 'mb-2'}`}>
                  {!isMe && (
                    <div className="flex flex-col items-center w-9 flex-shrink-0">
                      {showSender && (
                        <>
                          {sender?.photo_url ? (
                            <img src={sender.photo_url} alt={sender.display_name} className="w-8 h-8 rounded-xl object-cover shadow-md ring-1 ring-gray-200 dark:ring-gray-700" />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md"
                              style={{ background: `linear-gradient(135deg, ${getColorFromId(sender?.id)}, ${getColorFromId(sender?.id)}dd)` }}
                            >
                              <span className="text-white font-bold text-xs drop-shadow-sm">{sender?.display_name?.[0]?.toUpperCase() || '?'}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Message with reactions and reply */}
                  <div className={`relative max-w-[78%] ${isMe ? 'order-1' : ''}`}>
                    {/* Reply preview */}
                    {(msg.reply_to_id || msg._replyTo) && (
                      <div className={`mb-1.5 px-3 py-2 rounded-xl text-xs border-l-3 ${
                        isMe 
                          ? 'bg-white/15 text-white/90 border-white/50' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-[#E63946]'
                      }`}>
                        <span className="flex items-center gap-1.5 font-semibold mb-0.5 opacity-80">
                          <Reply className="w-3 h-3" />
                          Reply
                        </span>
                        <p className="truncate">{msg._replyTo?.content?.substring(0, 50) || 'Replying to message...'}</p>
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
                        {!msg._optimistic && msg.message_type !== 'deleted' && (
                          <div className={`absolute top-2 ${isMe ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-1.5`}>
                            <button
                              onClick={() => handleReply(msg)}
                              className="p-2 bg-black/60 backdrop-blur-md rounded-xl hover:bg-black/80 hover:scale-110 transition-all shadow-lg"
                            >
                              <Reply className="w-4 h-4 text-white" />
                            </button>
                            <button
                              onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                              className="p-2 bg-black/60 backdrop-blur-md rounded-xl hover:bg-black/80 hover:scale-110 transition-all shadow-lg"
                            >
                              <Heart className="w-4 h-4 text-white" />
                            </button>
                            <button
                              onClick={() => setShowDeleteModal(msg)}
                              className="p-2 bg-black/60 backdrop-blur-md rounded-xl hover:bg-red-600 hover:scale-110 transition-all shadow-lg"
                            >
                              <Trash2 className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : msg.message_type === 'voice' ? (
                      // Voice Message Player
                      <div
                        className={`relative px-4 py-3 transition-all duration-200 group ${
                          isMe
                            ? 'bg-gradient-to-br from-[#E63946] via-rose-500 to-pink-500 text-white rounded-2xl rounded-br-md shadow-lg shadow-rose-500/20'
                            : 'bg-white dark:bg-gray-750 text-gray-900 dark:text-white rounded-2xl rounded-bl-md shadow-md border border-gray-100 dark:border-gray-700'
                        } ${msg._optimistic ? 'opacity-60' : 'hover:shadow-xl'}`}
                        onDoubleClick={() => !msg._optimistic && handleReaction(msg.id, '❤️')}
                      >
                        <VoiceMessagePlayer message={msg} isMe={isMe} />
                        
                        {/* Message status for sent messages */}
                        {isMe && (
                          <div className="flex items-center justify-end gap-1.5 mt-2 -mb-0.5">
                            <span className="text-[10px] text-white/50 font-medium">
                              {formatMessageTime(msg.created_at).split(' ').pop()}
                            </span>
                            {msg._optimistic ? (
                              <Clock className="w-3 h-3 text-white/40" />
                            ) : msg.read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-cyan-300" title="Seen" />
                            ) : (
                              <CheckCheck className="w-3.5 h-3.5 text-white/50" title="Delivered" />
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                    <div
                      className={`relative px-4 py-3 transition-all duration-200 group ${
                        isMe
                          ? 'bg-gradient-to-br from-[#E63946] via-rose-500 to-pink-500 text-white rounded-2xl rounded-br-md shadow-lg shadow-rose-500/20'
                          : 'bg-white dark:bg-gray-750 text-gray-900 dark:text-white rounded-2xl rounded-bl-md shadow-md border border-gray-100 dark:border-gray-700'
                      } ${msg._optimistic ? 'opacity-60' : 'hover:shadow-xl'}`}
                      style={{ wordBreak: 'break-word' }}
                      onDoubleClick={() => !msg._optimistic && handleReaction(msg.id, '❤️')}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">{msg.content}</p>
                      
                      {/* Message status for sent messages */}
                      {isMe && (
                        <div className="flex items-center justify-end gap-1.5 mt-1.5 -mb-0.5">
                          <span className="text-[10px] text-white/50 font-medium">
                            {formatMessageTime(msg.created_at).split(' ').pop()}
                          </span>
                          {msg._optimistic ? (
                            <Clock className="w-3 h-3 text-white/40" />
                          ) : msg.read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-300" title="Seen" />
                          ) : (
                            <CheckCheck className="w-3.5 h-3.5 text-white/50" title="Delivered" />
                          )}
                        </div>
                      )}
                      
                      {/* Sending indicator */}
                      {msg._optimistic && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                          <div className="w-3 h-3 border-2 border-[#E63946] border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      
                      {/* Action buttons on hover */}
                      {!msg._optimistic && msg.message_type !== 'deleted' && (
                        <div className={`absolute -top-2 ${isMe ? '-left-20' : '-right-20'} opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-1`}>
                          <button
                            onClick={() => handleReply(msg)}
                            className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 shadow-md"
                            title="Reply"
                          >
                            <Reply className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                          </button>
                          <button
                            onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                            className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 shadow-md"
                            title="React"
                          >
                            <Smile className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                          </button>
                          <button
                            onClick={() => setShowDeleteModal(msg)}
                            className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 shadow-md"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-300 hover:text-red-500" />
                          </button>
                        </div>
                      )}
                    </div>
                    )}
                    
                    {/* Reactions display - floating pill style */}
                    {messageReactions[msg.id]?.length > 0 && (
                      <div className={`absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} flex`}>
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-100 dark:border-gray-700">
                          {Object.entries(
                            messageReactions[msg.id].reduce((acc, r) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="flex items-center hover:scale-110 transition-transform"
                            >
                              <span className="text-sm">{emoji}</span>
                              {count > 1 && <span className="text-[10px] text-gray-500 font-bold ml-0.5">{count}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Reaction picker - animated pill */}
                    {showReactionPicker === msg.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowReactionPicker(null)} />
                        <div 
                          className={`absolute ${isMe ? 'right-0' : 'left-0'} -top-14 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 px-3 py-2 flex gap-1 z-20`}
                          style={{ animation: 'message-in 0.2s ease-out' }}
                        >
                          {REACTION_EMOJI_LIST.map((emoji, i) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-xl transition-all hover:scale-125"
                              style={{ animationDelay: `${i * 30}ms` }}
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
        <div className="mx-3 mb-2">
          <button
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 text-amber-700 dark:text-amber-400 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 hover:shadow-md transition-all duration-200"
          >
            <span className="flex items-center gap-2.5">
              <div className="p-1.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-sm">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span>Quick Replies</span>
              <span className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{quickReplies.length}</span>
            </span>
            {showQuickReplies ? (
              <ChevronDown className="w-5 h-5 transition-transform" />
            ) : (
              <ChevronUp className="w-5 h-5 transition-transform" />
            )}
          </button>
          {showQuickReplies && (
            <div className="mt-2 px-2 pb-1 flex flex-wrap gap-2" style={{ animation: 'message-in 0.2s ease-out' }}>
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickReply(reply)}
                  className="px-4 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl border border-amber-200 dark:border-amber-800/50 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 truncate max-w-[220px] font-medium"
                >
                  {reply.substring(0, 40)}{reply.length > 40 ? '...' : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Questions (for renters) */}
      {!isLandlord && (
        <div className="mx-3 mb-2">
          <button
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-400 rounded-2xl border border-blue-200/60 dark:border-blue-800/40 hover:shadow-md transition-all duration-200"
          >
            <span className="flex items-center gap-2.5">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-sm">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <span>Quick Questions</span>
              <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">10</span>
            </span>
            {showQuickReplies ? (
              <ChevronDown className="w-5 h-5 transition-transform" />
            ) : (
              <ChevronUp className="w-5 h-5 transition-transform" />
            )}
          </button>
          {showQuickReplies && (
            <div className="mt-2 px-2 pb-1 flex flex-wrap gap-2" style={{ animation: 'message-in 0.2s ease-out' }}>
              {RENTER_QUICK_QUESTIONS.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickReply(question)}
                  className="px-4 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl border border-blue-200 dark:border-blue-800/50 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 font-medium"
                >
                  {question}
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

      {/* Reply Preview - Floating Style */}
      {replyingTo && (
        <div className="mx-3 mb-2 px-4 py-3 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-900/20 dark:via-blue-900/20 dark:to-cyan-900/20 rounded-2xl border border-blue-200/60 dark:border-blue-800/40 shadow-sm" style={{ animation: 'message-in 0.2s ease-out' }}>
          <div className="flex items-center gap-3">
            <div className="w-1 h-10 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mb-0.5">
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

      {/* Input Area - Premium Style */}
      <div className="flex-shrink-0 p-3 bg-gradient-to-t from-white via-white to-gray-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-850 border-t border-gray-100 dark:border-gray-700 safe-area-bottom">
        {/* Emoji Picker - Grid style */}
        {showEmojiPicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)} />
            <div 
              className="absolute bottom-24 left-4 right-4 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-20"
              style={{ animation: 'message-in 0.2s ease-out' }}
            >
              <p className="text-xs font-semibold text-gray-400 mb-3 px-1">Quick Emojis</p>
              <div className="grid grid-cols-8 gap-1">
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setNewMessage(prev => prev + emoji);
                      setShowEmojiPicker(false);
                      inputRef.current?.focus();
                    }}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-2xl transition-all hover:scale-125 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        
        <div className="flex items-center gap-2">
          {/* Attachment Button */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              disabled={uploadingImage}
              className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 ${
                showAttachMenu 
                  ? 'bg-gradient-to-br from-[#E63946] to-rose-500 text-white shadow-lg shadow-red-500/30 rotate-45' 
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

            {/* Attachment Menu - Floating Card */}
            {showAttachMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAttachMenu(false)} />
                <div 
                  className="absolute bottom-full left-0 mb-3 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 min-w-[180px]"
                  style={{ animation: 'message-in 0.2s ease-out' }}
                >
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent dark:hover:from-blue-900/20 transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <Image className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Photo</p>
                      <p className="text-xs text-gray-500">Share an image</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Emoji Button */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-300 ${
              showEmojiPicker 
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-500'
            }`}
            aria-label="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Message Input - Premium Style */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={handleKeyDown}
              placeholder={replyingTo ? "Type your reply..." : "Message..."}
              rows={1}
              className="w-full resize-none px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-transparent rounded-full focus:border-[#E63946] focus:bg-white dark:focus:bg-gray-650 focus:ring-2 focus:ring-red-100/50 dark:focus:ring-red-900/20 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-300 text-[15px]"
              style={{ maxHeight: '80px', minHeight: '44px' }}
            />
            {newMessage.length > 0 && (
              <span className={`absolute right-3 bottom-1.5 text-[10px] font-bold transition-all ${
                newMessage.length > 450 ? 'text-red-500' : newMessage.length > 400 ? 'text-amber-500' : 'text-gray-300'
              }`}>
                {newMessage.length}/500
              </span>
            )}
          </div>

          {/* Voice / Send Button - Morphs based on input */}
          {newMessage.trim() ? (
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-[#E63946] via-rose-500 to-pink-500 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 active:scale-95 transition-all duration-300"
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          ) : isRecording ? (
            // Recording UI
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-red-600 dark:text-red-400 min-w-[32px]">
                {formatDuration(recordingDuration)}
              </span>
              <button
                onClick={handleCancelRecording}
                className="w-8 h-8 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-800 rounded-full transition-colors"
                aria-label="Cancel recording"
              >
                <X className="w-4 h-4 text-red-600 dark:text-red-400" />
              </button>
              <button
                onClick={handleStopRecording}
                disabled={sendingVoice}
                className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors disabled:opacity-50"
                aria-label="Send voice message"
              >
                {sendingVoice ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartRecording}
              disabled={sendingVoice}
              className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-all duration-300 disabled:opacity-50"
              aria-label="Start voice recording"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Recording Error Message */}
        {recordingError && (
          <div className="mx-4 mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{recordingError}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Voice Message Player Component
function VoiceMessagePlayer({ message, isMe }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.voice_duration || 0);
  const audioRef = useRef(null);

  // Extract audio URL from message content if voice message
  const getAudioUrl = () => {
    if (message.voice && message.voice.audio_url) {
      console.log('Voice URL found:', message.voice.audio_url);
      return message.voice.audio_url;
    }
    console.warn('No voice data found for message:', message.id, message);
    return null;
  };

  const audioUrl = getAudioUrl();

  const handlePlayPause = async () => {
    if (!audioUrl) {
      console.warn('No audio URL available');
      return;
    }

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(audioUrl);
          audioRef.current.onloadedmetadata = () => {
            setDuration(Math.round(audioRef.current.duration));
          };
          audioRef.current.ontimeupdate = () => {
            setCurrentTime(Math.round(audioRef.current.currentTime));
          };
          audioRef.current.onended = () => {
            setIsPlaying(false);
            setCurrentTime(0);
          };
        }
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
    setIsPlaying(false);
  };

  const handleProgress = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <div className="flex items-center gap-3 py-1">
      {/* Play Button */}
      <button
        onClick={handlePlayPause}
        disabled={!audioUrl}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isMe
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-gradient-to-br from-[#E63946] to-rose-500 hover:scale-105 text-white'
        } ${!audioUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Progress Bar */}
      <div className="flex-1 min-w-0">
        <div
          className={`relative h-1.5 rounded-full cursor-pointer transition-colors ${
            isMe ? 'bg-white/30 hover:bg-white/50' : 'bg-gray-600/30 dark:bg-gray-500/30 hover:bg-gray-600/50 dark:hover:bg-gray-500/50'
          }`}
          onClick={handleProgress}
        >
          <div
            className={`h-full rounded-full transition-all ${
              isMe ? 'bg-white' : 'bg-gradient-to-r from-[#E63946] to-rose-500'
            }`}
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Duration */}
      <div className={`flex-shrink-0 text-xs font-semibold whitespace-nowrap ${
        isMe ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
      }`}>
        {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
      </div>
    </div>
  );
}
