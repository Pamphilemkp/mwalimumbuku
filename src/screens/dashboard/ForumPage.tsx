"use client";

import { useState } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { supabase } from '@/src/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Label } from '@/src/components/ui/label';
import { Badge } from '@/src/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Skeleton } from '@/src/components/ui/skeleton';
import { toast } from '@/src/components/ui/sonner';
import { MessageSquare, Plus, User, Clock, Trash2, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { usePagination } from '@/src/hooks/usePagination';
import PaginationControls from '@/src/components/PaginationControls';

const CATEGORIES = ['general', 'homework', 'announcements', 'resources', 'social'] as const;

export default function ForumPage() {
  const { user, role } = useAuth();
  const { t, lang } = useLanguage();
  const dateLocale = lang === 'fr' ? fr : enUS;
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [replyContent, setReplyContent] = useState('');

  const { data: posts, isLoading } = useQuery({
    queryKey: ['forum-posts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('forum_posts').select('*, profiles(full_name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: replies } = useQuery({
    queryKey: ['forum-replies', selectedPost],
    queryFn: async () => {
      const { data, error } = await supabase.from('forum_replies').select('*, profiles(full_name)').eq('post_id', selectedPost!).order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPost,
  });

  const createPost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('forum_posts').insert({ user_id: user!.id, title, content, category });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t.forum.postCreated); setTitle(''); setContent(''); setCategory('general'); setDialogOpen(false); qc.invalidateQueries({ queryKey: ['forum-posts'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const createReply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('forum_replies').insert({ post_id: selectedPost!, user_id: user!.id, content: replyContent });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t.forum.replyPosted); setReplyContent(''); qc.invalidateQueries({ queryKey: ['forum-replies', selectedPost] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => { const { error } = await supabase.from('forum_posts').delete().eq('id', postId); if (error) throw error; },
    onSuccess: () => { toast.success(t.forum.postDeleted); setSelectedPost(null); qc.invalidateQueries({ queryKey: ['forum-posts'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteReply = useMutation({
    mutationFn: async (replyId: string) => { const { error } = await supabase.from('forum_replies').delete().eq('id', replyId); if (error) throw error; },
    onSuccess: () => { toast.success(t.forum.replyDeleted); qc.invalidateQueries({ queryKey: ['forum-replies', selectedPost] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const isAdmin = role === 'admin';
  const activePost = posts?.find((p: any) => p.id === selectedPost);
  const catLabel = (c: string) => t.forum.categories[c as keyof typeof t.forum.categories] || c;
  const postsPagination = usePagination(posts, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{t.forum.title}</h1>
          <p className="mt-1 text-muted-foreground">{t.forum.subtitle}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> {t.forum.newPost}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.forum.createPost}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>{t.forum.postTitle}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>{t.forum.category}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{catLabel(c)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>{t.forum.content}</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} /></div>
              <Button onClick={() => createPost.mutate()} disabled={!title || !content || createPost.isPending}>{t.forum.post}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="space-y-2">
          {isLoading ? <Skeleton className="h-40" /> : posts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">{t.forum.noPosts}</p>
            </div>
          ) : postsPagination.paginatedItems.map((post: any) => (
            <button key={post.id} onClick={() => setSelectedPost(post.id)}
              className={`w-full text-left rounded-xl border p-4 transition-colors ${selectedPost === post.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-foreground line-clamp-1">{post.title}</h3>
                <Badge variant="secondary" className="shrink-0 text-[10px]">{catLabel(post.category)}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.content}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.profiles?.full_name || 'User'}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: dateLocale })}</span>
              </div>
            </button>
          ))}
          <PaginationControls {...postsPagination} />
        </div>

        <div>
          {activePost ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-start justify-between">
                  <Badge variant="secondary" className="mb-2">{catLabel(activePost.category)}</Badge>
                  {(isAdmin || activePost.user_id === user?.id) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deletePost.mutate(activePost.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <h2 className="font-display text-xl font-bold text-foreground">{activePost.title}</h2>
                <p className="mt-3 whitespace-pre-wrap text-foreground/90">{activePost.content}</p>
                <p className="mt-3 text-xs text-muted-foreground">{t.forum.by} {activePost.profiles?.full_name || 'User'} · {formatDistanceToNow(new Date(activePost.created_at), { addSuffix: true, locale: dateLocale })}</p>
                {isAdmin && <Badge variant="outline" className="mt-2 text-[10px]"><Shield className="mr-1 h-3 w-3" /> Admin</Badge>}
              </div>
              <div className="space-y-3">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t.forum.replies}</h3>
                {replies?.map((r: any) => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-foreground/90 flex-1">{r.content}</p>
                      {(isAdmin || r.user_id === user?.id) && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" onClick={() => deleteReply.mutate(r.id)}><Trash2 className="h-3 w-3" /></Button>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{r.profiles?.full_name || 'User'} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: dateLocale })}</p>
                  </div>
                ))}
                {replies?.length === 0 && <p className="text-sm text-muted-foreground">{t.forum.noReplies}</p>}
              </div>
              <div className="flex gap-2">
                <Textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder={t.forum.writeReply} rows={2} className="flex-1" />
                <Button onClick={() => createReply.mutate()} disabled={!replyContent || createReply.isPending} className="self-end">{t.forum.reply}</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
              <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">{t.forum.selectPost}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
