import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Send, Edit3, CheckCircle, Sparkles, AlertCircle, Link, RotateCcw, Clock, ChevronRight, Zap } from 'lucide-react';

const GENERATE_WEBHOOK = "/api/generate";
const ITERATE_WEBHOOK = "/api/iterate";
const POST_WEBHOOK = "/api/post";

type HistoryItem = {
  id: string;
  post: string;
  instruction: string | null;
};

type Step = 'topic' | 'draft' | 'success';

export default function App() {
  const [topic, setTopic] = useState('');
  const [currentPost, setCurrentPost] = useState<string | null>(null);
  const [changes, setChanges] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [step, setStep] = useState<Step>('topic');

  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedInStatus, setLinkedInStatus] = useState<{ connected: boolean; name?: string } | null>(null);
  const [charCount, setCharCount] = useState(0);
  const draftRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/auth/linkedin/status")
      .then(r => r.json())
      .then(setLinkedInStatus)
      .catch(() => setLinkedInStatus({ connected: false }));
    if (window.location.search.includes("linkedin=connected")) {
      window.history.replaceState({}, "", "/");
    }
  }, []);

  useEffect(() => {
    setCharCount(currentPost?.length ?? 0);
  }, [currentPost]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(GENERATE_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Topic: topic })
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (!data?.[0]?.output?.post) throw new Error("Unexpected response from server.");
      const newPost = data[0].output.post;
      setCurrentPost(newPost);
      setHistory([{ id: Date.now().toString(), post: newPost, instruction: `Topic: ${topic}` }]);
      setStep('draft');
      setTimeout(() => draftRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIterate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changes.trim() || !currentPost) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(ITERATE_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post: currentPost, changes })
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      let newPost: string | null =
        data?.[0]?.output?.post ?? data?.[0]?.post ?? data?.output?.post ?? data?.post ?? (typeof data === 'string' ? data : null);
      if (!newPost) throw new Error("Unexpected response from server.");
      setCurrentPost(newPost);
      setHistory(prev => [...prev, { id: Date.now().toString(), post: newPost!, instruction: changes }]);
      setChanges('');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPostForLinkedIn = (text: string): string =>
    text
      .replace(/\*\*(.+?)\*\*/gs, '$1')
      .replace(/\*(.+?)\*/gs, '$1')
      .replace(/__(.+?)__/gs, '$1')
      .replace(/_(.+?)_/gs, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .trim();

  const handlePublish = async () => {
    if (!currentPost) return;
    setIsPosting(true);
    setError(null);
    try {
      const res = await fetch(POST_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post: formatPostForLinkedIn(currentPost) })
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const posted = (Array.isArray(data) && data[0]?.posted) ?? data?.posted;
      if (posted === "yes" || posted === true || posted === 1) {
        setStep('success');
      } else {
        throw new Error(`LinkedIn returned: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleReset = () => {
    setTopic('');
    setCurrentPost(null);
    setChanges('');
    setHistory([]);
    setError(null);
    setStep('topic');
  };

  const isOverLimit = charCount > 3000;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start relative px-4 py-10 overflow-x-hidden bg-[#0a0a0f]">
      {/* Animated background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#0077B5] opacity-[0.07] blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#8b5cf6] opacity-[0.06] blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-[#06b6d4] opacity-[0.04] blur-[80px] animate-pulse" style={{ animationDelay: '4s' }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-[680px] flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0077B5] to-[#005885] flex items-center justify-center shadow-lg shadow-[#0077B5]/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-[16px] tracking-tight leading-none">Post Weaver</h1>
            <p className="text-white/40 text-[11px] mt-0.5">by Kanhaiya Kumar</p>
          </div>
        </div>

        {/* LinkedIn pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all ${
          linkedInStatus?.connected
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-white/5 border-white/10 text-white/50'
        }`}>
          {linkedInStatus === null ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : linkedInStatus.connected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {linkedInStatus.name}
              <button
                onClick={() => fetch("/auth/linkedin/logout").then(() => setLinkedInStatus({ connected: false }))}
                className="ml-1 opacity-50 hover:opacity-100 bg-transparent border-none cursor-pointer text-green-400 text-[10px] p-0"
              >✕</button>
            </>
          ) : (
            <a href="/auth/linkedin" className="flex items-center gap-1.5 text-[#0077B5] no-underline font-semibold">
              <Link className="w-3 h-3" /> Connect LinkedIn
            </a>
          )}
        </div>
      </header>

      {/* Step indicator */}
      <div className="relative z-10 w-full max-w-[680px] flex items-center gap-2 mb-6">
        {(['topic', 'draft', 'success'] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 text-[11px] font-semibold transition-all ${
              step === s ? 'text-white' : i < ['topic','draft','success'].indexOf(step) ? 'text-white/40' : 'text-white/20'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border transition-all ${
                step === s ? 'bg-[#0077B5] border-[#0077B5] text-white' :
                i < ['topic','draft','success'].indexOf(step) ? 'bg-white/10 border-white/20 text-white/40' :
                'border-white/10 text-white/20'
              }`}>{i + 1}</span>
              {s === 'topic' ? 'Topic' : s === 'draft' ? 'Draft' : 'Published'}
            </div>
            {i < 2 && <ChevronRight className="w-3 h-3 text-white/15 flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Main card */}
      <div ref={draftRef} className="relative z-10 w-full max-w-[680px] flex flex-col gap-5">

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-[13px]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div><strong className="block font-semibold mb-0.5">Error</strong>{error}</div>
            <button onClick={() => setError(null)} className="ml-auto opacity-50 hover:opacity-100 bg-transparent border-none cursor-pointer text-red-400">✕</button>
          </div>
        )}

        {/* SUCCESS screen */}
        {step === 'success' && (
          <div className="bg-[#111118] border border-white/10 rounded-3xl p-10 flex flex-col items-center gap-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Live on LinkedIn! 🎉</h2>
              <p className="text-white/50 text-[14px]">Your post has been published to Kanhaiya Kumar's LinkedIn profile.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full text-left">
              <p className="text-white/60 text-[13px] leading-relaxed whitespace-pre-wrap line-clamp-5">{formatPostForLinkedIn(currentPost!)}</p>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[13px] font-semibold px-6 py-3 rounded-full transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Write another post
            </button>
          </div>
        )}

        {/* TOPIC screen */}
        {step === 'topic' && (
          <div className="bg-[#111118] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col gap-6">
            <div>
              <p className="text-white/30 text-[11px] uppercase tracking-[2px] font-bold mb-1">Step 1</p>
              <h2 className="text-white text-[22px] font-bold leading-tight">What's on your mind?</h2>
              <p className="text-white/40 text-[13px] mt-1">Describe your topic — AI will craft a compelling LinkedIn post.</p>
            </div>

            <form onSubmit={handleGenerate} className="flex flex-col gap-4">
              <div className="relative">
                <textarea
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g., How Deep Learning is transforming JEE preparation in India..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white text-[14px] placeholder-white/25 resize-none focus:outline-none focus:border-[#0077B5]/60 focus:ring-2 focus:ring-[#0077B5]/15 transition-all min-h-[130px] leading-relaxed"
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(e); }}
                />
                <span className="absolute bottom-3 right-4 text-[10px] text-white/20">⌘↵ to generate</span>
              </div>

              <button
                type="submit"
                disabled={isLoading || !topic.trim()}
                className="group relative overflow-hidden bg-gradient-to-r from-[#0077B5] to-[#005885] hover:from-[#0088cc] hover:to-[#0077B5] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[13px] uppercase tracking-[1px] py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-[#0077B5]/20 cursor-pointer border-none"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Crafting your post...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate Post</>
                )}
                {!isLoading && <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all" />}
              </button>
            </form>
          </div>
        )}

        {/* DRAFT screen */}
        {step === 'draft' && currentPost && (
          <>
            {/* Draft card */}
            <div className="bg-[#111118] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              {/* Draft header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#0077B5] animate-pulse" />
                  <span className="text-white/60 text-[12px] font-semibold uppercase tracking-[1px]">Current Draft</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Version dots */}
                  <div className="flex items-center gap-1.5">
                    {history.map((item, i) => (
                      <button
                        key={item.id}
                        onClick={() => setCurrentPost(item.post)}
                        title={item.instruction ?? ''}
                        className={`transition-all border-none cursor-pointer p-0 rounded-full ${
                          currentPost === item.post
                            ? 'w-5 h-2 bg-[#0077B5] rounded-full'
                            : 'w-2 h-2 bg-white/20 hover:bg-white/40 rounded-full'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[11px] font-mono ${isOverLimit ? 'text-red-400' : 'text-white/30'}`}>
                    {charCount}/3000
                  </span>
                </div>
              </div>

              {/* Draft content */}
              <div className="px-6 py-5 max-h-[320px] overflow-y-auto">
                <p className="text-white/85 text-[14px] leading-[1.75] whitespace-pre-wrap m-0">
                  {currentPost}
                </p>
              </div>

              {/* Draft footer — action buttons */}
              <div className="px-6 py-4 border-t border-white/5 flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-[12px] bg-transparent border-none cursor-pointer transition-all p-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Start over
                </button>
                <div className="flex-1" />
                <button
                  onClick={handlePublish}
                  disabled={isPosting || !linkedInStatus?.connected || isOverLimit}
                  className={`group flex items-center gap-2 font-bold text-[13px] px-5 py-2.5 rounded-xl transition-all border-none cursor-pointer ${
                    linkedInStatus?.connected && !isOverLimit
                      ? 'bg-[#0077B5] hover:bg-[#0088cc] text-white shadow-lg shadow-[#0077B5]/25 disabled:opacity-50'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }`}
                  title={!linkedInStatus?.connected ? 'Connect LinkedIn first' : ''}
                >
                  {isPosting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>
                  ) : (
                    <><Send className="w-3.5 h-3.5" /> Post to LinkedIn</>
                  )}
                </button>
              </div>
            </div>

            {/* Refine card */}
            <div className="bg-[#111118] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
              <div>
                <p className="text-white/30 text-[11px] uppercase tracking-[2px] font-bold mb-0.5">Step 2 — Optional</p>
                <h3 className="text-white text-[16px] font-bold">Refine the draft</h3>
              </div>
              <form onSubmit={handleIterate} className="flex flex-col gap-3">
                <textarea
                  value={changes}
                  onChange={e => setChanges(e.target.value)}
                  placeholder="e.g., make it more personal, add Indian ecosystem examples, shorten it..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-[13px] placeholder-white/20 resize-none focus:outline-none focus:border-[#0077B5]/60 focus:ring-2 focus:ring-[#0077B5]/10 transition-all leading-relaxed"
                />
                <button
                  type="submit"
                  disabled={isLoading || !changes.trim()}
                  className="flex items-center justify-center gap-2 bg-white/8 hover:bg-white/12 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 text-white font-semibold text-[13px] py-3 rounded-xl transition-all cursor-pointer"
                >
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Refining...</> : <><Edit3 className="w-4 h-4" /> Refine Post</>}
                </button>
              </form>
            </div>

            {/* History */}
            {history.length > 1 && (
              <div className="bg-[#111118] border border-white/10 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-white/30 text-[11px] uppercase tracking-[2px] font-bold">Version History</span>
                </div>
                <div className="flex flex-col gap-2">
                  {history.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPost(item.post)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer bg-transparent ${
                        currentPost === item.post
                          ? 'border-[#0077B5]/40 bg-[#0077B5]/10'
                          : 'border-white/5 hover:border-white/15 hover:bg-white/3'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-white/50">
                          v{index + 1} — {index === 0 ? 'Initial Draft' : 'Refined'}
                        </span>
                        {currentPost === item.post && <span className="text-[10px] text-[#0077B5] font-semibold">Active</span>}
                      </div>
                      <p className="text-[12px] text-white/35 line-clamp-1 m-0">{item.instruction}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-10 text-white/20 text-[11px] text-center">
        Post Weaver · Built for Kanhaiya Kumar
      </footer>
    </div>
  );
}
