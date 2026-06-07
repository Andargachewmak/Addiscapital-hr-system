import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button, Input } from '@/components/ui'
import { useAuth } from '@/lib/auth'

export function SignUpPage() {
  const navigate = useNavigate()
  const register = useAuth((s) => s.register)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await register(name, email, password, 'employee')
      toast.success('Account created — please sign in')
      navigate('/login', { replace: true, state: { email } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 15% 10%, rgba(108,99,255,0.18), transparent 60%),' +
            'radial-gradient(50% 40% at 90% 90%, rgba(0,212,170,0.10), transparent 60%), #0a0b0f',
        }}
      />

      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/30 mb-4 relative overflow-hidden">
            <div className="absolute w-4 h-4 border-2 border-white/80 rounded-full top-3 left-4" />
            <div className="absolute w-5 h-2.5 border-2 border-white/80 rounded-t-full bottom-3 left-3.5" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Addis Capital <span className="text-brand-400">HR</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Create your employee account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-1/80 backdrop-blur border border-white/10 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl"
        >
          <Input label="Full name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-1 w-full justify-center">
            Create account
          </Button>
          <p className="text-[11px] text-slate-600 text-center -mt-1 leading-relaxed">
            If your email matches an employee record added by HR, you'll get full access. Otherwise you can browse and apply to open roles.
          </p>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
