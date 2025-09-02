export const dynamic = "force-dynamic";

import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LoginForm from './login-form'

export default async function LoginPage() {
  const session = await getSession()
  
  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Orion CMS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Content Management Console
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
