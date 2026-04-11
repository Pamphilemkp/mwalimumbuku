-- Admin can delete any forum post (moderation)
CREATE POLICY "Admins can delete any forum post"
ON public.forum_posts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete any forum reply (moderation)
CREATE POLICY "Admins can delete any forum reply"
ON public.forum_replies
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));