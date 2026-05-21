'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Team } from '@/lib/types';

function LogOutHeader() {
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };
  return (
    <div className="flex justify-end px-4 py-2">
      <button
        onClick={handleLogout}
        className="text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        Log out
      </button>
    </div>
  );
}

export default function ManagePage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // Layout already guards auth, but be defensive
      if (!user) { router.replace('/login'); return; }

      const { data } = await supabase
        .from('teams')
        .select('id, name')
        .eq('auth_user_id', user.id)
        .order('name');

      const captainTeams = (data ?? []) as Team[];

      if (captainTeams.length === 1) {
        // Single team — go straight to the hub
        router.replace(`/team/${captainTeams[0].id}`);
        return;
      }

      setTeams(captainTeams);
      setLoading(false);
    };

    init().catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <main
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: 'var(--bg-page)' }}
      >
        <LogOutHeader />
        <div className="flex flex-1 items-center justify-center">
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </main>
    );
  }

  // Zero teams
  if (teams.length === 0) {
    return (
      <main
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: 'var(--bg-page)' }}
      >
        <LogOutHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            No teams found
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            You don&apos;t manage any teams yet.
          </p>
        </div>
      </main>
    );
  }

  // Multiple teams — show picker
  return (
    <main
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      <LogOutHeader />
      <div className="p-6 max-w-lg mx-auto w-full">
        <h1
          className="font-display text-xl font-bold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Your Teams
        </h1>
        <div className="flex flex-col gap-2">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/team/${team.id}`}
              className="flex items-center justify-between rounded-lg p-4 border"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                textDecoration: 'none',
              }}
            >
              <p
                className="font-display text-lg font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {team.name}
              </p>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                style={{ color: 'var(--text-secondary)', flexShrink: 0 }}
              >
                <path
                  d="M6 4L10 8L6 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
