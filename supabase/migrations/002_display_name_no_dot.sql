-- Remove the trailing dot from the last-name initial in display names.
-- "John S." → "John S"
create or replace function get_display_name(
  p_name text, p_nickname text, p_jersey text
) returns text language sql immutable as $$
  select case
    when p_nickname is not null and p_nickname <> '' then p_nickname
    else split_part(p_name, ' ', 1) ||
         case when length(split_part(p_name, ' ', 2)) > 0
              then ' ' || left(split_part(p_name, ' ', 2), 1)
              else '' end
  end
$$;
