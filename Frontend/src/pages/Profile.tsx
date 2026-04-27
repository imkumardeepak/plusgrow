import React, { useState, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Badge } from '../components/atoms/Badge';
import { User, Mail, Phone, Calendar, Shield, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export const Profile = memo(function Profile() {
  const { user, changePassword } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!passwordData.currentPassword) {
      setMessage({ type: 'error', text: 'Current password is required' });
      return;
    }
    if (!passwordData.newPassword) {
      setMessage({ type: 'error', text: 'New password is required' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setIsLoading(true);
    const result = await changePassword({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });

    if (result.success) {
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } else {
      setMessage({ type: 'error', text: result.message || 'Failed to change password' });
    }
    setIsLoading(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar */}
      <Card variant="glass" className="p-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="page-icon-chip shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight tracking-tight">My Profile</h1>
            <p className="text-xs text-neutral-500 font-medium tracking-wide uppercase">Account Settings</p>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Profile Card */}
        <div className="lg:col-span-4 space-y-4">
          <Card variant="elevated" className="overflow-hidden">
            <div className="bg-gradient-to-br from-brand-500 to-brand-600 p-6 text-white text-center">
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white">
                {getInitials(user.fullName)}
              </div>
              <h2 className="text-xl font-bold">{user.fullName}</h2>
              <p className="text-brand-100 mt-1">@{user.username}</p>
              <Badge variant="default" className="mt-3 bg-white/20 text-white border-white/30">
                <Shield className="w-3 h-3 mr-1" />
                {user.roleName || 'User'}
              </Badge>
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-200">{user.email || 'No email set'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-200">{user.phone || 'No phone set'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-200">
                  Joined {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                </span>
              </div>
              {user.lastLoginAt && (
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="w-4 h-4 text-neutral-400" />
                  <span className="text-neutral-200">
                    Last login: {format(new Date(user.lastLoginAt), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card variant="elevated">
            <CardHeader className="py-3 px-4 border-b border-white/10">
              <CardTitle size="sm">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-200">Status</span>
                <Badge variant={user.isActive ? 'success' : 'danger'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-neutral-200">Role ID</span>
                <span className="text-sm font-mono font-semibold text-white">{user.roleId || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <div className="lg:col-span-8 space-y-4">
          {/* Change Password */}
          <Card variant="elevated">
            <CardHeader className="py-3 px-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <CardTitle size="sm" className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-neutral-400" />
                  Change Password
                </CardTitle>
                {!showPasswordForm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordForm(true)}
                  >
                    Change
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {message && (
                <div className={`flex items-center gap-2 p-3 rounded-2xl mb-4 text-sm animate-in fade-in slide-in-from-top-2 ${
                  message.type === 'success' 
                    ? '-/ border border-success-400/20 text-success-200'
                    : '-/ border border-danger-400/20 text-danger-200'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              {showPasswordForm ? (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="currentPassword" className="label-text font-medium inline-block mb-1 block">
                      Current Password
                    </label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Enter current password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="label-text font-medium inline-block mb-1 block">
                      New Password
                    </label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                      className="h-10"
                    />
                    <p className="text-xs text-neutral-500">Must be at least 6 characters</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="label-text font-medium inline-block mb-1 block">
                      Confirm New Password
                    </label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setMessage(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Password'
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-neutral-500">
                  Keep your account secure by using a strong password that you don't use elsewhere.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card variant="elevated">
            <CardHeader className="py-3 px-4 border-b border-white/10 bg-white/[0.02]">
              <CardTitle size="sm">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">User ID</p>
                  <p className="text-sm font-mono font-semibold text-white">{user.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Username</p>
                  <p className="text-sm font-semibold text-white">@{user.username}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Full Name</p>
                  <p className="text-sm font-semibold text-white">{user.fullName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Email</p>
                  <p className="text-sm font-semibold text-white">{user.email || 'Not set'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Phone</p>
                  <p className="text-sm font-semibold text-white">{user.phone || 'Not set'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Role</p>
                  <p className="text-sm font-semibold text-white">{user.roleName || 'User'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

export default Profile;
