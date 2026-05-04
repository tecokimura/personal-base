'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api, type WorkHistory, type WorkHistoryInput } from '@/lib/api';

const EMPTY_FORM: WorkHistoryInput = {
  yearMonthFrom: '',
  yearMonthTo: '',
  isCurrent: false,
  workSummary: '',
  toolsUsed: '',
  roleName: '',
  teamSize: undefined,
  projectCode: '',
};

type FormState = WorkHistoryInput & { teamSizeStr: string };

function toFormState(wh: WorkHistory): FormState {
  return {
    yearMonthFrom: wh.yearMonthFrom,
    yearMonthTo: wh.yearMonthTo ?? '',
    isCurrent: wh.isCurrent,
    workSummary: wh.workSummary,
    toolsUsed: wh.toolsUsed ?? '',
    roleName: wh.roleName ?? '',
    teamSizeStr: wh.teamSize != null ? String(wh.teamSize) : '',
    projectCode: wh.projectCode ?? '',
  };
}

function toInput(form: FormState): WorkHistoryInput {
  return {
    yearMonthFrom: form.yearMonthFrom,
    yearMonthTo: form.isCurrent ? undefined : (form.yearMonthTo || undefined),
    isCurrent: form.isCurrent,
    workSummary: form.workSummary,
    toolsUsed: form.toolsUsed || undefined,
    roleName: form.roleName || undefined,
    teamSize: form.teamSizeStr ? Number(form.teamSizeStr) : undefined,
    projectCode: form.projectCode || undefined,
  };
}

