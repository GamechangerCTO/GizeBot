import { useState } from 'react';
import Layout from '../../components/Layout';

export default function ManualSends() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [content, setContent] = useState('');
  const [buttons, setButtons] = useState([{ text: '', url: '' }]);
  const [imageFile, setImageFile] = useState(null);
  const [type, setType] = useState('predictions');
  const [dryRun, setDryRun] = useState(true);

  const send = async () => {
    setLoading(true); setMsg('');
    try {
      // Always use upload-and-send endpoint for direct sending (with or without image)
      const form = new FormData();
      if (imageFile) form.append('file', imageFile);
      form.append('content', content);
      form.append('buttons', JSON.stringify(buttons.filter(b=>b.text && b.url)));
      form.append('dryRun', String(dryRun));
      form.append('type', type); // Include type for logging/tracking
      
      const res = await fetch('/api/manual/upload-and-send', { method: 'POST', body: form });
      const data = await res.json();
      setMsg(data.message || (data.success ? 'Sent successfully!' : 'Failed to send'));
    } catch (e) { setMsg('Error: ' + e.message); }
    setLoading(false);
  };

  const addButton = () => setButtons([...buttons, { text: '', url: '' }]);
  const setBtn = (i, key, val) => setButtons(buttons.map((b,idx)=> idx===i? { ...b, [key]: val } : b));
  const delBtn = (i) => setButtons(buttons.filter((_,idx)=> idx!==i));

  return (
    <Layout>
      <div className="card">
        <h1>Manual Sends</h1>
        <p className="muted">Compose and send manual messages. Images are sent and discarded (not stored).</p>
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
          <div>
            <label>Type</label>
            <select value={type} onChange={e=>setType(e.target.value)}>
              <option value="predictions">Predictions</option>
              <option value="results">Results</option>
              <option value="promo">Promo</option>
              <option value="live-status">Live Status</option>
            </select>
          </div>
          <div>
            <label>Content</label>
            <textarea rows={8} value={content} onChange={e=>setContent(e.target.value)} style={{ width:'100%' }} placeholder="Write your message..." />
          </div>
          <div>
            <label>Inline Buttons</label>
            {buttons.map((b,i)=> (
              <div key={i} style={{ display:'flex', gap:6, marginBottom:6 }}>
                <input placeholder="Text" value={b.text} onChange={e=>setBtn(i,'text',e.target.value)} />
                <input placeholder="URL" value={b.url} onChange={e=>setBtn(i,'url',e.target.value)} />
                <button onClick={()=>delBtn(i)}>✕</button>
              </div>
            ))}
            <button onClick={addButton}>+ Add Button</button>
          </div>
          <div>
            <label>Image (optional)</label>
            <input type="file" accept="image/*" onChange={e=>setImageFile(e.target.files?.[0]||null)} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <label><input type="checkbox" checked={dryRun} onChange={e=>setDryRun(e.target.checked)} /> Dry-Run</label>
            <button disabled={loading} onClick={send}>{loading? 'Sending...' : 'Send'}</button>
          </div>
          {msg && <div className="card" style={{ background:'rgba(255,255,255,.04)' }}>{msg}</div>}
        </div>
      </div>
    </Layout>
  );
}

