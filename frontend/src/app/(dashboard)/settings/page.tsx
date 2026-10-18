'use client'

import React, { useEffect, useState } from 'react'
import { Button, Input } from '@heroui/react'
import Icon from '@/components/icon'
import { PageHeader, PanelHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/providers/AuthContext'
import { api } from '@/api/generated/main-service'
import { UpdateProfileRequest } from '@/api/generated/main-service/apiGenerated'

type FormMessage = { type: string; text: string }

const FIELD_CLASS_NAMES = {
  label: 'text-[13px] font-medium !text-default-500',
  inputWrapper: 'h-10 border-transparent bg-content2 data-[hover=true]:border-default-300 group-data-[focus=true]:border-foreground',
  input: 'text-[14px]',
  description: 'text-[12px] text-default-500'
}

const Message = ({ message }: { message: FormMessage }) => {
  if (!message.text) return null
  const isError = message.type === 'error'
  return (
    <p
      role='status'
      className={`flex items-center gap-2 text-[13px] font-medium ${isError ? 'text-danger' : 'text-success'}`}>
      <Icon icon={isError ? 'lucide:alert-circle' : 'lucide:check-circle-2'} className='h-4 w-4' />
      {message.text}
    </p>
  )
}

export default function SettingsPage() {
  const { user, refreshUser, changePassword, logout } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<FormMessage>({ type: '', text: '' })

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<FormMessage>({ type: '', text: '' })

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
    }
  }, [user])

  const isProfileDirty = firstName !== (user?.firstName || '') || lastName !== (user?.lastName || '')
  const loginId = user?.email || ''
  const loginIsEmail = loginId.includes('@')

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
      setPasswordMsg({ type: 'error', text: 'Failed to change password. Check your current password and try again.' })
    } finally {
      setPasswordLoading(false)
    }
  }

  const initial = (user?.firstName || user?.email || 'U').charAt(0).toUpperCase()
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-6'>
      <PageHeader
        breadcrumb={[{ label: 'Account' }, { label: 'Settings' }]}
        title='Account settings'
        description='Your name and password. These apply to every project.'
      />

      {/* Profile */}
      <section className='border border-divider bg-content1'>
        <PanelHeader title='Profile' description='How your name appears in the app.' />
        <div className='flex flex-col gap-6 p-5'>
          <div className='flex items-center gap-4'>
            <span className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-content3 text-[20px] font-bold text-foreground'>
              {initial}
            </span>
            <div className='min-w-0'>
              <p className='truncate text-[15px] font-semibold text-foreground'>{displayName}</p>
              <p className='truncate text-[13px] text-default-500'>{user?.email}</p>
            </div>
          </div>

          <div className='grid gap-6 md:grid-cols-2'>
            <Input
              label='First name'
              labelPlacement='outside'
              placeholder='First name'
              value={firstName}
              onValueChange={setFirstName}
              variant='bordered'
              classNames={FIELD_CLASS_NAMES}
            />
            <Input
              label='Last name'
              labelPlacement='outside'
              placeholder='Last name'
              value={lastName}
              onValueChange={setLastName}
              variant='bordered'
              classNames={FIELD_CLASS_NAMES}
            />
          </div>

          <Input
            label={loginIsEmail ? 'Email' : 'Username'}
            labelPlacement='outside'
            value={loginId}
            isReadOnly
            variant='bordered'
            description='Used to sign in. It cannot be changed here.'
            classNames={{
              ...FIELD_CLASS_NAMES,
              inputWrapper: 'h-10 border-divider bg-content1',
              input: 'text-[14px] text-default-500'
            }}
          />

          <Message message={msg} />
        </div>
        <div className='flex justify-end border-t border-divider px-5 py-4'>
          <Button
            color='primary'
            className='h-10 font-medium'
            isLoading={loading}
            isDisabled={!isProfileDirty}
            onPress={handleUpdateProfile}>
            Save changes
          </Button>
        </div>
      </section>

      {/* Password */}
      <section className='border border-divider bg-content1'>
        <PanelHeader title='Password' description='Use at least 8 characters.' />
        <div className='p-5'>
          {user?.isSystemAdmin ? (
            <p className='text-sm text-default-500'>
              The admin sign-in comes from <code className='font-mono'>ADMIN_EMAIL</code> and{' '}
              <code className='font-mono'>ADMIN_PASSWORD</code> in <code className='font-mono'>.env</code> and is reset
              to those values on every start. Change them there, then run{' '}
              <code className='font-mono'>docker compose up -d</code>.
            </p>
          ) : !showPasswordForm ? (
            <div className='flex flex-col items-start gap-3'>
              <Message message={passwordMsg} />
              <Button
                variant='bordered'
                className='h-10 border-default-300 font-medium'
                startContent={<Icon icon='lucide:lock' className='h-4 w-4' />}
                onPress={() => setShowPasswordForm(true)}>
                Change password
              </Button>
            </div>
          ) : (
            <div className='flex flex-col gap-6'>
              <Input
                label='Current password'
                labelPlacement='outside'
                placeholder='Current password'
                type='password'
                autoComplete='current-password'
                value={currentPassword}
                onValueChange={setCurrentPassword}
                variant='bordered'
                classNames={FIELD_CLASS_NAMES}
              />
              <div className='grid gap-6 md:grid-cols-2'>
                <Input
                  label='New password'
                  labelPlacement='outside'
                  placeholder='New password'
                  type='password'
                  autoComplete='new-password'
                  value={newPassword}
                  onValueChange={setNewPassword}
                  variant='bordered'
                  classNames={FIELD_CLASS_NAMES}
                />
                <Input
                  label='Confirm new password'
                  labelPlacement='outside'
                  placeholder='Repeat new password'
                  type='password'
                  autoComplete='new-password'
                  value={confirmPassword}
                  onValueChange={setConfirmPassword}
                  variant='bordered'
                  classNames={FIELD_CLASS_NAMES}
                />
              </div>
              <Message message={passwordMsg} />
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='bordered'
                  className='h-10 border-default-300 font-medium'
                  isLoading={passwordLoading}
                  onPress={handleChangePassword}>
                  Update password
                </Button>
                <Button variant='light' className='h-10 font-medium' onPress={() => setShowPasswordForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Session */}
      <section className='border border-divider bg-content1'>
        <PanelHeader title='Session' />
        <div className='flex flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center'>
          <p className='text-[14px] text-default-500'>Sign out of Qorstack Report on this device.</p>
          <Button
            color='danger'
            variant='bordered'
            className='h-10 shrink-0 font-medium'
            startContent={<Icon icon='lucide:log-out' className='h-4 w-4' />}
            onPress={() => logout()}>
            Log out
          </Button>
        </div>
      </section>
    </div>
  )
}
