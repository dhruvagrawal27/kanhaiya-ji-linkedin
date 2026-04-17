import React, { useState, useEffect } from 'react';
import { Loader2, Send, Edit3, CheckCircle, Sparkles, AlertCircle, Link } from 'lucide-react';
import { FloralDecorations } from './FloralDecorations';

const GENERATE_WEBHOOK = "/api/generate";
const ITERATE_WEBHOOK = "/api/iterate";
const POST_WEBHOOK = "/api/post";

type HistoryItem = {
  id: string;
  post: string;
  instruction: string | null;
};

export default function App() {
  const [topic, setTopic] = useState('');
  const [currentPost, setCurrentPost] = useState<string | null>(null);
  const [changes, setChanges] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedInStatus, setLinkedInStatus] = useState<{ connected: boolean; name?: string } | null>(null);

  useEffect(() => {
    fetch("/auth/linkedin/status")
      .then(r => r.json())
      .then(setLinkedInStatus)
      .catch(() => setLinkedInStatus({ connected: false }));

    // Check if we just came back from OAuth
    if (window.location.search.includes("linkedin=connected")) {
      window.history.replaceState({}, "", "/");
    }
  }, []);

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
      
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      
      const data = await res.json();
      
      if (!data || !data[0] || !data[0].output || !data[0].output.post) {
        console.error("Unexpected response format:", data);
        throw new Error("Received an unexpected response format from the server.");
      }
      
      const newPost = data[0].output.post;
      
      setCurrentPost(newPost);
      setHistory([{ id: Date.now().toString(), post: newPost, instruction: `Topic: ${topic}` }]);
    } catch (err) {
      console.error("Failed to generate:", err);
      setError(err instanceof Error ? err.message : "Failed to generate post. Please try again.");
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
        body: JSON.stringify({ post: currentPost, changes: changes })
      });
      
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Iterate raw response:", JSON.stringify(data));

      // Support multiple response formats from n8n
      let newPost: string | null = null;
      if (Array.isArray(data) && data[0]?.output?.post) {
        newPost = data[0].output.post;
      } else if (Array.isArray(data) && data[0]?.post) {
        newPost = data[0].post;
      } else if (data?.output?.post) {
        newPost = data.output.post;
      } else if (data?.post) {
        newPost = data.post;
      } else if (typeof data === 'string') {
        newPost = data;
      }

      if (!newPost) {
        console.error("Unexpected response format:", data);
        throw new Error("Received an unexpected response format from the server.");
      }
      
      setCurrentPost(newPost);
      setHistory(prev => [...prev, { id: Date.now().toString(), post: newPost!, instruction: changes }]);
      setChanges('');
    } catch (err) {
      console.error("Failed to iterate:", err);
      setError(err instanceof Error ? err.message : "Failed to update post. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPostForLinkedIn = (text: string): string => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')      // Remove **bold**
      .replace(/\*(.+?)\*/g, '$1')           // Remove *italic*
      .replace(/__(.+?)__/g, '$1')           // Remove __bold__
      .replace(/_(.+?)_/g, '$1')             // Remove _italic_
      .replace(/^#{1,6}\s+/gm, '')           // Remove # headings
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')    // Convert [text](url) → text
      .replace(/`(.+?)`/g, '$1')             // Remove `inline code`
      .replace(/→/g, '→')                   // Keep arrows as-is
      .trim();
  };

  const handlePublish = async () => {
    if (!currentPost) return;
    
    const formattedPost = formatPostForLinkedIn(currentPost);

    setIsPosting(true);
    setError(null);
    try {
      const res = await fetch(POST_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post: formattedPost })
      });
      
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Publish raw response:", JSON.stringify(data));

      // Support: [{"posted":"yes"}] or {"posted":"yes"} or any truthy posted field
      const posted =
        (Array.isArray(data) && data[0]?.posted) ||
        data?.posted;

      if (posted === "yes" || posted === true || posted === 1) {
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 5000);
      } else {
        throw new Error(`Failed to confirm publication. Server said: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error("Failed to post:", err);
      setError(err instanceof Error ? err.message : "Failed to publish post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const restoreHistory = (item: HistoryItem) => {
    setCurrentPost(item.post);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4 py-12 overflow-x-hidden">
      <FloralDecorations />
      
      <div className="relative z-10 w-full max-w-[640px] bg-white rounded-[24px] p-8 md:p-[44px] shadow-[0_20px_40px_rgba(46,31,26,0.08)] border border-border-soft flex flex-col gap-6">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blush via-rose to-sage rounded-t-[24px]" />
        
        {history.length > 0 && (
          <div className="flex justify-center gap-2 mb-[-20px]">
            {history.map((item) => (
              <div 
                key={item.id} 
                className={`w-2 h-2 rounded-full ${currentPost === item.post ? 'bg-rose' : 'bg-border-soft'}`}
              />
            ))}
          </div>
        )}

        <h1 className="font-serif text-[2.2rem] font-normal m-0 text-text-main text-center">
          Post Weaver
        </h1>

        {/* LinkedIn Connection Status — always visible at top */}
        <div className="flex items-center justify-between bg-[#f0f7ff] border border-[#d0e8f7] rounded-2xl px-4 py-3">
          {linkedInStatus?.connected ? (
            <>
              <div className="flex items-center gap-2 text-[13px] text-[#0077B5] font-semibold">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Connected as <span className="font-bold">{linkedInStatus.name}</span>
              </div>
              <button
                type="button"
                onClick={() => fetch("/auth/linkedin/logout").then(() => setLinkedInStatus({ connected: false }))}
                className="text-[11px] text-text-muted underline bg-transparent border-none cursor-pointer hover:text-red-500"
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-[13px] text-text-muted">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                LinkedIn not connected
              </div>
              <a
                href="/auth/linkedin"
                className="flex items-center gap-1.5 bg-[#0077B5] text-white text-[12px] font-semibold px-4 py-1.5 rounded-full no-underline hover:opacity-90 transition-opacity"
              >
                <Link className="w-3.5 h-3.5" /> Connect
              </a>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold mb-1">Error</strong>
              {error}
            </div>
          </div>
        )}

        {!currentPost ? (
          <form onSubmit={handleGenerate} className="flex flex-col gap-6">
            <div>
              <span className="text-[11px] uppercase tracking-[1px] text-text-muted font-bold mb-2 block">
                What would you like to write about?
              </span>
              <textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., how ai is affecting jee scores..."
                className="w-full border border-border-soft rounded-xl py-3 px-4 font-sans text-[14px] text-text-main bg-white resize-none focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/10 transition-all min-h-[120px]"
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button
                type="submit"
                disabled={isLoading || !topic.trim()}
                className="border-none py-[14px] rounded-[50px] cursor-pointer text-[13px] font-semibold uppercase tracking-[0.5px] transition-opacity bg-deep-rose text-white disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isLoading ? 'Drafting...' : 'Draft Post'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div>
              <span className="text-[11px] uppercase tracking-[1px] text-text-muted font-bold mb-2 block">
                Current Draft
              </span>
              <div className="bg-petal rounded-xl p-6 border border-border-soft max-h-[280px] overflow-y-auto relative">
                <p className="text-[15px] leading-[1.6] m-0 text-text-main whitespace-pre-wrap">
                  {currentPost}
                </p>
              </div>
            </div>

            <form onSubmit={handleIterate} className="flex flex-col gap-6">
              <div>
                <span className="text-[11px] uppercase tracking-[1px] text-text-muted font-bold mb-2 block">
                  Refine your thoughts
                </span>
                <textarea
                  id="changes"
                  value={changes}
                  onChange={(e) => setChanges(e.target.value)}
                  placeholder="e.g., Make it more professional or shorter..."
                  rows={3}
                  className="w-full border border-border-soft rounded-xl py-3 px-4 font-sans text-[14px] text-text-main bg-white resize-none focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/10 transition-all"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="submit"
                  disabled={isLoading || !changes.trim()}
                  className="border-none py-[14px] rounded-[50px] cursor-pointer text-[13px] font-semibold uppercase tracking-[0.5px] transition-opacity bg-deep-rose text-white disabled:opacity-70 flex items-center justify-center gap-2 hover:opacity-90"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                  Refine Post
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={isPosting || isSuccess || !linkedInStatus?.connected}
                  className="border-none py-[14px] rounded-[50px] cursor-pointer text-[13px] font-semibold uppercase tracking-[0.5px] transition-opacity bg-sage text-white disabled:opacity-70 flex items-center justify-center gap-2 hover:opacity-90"
                >
                  {isPosting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>
                  ) : isSuccess ? (
                    <><CheckCircle className="w-4 h-4" /> Published</>
                  ) : (
                    <><Send className="w-4 h-4" /> Post to LinkedIn</>
                  )}
                </button>
              </div>
            </form>

            {/* History Panel (Desktop) */}
            {history.length > 0 && (
              <div className="hidden xl:flex absolute right-[-240px] top-[40px] w-[200px] flex-col gap-3 opacity-80">
                <span className="text-[11px] uppercase tracking-[1px] text-text-muted font-bold mb-1 block">
                  History
                </span>
                {history.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => restoreHistory(item)}
                    className={`text-[11px] p-3 border border-border-soft rounded-lg bg-white cursor-pointer text-text-muted leading-[1.4] border-l-[3px] hover:border-rose transition-colors ${
                      currentPost === item.post ? 'border-l-rose' : 'border-l-blush'
                    }`}
                  >
                    <strong className="text-text-main">v{index + 1}: {index === 0 ? 'Initial Draft' : 'Iteration'}</strong><br/>
                    <span className="line-clamp-2 mt-1">{item.instruction || 'Original topic'}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* History Panel (Mobile/Tablet Fallback) */}
            {history.length > 0 && (
              <div className="flex xl:hidden flex-col gap-3 mt-2 pt-6 border-t border-border-soft">
                <span className="text-[11px] uppercase tracking-[1px] text-text-muted font-bold mb-1 block">
                  History
                </span>
                <div className="flex flex-col gap-2">
                  {history.map((item, index) => (
                    <div
                      key={item.id}
                      onClick={() => restoreHistory(item)}
                      className={`text-[11px] p-3 border border-border-soft rounded-lg bg-white cursor-pointer text-text-muted leading-[1.4] border-l-[3px] hover:border-rose transition-colors ${
                        currentPost === item.post ? 'border-l-rose' : 'border-l-blush'
                      }`}
                    >
                      <strong className="text-text-main">v{index + 1}: {index === 0 ? 'Initial Draft' : 'Iteration'}</strong><br/>
                      <span className="line-clamp-2 mt-1">{item.instruction || 'Original topic'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
