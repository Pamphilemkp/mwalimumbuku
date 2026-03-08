import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { type, course_id, exercise_id } = await req.json();

    if (type === 'enrollment') {
      // Get course info
      const { data: course } = await supabase.from('courses').select('title, teacher_id').eq('id', course_id).single();
      if (!course) return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404, headers: corsHeaders });

      // Get student name
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).single();

      // Log notification (we store in a simple way - could be extended to actual email)
      console.log(`[NOTIFICATION] Student "${profile?.full_name}" enrolled in course "${course.title}"`);

      // Notify parent if linked
      const { data: parentLinks } = await supabase.from('parent_student').select('parent_id').eq('student_id', user.id);
      if (parentLinks && parentLinks.length > 0) {
        for (const link of parentLinks) {
          // Create an in-app message to the parent
          await supabase.from('messages').insert({
            sender_id: user.id,
            receiver_id: link.parent_id,
            content: `Your child ${profile?.full_name || 'Student'} has enrolled in the course "${course.title}".`,
          });
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Enrollment notification sent' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (type === 'exercise_complete') {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).single();

      // Notify parent
      const { data: parentLinks } = await supabase.from('parent_student').select('parent_id').eq('student_id', user.id);
      if (parentLinks && parentLinks.length > 0) {
        for (const link of parentLinks) {
          await supabase.from('messages').insert({
            sender_id: user.id,
            receiver_id: link.parent_id,
            content: `Your child ${profile?.full_name || 'Student'} completed an exercise!`,
          });
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Exercise notification sent' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
