grant execute on function public.has_staff_role() to anon, authenticated, service_role;
grant execute on function public.has_role(uuid, public.app_role) to anon, authenticated, service_role;
grant execute on function public.is_arcade_member(uuid) to anon, authenticated, service_role;
grant execute on function public.can_host_game(uuid, text) to anon, authenticated, service_role;
grant execute on function public.entitlement_verified(uuid) to anon, authenticated, service_role;