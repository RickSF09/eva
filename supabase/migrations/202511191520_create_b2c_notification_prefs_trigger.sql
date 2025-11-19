create or replace function public.handle_b2c_notification_prefs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_type = 'b2c' then
    insert into public.user_notification_prefs (
      user_id,
      email_cadence,
      only_if_call,
      send_time_local,
      timezone,
      weekly_day_of_week,
      include_transcript,
      include_recording,
      to_emails
    )
    values (
      new.id,
      'per_call',
      true,
      '18:00:00',
      coalesce(current_setting('TIMEZONE', true), 'UTC'),
      null,
      false,
      false,
      to_jsonb(array[new.email])
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists b2c_user_notification_prefs_ai on public.users;

create trigger b2c_user_notification_prefs_ai
after insert on public.users
for each row
execute function public.handle_b2c_notification_prefs();


