import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, ArrowLeft, Sparkles, Search, Building2 } from 'lucide-react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import PropertyManagement from './PropertyManagement';
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
  initialConversation = null, // Optional: open specific conversation
  onViewListing = null // Callback to open listing detail modal
}) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(initialConversation);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('messages'); // 'messages' or 'groups'

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

  // If showing PropertyManagement (groups tab)
  if (activeTab === 'groups') {
    return (
      <div className="min-h-[calc(100vh-140px)] pb-20 bg-gradient-to-b from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-900 -mx-4 sm:-mx-6 lg:-mx-8">
        {/* Tab Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-[#1D3557] via-[#2d4a6f] to-[#1D3557] text-white shadow-xl overflow-hidden">
          {/* Animated shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" style={{ animationTimingFunction: 'ease-in-out' }} />
          
          <div className="relative flex items-center gap-3 p-4">
            {onBack && (
              <button onClick={onBack} className="p-2.5 hover:bg-white/15 rounded-xl transition-all hover:scale-105 active:scale-95">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold tracking-tight">Messages</h1>
            </div>
          </div>
          
          {/* Tab Switcher */}
          <div className="relative flex px-4 pb-3 gap-2">
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'messages'
                  ? 'bg-white text-[#1D3557] shadow-lg shadow-black/10 scale-[1.02]'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:scale-[1.01]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Direct
              {totalUnread > 0 && (
                <span className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-full animate-pulse ${
                  activeTab === 'messages' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white text-red-500'
                }`}>{totalUnread}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'groups'
                  ? 'bg-white text-[#1D3557] shadow-lg shadow-black/10 scale-[1.02]'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:scale-[1.01]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              {isLandlord ? 'My Properties' : 'My Rental'}
            </button>
          </div>
        </div>

        {/* Property Management Content */}
        <PropertyManagement
          currentUser={currentUser}
          showToast={() => {}}
          isLandlord={isLandlord}
          embedded={true}
        />
      </div>
    );
  }

  // Mobile: show either list or chat
  if (isMobile) {
    if (selectedConversation) {
      return (
        <div className="fixed inset-0 z-40 bg-white dark:bg-gray-900 transition-all duration-300 animate-fadein">
          <ChatWindow
            conversation={selectedConversation}
            currentUserId={currentUser.id}
            onBack={handleBackToList}
            isLandlord={isLandlord}
            onViewListing={onViewListing}
          />
        </div>
      );
    }

    return (
      <div className="min-h-[calc(100vh-140px)] pb-20 bg-gradient-to-b from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-900 transition-all duration-300 -mx-4 sm:-mx-6 lg:-mx-8">
        {/* Premium Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-[#1D3557] via-[#2d4a6f] to-[#1D3557] text-white shadow-xl overflow-hidden">
          {/* Animated shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" style={{ animationTimingFunction: 'ease-in-out' }} />
          
          <div className="relative flex items-center gap-3 p-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2.5 hover:bg-white/15 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold tracking-tight">Messages</h1>
            </div>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex px-4 pb-3 gap-2">
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'messages'
                  ? 'bg-white text-[#1D3557] shadow-lg shadow-black/10 scale-[1.02]'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:scale-[1.01]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Direct
              {totalUnread > 0 && (
                <span className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-full animate-pulse ${
                  activeTab === 'messages' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white text-red-500'
                }`}>{totalUnread}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'groups'
                  ? 'bg-white text-[#1D3557] shadow-lg shadow-black/10 scale-[1.02]'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:scale-[1.01]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              {isLandlord ? 'Properties' : 'My Rental'}
            </button>
          </div>
          
          {/* Search Bar - only for direct messages */}
          {conversations.length > 0 && activeTab === 'messages' && (
            <div className="px-4 pb-4">
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center group-focus-within:bg-white/20 transition-colors">
                  <Search className="w-4 h-4 text-white/70" />
                </div>
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-4 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-2xl text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition-all duration-200"
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
          <div className="bg-white dark:bg-gray-800 overflow-hidden">
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
    <div className="flex h-[calc(100vh-120px)] bg-gradient-to-br from-slate-100 to-gray-100 dark:from-gray-900 dark:to-gray-900 rounded-3xl overflow-hidden shadow-2xl mx-4 my-4 border border-gray-200/50 dark:border-gray-700/50">
      {/* Conversation List Panel */}
      <div className="w-[400px] flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1D3557] via-[#2d4a6f] to-[#1D3557] text-white p-5 relative overflow-hidden">
          {/* Animated shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" style={{ animationTimingFunction: 'ease-in-out' }} />
          
          <div className="relative flex items-center gap-3 mb-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2.5 hover:bg-white/15 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner ring-2 ring-white/10">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Messages</h1>
                {totalUnread > 0 ? (
                  <p className="text-xs text-white/70 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                    {totalUnread} unread
                  </p>
                ) : (
                  <p className="text-xs text-white/70">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center group-focus-within:bg-white/20 transition-colors">
              <Search className="w-4 h-4 text-white/70" />
            </div>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-4 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-2xl text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 transition-all duration-200"
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
            isLandlord={isLandlord}
            onViewListing={onViewListing}
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
