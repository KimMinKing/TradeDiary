import { useEffect, useRef, useState } from 'react';
import {
  createCommunityComment, createCommunityPost, deleteCommunityComment, deleteCommunityPost,
  getCommunityPost, getCommunityPosts,
} from '../../api/communityApi';

const when = (value) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const initials = (name = '?') => name.slice(0, 2).toUpperCase();
const IMAGE_TOKEN = /\[\[image:(\d+)\]\]/g;

const PostContent = ({ content, images = [], legacyImage = null, preview = false }) => {
  const parts = String(content || '').split(/(\[\[image:\d+\]\])/g);
  const hasInlineImage = parts.some(part => /^\[\[image:\d+\]\]$/.test(part));
  return <div className={preview ? 'community-inline-preview' : 'community-post-body'}>
    {parts.map((part, index) => {
      const match = part.match(/^\[\[image:(\d+)\]\]$/);
      if (match) {
        const src = images[Number(match[1])];
        return src ? <img className="community-post-image" src={src} alt={`Inline attachment ${Number(match[1]) + 1}`} key={`${part}-${index}`} /> : null;
      }
      return part ? <span className="community-text-block" key={index}>{part}</span> : null;
    })}
    {!hasInlineImage && legacyImage && <img className="community-post-image" src={legacyImage} alt="Attached to post" />}
  </div>;
};

