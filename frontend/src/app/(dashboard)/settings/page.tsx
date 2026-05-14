'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Button, Input, Avatar, Chip } from '@heroui/react'
import Icon from '@/components/icon'
import { useAuth } from '@/providers/AuthContext'
import { api } from '@/api/generated/main-service'
import { UpdateProfileRequest, ApiKeyDto } from '@/api/generated/main-service/apiGenerated'
import { format } from 'date-fns'

export default function SettingsPage() {
  const { user, refreshUser, changePassword } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })

  const [apiKey, setApiKey] = useState<ApiKeyDto | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [keyLoading, setKeyLoading] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)

  const fetchApiKey = useCallback(async () => {
    if (!user?.id) return
    try {
      const keys = await api.users.apiKeysDetail(user.id)
      const active = keys?.find(k => k.isActive !== false)
      if (active) setApiKey(active)
    } catch (error: any) {
      console.error('Failed to fetch API keys', error)
    }
  }, [user?.id])

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
      fetchApiKey()
    }
  }, [user, fetchApiKey])

  const handleGenerateKey = async () => {
    if (!user?.id) return
    setKeyLoading(true)
    try {
      await api.users.apiKeysCreate(user.id, { name: 'Personal API Key' })
      await fetchApiKey()
    } catch (error: any) {
      console.error('Failed to generate API key', error)
    } finally {
      setKeyLoading(false)
    }
  }

  const handleCopyKey = () => {
    if (!apiKey?.xApiKey) return
    navigator.clipboard.writeText(apiKey.xApiKey)
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2000)
  }

  const handleUpdateProfile = async () => {
    setLoading(true)
    setMsg({ type: '', text: '' })
    try {
      const data: UpdateProfileRequest = { firstName, lastName, profileImageUrl: null }
      await api.settings.profileUpdate(data)
      await refreshUser()
      setMsg({ type: 'success', text: 'Profile updated successfully' })
    } catch (error: any) {
      console.error('Update profile failed', error)
      setMsg({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match' })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }
    setPasswordLoading(true)
    setPasswordMsg({ type: '', text: '' })
    try {
      await changePassword(currentPassword, newPassword)
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (error: any) {
      console.error('Change password failed', error)
      setPasswordMsg({ type: 'error', text: 'Failed to change password' })
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className='dashboard-page mx-auto w-full max-w-2xl pb-20 pt-4'>
      <div className='dashboard-panel'>
        <div className='dashboard-header'>
          <div>
            <h1 className='dashboard-title'>Account Settings</h1>
            <p className='dashboard-subtitle'>Manage your profile and preferences</p>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className='dashboard-panel'>
        <div className='dashboard-header'>
          <h3 className='text-[13px] font-bold text-foreground'>Personal Information</h3>
          <p className='mt-0.5 text-[11.5px] text-default-500'>Update your personal details</p>
        </div>
        <div className='space-y-5 p-6'>
          <div className='flex items-center gap-4'>
            <Avatar
              src={user?.profileImageUrl || undefined}
              name={user?.firstName?.charAt(0) || 'U'}
              className='h-16 w-16 text-xl'
            />
            <Button variant='flat' size='sm' radius='md' className='h-8 px-4 text-[11.5px] font-bold'>
              Change Avatar
            </Button>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <Input label='First Name' value={firstName} onValueChange={setFirstName} variant='bordered' size='sm' />
            <Input label='Last Name' value={lastName} onValueChange={setLastName} variant='bordered' size='sm' />
          </div>

          <Input
            label='Email'
            value={user?.email || ''}
            isReadOnly
            variant='faded'
            size='sm'
            description='Email cannot be changed'
          />

          {msg.text && (
            <p className={`text-[11.5px] font-medium ${msg.type === 'error' ? 'text-danger' : 'text-success'}`}>
              {msg.text}
            </p>
          )}
        </div>
        <div className='border-t border-default-200/70 bg-content2/50 px-6 py-3 text-right dark:border-white/10'>
          <Button
            color='primary'
            size='sm'
            radius='md'
            className='h-8 px-4 text-[11.5px] font-bold'
            isLoading={loading}
            onPress={handleUpdateProfile}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* Security */}
      <div className='dashboard-panel'>
        <div className='dashboard-header'>
          <h3 className='text-[13px] font-bold text-foreground'>Security</h3>
          <p className='mt-0.5 text-[11.5px] text-default-500'>Manage your password</p>
        </div>
        <div className='p-6'>
          {!showPasswordForm ? (
            <Button
              variant='bordered'
              size='sm'
              radius='md'
              className='h-8 px-4 text-[11.5px] font-bold'
              startContent={<Icon icon='lucide:lock' className='h-3.5 w-3.5' />}
              onPress={() => setShowPasswordForm(true)}>
              Change Password
            </Button>
          ) : (
            <div className='space-y-4'>
              <Input
                label='Current Password'
                type='password'
                value={currentPassword}
                onValueChange={setCurrentPassword}
                variant='bordered'
                size='sm'
              />
              <Input
                label='New Password'
                type='password'
                value={newPassword}
                onValueChange={setNewPassword}
                variant='bordered'
                size='sm'
              />
              <Input
                label='Confirm New Password'
                type='password'
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                variant='bordered'
                size='sm'
              />
              {passwordMsg.text && (
                <p className={`text-[11.5px] font-medium ${passwordMsg.type === 'error' ? 'text-danger' : 'text-success'}`}>
                  {passwordMsg.text}
                </p>
              )}
              <div className='flex gap-2'>
                <Button
                  color='primary'
                  size='sm'
                  radius='md'
                  className='h-8 px-4 text-[11.5px] font-bold'
                  isLoading={passwordLoading}
                  onPress={handleChangePassword}>
                  Update Password
                </Button>
                <Button
                  variant='light'
                  size='sm'
                  radius='md'
                  className='h-8 px-4 text-[11.5px] font-bold'
                  onPress={() => setShowPasswordForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Personal API Key */}
      <div className='dashboard-panel'>
        <div className='dashboard-header'>
          <h3 className='text-[13px] font-bold text-foreground'>Personal API Key</h3>
          <p className='mt-0.5 text-[11.5px] text-default-500'>Manage your personal API authentication key</p>
        </div>
        <div className='p-6'>
          {apiKey ? (
            <div className='space-y-4'>
              <div className='dashboard-soft p-4'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <span className='label-mono text-default-500'>Your Key</span>
                    <Chip size='sm' color='success' variant='flat' className='h-5 px-2 text-[9px] font-bold uppercase'>
                      Active
                    </Chip>
                  </div>
                  <span className='text-[10.5px] text-default-400'>
                    Created {apiKey.createdDatetime ? format(new Date(apiKey.createdDatetime), 'MMM dd, yyyy') : '-'}
                  </span>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='ring-hairline flex-1 rounded-lg bg-content3 px-3 py-2.5 font-mono text-[12.5px] text-foreground'>
                    {showApiKey
                      ? apiKey.xApiKey
                      : apiKey.xApiKey
                        ? apiKey.xApiKey.substring(0, 8) + '••••••••••••••••'
                        : '••••••••••••••••••••'}
                  </div>
                  <div className='flex gap-1'>
                    <Button
                      isIconOnly
                      size='sm'
                      variant='light'
                      onPress={() => setShowApiKey(!showApiKey)}
                      className='text-default-500'>
                      <Icon icon={showApiKey ? 'lucide:eye-off' : 'lucide:eye'} className='h-4 w-4' />
                    </Button>
                    <Button isIconOnly size='sm' color={keyCopied ? 'success' : 'primary'} variant='flat' onPress={handleCopyKey}>
                      <Icon icon={keyCopied ? 'lucide:check' : 'lucide:copy'} className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </div>
              <div className='flex items-start gap-2.5 rounded-xl bg-content2 p-3.5 shadow-[inset_0_0_0_1px_var(--hairline-soft)]'>
                <Icon icon='lucide:info' className='mt-0.5 h-3.5 w-3.5 shrink-0 text-primary' />
                <p className='text-[11.5px] text-primary'>
                  This key grants access to your personal resources. Keep it confidential and never share it in
                  client-side code.
                </p>
              </div>
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center py-8 text-center'>
              <div className='mb-3 rounded-2xl bg-content3 p-3.5'>
                <Icon icon='lucide:key' className='h-6 w-6 text-default-400' />
              </div>
              <h4 className='font-medium text-foreground'>No API Key Found</h4>
              <p className='mb-5 mt-1 text-[11.5px] text-default-500'>
                Generate an API key to access the Qorstack Report API programmatically.
              </p>
              <Button
                color='primary'
                size='sm'
                radius='md'
                className='h-8 px-5 text-[11.5px] font-bold'
                isLoading={keyLoading}
                onPress={handleGenerateKey}>
                Generate API Key
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
