import { LoginButton } from '@/components/auth/LoginButton';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="rounded-xl bg-white p-10 shadow-md text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Hockey Lines</h1>
        <p className="text-gray-500 text-sm">Captain access only</p>
        <LoginButton />
      </div>
    </main>
  );
}
