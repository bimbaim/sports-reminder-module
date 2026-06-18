import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const subscribeSchema = z.object({
  tenant_id: z.string(),
  email: z.string().email(),
  whatsapp_number: z.string().min(10).max(15),
  is_consented: z.boolean(),
  favorite_sports: z.array(z.string()).min(1),
  favorite_teams: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = subscribeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        success: false, 
        error: validation.error.issues[0]?.message || "Validation failed" 
      }, { status: 400 });
    }

    const { 
      tenant_id, email, whatsapp_number, is_consented, favorite_sports, favorite_teams 
    } = validation.data;

    const supabase = createAdminClient();

    const { error } = await supabase.from("subscribers").insert({
      tenant_id,
      email,
      whatsapp_number,
      favorite_sports,
      favorite_teams: favorite_teams || [],
      is_consented,
      consented_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ success: false, error: "Already subscribed." }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
