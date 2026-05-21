'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Returns whether the currently authenticated user is the captain
 * (owner) of the given team.
 *
 * Captain status is determined solely by:
 *   teams.auth_user_id = session.user.id  AND  teams.id = teamId
 *
 * This is the single source of truth for captain detection across all pages.
 * Never duplicate this logic inline — import this hook instead.
 */
export function useIsTeamCaptain(teamId: string | null): {
  isCaptain: boolean;
  loading: boolean;
} {
  const [isCaptain, setIsCaptain] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setIsCaptain(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) { setIsCaptain(false); setLoading(false); }
        return;
      }

      // maybeSingle(): returns null (not an error) when the row is absent
      const { data } = await supabase
        .from('teams')
        .select('id')
        .eq('id', teamId)
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!cancelled) {
        setIsCaptain(!!data);
        setLoading(false);
      }
    };

    check().catch(() => {
      if (!cancelled) { setIsCaptain(false); setLoading(false); }
    });

    return () => { cancelled = true; };
  }, [teamId]);

  return { isCaptain, loading };
}
