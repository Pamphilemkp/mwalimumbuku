import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { MessageSquare, Plus, User, Clock, Trash2, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CATEGORIES = ['general', 'homework', 'announcements', 'resources', 'social'];

export default function ForumPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [replyContent, setReplyContent] = useState('');

  const { data: posts, isLoading } = useQuery({
    queryKey: ['forum-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_posts')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: replies } = useQuery({
    queryKey: ['forum-replies', selectedPost],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_replies')
        .select('*, profiles(full_name)')
        .eq('post_id', selectedPost!)
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPost,
  });

  const createPost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('forum_posts').insert({
        user_id: user!.id,
        title,
        content,
        category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Post created!');
      setTitle(''); setContent(''); setCategory('general');
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['forum-posts'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createReply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('forum_replies').insert({
        post_id: selectedPost!,
        user_id: user!.id,
        content: replyContent,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reply posted!');
      setReplyContent('');
      qc.invalidateQueries({ queryKey: ['forum-replies', selectedPost] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('forum_posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Post deleted');
      setSelectedPost(null);
      qc.invalidateQueries({ queryKey: ['forum-posts'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteReply = useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await supabase.from('forum_replies').delete().eq('id', replyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reply deleted');
      qc.invalidateQueries({ queryKey: ['forum-replies', selectedPost] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isAdmin = role === 'admin';
  const activePost = posts?.find((p: any) => p.id === selectedPost);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Forum</h1>
          <p className="mt-1 text-muted-foreground">Discuss with your community.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Post</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a Post</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
              </div>
              <Button onClick={() => createPost.mutate()} disabled={!title || !content || createPost.isPending}>
                Post
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* Post list */}
        <div className="space-y-2">
          {isLoading ? <Skeleton className="h-40" /> : posts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">No posts yet. Start the conversation!</p>
            </div>
          ) : (
            posts?.map((post: any) => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post.id)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                  selectedPost === post.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-foreground line-clamp-1">{post.title}</h3>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">{post.category}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.profiles?.full_name || 'User'}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Selected post + replies */}
        <div>
          {activePost ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-6">
                <Badge variant="secondary" className="mb-2">{activePost.category}</Badge>
                <h2 className="font-display text-xl font-bold text-foreground">{activePost.title}</h2>
                <p className="mt-3 whitespace-pre-wrap text-foreground/90">{activePost.content}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  by {activePost.profiles?.full_name || 'User'} · {formatDistanceToNow(new Date(activePost.created_at), { addSuffix: true })}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Replies</h3>
                {replies?.map((r: any) => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm text-foreground/90">{r.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {r.profiles?.full_name || 'User'} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
                {replies?.length === 0 && <p className="text-sm text-muted-foreground">No replies yet.</p>}
              </div>

              <div className="flex gap-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={() => createReply.mutate()} disabled={!replyContent || createReply.isPending} className="self-end">
                  Reply
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
              <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">Select a post to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
