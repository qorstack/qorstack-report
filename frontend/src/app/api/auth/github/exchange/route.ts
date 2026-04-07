import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  if (!code) {
    return NextResponse.json({ message: 'Code is required' }, { status: 400 })
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      },
      {
        headers: {
          Accept: 'application/json'
        }
      }
    )

    const { access_token } = tokenResponse.data

    if (!access_token) {
      return NextResponse.json(
        { message: 'Failed to retrieve access token from GitHub', details: tokenResponse.data },
        { status: 400 }
      )
    }

    // 2. Fetch user profile
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    })

    const user = userResponse.data

    // 3. Fetch user emails (if email is private)
    let email = user.email
    if (!email) {
      const emailsResponse = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      })
      const primaryEmail = emailsResponse.data.find((e: any) => e.primary && e.verified)
      if (primaryEmail) {
        email = primaryEmail.email
      }
    }

    return NextResponse.json({
      githubId: user.id.toString(),
      email: email,
      name: user.name || user.login,
      avatarUrl: user.avatar_url
    })
  } catch (error: any) {
    console.error('GitHub Auth Error:', error.response?.data || error.message)
    return NextResponse.json({ message: 'Internal server error during GitHub authentication' }, { status: 500 })
  }
}
