'use client';

import Link from 'next/link';

interface BackToTeamProps {
  teamId: string;
  teamName: string;
}

export function BackToTeam({ teamId, teamName }: BackToTeamProps) {
  return (
    <Link
      href={`/team/${teamId}`}
      className="flex items-center gap-1.5 w-full min-h-[44px] py-2 no-underline"
      style={{ textDecoration: 'none' }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ color: 'var(--accent)', flexShrink: 0 }}
      >
        <path
          d="M10 4L6 8L10 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
        {teamName}
      </span>
    </Link>
  );
}
