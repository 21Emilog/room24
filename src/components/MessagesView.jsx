import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, ArrowLeft, Sparkles, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

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
  
  // Filter conversations by search
  const filteredConversations = conversations.filter(convo => {
    if (!searchQuery.trim()) return true;
    const otherUser = convo.landlord_id === currentUser?.id ? convo.renter : convo.landlord;
    const searchLower = searchQuery.toLowerCase();
    return (
      otherUser?.display_name?.toLowerCase().includes(searchLower) ||
      convo.listing?.title?.toLowerCase().includes(searchLower) ||
      convo.listing?.location?.toLowerCase().includes(searchLower)
    );
  });

  const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

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
      <div className="min-h-[calc(100vh-140px)] pb-20 bg-gradient-to-b from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-900 transition-all duration-300">
        {/* Premium Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-[#1D3557] to-[#2d4a6f] text-white shadow-lg">
          <div className="flex items-center gap-3 p-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Messages</h1>
                  {totalUnread > 0 && (
                    <p className="text-xs text-white/70">{totalUnread} unread message{totalUnread !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Search Bar */}
          {conversations.length > 0 && (
            <div className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>
          )}
        </div>

        {(!loading && conversations.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-32 h-32 mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-rose-100 rounded-full animate-pulse" />
              <div className="absolute inset-4 bg-white rounded-full shadow-lg flex items-center justify-center">
                <MessageSquare className="w-12 h-12 text-red-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No conversations yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mb-4">
              Start chatting with landlords or renters about listings
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Tip: Tap "Message" on any listing to start!</span>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 mt-2 mx-2 rounded-2xl shadow-sm overflow-hidden">
            <ConversationList
              conversations={filteredConversations}
              currentUserId={currentUser.id}
              onSelectConversation={handleSelectConversation}
              selectedConversationId={selectedConversation?.id}
              unreadCounts={unreadCounts}
              loading={loading}
            />
          </div>
        )}
      </div>
    );
  }

  // Desktop: side-by-side layout
  return (
    <div className="flex h-[calc(100vh-120px)] bg-gradient-to-br from-slate-100 to-gray-100 dark:from-gray-900 dark:to-gray-900 rounded-2xl overflow-hidden shadow-xl mx-4 my-4">
      {/* Conversation List Panel */}
      <div className="w-[380px] flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1D3557] to-[#2d4a6f] text-white p-5">
          <div className="flex items-center gap-3 mb-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Messages</h1>
                {totalUnread > 0 ? (
                  <p className="text-xs text-white/70">{totalUnread} unread</p>
                ) : (
                  <p className="text-xs text-white/70">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={filteredConversations}
            currentUserId={currentUser.id}
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversation?.id}
            unreadCounts={unreadCounts}
            loading={loading}
          />
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            currentUserId={currentUser.id}
            onBack={handleBackToList}
            isLandlord={isLandlord && selectedConversation.landlord_id === currentUser.id}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-32 h-32 mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full" />
              <div className="absolute inset-4 bg-white dark:bg-gray-700 rounded-full shadow-inner flex items-center justify-center">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Select a conversation
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-base max-w-sm">
              Choose a conversation from the list to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
