import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import { 
  getUserConversations, 
  getMessages, 
  subscribeToUserConversations,
  subscribeToNewMessages 
} from '../chat';

export default function MessagesView({ 
  currentUser, 
  userType,
  onBack,
  initialConversation = null // Optional: open specific conversation
}) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(initialConversation);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate unread messages per conversation
  const updateUnreadCounts = useCallback(async (convos) => {
    if (!currentUser?.id) return;

    const counts = {};
    for (const convo of convos) {
      const messages = await getMessages(convo.id);
      counts[convo.id] = messages.filter(
        m => m.sender_id !== currentUser.id && !m.read
      ).length;
    }
    setUnreadCounts(counts);
  }, [currentUser?.id]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    
    setLoading(true);
    const convos = await getUserConversations(currentUser.id);
    setConversations(convos);
    setLoading(false);

    // Calculate unread counts
    await updateUnreadCounts(convos);
  }, [currentUser?.id, updateUnreadCounts]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!currentUser?.id) return;

    // Subscribe to conversation updates
    const unsubConvos = subscribeToUserConversations(currentUser.id, () => {
      loadConversations();
    });

    // Subscribe to new messages for unread badge updates
    const convoIds = conversations.map(c => c.id);
    const unsubMessages = subscribeToNewMessages(
      currentUser.id,
      convoIds,
      (newMsg) => {
        // Update unread count for the conversation
        setUnreadCounts(prev => ({
          ...prev,
          [newMsg.conversation_id]: (prev[newMsg.conversation_id] || 0) + 1
        }));
      }
    );

    return () => {
      unsubConvos();
      unsubMessages();
    };
  }, [currentUser?.id, conversations, loadConversations]);

  // Handle selecting a conversation
  const handleSelectConversation = (convo) => {
    setSelectedConversation(convo);
    // Clear unread count for this conversation
    setUnreadCounts(prev => ({ ...prev, [convo.id]: 0 }));
  };

  // Handle going back from chat
  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  const isLandlord = userType === 'landlord';

  // Mobile: show either list or chat
  if (isMobile) {
    if (selectedConversation) {
      return (
        <div className="fixed inset-0 z-40 bg-white dark:bg-gray-900 transition-all duration-300 animate-fadein">
          <ChatWindow
            conversation={selectedConversation}
            currentUserId={currentUser.id}
            onBack={handleBackToList}
            isLandlord={isLandlord && selectedConversation.landlord_id === currentUser.id}
          />
        </div>
      );
    }

    return (
      <div className="min-h-[calc(100vh-140px)] pb-20 bg-gradient-to-br from-red-50 via-rose-50 to-red-50 dark:bg-gray-900 transition-all duration-300 animate-fadein">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center gap-3 p-5 bg-white/90 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-lg">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Back to main navigation"
            >
              <ArrowLeft className="w-5 h-5 text-red-500" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Messages</h1>
          </div>
        </div>

        {(!loading && conversations.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fadein">
            <div className="w-24 h-24 mb-4">
              <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="24" width="80" height="56" rx="16" fill="#F3F4F6" />
                <rect x="20" y="36" width="56" height="32" rx="8" fill="#E63946" fillOpacity="0.08" />
                <circle cx="48" cy="52" r="8" fill="#E63946" fillOpacity="0.15" />
                <rect x="32" y="68" width="32" height="4" rx="2" fill="#E63946" fillOpacity="0.12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No conversations yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mb-2">Start a chat with a landlord or renter to see your messages here.</p>
            <p className="text-xs text-gray-400">Tip: Tap a listing and use "Message in App" to start chatting!</p>
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            currentUserId={currentUser.id}
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversation?.id}
            unreadCounts={unreadCounts}
            loading={loading}
          />
        )}
      </div>
    );
  }

  // Desktop: side-by-side layout
  return (
    <div className="flex h-[calc(100vh-120px)] bg-gradient-to-br from-red-50 via-rose-50 to-red-50 dark:bg-gray-900 animate-fadein">
      {/* Conversation List Panel */}
      <div className="w-96 flex-shrink-0 bg-white/95 dark:bg-gray-800/95 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col shadow-xl rounded-r-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Back to main navigation"
            >
              <ArrowLeft className="w-5 h-5 text-red-500" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Messages</h1>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ConversationList
            conversations={conversations}
            currentUserId={currentUser.id}
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversation?.id}
            unreadCounts={unreadCounts}
            loading={loading}
          />
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            currentUserId={currentUser.id}
            onBack={handleBackToList}
            isLandlord={isLandlord && selectedConversation.landlord_id === currentUser.id}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/80 dark:bg-gray-900 animate-fadein">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Select a conversation
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-base max-w-md mb-2">
              Choose a conversation from the list to start chatting
            </p>
            <p className="text-xs text-gray-400">Tip: Message a landlord or renter from a listing to start a chat.</p>
          </div>
        )}
      </div>
    </div>
  );
}
