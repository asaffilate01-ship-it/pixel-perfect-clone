import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

async function fetchAvatar(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_preset")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.avatar_preset ?? "captain";
}

export function useMyAvatar() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-avatar", user?.id],
    queryFn: () => fetchAvatar(user!.id),
    enabled: !!user,
  });
  return data ?? "captain";
}
