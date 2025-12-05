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
        <div className="fixed inset-0 top-0 bottom-[60px] z-10 bg-white dark:bg-gray-900">
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
      <div className="min-h-[calc(100vh-140px)] pb-20 bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-red-500" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h1>
          </div>
        </div>

        <ConversationList
          conversations={conversations}
          currentUserId={currentUser.id}
          onSelectConversation={handleSelectConversation}
          selectedConversationId={selectedConversation?.id}
          unreadCounts={unreadCounts}
          loading={loading}
        />
      </div>
    );
  }

  // Desktop: side-by-side layout
  return (
    <div className="flex h-[calc(100vh-120px)] bg-gray-100 dark:bg-gray-900">
      {/* Conversation List Panel */}
      <div className="w-96 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-red-500" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h1>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
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
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50 dark:bg-gray-900">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Select a conversation
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
              Choose a conversation from the list to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
