
-- Add foreign keys for forum tables to profiles (via user_id)
-- We can't reference profiles.user_id directly as FK since it's not unique constraint
-- Instead, let's just query profiles separately in code.
-- But we need to add a way to join. Let's add a unique constraint on profiles.user_id
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

ALTER TABLE public.forum_posts 
  ADD CONSTRAINT forum_posts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

ALTER TABLE public.forum_replies 
  ADD CONSTRAINT forum_replies_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(user_id);

ALTER TABLE public.messages
  ADD CONSTRAINT messages_receiver_id_fkey
  FOREIGN KEY (receiver_id) REFERENCES public.profiles(user_id);
