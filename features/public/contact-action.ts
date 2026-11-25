"use server";

import { headers } from "next/headers";
import { clientAddress } from "@/lib/auth/client-address";
import { authRateLimiter } from "@/lib/auth/limiter";
import { createClient } from "@/lib/supabase/server";
import { runContact } from "./contact";

export async function submitContactAction(input: {
  name?: string;
  email?: string;
  topic?: string;
  message?: string;
}) {
  const headerList = await headers();
  return runContact(
    {
      consume: authRateLimiter,
      save: async (message) => {
        const supabase = await createClient();
        const { error } = await supabase.from("contact_messages").insert(message);
        return { error: Boolean(error) };
      },
    },
    {
      name: input?.name,
      email: input?.email,
      topic: input?.topic,
      message: input?.message,
      address: clientAddress(headerList.get("x-forwarded-for")),
    },
  );
}