const CommunityBoard = () => {
  const [posts, setPosts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState({ title: '', content: '', image: null, images: [] });
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const editorRef = useRef(null);

  const loadPosts = async () => {
    try { setPosts((await getCommunityPosts()).data.content ?? []); setError(''); }
    catch { setError('The board could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadPosts(); }, []);

  const openPost = async (id) => {
    try { setSelected((await getCommunityPost(id)).data); setCompose(false); setError(''); }
    catch { setError('This post is no longer available.'); }
  };
  const publish = async (event) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.content.trim()) return;
    try {
      const post = (await createCommunityPost(draft)).data;
      setDraft({ title: '', content: '', image: null, images: [] }); setCompose(false); setSelected(post); await loadPosts();
    } catch { setError('Your post could not be published.'); }
  };
  const chooseImage = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (draft.images.length >= 4) { setError('You can insert up to four images.'); return; }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1_500_000) {
      setError('Use a PNG, JPEG or WebP image under 1.5 MB.'); return;
    }
    const cursor = editorRef.current?.selectionStart ?? draft.content.length;
    const reader = new FileReader();
    reader.onload = () => setDraft(current => {
      const index = current.images.length;
      const token = `\n[[image:${index}]]\n`;
      return { ...current, content: current.content.slice(0, cursor) + token + current.content.slice(cursor), images: [...current.images, reader.result] };
    });
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  const removeImage = index => setDraft(current => {
    const images = current.images.filter((_, itemIndex) => itemIndex !== index);
    const content = current.content.replace(IMAGE_TOKEN, (_, rawIndex) => {
      const tokenIndex = Number(rawIndex);
      if (tokenIndex === index) return '';
      return `[[image:${tokenIndex > index ? tokenIndex - 1 : tokenIndex}]]`;
    });
    return { ...current, content, images };
  });
  const removePost = async () => {
    if (!window.confirm('Delete this post permanently?')) return;
    await deleteCommunityPost(selected.id); setSelected(null); await loadPosts();
  };
  const submitComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    try {
      const created = (await createCommunityComment(selected.id, comment)).data;
      setSelected(current => ({ ...current, comments: [...current.comments, created], comment_count: current.comment_count + 1 }));
      setComment(''); await loadPosts();
    } catch { setError('Your comment could not be posted.'); }
  };
  const removeComment = async (id) => {
    await deleteCommunityComment(id);
    setSelected(current => ({ ...current, comments: current.comments.filter(item => item.id !== id), comment_count: Math.max(0, current.comment_count - 1) }));
    await loadPosts();
  };

  if (compose) return (
    <form className="community-compose" onSubmit={publish}>
      <div className="community-section-head"><div><b>New discussion</b><span>Write a clear title and add useful context.</span></div><button type="button" onClick={() => setCompose(false)}>Cancel</button></div>
      <input maxLength="160" placeholder="Discussion title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} autoFocus />
      <textarea ref={editorRef} maxLength="10000" placeholder="What are you seeing in the market?" value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })} />
      <div className="community-media-row"><label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} />+ Insert image at cursor</label><span>{draft.images.length} / 4 images</span></div>
      {draft.images.length > 0 && <div className="community-image-strip">{draft.images.map((image, index) => <div key={index}><img src={image} alt={`Attachment ${index + 1}`} /><button type="button" onClick={() => removeImage(index)}>Remove {index + 1}</button></div>)}</div>}
      {(draft.content.trim() || draft.images.length > 0) && <div className="community-compose-preview"><b>Post preview</b><PostContent content={draft.content} images={draft.images} preview /></div>}
      <footer><span>{draft.content.length} / 10,000 · Up to 4 images, 1.5 MB each</span><button className="community-primary" type="submit">Publish post</button></footer>
    </form>
  );

  if (selected) return (
    <article className="community-detail">
      <button className="community-back" onClick={() => setSelected(null)}>← Back to board</button>
      <div className="community-detail-head">
        <div><h2>{selected.title}</h2><span>{selected.author.nickname} · {when(selected.created_at)} · {selected.view_count} views</span></div>
        {selected.owner && <button className="community-danger" onClick={removePost}>Delete</button>}
      </div>
      <PostContent content={selected.content} images={selected.images} legacyImage={selected.image} />
      <section className="community-comments">
        <h3>{selected.comment_count} Comments</h3>
        <form onSubmit={submitComment}><input maxLength="2000" placeholder="Add to the discussion..." value={comment} onChange={e => setComment(e.target.value)} /><button className="community-primary">Comment</button></form>
        {selected.comments.map(item => <div className="community-comment" key={item.id}>
          <div className="community-avatar">{initials(item.author.nickname)}</div>
          <div><header><b>{item.author.nickname}</b><span>{when(item.created_at)}</span>{item.owner && <button onClick={() => removeComment(item.id)}>Delete</button>}</header><p>{item.content}</p></div>
        </div>)}
      </section>
      <section className="community-detail-list">
        <div className="community-detail-list-head"><b>Latest discussions</b><button onClick={() => setSelected(null)}>View board</button></div>
        <div className="community-list">{posts.map(post => <button className={post.id === selected.id ? 'current' : ''} key={post.id} onClick={() => post.id !== selected.id && openPost(post.id)}>
          <div className="community-topic"><b>{post.title}</b><span>{post.author.nickname} · {when(post.created_at)}</span></div>
          <div className="community-metric"><b>{post.comment_count}</b><span>replies</span></div>
          <div className="community-metric"><b>{post.view_count}</b><span>views</span></div>
        </button>)}</div>
      </section>
    </article>
  );

  return <section className="community-board">
    <div className="community-board-grid"><main><div className="community-section-head"><div><b>Latest discussions</b><span>Ideas, reviews and market notes from the community.</span></div><button className="community-primary" onClick={() => setCompose(true)}>New post</button></div>
    {error && <div className="community-error">{error}</div>}
    {loading ? <div className="community-empty">Loading discussions...</div> : posts.length === 0 ? <div className="community-empty"><b>Start the first discussion.</b><span>The board is ready for your market idea.</span></div> :
      <div className="community-list">{posts.map(post => <button key={post.id} onClick={() => openPost(post.id)}>
        <div className="community-avatar">{initials(post.author.nickname)}</div>
        <div className="community-topic"><b>{post.title}</b><span>{post.author.nickname} · {when(post.created_at)}</span></div>
        <div className="community-metric"><b>{post.comment_count}</b><span>replies</span></div>
        <div className="community-metric"><b>{post.view_count}</b><span>views</span></div>
      </button>)}</div>}</main><aside className="community-sidebar"><span className="community-kicker">COMMUNITY DESK</span><h3>Better decisions start with better notes.</h3><p>Share the setup, the risk and what would invalidate your idea. Specific context creates useful discussion.</p><dl><div><dt>{posts.length}</dt><dd>recent topics</dd></div><div><dt>{posts.reduce((sum, post) => sum + post.comment_count, 0)}</dt><dd>replies</dd></div></dl><div className="community-rules"><b>Posting standards</b><span>01 · Explain your thesis</span><span>02 · State the risk</span><span>03 · Respect other traders</span></div></aside></div>
  </section>;
};

export default CommunityBoard;
