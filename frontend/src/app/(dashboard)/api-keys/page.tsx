'use client'

import React, { useEffect, useState } from 'react'
import {
  Card,
  Button,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tooltip
} from '@heroui/react'
import Icon from '@/components/icon'
import { useAuth } from '@/providers/AuthContext'
import { api } from '@/api/generated/main-service'
import { ApiKeyDto } from '@/api/generated/main-service/apiGenerated'
import { format } from 'date-fns'

export default function ApiKeysPage() {
  const { user } = useAuth()
  const [keys, setKeys] = useState<ApiKeyDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKeys = async () => {
      if (user?.id) {
        try {
          const res = await api.users.apiKeysDetail(user.id)
          setKeys(res || [])
        } catch (error) {
          console.error('Failed to fetch API keys', error)
        } finally {
          setLoading(false)
        }
      }
    }
    fetchKeys()
  }, [user])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleDelete = async (keyId: string) => {
    console.log('Delete key', keyId)
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>API Keys</h1>
          <p className='text-sm text-default-500'>Manage your secret keys for API authentication.</p>
        </div>
      </div>

      {/* Warning Card */}
      <Card className='border-l-4 border-warning bg-warning-50 p-4 shadow-sm' shadow='none' radius='none'>
        <div className='flex items-start gap-4'>
          <Icon icon='lucide:alert-triangle' className='mt-1 h-5 w-5 text-warning-600' />
          <div>
            <h3 className='font-bold text-warning-800'>Security Notice</h3>
            <p className='text-sm text-warning-700'>
              Your secret API keys can be used to perform any action on your behalf. Keep them secure and never share
              them in client-side code (browsers, apps).
            </p>
          </div>
        </div>
      </Card>

      {/* API Keys Table */}
      <Card className='border border-default-200 shadow-sm' shadow='none' radius='none'>
        <Table aria-label='API keys table' shadow='none' removeWrapper>
          <TableHeader>
            <TableColumn>NAME</TableColumn>
            <TableColumn>TOKEN PREFIX</TableColumn>
            <TableColumn>CREATED</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody emptyContent={'No API keys found.'} isLoading={loading}>
            {keys.map(key => (
              <TableRow key={key.id} className='border-b border-default-100 last:border-none hover:bg-content2'>
                <TableCell>
                  <div className='font-bold text-foreground'>{key.name || 'Untitled Key'}</div>
                  <div className='text-xs text-default-400'>{key.id}</div>
                </TableCell>
                <TableCell>
                  <code className='rounded bg-content3 px-2 py-1 text-xs'>
                    {key.xApiKey ? key.xApiKey.substring(0, 8) + '...' : '****************'}
                  </code>
                </TableCell>
                <TableCell>
                  {key.createdDatetime ? format(new Date(key.createdDatetime), 'MMM dd, yyyy') : '-'}
                </TableCell>
                <TableCell>
                  <Chip size='sm' color={key.isActive ? 'success' : 'danger'} variant='flat' className='rounded-sm'>
                    {key.isActive ? 'Active' : 'Inactive'}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className='flex items-center gap-2'>
                    <Tooltip content='Copy Key ID'>
                      <button onClick={() => handleCopy(key.id || '')} className='text-default-400 hover:text-foreground'>
                        <Icon icon='lucide:copy' className='h-4 w-4' />
                      </button>
                    </Tooltip>
                    <Tooltip content='Revoke Key' color='danger'>
                      <button onClick={() => handleDelete(key.id || '')} className='text-default-400 hover:text-danger'>
                        <Icon icon='lucide:trash-2' className='h-4 w-4' />
                      </button>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
