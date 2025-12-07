import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Users, Plus, Search, X, ChevronRight, MessageCircle, 
  UserPlus, Copy, Check, Trash2, Home, Send, ArrowLeft, MoreVertical, 
  Crown, User, Clock, Link2, Share2, Loader2, Shield, ShieldOff, 
  MessageSquareOff, Settings, ShieldCheck
} from 'lucide-react';

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
} from '../tenantManagement';

// ===========================
// MAIN COMPONENT
// ===========================

export default function PropertyManagement({ currentUser, showToast, isLandlord, embedded = false }) {
  const [view, setView] = useState('list'); // list, property-detail, chat, add-property
  const [properties, setProperties] = useState([]);
  const [tenantProperties, setTenantProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

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
      className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 hover:border-[#c5303c] hover:shadow-lg transition-all text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isOwner 
              ? 'bg-gradient-to-br from-[#c5303c] to-[#E63946]' 
              : 'bg-gradient-to-br from-blue-500 to-blue-600'
          }`}>
            {isOwner ? (
              <Crown className="w-6 h-6 text-white" />
            ) : (
              <Home className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">{property.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {property.address || 'No address set'}
            </p>
            {tenantInfo && (
              <p className="text-xs text-green-600 font-medium mt-1">
                {tenantInfo.room_number ? `Room ${tenantInfo.room_number}` : 'Active Tenant'}
              </p>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
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
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl p-4 border border-blue-200 dark:border-blue-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Join with Code</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Got an invite code from your landlord?</p>
          </div>
        </div>
        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="XXXXXX"
              className="flex-1 min-w-0 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono text-center text-lg tracking-widest"
              maxLength={6}
            />
            <button
              onClick={handleJoin}
              disabled={joining || code.length < 6}
              className="flex-shrink-0 px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">Add Property</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Property Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Hillbrow Apartments"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 123 Main Street, Johannesburg"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any notes about this property..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 resize-none"
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

      <div className="p-4 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onOpenChat}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-[#c5303c] transition-all flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Group Chat</p>
              <p className="text-xs text-gray-500">Message everyone</p>
            </div>
          </button>

          {isOwner && (
            <button
              onClick={() => setShowAddTenant(true)}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-[#c5303c] transition-all flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Add Tenant</p>
                <p className="text-xs text-gray-500">Search users</p>
              </div>
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

        {/* Tenants List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Tenants ({property.tenants?.length || 0})
            </h3>
            {isOwner && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="text-sm text-[#c5303c] font-semibold flex items-center gap-1"
              >
                <Share2 className="w-4 h-4" />
                Invite
              </button>
            )}
          </div>

          {property.tenants?.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No tenants yet. Add tenants or share an invite code.
            </p>
          ) : (
            <div className="space-y-3">
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
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
      {tenant.profile?.photo_url ? (
        <img src={tenant.profile.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
          <User className="w-5 h-5 text-gray-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 dark:text-gray-200 truncate flex items-center gap-1.5">
          {tenant.profile?.display_name || 'Unknown User'}
          {tenant.is_admin && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-[10px] font-bold">
              <ShieldCheck className="w-3 h-3" />
              Admin
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {tenant.room_number && <span>Room {tenant.room_number}</span>}
          <span className={`px-1.5 py-0.5 rounded-full ${
            tenant.status === 'active' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : tenant.status === 'ended'
              ? 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {tenant.status}
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
    <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg">
      <div className="flex-1">
        <p className="font-mono text-lg font-bold text-gray-800 dark:text-gray-200">{invitation.invite_code}</p>
        <p className="text-xs text-gray-500">
          {invitation.email || invitation.phone || 'General invite'}
        </p>
      </div>
      <button onClick={copyCode} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
      </button>
      <button onClick={onCancel} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg">
        <X className="w-4 h-4 text-red-500" />
      </button>
    </div>
  );
}

// ===========================
// ADD TENANT MODAL
// ===========================

function AddTenantModal({ property, currentUser, showToast, onClose, onAdded }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(null);
  const [roomNumber, setRoomNumber] = useState('');

  // Search users
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const search = async () => {
      setSearching(true);
      const existingIds = property.tenants?.map(t => t.tenant_id) || [];
      existingIds.push(currentUser.id); // Exclude self
      const results = await searchUsers(searchQuery, existingIds);
      setSearchResults(results);
      setSearching(false);
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, property.tenants, currentUser.id]);

  const handleAdd = async (user) => {
    setAdding(user.id);
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Add Tenant</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Room Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Room/Unit Number (optional)
            </label>
            <input
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g., 101, A, Ground Floor"
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search Users
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {searching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : searchQuery.length >= 2 && searchResults.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No users found</p>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                >
                  {user.photo_url ? (
                    <img src={user.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{user.display_name}</p>
                    {user.phone && <p className="text-xs text-gray-500 truncate">{user.phone}</p>}
                  </div>
                  <button
                    onClick={() => handleAdd(user)}
                    disabled={adding === user.id}
                    className="px-3 py-1.5 bg-[#c5303c] text-white rounded-lg text-sm font-semibold hover:bg-[#a52833] disabled:opacity-50"
                  >
                    {adding === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                  </button>
                </div>
              ))
            )}
          </div>
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Invite Tenant</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          {!newInvite ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                <Share2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Create Invite Code</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Generate a 6-character code that tenants can use to join your property. The code expires in 7 days.
              </p>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full py-3 bg-gradient-to-r from-[#c5303c] to-[#E63946] text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
            <div className="text-center">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-6 mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Invite Code</p>
                <p className="font-mono text-3xl font-bold text-gray-800 dark:text-gray-200 tracking-widest">
                  {newInvite.invite_code}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Expires in 7 days
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={copyCode}
                  className="py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={shareCode}
                  className="py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              </div>

              <button
                onClick={onCreated}
                className="w-full mt-4 py-3 bg-[#c5303c] text-white rounded-xl font-semibold"
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
// PROPERTY CHAT VIEW
// ===========================

function PropertyChatView({ property, currentUser, showToast, onBack }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const messagesEndRef = useRef(null);

  // Check if user can send messages (admin-only mode check)
  useEffect(() => {
    const checkSendPermission = async () => {
      const allowed = await canSendPropertyMessage(property.id, currentUser.id);
      setCanSend(allowed);
    };
    checkSendPermission();
  }, [property.id, currentUser.id, property.admin_only_messages]);

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
      // Mark as read if it's not from current user
      if (newMsg.sender_id !== currentUser.id) {
        markPropertyMessagesAsRead(property.id, currentUser.id);
      }
    });

    return unsubscribe;
  }, [property.id, currentUser.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      setNewMessage(content); // Restore message
    }
    setSending(false);
  };

  // Check if a message sender is an admin
  const isSenderAdmin = (msg) => {
    // Landlord is always admin
    if (msg.sender_id === property.landlord_id) return true;
    // Check if sender is in tenants list and is_admin
    const tenant = property.tenants?.find(t => t.user_id === msg.sender_id);
    return tenant?.is_admin || false;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#c5303c] to-[#E63946] p-4 text-white flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold">{property.name}</h1>
          <p className="text-sm opacity-80">
            {(property.tenants?.length || 0) + 1} members
            {property.admin_only_messages && <span className="ml-2">• Admin-only</span>}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
            <p className="text-sm text-gray-400">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id;
            const isLandlord = msg.sender_id === property.landlord_id;
            const isAdmin = isSenderAdmin(msg);

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                {!isMe && (
                  <div className="flex-shrink-0">
                    {msg.sender?.photo_url ? (
                      <img src={msg.sender.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                )}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      {msg.sender?.display_name || 'Unknown'}
                      {isLandlord && <Crown className="w-3 h-3 text-yellow-500" title="Landlord" />}
                      {isAdmin && !isLandlord && <ShieldCheck className="w-3 h-3 text-blue-500" title="Admin" />}
                    </p>
                  )}
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isMe
                        ? 'bg-gradient-to-r from-[#c5303c] to-[#E63946] text-white rounded-tr-md'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - or admin-only notice */}
      {canSend ? (
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="px-4 py-3 bg-gradient-to-r from-[#c5303c] to-[#E63946] text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-700">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <MessageSquareOff className="w-5 h-5" />
            <p className="text-sm">Only admins can send messages in this group</p>
          </div>
        </div>
      )}
    </div>
  );
}
