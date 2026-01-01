import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Users, Plus, Search, X, ChevronRight, MessageCircle, 
  UserPlus, Copy, Check, Trash2, Home, Send, ArrowLeft, MoreVertical, 
  Crown, User, Clock, Link2, Share2, Loader2, Shield, ShieldOff, 
  MessageSquareOff, Settings, ShieldCheck, Star, Phone, BookUser, UserCheck,
  Mic, Play, Pause, Circle, UserMinus, Volume2, LogOut, Ban, Contact, AlertCircle,
  Image, Paperclip
} from 'lucide-react';

import { getSavedContacts, saveContact, deleteContact, searchContacts } from '../utils/savedContacts';
import { VoiceRecorder } from '../utils/voiceRecorder';
import { supabase } from '../supabase';

import {
  createProperty,
  getLandlordProperties,
  getTenantProperties,
  deleteProperty,
  addTenant,
  updateTenantStatus,
  removeTenant,
  createTenantInvitation,
  cancelInvitation,
  acceptInvitation,
  sendPropertyMessage,
  getPropertyMessages,
  markPropertyMessagesAsRead,
  subscribeToPropertyMessages,
  searchUsers,
  getPropertyWithDetails,
  setTenantAdmin,
  setAdminOnlyMessages,
  canSendPropertyMessage,
  leavePropertyGroup,
  blockUser,
  pickContactsAndCheckRegistration,
  deletePropertyMessageForMe,
  deletePropertyMessageForEveryone,
  acceptGroupInvitation,
  declineGroupInvitation,
  getPendingInvitations,
} from '../tenantManagement';

// ===========================
// MAIN COMPONENT
// ===========================

