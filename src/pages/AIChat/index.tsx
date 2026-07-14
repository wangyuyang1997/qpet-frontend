import { useState, useRef, useEffect } from 'react';
import { Input, Button, Select, Typography } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { accountApi } from '../../api/client';

interface Message { role: 'user' | 'assistant'; content: string }

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [accountId, setAccountId] = useState<string | undefined>();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { accountApi.list().then((r) => setAccounts(r.data.accounts || r.data || [])); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    setMessages((m) => [...m, { role: 'user', content: input }]);
    const currentInput = input;
    setInput('');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ message: currentInput, accountId }),
      });
      const reader = res.body?.getReader();
      if (reader) {
        let content = '';
        setMessages((m) => [...m, { role: 'assistant', content: '' }]);
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          content += decoder.decode(value, { stream: true });
          setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content }; return c; });
        }
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: '请求失败，请稍后重试。' }]);
    }
    setSending(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>AI 助手</h3>
        <Select allowClear placeholder="选择账号上下文" style={{ width: 220 }}
          options={accounts.map((a) => ({ label: a.name, value: a.id }))} onChange={setAccountId} />
      </div>

      <div style={{
        flex: 1, overflow: 'auto', marginBottom: 16,
        borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)',
        backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
        boxShadow: 'var(--shadow-sm)', padding: '24px 28px',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Typography.Text style={{ fontSize: 15, color: 'var(--text-tertiary)' }}>向 AI 助手提问，获取游戏建议</Typography.Text>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: m.role === 'user' ? 'var(--accent-subtle)' : 'rgba(0,0,0,0.04)',
              color: m.role === 'user' ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}>
              {m.role === 'user' ? '你' : 'AI'}
            </div>
            <div style={{ flex: 1 }}>
              <Typography.Paragraph style={{
                margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                color: 'var(--text-primary)',
              }}>
                {m.content}
              </Typography.Paragraph>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Input.TextArea
          value={input} onChange={(e) => setInput(e.target.value)}
          onPressEnter={(e) => { e.preventDefault(); send(); }}
          placeholder="输入问题..."
          rows={2} disabled={sending}
          style={{ borderRadius: 'var(--radius-md)', resize: 'none' }}
        />
        <Button type="primary" icon={<SendOutlined />} onClick={send} loading={sending}
          style={{ height: 'auto', borderRadius: 'var(--radius-md)', minWidth: 52 }} />
      </div>
    </div>
  );
}
