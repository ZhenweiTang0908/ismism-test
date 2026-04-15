import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const getSupabaseConfig = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return { supabaseUrl, supabaseKey };
};

type SupabaseHealthResult =
  | {
      ok: true;
      status: number;
      statusText: string;
      version?: string;
      name?: string;
      description?: string;
    }
  | {
      ok: false;
      status: number;
      statusText: string;
      details: string;
    };

export const createClient = async () => {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};

export const getSupabaseHealth = async (): Promise<SupabaseHealthResult> => {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  const response = await fetch(new URL("/auth/v1/health", supabaseUrl), {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      statusText: response.statusText,
      details: await response.text(),
    };
  }

  const data = (await response.json()) as {
    version?: string;
    name?: string;
    description?: string;
  };

  return {
    ok: true,
    status: response.status,
    statusText: response.statusText,
    ...data,
  };
};
