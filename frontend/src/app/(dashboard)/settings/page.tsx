'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Button, Input, Avatar, Card, CardBody, CardHeader, Chip } from '@heroui/react'
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
      if (active) {
        setApiKey(active)
      }
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      console.error('Change password failed', error)
      setPasswordMsg({ type: 'error', text: 'Failed to change password' })
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className='mx-auto max-w-2xl space-y-8'>
      <div className='text-center'>
        <h1 className='text-2xl font-bold text-foreground'>Account Settings</h1>
        <p className='text-default-500'>Manage your profile and preferences</p>
      </div>

      <div className='grid gap-8'>
        {/* Profile Card */}
        <Card className='p-4'>
          <CardHeader className='flex flex-col items-start gap-1 pb-0'>
            <h3 className='text-lg font-bold'>Personal Information</h3>
            <p className='text-sm text-default-500'>Update your personal details</p>
          </CardHeader>
          <CardBody className='gap-6 pt-6'>
            <div className='flex items-center gap-4'>
              <Avatar
                src={user?.profileImageUrl || undefined}
                name={user?.firstName?.charAt(0) || 'U'}
                className='h-20 w-20 text-2xl'
              />
              <Button variant='flat' size='sm'>
                Change Avatar
              </Button>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <Input label='First Name' value={firstName} onValueChange={setFirstName} variant='bordered' />
              <Input label='Last Name' value={lastName} onValueChange={setLastName} variant='bordered' />
            </div>

            <Input
              label='Email'
              value={user?.email || ''}
              isReadOnly
              variant='faded'
              description='Email cannot be changed'
            />

            {msg.text && (
              <div className={`text-sm ${msg.type === 'error' ? 'text-danger' : 'text-success'}`}>{msg.text}</div>
            )}

            <div className='flex justify-end'>
              <Button color='primary' isLoading={loading} onPress={handleUpdateProfile}>
                Save Changes
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Security Card */}
        <Card className='p-4'>
          <CardHeader className='flex flex-col items-start gap-1 pb-0'>
            <h3 className='text-lg font-bold'>Security</h3>
            <p className='text-sm text-default-500'>Manage your password</p>
          </CardHeader>
          <CardBody className='gap-4 pt-6'>
            {!showPasswordForm ? (
              <Button
                variant='bordered'
                startContent={<Icon icon='lucide:lock' />}
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
                />
                <Input
                  label='New Password'
                  type='password'
                  value={newPassword}
                  onValueChange={setNewPassword}
                  variant='bordered'
                />
                <Input
                  label='Confirm New Password'
                  type='password'
                  value={confirmPassword}
                  onValueChange={setConfirmPassword}
                  variant='bordered'
                />

                {passwordMsg.text && (
                  <div className={`text-sm ${passwordMsg.type === 'error' ? 'text-danger' : 'text-success'}`}>
                    {passwordMsg.text}
                  </div>
                )}

                <div className='flex gap-2'>
                  <Button color='primary' isLoading={passwordLoading} onPress={handleChangePassword}>
                    Update Password
                  </Button>
                  <Button variant='light' onPress={() => setShowPasswordForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* API Key Card */}
        <Card className='p-4'>
          <CardHeader className='flex flex-col items-start gap-1 pb-0'>
            <h3 className='text-lg font-bold'>Personal API Key</h3>
            <p className='text-sm text-default-500'>Manage your personal API authentication key</p>
          </CardHeader>
          <CardBody className='gap-6 pt-6'>
            {apiKey ? (
              <div className='space-y-4'>
                <div className='rounded-lg border border-default-200 bg-content2 p-4'>
                  <div className='mb-2 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs font-semibold uppercase text-default-500'>Your Key</span>
                      <Chip size='sm' color='success' variant='flat' className='h-5 text-xs'>
                        Active
                      </Chip>
                    </div>
                    <span className='text-xs text-default-400'>
                      Created {apiKey.createdDatetime ? format(new Date(apiKey.createdDatetime), 'MMM dd, yyyy') : '-'}
                    </span>
                  </div>

                  <div className='flex items-center gap-3'>
                    <div className='flex-1 font-mono text-sm text-foreground'>
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
                      <Button
                        isIconOnly
                        size='sm'
                        color={keyCopied ? 'success' : 'primary'}
                        variant='flat'
                        onPress={handleCopyKey}>
                        <Icon icon={keyCopied ? 'lucide:check' : 'lucide:copy'} className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className='flex items-start gap-2 rounded-lg bg-primary-50 p-3 text-xs text-primary'>
                  <Icon icon='lucide:info' className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                  <p>
                    This key grants access to your personal resources. Keep it confidential and never share it in
                    client-side code.
                  </p>
                </div>
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center py-6 text-center'>
                <div className='mb-3 rounded-full bg-content3 p-3'>
                  <Icon icon='lucide:key' className='h-6 w-6 text-default-400' />
                </div>
                <h4 className='font-medium text-foreground'>No API Key Found</h4>
                <p className='mb-4 text-sm text-default-500'>
                  Generate an API key to access the Qorstack Report API programmatically.
                </p>
                <Button color='primary' isLoading={keyLoading} onPress={handleGenerateKey}>
                  Generate API Key
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
