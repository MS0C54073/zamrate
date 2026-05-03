import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./StarRating";
import { supabase } from "@/integrations/supabase/client";
import { getAnonId } from "@/lib/anonId";
import { iconFor } from "@/lib/categories";
import { toast } from "sonner";
import { MessageCircle, CornerDownRight, Lock, Clock } from "lucide-react";
import type { Company, CommentRow } from "@/types";

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface Props {
  company: Company | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRatingChanged: () => void;
}

export function CompanyDetailDialog({ company, open, onOpenChange, onRatingChanged }: Props) {
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [myChangeCount, setMyChangeCount] = useState(0);
  const [myRatingId, setMyRatingId] = useState<string | null>(null);
  const [pickedRating, setPickedRating] = useState(0);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [, setNow] = useState(Date.now());

  const anonId = getAnonId();

  useEffect(() => {
    if (!company || !open) return;
    void loadAll();

    // Live tick for "time ago" labels
    const tick = setInterval(() => setNow(Date.now()), 30_000);

    // Realtime subscriptions for ratings + comments scoped to this company
    const channel = supabase
      .channel(`company-${company.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ratings", filter: `company_id=eq.${company.id}` },
        () => { void loadAll(); onRatingChanged(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `company_id=eq.${company.id}` },
        () => { void loadAll(); },
      )
      .subscribe();

    return () => {
      clearInterval(tick);
      void supabase.removeChannel(channel);
    };
  }, [company, open]);

  async function loadAll() {
    if (!company) return;
    const [{ data: ratings }, { data: cs }] = await Promise.all([
      supabase.from("ratings").select("id, rating, rating_change_count, anonymous_user_id").eq("company_id", company.id),
      supabase.from("comments").select("id, company_id, parent_comment_id, comment_text, created_at, anonymous_user_id").eq("company_id", company.id).order("created_at", { ascending: true }),
    ]);
    const rs = ratings ?? [];
    setCount(rs.length);
    setAvg(rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : 0);
    const mine = rs.find((r) => r.anonymous_user_id === anonId);
    if (mine) {
      setMyRating(mine.rating);
      setMyChangeCount(mine.rating_change_count);
      setMyRatingId(mine.id);
      setPickedRating(mine.rating);
    } else {
      setMyRating(null);
      setMyChangeCount(0);
      setMyRatingId(null);
      setPickedRating(0);
    }
    setComments(cs ?? []);
  }

  async function submitRating() {
    if (!company || !pickedRating) return;
    if (myRatingId) {
      if (pickedRating === myRating) return;
      if (myChangeCount >= 3) {
        toast.error("Rating locked. Maximum 3 changes reached.");
        return;
      }
      const { error } = await supabase.from("ratings").update({ rating: pickedRating }).eq("id", myRatingId);
      if (error) return toast.error(error.message);
      const remaining = 3 - (myChangeCount + 1);
      toast.success(remaining > 0 ? `Rating updated. ${remaining} change${remaining === 1 ? "" : "s"} remaining.` : "Rating updated. Now locked.");
    } else {
      const { error } = await supabase.from("ratings").insert({
        company_id: company.id, anonymous_user_id: anonId, rating: pickedRating,
      });
      if (error) return toast.error(error.message);
      toast.success("Thank you! Your rating has been recorded.");
    }
    await loadAll();
    onRatingChanged();
  }

  async function postComment(text: string, parent: string | null) {
    if (!company || !text.trim()) return;
    const { error } = await supabase.from("comments").insert({
      company_id: company.id,
      anonymous_user_id: anonId,
      parent_comment_id: parent,
      comment_text: text.trim(),
    });
    if (error) return toast.error(error.message);
    if (parent) { setReplyText(""); setReplyTo(null); } else { setNewComment(""); }
    toast.success("Posted!");
    await loadAll();
  }

  if (!company) return null;
  const Icon = iconFor(company.category);
  const topComments = comments.filter((c) => !c.parent_comment_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_comment_id === id);
  const remainingChanges = myRating ? Math.max(0, 3 - myChangeCount) : 3;
  const locked = myRating !== null && myChangeCount >= 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="size-14 bg-secondary rounded-2xl flex items-center justify-center text-clay shrink-0">
              <Icon className="size-7" />
            </div>
            <div className="flex-1">
              <Badge variant="outline" className="text-primary border-primary/30 mb-2">{company.category}</Badge>
              <DialogTitle className="font-display text-3xl">{company.name}</DialogTitle>
              <DialogDescription className="mt-2 text-base">{company.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {company.services && (
          <div className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Services: </span>{company.services}</div>
        )}

        <div className="bg-secondary/50 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="text-4xl font-display text-clay tabular-nums">{avg ? avg.toFixed(1) : "—"}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground mt-1">{count} ratings</div>
          </div>
          <StarRating value={avg} readOnly size={28} />
        </div>

        <div className="border border-border rounded-2xl p-5">
          <h4 className="font-display text-xl mb-3">Your rating</h4>
          {locked ? (
            <div className="flex items-center gap-2 text-clay font-medium">
              <Lock className="size-4" /> Rating locked. You used all 3 changes.
            </div>
          ) : (
            <>
              <StarRating value={pickedRating} onChange={setPickedRating} size={32} />
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  {myRating ? `You have ${remainingChanges} rating change${remainingChanges === 1 ? "" : "s"} remaining.` : "Your rating is anonymous."}
                </p>
                <Button onClick={submitRating} disabled={!pickedRating || pickedRating === myRating} className="rounded-xl">
                  {myRating ? "Update Rating" : "Submit Rating"}
                </Button>
              </div>
            </>
          )}
        </div>

        <div>
          <h4 className="font-display text-xl mb-3 flex items-center gap-2"><MessageCircle className="size-5 text-primary" /> Comments</h4>
          <div className="space-y-3">
            <Textarea
              placeholder="Share your experience anonymously…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              maxLength={2000}
              className="rounded-xl"
            />
            <div className="flex justify-end">
              <Button onClick={() => postComment(newComment, null)} disabled={!newComment.trim()} className="rounded-xl">Post Anonymously</Button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {topComments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first.</p>
            )}
            {topComments.map((c) => (
              <div key={c.id} className="bg-secondary/40 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Anonymous</span>
                  <span className="text-xs text-muted-foreground/70 inline-flex items-center gap-1"><Clock className="size-3" />{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.comment_text}</p>
                <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="text-xs text-primary font-semibold mt-2 hover:underline">
                  {replyTo === c.id ? "Cancel" : "Reply"}
                </button>

                {replyTo === c.id && (
                  <div className="mt-3 space-y-2">
                    <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply anonymously…" className="rounded-xl" maxLength={2000} />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => postComment(replyText, c.id)} disabled={!replyText.trim()} className="rounded-xl">Post Reply</Button>
                    </div>
                  </div>
                )}

                {repliesOf(c.id).map((r) => (
                  <div key={r.id} className="mt-3 ml-4 pl-4 border-l-2 border-accent/40 flex gap-2">
                    <CornerDownRight className="size-4 text-muted-foreground mt-1 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Anonymous</span>
                        <span className="text-xs text-muted-foreground/70 inline-flex items-center gap-1"><Clock className="size-3" />{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{r.comment_text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