export default function PropertyManagement({ currentUser, showToast, isLandlord, embedded = false }) {
  const [view, setView] = useState('list'); // list, property-detail, chat, add-property
  const [properties, setProperties] = useState([]);
  const [tenantProperties, setTenantProperties] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState(null);

  // Load properties
  useEffect(() => {
    if (!currentUser?.id) return;

    const loadProperties = async () => {
      setLoading(true);
      try {
        if (isLandlord) {
          const props = await getLandlordProperties(currentUser.id);
          setProperties(props);
        }
        // Load properties where user is tenant (for all users)
        const tenantProps = await getTenantProperties(currentUser.id);
        setTenantProperties(tenantProps);
        
        // Load pending invitations
        const pending = await getPendingInvitations(currentUser.id);
        setPendingInvitations(pending);
      } catch (err) {
        console.error('Failed to load properties:', err);
        showToast?.('Failed to load properties', 'error');
      }
      setLoading(false);
    };

    loadProperties();
  }, [currentUser?.id, isLandlord, showToast]);

  // Refresh property details
  const refreshProperty = async (propertyId) => {
    const details = await getPropertyWithDetails(propertyId);
    setSelectedProperty(details);
  };

  // Handle accepting group invitation
  const handleAcceptInvitation = async (tenantRecordId) => {
    setProcessingInvitation(tenantRecordId);
    try {
      const result = await acceptGroupInvitation(tenantRecordId);
      if (result.success) {
        showToast('Invitation accepted! You can now access the property group.', 'success');
        // Refresh tenant properties and pending invitations
        const tenantProps = await getTenantProperties(currentUser.id);
        setTenantProperties(tenantProps);
        setPendingInvitations(prev => prev.filter(inv => inv.id !== tenantRecordId));
      } else {
        showToast(result.error || 'Failed to accept invitation', 'error');
      }
    } catch (error) {
      showToast('Error accepting invitation', 'error');
    } finally {
      setProcessingInvitation(null);
    }
  };

  // Handle declining group invitation
  const handleDeclineInvitation = async (tenantRecordId) => {
    setProcessingInvitation(tenantRecordId);
    try {
      const result = await declineGroupInvitation(tenantRecordId);
      if (result.success) {
        showToast('Invitation declined', 'success');
        setPendingInvitations(prev => prev.filter(inv => inv.id !== tenantRecordId));
      } else {
        showToast(result.error || 'Failed to decline invitation', 'error');
      }
    } catch (error) {
      showToast('Error declining invitation', 'error');
    } finally {
      setProcessingInvitation(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#c5303c]" />
      </div>
    );
  }

  // Property List View
  if (view === 'list') {
    return (
      <div className={embedded ? "" : "pb-24"}>
        {/* Header - hidden when embedded */}
        {!embedded && (
          <div className="sticky top-0 z-10 bg-gradient-to-r from-[#c5303c] to-[#E63946] p-4 text-white">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              {isLandlord ? 'My Properties' : 'My Rentals'}
            </h1>
            <p className="text-sm opacity-80 mt-1">
              {isLandlord ? 'Manage your tenants and property groups' : 'Properties where you are a tenant'}
            </p>
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* Landlord's Properties */}
          {isLandlord && (
            <>
              {properties.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center border border-gray-200 dark:border-gray-700">
                  <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">No Properties Yet</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Create a property to start managing your tenants
                  </p>
                  <button
                    onClick={() => setView('add-property')}
                    className="px-4 py-2 bg-[#c5303c] text-white rounded-xl font-semibold hover:bg-[#a52833] transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-5 h-5" />
                    Add Property
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200">Your Properties</h2>
                    <button
                      onClick={() => setView('add-property')}
                      className="px-3 py-1.5 bg-[#c5303c] text-white rounded-lg text-sm font-semibold hover:bg-[#a52833] transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>

                  {properties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      isOwner={true}
                      onClick={async () => {
                        const details = await getPropertyWithDetails(property.id);
                        setSelectedProperty(details);
                        setView('property-detail');
                      }}
                    />
                  ))}
                </>
              )}
            </>
          )}

          {/* Pending Group Invitations */}
          {pendingInvitations.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Pending Invitations
              </h2>
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-800 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {invitation.property?.name || 'Property'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {invitation.property?.address}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Invited by {invitation.property?.landlord?.name || 'Landlord'}
                      </p>
                      {invitation.unit_number && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Unit: {invitation.unit_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleDeclineInvitation(invitation.id)}
                      disabled={processingInvitation === invitation.id}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processingInvitation === invitation.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      Decline
                    </button>
                    <button
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      disabled={processingInvitation === invitation.id}
                      className="flex-1 px-3 py-2 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processingInvitation === invitation.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tenant's Properties */}
          {tenantProperties.length > 0 && (
            <>
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mt-6">
                {isLandlord ? 'Properties You Rent' : 'Your Rentals'}
              </h2>
              {tenantProperties.map((tenantRecord) => (
                <PropertyCard
                  key={tenantRecord.id}
                  property={tenantRecord.property}
                  isOwner={false}
                  tenantInfo={tenantRecord}
                  onClick={async () => {
                    const details = await getPropertyWithDetails(tenantRecord.property.id);
                    setSelectedProperty(details);
                    setView('property-detail');
                  }}
                />
              ))}
            </>
          )}

          {/* Join with Code */}
          <JoinWithCodeCard
            currentUser={currentUser}
            showToast={showToast}
            onJoined={async (property) => {
              // Refresh tenant properties
              const tenantProps = await getTenantProperties(currentUser.id);
              setTenantProperties(tenantProps);
              showToast?.(`Joined ${property.name}!`, 'success');
            }}
          />
        </div>
      </div>
    );
  }

  // Add Property View
  if (view === 'add-property') {
    return (
      <AddPropertyView
        currentUser={currentUser}
        showToast={showToast}
        onBack={() => setView('list')}
        onCreated={async (property) => {
          const props = await getLandlordProperties(currentUser.id);
          setProperties(props);
          setView('list');
          showToast?.('Property created!', 'success');
        }}
      />
    );
  }

  // Property Detail View
  if (view === 'property-detail' && selectedProperty) {
    return (
      <PropertyDetailView
        property={selectedProperty}
        currentUser={currentUser}
        showToast={showToast}
        isOwner={selectedProperty.landlord_id === currentUser?.id}
        onBack={() => {
          setSelectedProperty(null);
          setView('list');
        }}
        onOpenChat={() => setView('chat')}
        onRefresh={() => refreshProperty(selectedProperty.id)}
        showAddTenant={showAddTenant}
        setShowAddTenant={setShowAddTenant}
        showInviteModal={showInviteModal}
        setShowInviteModal={setShowInviteModal}
      />
    );
  }

  // Chat View
  if (view === 'chat' && selectedProperty) {
    return (
      <PropertyChatView
        property={selectedProperty}
        currentUser={currentUser}
        showToast={showToast}
        onBack={() => setView('property-detail')}
      />
    );
  }

  return null;
}

// ===========================
// PROPERTY CARD
// ===========================

function PropertyCard({ property, isOwner, tenantInfo, onClick }) {
  if (!property) return null;

  return (
    <button
      onClick={onClick}
      className="group w-full bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 hover:border-[#c5303c]/50 hover:shadow-xl hover:shadow-[#c5303c]/10 transition-all duration-300 text-left relative overflow-hidden"
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#c5303c]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 ${
            isOwner 
              ? 'bg-gradient-to-br from-[#c5303c] to-[#E63946] shadow-red-500/30' 
              : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30'
          }`}>
            {isOwner ? (
              <Crown className="w-6 h-6 text-white" />
            ) : (
              <Home className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-[#c5303c] transition-colors">{property.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {property.address || 'No address set'}
            </p>
            {tenantInfo && (
              <p className="text-xs font-semibold mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                {tenantInfo.room_number ? `Room ${tenantInfo.room_number}` : 'Active Tenant'}
              </p>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#c5303c] group-hover:translate-x-1 transition-all" />
      </div>
    </button>
  );
}

// ===========================
// JOIN WITH CODE CARD
// ===========================

function JoinWithCodeCard({ currentUser, showToast, onJoined }) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleJoin = async () => {
    if (!code.trim() || code.length < 6) {
      showToast?.('Please enter a valid 6-character code', 'error');
      return;
    }

    setJoining(true);
    try {
      const property = await acceptInvitation(code.toUpperCase(), currentUser.id);
      setCode('');
      setExpanded(false);
      onJoined?.(property);
    } catch (err) {
      showToast?.(err.message || 'Failed to join property', 'error');
    }
    setJoining(false);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 dark:from-indigo-900/20 dark:via-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800 shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
            <Link2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Join with Code</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Got an invite code from your landlord?</p>
          </div>
        </div>
        <div className={`p-2 rounded-lg bg-white/50 dark:bg-gray-800/50 transition-all ${expanded ? 'rotate-90 bg-indigo-100 dark:bg-indigo-900/30' : 'group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30'}`}>
          <ChevronRight className={`w-5 h-5 text-indigo-500 transition-transform ${expanded ? 'rotate-0' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-800 animate-slideDown">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Enter your 6-character invite code:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="XXXXXX"
              className="flex-1 min-w-0 px-4 py-3 rounded-xl border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono text-center text-xl tracking-[0.3em] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
              maxLength={6}
            />
            <button
              onClick={handleJoin}
              disabled={joining || code.length < 6}
              className="flex-shrink-0 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none hover:scale-105 active:scale-95"
            >
              {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Join'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================
// ADD PROPERTY VIEW
// ===========================

function AddPropertyView({ currentUser, showToast, onBack, onCreated }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast?.('Please enter a property name', 'error');
      return;
    }

    setSaving(true);
    try {
      const property = await createProperty({
        landlordId: currentUser.id,
        name: name.trim(),
        address: address.trim(),
        description: description.trim(),
      });
      onCreated?.(property);
    } catch (err) {
      showToast?.(err.message || 'Failed to create property', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="pb-24 bg-gradient-to-b from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#c5303c] via-rose-500 to-[#E63946] p-4 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" style={{ animationTimingFunction: 'ease-in-out' }} />
        <div className="relative flex items-center gap-3">
          <button onClick={onBack} className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all hover:scale-105">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Add Property</h1>
            <p className="text-sm text-white/70">Create a new property group</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#c5303c]" />
            Property Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Hillbrow Apartments"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#c5303c]/50 focus:border-[#c5303c] transition-all"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Home className="w-4 h-4 text-blue-500" />
            Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 123 Main Street, Johannesburg"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-500" />
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any notes about this property..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={saving || !name.trim()}
          className="w-full py-3 bg-gradient-to-r from-[#c5303c] to-[#E63946] text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Create Property
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ===========================
// PROPERTY DETAIL VIEW
// ===========================

function PropertyDetailView({ 
  property, 
  currentUser, 
  showToast, 
  isOwner, 
  onBack, 
  onOpenChat,
  onRefresh,
  showAddTenant,
  setShowAddTenant,
  showInviteModal,
  setShowInviteModal
}) {
  const [deleting, setDeleting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [adminOnlyMessages, setAdminOnlyMessagesState] = useState(property.admin_only_messages || false);
  const [savingSettings, setSavingSettings] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this property? All tenant records will be removed.')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteProperty(property.id);
      showToast?.('Property deleted', 'success');
      onBack();
    } catch (err) {
      showToast?.(err.message || 'Failed to delete property', 'error');
    }
    setDeleting(false);
  };

  const handleToggleAdminOnly = async () => {
    setSavingSettings(true);
    try {
      const newValue = !adminOnlyMessages;
      await setAdminOnlyMessages(property.id, newValue);
      setAdminOnlyMessagesState(newValue);
      showToast?.(newValue ? 'Only admins can send messages now' : 'All members can send messages', 'success');
    } catch (err) {
      showToast?.(err.message || 'Failed to update setting', 'error');
    }
    setSavingSettings(false);
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#c5303c] to-[#E63946] p-4 text-white">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{property.name}</h1>
            <p className="text-sm opacity-80">{property.address || 'No address'}</p>
          </div>
          {isOwner && (
            <>
              <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <button onClick={handleDelete} disabled={deleting} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Admin Settings Panel */}
      {showSettings && isOwner && (
        <div className="mx-4 mt-4 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#c5303c]" />
            Admin Settings
          </h3>
          
          <div className="space-y-4">
            {/* Admin-only messages toggle */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <MessageSquareOff className="w-4 h-4 text-gray-500" />
                  Admin-Only Messages
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Only admins (landlord and promoted tenants) can send messages in the group chat
                </p>
              </div>
              <button
                onClick={handleToggleAdminOnly}
                disabled={savingSettings}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  adminOnlyMessages ? 'bg-[#c5303c]' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    adminOnlyMessages ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <Shield className="w-3 h-3 inline mr-1" />
                As the landlord, you are always an admin. You can promote tenants to admin status from their profile card.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 space-y-3">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={onOpenChat}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Group Chat
          </button>

          {isOwner && (
            <button
              onClick={() => setShowAddTenant(true)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Tenant
            </button>
          )}
        </div>

        {/* Landlord Info (for tenants) */}
        {!isOwner && property.landlord && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              Landlord
            </h3>
            <div className="flex items-center gap-3">
              {property.landlord.photo_url ? (
                <img src={property.landlord.photo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{property.landlord.display_name}</p>
                {property.landlord.phone && (
                  <p className="text-sm text-gray-500">{property.landlord.phone}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tenants List - Collapsible */}
        <details className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4" />
              Tenants ({property.tenants?.length || 0})
            </span>
            {isOwner && (
              <button
                onClick={(e) => { e.preventDefault(); setShowInviteModal(true); }}
                className="text-xs text-[#c5303c] font-semibold flex items-center gap-1"
              >
                <Share2 className="w-3 h-3" />
                Invite
              </button>
            )}
          </summary>
          <div className="border-t border-gray-100 dark:border-gray-700">
          {property.tenants?.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-3">
              No tenants yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {property.tenants?.map((tenant) => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  isOwner={isOwner}
                  showToast={showToast}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          )}
          </div>
        </details>

        {/* Pending Invitations */}
        {isOwner && property.invitations?.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-4 border border-yellow-200 dark:border-yellow-700">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              Pending Invitations
            </h3>
            <div className="space-y-2">
              {property.invitations.map((invite) => (
                <InvitationCard
                  key={invite.id}
                  invitation={invite}
                  showToast={showToast}
                  onCancel={async () => {
                    await cancelInvitation(invite.id);
                    onRefresh();
                    showToast?.('Invitation cancelled', 'success');
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Tenant Modal */}
      {showAddTenant && (
        <AddTenantModal
          property={property}
          currentUser={currentUser}
          showToast={showToast}
          onClose={() => setShowAddTenant(false)}
          onAdded={() => {
            setShowAddTenant(false);
            onRefresh();
          }}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          property={property}
          currentUser={currentUser}
          showToast={showToast}
          onClose={() => setShowInviteModal(false)}
          onCreated={() => {
            setShowInviteModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// ===========================
// TENANT CARD
// ===========================

function TenantCard({ tenant, isOwner, isAdmin, showToast, onRefresh, currentUserId }) {
  const [showMenu, setShowMenu] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [togglingAdmin, setTogglingAdmin] = useState(false);

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${tenant.profile?.display_name || 'this tenant'}?`)) return;

    setRemoving(true);
    try {
      await removeTenant(tenant.id);
      showToast?.('Tenant removed', 'success');
      onRefresh?.();
    } catch (err) {
      showToast?.(err.message || 'Failed to remove tenant', 'error');
    }
    setRemoving(false);
  };

  const handleEndLease = async () => {
    if (!window.confirm('Mark this tenant as moved out?')) return;

    try {
      await updateTenantStatus(tenant.id, 'ended');
      showToast?.('Lease ended', 'success');
      onRefresh?.();
    } catch (err) {
      showToast?.(err.message || 'Failed to update status', 'error');
    }
    setShowMenu(false);
  };

  const handleToggleAdmin = async () => {
    setTogglingAdmin(true);
    try {
      await setTenantAdmin(tenant.id, !tenant.is_admin);
      showToast?.(tenant.is_admin ? 'Admin rights removed' : 'Promoted to admin', 'success');
      onRefresh?.();
    } catch (err) {
      showToast?.(err.message || 'Failed to update admin status', 'error');
    }
    setTogglingAdmin(false);
    setShowMenu(false);
  };

  // Only landlord or admins can manage tenants
  const canManage = isOwner || isAdmin;
  // Can't manage yourself
  const isSelf = tenant.tenant_id === currentUserId;

  return (
    <div className="group flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-md transition-all duration-200">
      {tenant.profile?.photo_url ? (
        <img src={tenant.profile.photo_url} alt="" className="w-11 h-11 rounded-xl object-cover border-2 border-white dark:border-gray-700 shadow-md group-hover:scale-105 transition-transform" />
      ) : (
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
          <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 dark:text-gray-200 truncate flex items-center gap-1.5">
          {tenant.profile?.display_name || 'Unknown User'}
          {tenant.is_admin && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 text-purple-600 dark:text-purple-400 rounded-full text-[10px] font-bold shadow-sm">
              <ShieldCheck className="w-3 h-3" />
              Admin
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {tenant.room_number && <span className="font-medium">Room {tenant.room_number}</span>}
          <span className={`px-2 py-0.5 rounded-full font-medium ${
            tenant.status === 'active' 
              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 dark:from-green-900/40 dark:to-emerald-900/40 dark:text-green-400' 
              : tenant.status === 'ended'
              ? 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-400'
              : 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 dark:from-yellow-900/40 dark:to-amber-900/40 dark:text-yellow-400'
          }`}>
            {tenant.status === 'active' ? '● Active' : tenant.status}
          </span>
        </div>
      </div>

      {canManage && !isSelf && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[160px]">
                {/* Promote/Demote Admin - only landlord can do this */}
                {isOwner && tenant.status === 'active' && (
                  <button
                    onClick={handleToggleAdmin}
                    disabled={togglingAdmin}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    {tenant.is_admin ? (
                      <>
                        <ShieldOff className="w-4 h-4 text-gray-500" />
                        {togglingAdmin ? 'Removing...' : 'Remove Admin'}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-purple-500" />
                        {togglingAdmin ? 'Promoting...' : 'Make Admin'}
                      </>
                    )}
                  </button>
                )}
                {tenant.status === 'active' && (
                  <button
                    onClick={handleEndLease}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    End Lease
                  </button>
                )}
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {removing ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ===========================
// INVITATION CARD
// ===========================

function InvitationCard({ invitation, showToast, onCancel }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(invitation.invite_code);
    setCopied(true);
    showToast?.('Code copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-md">
        <Link2 className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-lg font-bold text-gray-800 dark:text-gray-200 tracking-wider">{invitation.invite_code}</p>
        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          {invitation.email || invitation.phone || 'Anyone with code can join'}
        </p>
      </div>
      <button onClick={copyCode} className="p-2.5 bg-white dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl shadow-sm transition-colors">
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-blue-500" />}
      </button>
      <button onClick={onCancel} className="p-2.5 bg-white dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl shadow-sm transition-colors">
        <X className="w-4 h-4 text-red-500" />
      </button>
    </div>
  );
}

// ===========================
// ADD TENANT MODAL
// ===========================

function AddTenantModal({ property, currentUser, showToast, onClose, onAdded }) {
  const [activeTab, setActiveTab] = useState('saved'); // saved, search, phone, new
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [savedContacts, setSavedContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  
  // New contact form
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  
  // Phone contacts from device
  // eslint-disable-next-line no-unused-vars
  const [phoneContacts, setPhoneContacts] = useState([]);
  const [registeredContacts, setRegisteredContacts] = useState({});
  const [notRegisteredContacts, setNotRegisteredContacts] = useState([]);
  const [loadingPhoneContacts, setLoadingPhoneContacts] = useState(false);
  const [phoneContactsError, setPhoneContactsError] = useState(null);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  // Load saved contacts on mount
  useEffect(() => {
    const contacts = getSavedContacts();
    setSavedContacts(contacts);
    setFilteredContacts(contacts);
  }, []);

  // Filter saved contacts when searching
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setFilteredContacts(savedContacts);
    } else {
      const results = searchContacts(searchQuery);
      setFilteredContacts(results);
    }
  }, [searchQuery, savedContacts]);

  // Search users from database
  useEffect(() => {
    if (activeTab !== 'search' || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const search = async () => {
      setSearching(true);
      const existingIds = property.tenants?.map(t => t.tenant_id) || [];
      existingIds.push(currentUser.id);
      const results = await searchUsers(searchQuery, existingIds);
      setSearchResults(results);
      setSearching(false);
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, property.tenants, currentUser.id, activeTab]);

  const handleAdd = async (user) => {
    setAdding(user.id);
    try {
      await addTenant({
        propertyId: property.id,
        tenantId: user.id,
        landlordId: currentUser.id,
        roomNumber: roomNumber.trim() || null,
      });
      // Save to contacts if not already saved
      if (user.phone) {
        saveContact({ name: user.display_name, phone: user.phone, userId: user.id });
        setSavedContacts(getSavedContacts());
      }
      showToast?.(`${user.display_name} added as tenant!`, 'success');
      onAdded?.();
    } catch (err) {
      showToast?.(err.message || 'Failed to add tenant', 'error');
    }
    setAdding(null);
  };

  const handleAddFromContact = async (contact) => {
    if (!contact.userId) {
      showToast?.('This contact hasn\'t registered yet. Share an invite code with them!', 'info');
      return;
    }
    setAdding(contact.id);
    try {
      await addTenant({
        propertyId: property.id,
        tenantId: contact.userId,
        landlordId: currentUser.id,
        roomNumber: roomNumber.trim() || null,
      });
      showToast?.(`${contact.name} added as tenant!`, 'success');
      onAdded?.();
    } catch (err) {
      showToast?.(err.message || 'Failed to add tenant', 'error');
    }
    setAdding(null);
  };

  const handleSaveNewContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      showToast?.('Please enter name and phone number', 'error');
      return;
    }
    setSavingContact(true);
    saveContact({ name: newContactName.trim(), phone: newContactPhone.trim() });
    setSavedContacts(getSavedContacts());
    setNewContactName('');
    setNewContactPhone('');
    setSavingContact(false);
    showToast?.('Contact saved!', 'success');
    setActiveTab('saved');
  };

  const handleDeleteContact = (contactId, e) => {
    e.stopPropagation();
    deleteContact(contactId);
    setSavedContacts(getSavedContacts());
    showToast?.('Contact deleted', 'success');
  };

  // Load contacts from phone
  const handleLoadPhoneContacts = async () => {
    setLoadingPhoneContacts(true);
    setPhoneContactsError(null);
    
    try {
      const result = await pickContactsAndCheckRegistration();
      setPhoneContacts(result.contacts);
      setRegisteredContacts(result.registered);
      setNotRegisteredContacts(result.notRegistered);
      setContactsLoaded(true);
      
      // Auto-save registered contacts to saved contacts
      Object.values(result.registered).forEach(({ name, phone, user }) => {
        saveContact({ name, phone, userId: user.id });
      });
      setSavedContacts(getSavedContacts());
      
    } catch (error) {
      console.error('Error loading phone contacts:', error);
      setPhoneContactsError(error.message || 'Failed to load contacts');
      
      // Show helpful message based on error
      if (error.message?.includes('not supported')) {
        showToast?.('Contact picker is not supported on this device. Try adding manually.', 'info');
      } else if (error.message?.includes('denied')) {
        showToast?.('Please allow access to contacts to use this feature', 'error');
      }
    }
    
    setLoadingPhoneContacts(false);
  };

  // Add from phone contact
  const handleAddFromPhoneContact = async (contact, user) => {
    setAdding(contact.phone);
    try {
      await addTenant({
        propertyId: property.id,
        tenantId: user.id,
        landlordId: currentUser.id,
        roomNumber: roomNumber.trim() || null,
      });
      showToast?.(`${user.display_name} added as tenant!`, 'success');
      onAdded?.();
    } catch (err) {
      showToast?.(err.message || 'Failed to add tenant', 'error');
    }
    setAdding(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Add Tenant</h2>
                <p className="text-sm text-white/70">Quick add from contacts</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs - Like WhatsApp */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              activeTab === 'saved' 
                ? 'text-green-600 border-b-2 border-green-500 bg-white dark:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Saved
          </button>
          <button
            onClick={() => setActiveTab('phone')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              activeTab === 'phone' 
                ? 'text-green-600 border-b-2 border-green-500 bg-white dark:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Contact className="w-3.5 h-3.5" />
            Phone
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              activeTab === 'search' 
                ? 'text-green-600 border-b-2 border-green-500 bg-white dark:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              activeTab === 'new' 
                ? 'text-green-600 border-b-2 border-green-500 bg-white dark:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {/* Room Number - Always visible */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Room/Unit Number (optional)
            </label>
            <input
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g., 101, A, Ground Floor"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* SAVED CONTACTS TAB */}
          {activeTab === 'saved' && (
            <>
              {/* Quick Search for saved contacts */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search saved contacts..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Saved Contacts List */}
              <div className="space-y-2">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-8">
                    <BookUser className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No saved contacts yet</p>
                    <button
                      onClick={() => setActiveTab('new')}
                      className="text-green-600 dark:text-green-400 text-sm font-medium hover:underline"
                    >
                      + Add your first contact
                    </button>
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${
                        contact.userId 
                          ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                          : 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'
                      }`}>
                        <span className="text-white font-bold text-lg">
                          {contact.name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{contact.name}</p>
                          {contact.userId && (
                            <span className="flex items-center gap-0.5 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                              <UserCheck className="w-3 h-3" /> Registered
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {contact.phone}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleDeleteContact(contact.id, e)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => contact.userId ? handleAddFromContact(contact) : showToast?.('Contact not registered yet. Share an invite code!', 'info')}
                          disabled={adding === contact.id}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                            contact.userId
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/30'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {adding === contact.id ? <Loader2 className="w-4 h-4 animate-spin" /> : contact.userId ? 'Add' : 'Invite'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* PHONE CONTACTS TAB */}
          {activeTab === 'phone' && (
            <div className="space-y-4">
              {!contactsLoaded ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Contact className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Import from Phone</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs mx-auto">
                    Select contacts from your phone. We'll check which ones have the app installed.
                  </p>
                  
                  {phoneContactsError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2 justify-center">
                      <AlertCircle className="w-4 h-4" />
                      {phoneContactsError}
                    </div>
                  )}
                  
                  <button
                    onClick={handleLoadPhoneContacts}
                    disabled={loadingPhoneContacts}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    {loadingPhoneContacts ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Contact className="w-5 h-5" />
                        Choose Contacts
                      </>
                    )}
                  </button>
                  
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                    📱 Works on mobile devices with Contact Picker API support
                  </p>
                </div>
              ) : (
                <>
                  {/* Registered Contacts */}
                  {Object.keys(registeredContacts).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-green-500" />
                        Registered on RentMzansi ({Object.keys(registeredContacts).length})
                      </h4>
                      <div className="space-y-2">
                        {Object.values(registeredContacts).map(({ name, phone, user }) => (
                          <div
                            key={phone}
                            className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800"
                          >
                            {user.photo_url ? (
                              <img src={user.photo_url} alt="" className="w-11 h-11 rounded-xl object-cover shadow-sm" />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-sm">
                                <span className="text-white font-bold text-lg">{user.display_name?.[0]?.toUpperCase() || '?'}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{user.display_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{name} • {phone}</p>
                            </div>
                            <button
                              onClick={() => handleAddFromPhoneContact({ name, phone }, user)}
                              disabled={adding === phone}
                              className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all disabled:opacity-50"
                            >
                              {adding === phone ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Not Registered Contacts */}
                  {notRegisteredContacts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        Not on RentMzansi ({notRegisteredContacts.length})
                      </h4>
                      <div className="space-y-2">
                        {notRegisteredContacts.slice(0, 5).map((contact) => (
                          <div
                            key={contact.phone}
                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                          >
                            <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{contact.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{contact.phone}</p>
                            </div>
                            <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                              Not registered
                            </span>
                          </div>
                        ))}
                        {notRegisteredContacts.length > 5 && (
                          <p className="text-xs text-gray-500 text-center py-2">
                            + {notRegisteredContacts.length - 5} more contacts not registered
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                        💡 Share an invite link with them to join the app!
                      </p>
                    </div>
                  )}

                  {/* Pick more contacts */}
                  <button
                    onClick={handleLoadPhoneContacts}
                    disabled={loadingPhoneContacts}
                    className="w-full py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Select More Contacts
                  </button>
                </>
              )}
            </div>
          )}

          {/* SEARCH USERS TAB */}
          {activeTab === 'search' && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                {searching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                  </div>
                ) : searchQuery.length < 2 ? (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">Type at least 2 characters to search</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">No users found</p>
                    <button
                      onClick={() => setActiveTab('new')}
                      className="text-green-600 dark:text-green-400 text-sm font-medium hover:underline"
                    >
                      + Save as new contact instead
                    </button>
                  </div>
                ) : (
                  searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {user.photo_url ? (
                        <img src={user.photo_url} alt="" className="w-11 h-11 rounded-xl object-cover shadow-sm" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-sm">
                          <span className="text-white font-bold text-lg">{user.display_name?.[0]?.toUpperCase() || '?'}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{user.display_name}</p>
                        {user.phone && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {user.phone}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAdd(user)}
                        disabled={adding === user.id}
                        className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all disabled:opacity-50"
                      >
                        {adding === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* NEW CONTACT TAB */}
          {activeTab === 'new' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                    <BookUser className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">Save New Contact</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Like WhatsApp - save for quick access</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                    <input
                      type="text"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="e.g., John Doe"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      placeholder="e.g., 0812345678"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveNewContact}
                disabled={savingContact || !newContactName.trim() || !newContactPhone.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                {savingContact ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Save Contact
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                💡 Tip: When this person registers with the same phone number, you can add them instantly!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================
// INVITE MODAL
// ===========================

function InviteModal({ property, currentUser, showToast, onClose, onCreated }) {
  const [creating, setCreating] = useState(false);
  const [newInvite, setNewInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const invite = await createTenantInvitation({
        propertyId: property.id,
        landlordId: currentUser.id,
      });
      setNewInvite(invite);
    } catch (err) {
      showToast?.(err.message || 'Failed to create invitation', 'error');
    }
    setCreating(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(newInvite.invite_code);
    setCopied(true);
    showToast?.('Code copied!', 'success');
  };

  const shareCode = () => {
    const text = `Join my property "${property.name}" on RentMzansi!\n\nUse this code: ${newInvite.invite_code}\n\nOpen the app and go to Properties → Join with Code`;
    
    if (navigator.share) {
      navigator.share({ title: 'Property Invite', text });
    } else {
      navigator.clipboard.writeText(text);
      showToast?.('Invite message copied!', 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Invite Tenant</h2>
                <p className="text-sm text-white/70">Create a shareable code</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5">
          {!newInvite ? (
            <div className="text-center py-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Share2 className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Create Invite Code</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
                Generate a 6-character code that tenants can use to join your property. The code expires in 7 days.
              </p>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link2 className="w-5 h-5" />
                    Generate Code
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center animate-fadein">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 mb-4 border border-green-100 dark:border-green-800">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/30">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-2">YOUR INVITE CODE</p>
                <p className="font-mono text-4xl font-bold text-gray-800 dark:text-gray-200 tracking-[0.3em]">
                  {newInvite.invite_code}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires in 7 days
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={copyCode}
                  className="py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={shareCode}
                  className="py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              </div>

              <button
                onClick={onCreated}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-[#c5303c] to-[#E63946] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-red-500/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================
// PROPERTY CHAT VIEW (Group Chat)
// ===========================

function PropertyChatView({ property, currentUser, showToast, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState({});
  const messagesEndRef = useRef(null);
  
  // File upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef(null);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sendingVoice, setSendingVoice] = useState(false);
  const voiceRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  
  // Voice playback state
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [voiceProgress, setVoiceProgress] = useState({});
  const audioRef = useRef(null);
  
  // Message delete state
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(false);

  // Get all members (landlord + tenants)
  const allMembers = [
    { 
      id: property.landlord_id, 
      profile: property.landlord, 
      isLandlord: true,
      isAdmin: true
    },
    ...(property.tenants || []).map(t => ({
      id: t.tenant_id,
      profile: t.profile,
      isLandlord: false,
      isAdmin: t.is_admin,
      tenantId: t.id,
      status: t.status,
      roomNumber: t.room_number
    }))
  ];

  const isOwner = property.landlord_id === currentUser.id;
  const currentTenant = property.tenants?.find(t => t.tenant_id === currentUser.id);
  // isOwner || currentTenant?.is_admin used for permission checks inline

  // Check if user can send messages (admin-only mode check)
  useEffect(() => {
    const checkSendPermission = async () => {
      const allowed = await canSendPropertyMessage(property.id, currentUser.id);
      setCanSend(allowed);
    };
    checkSendPermission();
  }, [property.id, currentUser.id, property.admin_only_messages]);

  // Initialize voice recorder
  useEffect(() => {
    voiceRecorderRef.current = new VoiceRecorder();
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      const msgs = await getPropertyMessages(property.id);
      setMessages(msgs);
      await markPropertyMessagesAsRead(property.id, currentUser.id);
      setLoading(false);
    };

    loadMessages();
  }, [property.id, currentUser.id]);

  // Subscribe to new messages
  useEffect(() => {
    const unsubscribe = subscribeToPropertyMessages(property.id, (newMsg) => {
      setMessages(prev => [...prev, newMsg]);
      if (newMsg.sender_id !== currentUser.id) {
        markPropertyMessagesAsRead(property.id, currentUser.id);
      }
    });

    return unsubscribe;
  }, [property.id, currentUser.id]);

  // Online presence for group chat
  useEffect(() => {
    const channelName = `property-presence:${property.id}`;
    
    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentUser.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = {};
        Object.keys(state).forEach(key => {
          online[key] = true;
        });
        setOnlineMembers(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [property.id, currentUser.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice recording functions
  const handleStartRecording = async () => {
    try {
      if (!navigator.mediaDevices) {
        showToast?.('Your browser does not support voice recording', 'error');
        return;
      }
      await voiceRecorderRef.current.startRecording();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 0.1);
      }, 100);
    } catch (error) {
      console.error('Error starting recording:', error);
      showToast?.(error.message || 'Failed to start recording', 'error');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    setSendingVoice(true);

    try {
      const result = await voiceRecorderRef.current.stopRecording();
      if (!result || !result.blob) throw new Error('No audio recorded');

      const audioBlob = result.blob;

      // Upload to Supabase storage
      const fileName = `property_${property.id}_${currentUser.id}_${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(fileName);

      // Send voice message
      await sendPropertyMessage({
        propertyId: property.id,
        senderId: currentUser.id,
        content: '🎤 Voice message',
        messageType: 'voice',
        voiceUrl: urlData.publicUrl,
        voiceDuration: Math.round(recordingDuration)
      });

      setRecordingDuration(0);
    } catch (error) {
      console.error('Error sending voice message:', error);
      showToast?.('Failed to send voice message', 'error');
    }
    setSendingVoice(false);
  };

  const handleCancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    voiceRecorderRef.current?.stopRecording();
    setIsRecording(false);
    setRecordingDuration(0);
  };

  // Voice playback
  const handlePlayVoice = (msg) => {
    if (playingVoiceId === msg.id) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(msg.voice_url);
    audioRef.current = audio;
    
    audio.ontimeupdate = () => {
      const progress = (audio.currentTime / audio.duration) * 100;
      setVoiceProgress(prev => ({ ...prev, [msg.id]: progress }));
    };
    
    audio.onended = () => {
      setPlayingVoiceId(null);
      setVoiceProgress(prev => ({ ...prev, [msg.id]: 0 }));
    };

    audio.play();
    setPlayingVoiceId(msg.id);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !canSend) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await sendPropertyMessage({
        propertyId: property.id,
        senderId: currentUser.id,
        content,
      });
    } catch (err) {
      showToast?.('Failed to send message', 'error');
      setNewMessage(content);
    }
    setSending(false);
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle image upload for group chat
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast?.('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast?.('Image must be less than 5MB', 'error');
      return;
    }

    setUploadingImage(true);
    setShowAttachMenu(false);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `property-chat/${property.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      let imageUrl;
      
      if (error) {
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
        
        imageUrl = urlData.publicUrl;
      } else {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('chat-images')
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      // Send image as message
      await sendPropertyMessage({
        propertyId: property.id,
        senderId: currentUser.id,
        content: `[Image] ${imageUrl}`,
      });

      showToast?.('Image sent!', 'success');
    } catch (error) {
      console.error('Failed to upload image:', error);
      showToast?.('Failed to upload image. Please try again.', 'error');
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete message handlers
  const handleDeleteForMe = async () => {
    if (!showDeleteModal) return;
    setDeletingMessage(true);
    try {
      await deletePropertyMessageForMe(showDeleteModal.id, currentUser.id);
      setMessages(prev => prev.filter(m => m.id !== showDeleteModal.id));
      setShowDeleteModal(null);
      showToast?.('Message deleted', 'success');
    } catch (err) {
      console.error('Failed to delete message:', err);
      showToast?.('Failed to delete message', 'error');
    }
    setDeletingMessage(false);
  };

  const handleDeleteForEveryone = async () => {
    if (!showDeleteModal) return;
    setDeletingMessage(true);
    try {
      await deletePropertyMessageForEveryone(showDeleteModal.id, currentUser.id);
      setMessages(prev => prev.map(m => 
        m.id === showDeleteModal.id 
          ? { ...m, content: '🚫 This message was deleted', message_type: 'deleted', voice_url: null }
          : m
      ));
      setShowDeleteModal(null);
      showToast?.('Message deleted for everyone', 'success');
    } catch (err) {
      console.error('Failed to delete message:', err);
      showToast?.('Failed to delete message', 'error');
    }
    setDeletingMessage(false);
  };

  // Check if sender is admin
  const isSenderAdmin = (msg) => {
    if (msg.sender_id === property.landlord_id) return true;
    const tenant = property.tenants?.find(t => t.tenant_id === msg.sender_id);
    return tenant?.is_admin || false;
  };

  const isSenderLandlord = (senderId) => senderId === property.landlord_id;

  // Count online members
  const onlineCount = Object.keys(onlineMembers).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#E63946] via-rose-500 to-[#E63946] p-4 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
        
        <div className="relative flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 shadow-inner"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => setShowMembersPanel(true)}
            className="flex items-center gap-3 flex-1 min-w-0 hover:bg-white/10 rounded-xl p-1 -m-1 transition-colors"
          >
            <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner ring-2 ring-white/10">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h1 className="font-bold truncate">{property.name}</h1>
              <p className="text-sm text-white/80 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Circle className="w-2 h-2 fill-green-400 text-green-400" />
                  {onlineCount} online
                </span>
                <span>• {allMembers.length} members</span>
                {property.admin_only_messages && (
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">Admin-only</span>
                )}
              </p>
            </div>
          </button>
          
          <button 
            onClick={() => setShowMembersPanel(true)}
            className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <div className="w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-10 h-10 text-red-400" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white mb-1">No messages yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Start the group conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUser.id;
            const isLandlord = isSenderLandlord(msg.sender_id);
            const msgIsAdmin = isSenderAdmin(msg);
            const showAvatar = idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id;
            const showTime = idx === messages.length - 1 || messages[idx + 1]?.sender_id !== msg.sender_id;
            const isVoice = msg.message_type === 'voice' && msg.voice_url;
            const isOnline = onlineMembers[msg.sender_id];

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''} ${!showAvatar ? 'mt-0.5' : 'mt-3'}`}
              >
                {!isMe && (
                  <div className="flex-shrink-0 w-9">
                    {showAvatar && (
                      <div className="relative">
                        {msg.sender?.photo_url ? (
                          <img src={msg.sender.photo_url} alt="" className="w-9 h-9 rounded-xl object-cover border-2 border-white dark:border-gray-800 shadow-md" />
                        ) : (
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${
                            isLandlord 
                              ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
                              : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700'
                          }`}>
                            <span className="text-sm font-bold text-white">
                              {msg.sender?.display_name?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && showAvatar && (
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5 font-medium ml-1">
                      {msg.sender?.display_name || 'Unknown'}
                      {isLandlord && (
                        <span className="flex items-center gap-0.5 text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded-full">
                          <Crown className="w-3 h-3" />
                          <span className="text-[10px]">Owner</span>
                        </span>
                      )}
                      {msgIsAdmin && !isLandlord && (
                        <span className="flex items-center gap-0.5 text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          <span className="text-[10px]">Admin</span>
                        </span>
                      )}
                    </p>
                  )}
                  
                  {/* Voice Message */}
                  {isVoice ? (
                    <div
                      onClick={(e) => {
                        // Don't show delete if clicking play button
                        if (e.target.closest('button')) return;
                        if (msg.message_type !== 'deleted') setShowDeleteModal(msg);
                      }}
                      className={`px-3 py-2.5 shadow-sm flex items-center gap-3 min-w-[200px] cursor-pointer hover:opacity-90 ${
                        isMe
                          ? 'bg-gradient-to-r from-[#c5303c] to-[#E63946] text-white rounded-2xl rounded-tr-md'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-md border border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      <button
                        onClick={() => handlePlayVoice(msg)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isMe 
                            ? 'bg-white/20 hover:bg-white/30' 
                            : 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50'
                        }`}
                      >
                        {playingVoiceId === msg.id ? (
                          <Pause className={`w-5 h-5 ${isMe ? 'text-white' : 'text-red-500'}`} />
                        ) : (
                          <Play className={`w-5 h-5 ${isMe ? 'text-white' : 'text-red-500'}`} />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className={`h-1.5 rounded-full overflow-hidden ${isMe ? 'bg-white/30' : 'bg-gray-200 dark:bg-gray-700'}`}>
                          <div 
                            className={`h-full transition-all ${isMe ? 'bg-white' : 'bg-red-500'}`}
                            style={{ width: `${voiceProgress[msg.id] || 0}%` }}
                          />
                        </div>
                        <p className={`text-xs mt-1 ${isMe ? 'text-white/70' : 'text-gray-500'}`}>
                          {formatDuration(msg.voice_duration || 0)}
                        </p>
                      </div>
                      <Volume2 className={`w-4 h-4 ${isMe ? 'text-white/50' : 'text-gray-400'}`} />
                    </div>
                  ) : msg.content?.startsWith('[Image]') ? (
                    // Image message
                    <div 
                      onClick={() => msg.message_type !== 'deleted' && setShowDeleteModal(msg)}
                      className={`rounded-2xl overflow-hidden shadow-lg cursor-pointer hover:opacity-90 ${
                        isMe ? 'rounded-tr-md' : 'rounded-tl-md'
                      }`}
                    >
                      <img 
                        src={msg.content.replace('[Image] ', '')}
                        alt="Shared content"
                        className="max-w-[240px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(msg.content.replace('[Image] ', ''), '_blank')}
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => msg.message_type !== 'deleted' && setShowDeleteModal(msg)}
                      className={`px-4 py-2.5 shadow-sm cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all ${
                        isMe
                          ? 'bg-gradient-to-r from-[#c5303c] to-[#E63946] text-white rounded-2xl rounded-tr-md'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-md border border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  )}
                  
                  {showTime && (
                    <p className={`text-[10px] text-gray-400 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - or admin-only notice */}
      {canSend ? (
        <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {isRecording ? (
            /* Recording UI */
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancelRecording}
                className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              
              <div className="flex-1 flex items-center justify-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-2xl py-3 px-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="font-mono text-lg font-bold text-red-600 dark:text-red-400">
                  {formatDuration(recordingDuration)}
                </span>
                <span className="text-sm text-red-500 dark:text-red-400">Recording...</span>
              </div>
              
              <button
                onClick={handleStopRecording}
                disabled={sendingVoice}
                className="p-3.5 bg-gradient-to-r from-[#c5303c] to-[#E63946] text-white rounded-full hover:shadow-lg hover:shadow-red-500/30 transition-all"
              >
                {sendingVoice ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          ) : (
            /* Normal input UI */
            <div className="flex gap-2 items-center">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              
              {/* Attachment Button */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  disabled={uploadingImage}
                  className={`p-3 flex items-center justify-center rounded-full transition-all duration-300 ${
                    showAttachMenu 
                      ? 'bg-gradient-to-br from-[#E63946] to-rose-500 text-white shadow-lg shadow-red-500/30 rotate-45' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
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
              
              {/* Voice Button */}
              <button
                onClick={handleStartRecording}
                className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all hover:scale-105 active:scale-95"
              >
                <Mic className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Type a message..."
                  className="w-full px-4 py-3 rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                />
              </div>
              
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                className="p-3 bg-gradient-to-r from-[#c5303c] to-[#E63946] text-white rounded-full hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none hover:scale-105 active:scale-95"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-shrink-0 p-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-700">
          <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400">
            <MessageSquareOff className="w-5 h-5" />
            <p className="text-sm font-medium">Only admins can send messages in this group</p>
          </div>
        </div>
      )}

      {/* Delete Message Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
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
                    : showDeleteModal.voice_url
                    ? '🎤 Voice message'
                    : showDeleteModal.content?.substring(0, 100)}
                </p>
              </div>
              
              <div className="space-y-2">
                {/* Delete for Me */}
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
                    <p className="text-xs text-gray-500">Only you won't see this message</p>
                  </div>
                  {deletingMessage && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
                </button>
                
                {/* Delete for Everyone - only if sender */}
                {showDeleteModal.sender_id === currentUser.id && (
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
                      <p className="text-xs text-gray-500">Message will be deleted for all members</p>
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

      {/* Members Panel (Slide-in) */}
      {showMembersPanel && (
        <div className="fixed inset-0 z-60 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMembersPanel(false)} />
          <div className="relative ml-auto w-full max-w-sm bg-white dark:bg-gray-800 h-full shadow-2xl animate-[slideInRight_0.3s_ease-out] overflow-hidden flex flex-col">
            {/* Panel Header */}
            <div className="bg-gradient-to-r from-[#E63946] via-rose-500 to-[#E63946] p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Group Members</h2>
                  <p className="text-sm text-white/80">{allMembers.length} members • {onlineCount} online</p>
                </div>
                <button onClick={() => setShowMembersPanel(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {allMembers.map((member) => {
                const memberIsOnline = onlineMembers[member.id];
                const canManage = isOwner && !member.isLandlord && member.id !== currentUser.id;

                return (
                  <MemberCard
                    key={member.id}
                    member={member}
                    isOnline={memberIsOnline}
                    canManage={canManage}
                    showToast={showToast}
                    onRefresh={() => {
                      // Refresh would need to be passed from parent
                    }}
                  />
                );
              })}
            </div>

            {/* Tenant Actions - Leave Group & Block */}
            {!isOwner && currentTenant && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <button
                  onClick={async () => {
                    if (!window.confirm('Are you sure you want to leave this group? You will no longer receive messages.')) return;
                    try {
                      await leavePropertyGroup(currentTenant.id, 'User chose to leave');
                      showToast?.('You have left the group', 'success');
                      onBack();
                    } catch (err) {
                      showToast?.(err.message || 'Failed to leave group', 'error');
                    }
                  }}
                  className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-5 h-5" />
                  Leave Group
                </button>
                <button
                  onClick={async () => {
                    if (!window.confirm(`Block ${property.landlord?.display_name || 'the landlord'}? You won't receive messages from them.`)) return;
                    try {
                      await blockUser(currentUser.id, property.landlord_id, 'Blocked by tenant');
                      showToast?.('Landlord blocked', 'success');
                    } catch (err) {
                      showToast?.(err.message || 'Failed to block', 'error');
                    }
                  }}
                  className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center justify-center gap-2"
                >
                  <Ban className="w-5 h-5" />
                  Block Landlord
                </button>
              </div>
            )}

            {/* Group Info Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {property.admin_only_messages ? (
                  <>
                    <MessageSquareOff className="w-4 h-4 inline mr-1" />
                    Admin-only messaging enabled
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 inline mr-1" />
                    All members can send messages
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Member Card for Group Panel
function MemberCard({ member, isOnline, canManage, showToast, onRefresh }) {
  const [showMenu, setShowMenu] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleToggleAdmin = async () => {
    if (!member.tenantId) return;
    setProcessing(true);
    try {
      await setTenantAdmin(member.tenantId, !member.isAdmin);
      showToast?.(member.isAdmin ? 'Admin rights removed' : 'Promoted to admin', 'success');
      onRefresh?.();
    } catch (err) {
      showToast?.(err.message || 'Failed to update', 'error');
    }
    setProcessing(false);
    setShowMenu(false);
  };

  const handleRemove = async () => {
    if (!member.tenantId) return;
    if (!window.confirm(`Remove ${member.profile?.display_name || 'this member'}?`)) return;
    
    setProcessing(true);
    try {
      await removeTenant(member.tenantId);
      showToast?.('Member removed', 'success');
      onRefresh?.();
    } catch (err) {
      showToast?.(err.message || 'Failed to remove', 'error');
    }
    setProcessing(false);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="relative">
        {member.profile?.photo_url ? (
          <img src={member.profile.photo_url} alt="" className="w-11 h-11 rounded-xl object-cover shadow-md" />
        ) : (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md ${
            member.isLandlord 
              ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
              : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700'
          }`}>
            <span className="text-white font-bold">{member.profile?.display_name?.[0]?.toUpperCase() || '?'}</span>
          </div>
        )}
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-700 rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 dark:text-gray-200 truncate flex items-center gap-1.5">
          {member.profile?.display_name || 'Unknown'}
          {member.isLandlord && (
            <Crown className="w-4 h-4 text-yellow-500" />
          )}
          {member.isAdmin && !member.isLandlord && (
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          )}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className={`flex items-center gap-1 ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
            <Circle className={`w-2 h-2 ${isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {member.roomNumber && (
            <span className="text-gray-500">• Room {member.roomNumber}</span>
          )}
          {member.isLandlord && (
            <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full font-medium">
              Owner
            </span>
          )}
          {member.isAdmin && !member.isLandlord && (
            <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full font-medium">
              Admin
            </span>
          )}
        </div>
      </div>

      {canManage && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[160px]">
                <button
                  onClick={handleToggleAdmin}
                  disabled={processing}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  {member.isAdmin ? (
                    <>
                      <ShieldOff className="w-4 h-4 text-gray-500" />
                      Remove Admin
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-purple-500" />
                      Make Admin
                    </>
                  )}
                </button>
                <button
                  onClick={handleRemove}
                  disabled={processing}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <UserMinus className="w-4 h-4" />
                  Remove from Group
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
