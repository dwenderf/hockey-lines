'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Team } from '@/lib/types';

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('teams')
      .select('id, name')
      .order('name');

    if (data && data.length > 0) {
      setTeams(data);
      setSelectedTeamId((prev) => prev ?? data[0].id);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { teams, selectedTeamId, setSelectedTeamId, loading };
}
