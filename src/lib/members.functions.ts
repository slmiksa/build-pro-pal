import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  title: z.string().max(80).default("مدير"),
  password: z.string().min(8).max(72),
});

/** Admin-only: create a company account with a password chosen by the admin. */
export const createMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { error: "هذه العملية للمسؤول فقط" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, title: data.title },
    });
    if (error) {
      return {
        error: error.message.includes("already")
          ? "هذا البريد مسجّل مسبقاً"
          : "تعذّر إنشاء الحساب",
      };
    }

    await context.supabase.from("audit_events").insert({
      type: "member_added",
      actor_id: context.userId,
      detail: `إضافة عضو جديد: ${data.name} (${data.email})`,
    });

    return { error: null as string | null };
  });