export default function WorkHistoriesPage() {
  const { me, loading: authLoading } = useAuth();
  const [records, setRecords] = useState<WorkHistory[]>([]);
  const [pageError, setPageError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<FormState>({ ...EMPTY_FORM, teamSizeStr: '' });
  const [addError, setAddError] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>({ ...EMPTY_FORM, teamSizeStr: '' });
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !me) return;
    api.workHistories
      .list(me.employeeId)
      .then(setRecords)
      .catch((err: unknown) => setPageError(String(err)))
      .finally(() => setLoading(false));
  }, [authLoading, me]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setAddSaving(true);
    setAddError('');
    try {
      const created = await api.workHistories.create(me.employeeId, toInput(addForm));
      setRecords((prev) => [created, ...prev]);
      setShowAddForm(false);
      setAddForm({ ...EMPTY_FORM, teamSizeStr: '' });
    } catch (err) {
      setAddError(String(err));
    } finally {
      setAddSaving(false);
    }
  }

  function startEdit(wh: WorkHistory) {
    setEditingId(wh.id);
    setEditForm(toFormState(wh));
    setEditError('');
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId == null) return;
    setEditSaving(true);
    setEditError('');
    try {
      const updated = await api.workHistories.update(editingId, toInput(editForm));
      setRecords((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
      setEditingId(null);
    } catch (err) {
      setEditError(String(err));
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('この職歴を削除しますか？')) return;
    try {
      await api.workHistories.remove(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(String(err));
    }
  }

  if (authLoading || loading) return <p>読み込み中...</p>;
  if (pageError) return <p className="error-msg">{pageError}</p>;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>職歴管理</h1>
        {!showAddForm && (
          <button className="btn-primary" onClick={() => { setShowAddForm(true); setAddError(''); }}>
            ＋ 職歴を追加
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#555' }}>新規職歴</h2>
          <WorkHistoryForm
            form={addForm}
            onChange={setAddForm}
            onSubmit={handleAdd}
            onCancel={() => { setShowAddForm(false); setAddError(''); }}
            error={addError}
            saving={addSaving}
            submitLabel="追加"
          />
        </div>
      )}

      {records.length === 0 ? (
        <div className="card">
          <p style={{ color: '#aaa', margin: 0 }}>職歴がありません。「職歴を追加」から登録してください。</p>
        </div>
      ) : (
        records.map((wh) =>
          editingId === wh.id ? (
            <div key={wh.id} className="card" style={{ marginBottom: 8 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#555' }}>職歴を編集</h2>
              <WorkHistoryForm
                form={editForm}
                onChange={setEditForm}
                onSubmit={handleEdit}
                onCancel={() => setEditingId(null)}
                error={editError}
                saving={editSaving}
                submitLabel="保存"
              />
            </div>
          ) : (
            <WorkHistoryCard
              key={wh.id}
              wh={wh}
              onEdit={() => startEdit(wh)}
              onDelete={() => handleDelete(wh.id)}
            />
          )
        )
      )}
    </>
  );
}

function WorkHistoryCard({
  wh,
  onEdit,
  onDelete,
}: {
  wh: WorkHistory;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const period = wh.isCurrent
    ? `${wh.yearMonthFrom} 〜 現在`
    : wh.yearMonthTo
    ? `${wh.yearMonthFrom} 〜 ${wh.yearMonthTo}`
    : wh.yearMonthFrom;

  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{period}</div>
          {wh.roleName && (
            <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>{wh.roleName}</div>
          )}
          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{wh.workSummary}</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#888', flexWrap: 'wrap' }}>
            {wh.toolsUsed && <span>使用技術: {wh.toolsUsed}</span>}
            {wh.teamSize != null && <span>チーム規模: {wh.teamSize}名</span>}
            {wh.projectCode && <span>案件コード: {wh.projectCode}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 16, flexShrink: 0 }}>
          <button className="btn-secondary" onClick={onEdit}>編集</button>
          <button className="btn-danger" onClick={onDelete}>削除</button>
        </div>
      </div>
    </div>
  );
}

function WorkHistoryForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  error,
  saving,
  submitLabel,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  error: string;
  saving: boolean;
  submitLabel: string;
}) {
  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...form, [key]: e.target.value });
  }

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <label style={labelStyle}>
          開始年月 (YYYY-MM) <span style={{ color: 'red' }}>*</span>
          <input
            style={inputStyle}
            value={form.yearMonthFrom}
            onChange={field('yearMonthFrom')}
            placeholder="例: 2023-04"
            pattern="\d{4}-(0[1-9]|1[0-2])"
            required
          />
        </label>
        <label style={labelStyle}>
          終了年月 (YYYY-MM)
          <input
            style={inputStyle}
            value={form.yearMonthTo}
            onChange={field('yearMonthTo')}
            placeholder="例: 2024-03"
            pattern="\d{4}-(0[1-9]|1[0-2])"
            disabled={form.isCurrent}
          />
        </label>
      </div>

      <label style={{ ...labelStyle, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, gridColumn: 'span 2' }}>
        <input
          type="checkbox"
          checked={form.isCurrent}
          onChange={(e) => onChange({ ...form, isCurrent: e.target.checked, yearMonthTo: e.target.checked ? '' : form.yearMonthTo })}
        />
        現在も継続中
      </label>

      <label style={{ ...labelStyle, marginBottom: 12 }}>
        業務内容 <span style={{ color: 'red' }}>*</span>
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={form.workSummary}
          onChange={field('workSummary')}
          required
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <label style={labelStyle}>
          役割・職名
          <input style={inputStyle} value={form.roleName} onChange={field('roleName')} />
        </label>
        <label style={labelStyle}>
          使用技術・ツール
          <input style={inputStyle} value={form.toolsUsed} onChange={field('toolsUsed')} />
        </label>
        <label style={labelStyle}>
          チーム規模（名）
          <input
            style={inputStyle}
            type="number"
            min={1}
            value={form.teamSizeStr}
            onChange={field('teamSizeStr')}
          />
        </label>
        <label style={labelStyle}>
          案件コード
          <input style={inputStyle} value={form.projectCode} onChange={field('projectCode')} />
        </label>
      </div>

      {error && <p className="error-msg" style={{ marginBottom: 8 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? '保存中...' : submitLabel}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          キャンセル
        </button>
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
  color: '#555',
};

const inputStyle: React.CSSProperties = {
  padding: '6px 8px',
  border: '1px solid #ddd',
  borderRadius: 4,
  fontSize: 13,
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
};
