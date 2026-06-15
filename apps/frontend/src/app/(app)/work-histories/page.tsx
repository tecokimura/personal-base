'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api, type WorkHistory, type WorkHistoryInput } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

  if (authLoading || loading) return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  if (pageError) return <p className="text-sm text-destructive">{pageError}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">職歴管理</h1>
        {!showAddForm && (
          <Button size="sm" onClick={() => { setShowAddForm(true); setAddError(''); }}>
            ＋ 職歴を追加
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">新規職歴</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkHistoryForm
              form={addForm}
              onChange={setAddForm}
              onSubmit={handleAdd}
              onCancel={() => { setShowAddForm(false); setAddError(''); }}
              error={addError}
              saving={addSaving}
              submitLabel="追加"
            />
          </CardContent>
        </Card>
      )}

      {records.length === 0 ? (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">職歴がありません。「職歴を追加」から登録してください。</p>
          </CardContent>
        </Card>
      ) : (
        records.map((wh) =>
          editingId === wh.id ? (
            <Card key={wh.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">職歴を編集</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkHistoryForm
                  form={editForm}
                  onChange={setEditForm}
                  onSubmit={handleEdit}
                  onCancel={() => setEditingId(null)}
                  error={editError}
                  saving={editSaving}
                  submitLabel="保存"
                />
              </CardContent>
            </Card>
          ) : (
            <WorkHistoryCard
              key={wh.id}
              wh={wh}
              onEdit={() => startEdit(wh)}
              onDelete={() => { void handleDelete(wh.id); }}
            />
          )
        )
      )}
    </div>
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
    <Card>
      <CardContent className="pt-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-semibold mb-1">{period}</div>
            {wh.roleName && (
              <div className="text-sm text-muted-foreground mb-1">{wh.roleName}</div>
            )}
            <div className="text-sm whitespace-pre-wrap mb-2">{wh.workSummary}</div>
            <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
              {wh.toolsUsed && <span>使用技術: {wh.toolsUsed}</span>}
              {wh.teamSize != null && <span>チーム規模: {wh.teamSize}名</span>}
              {wh.projectCode && <span>案件コード: {wh.projectCode}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={onEdit}>編集</Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>削除</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const labelCls = "flex flex-col gap-1 text-xs font-semibold text-muted-foreground";
const inputCls = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

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
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          開始年月 (YYYY-MM) <span className="text-destructive">*</span>
          <input
            className={inputCls}
            value={form.yearMonthFrom}
            onChange={field('yearMonthFrom')}
            placeholder="例: 2023-04"
            pattern="\d{4}-(0[1-9]|1[0-2])"
            required
          />
        </label>
        <label className={labelCls}>
          終了年月 (YYYY-MM)
          <input
            className={inputCls}
            value={form.yearMonthTo}
            onChange={field('yearMonthTo')}
            placeholder="例: 2024-03"
            pattern="\d{4}-(0[1-9]|1[0-2])"
            disabled={form.isCurrent}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={form.isCurrent}
          onChange={(e) => onChange({ ...form, isCurrent: e.target.checked, yearMonthTo: e.target.checked ? '' : form.yearMonthTo })}
        />
        現在も継続中
      </label>

      <label className={labelCls}>
        業務内容 <span className="text-destructive">*</span>
        <textarea
          className={inputCls}
          value={form.workSummary}
          onChange={field('workSummary')}
          required
          style={{ minHeight: 80, resize: 'vertical' }}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          役割・職名
          <input className={inputCls} value={form.roleName} onChange={field('roleName')} />
        </label>
        <label className={labelCls}>
          使用技術・ツール
          <input className={inputCls} value={form.toolsUsed} onChange={field('toolsUsed')} />
        </label>
        <label className={labelCls}>
          チーム規模（名）
          <input
            className={inputCls}
            type="number"
            min={1}
            value={form.teamSizeStr}
            onChange={field('teamSizeStr')}
          />
        </label>
        <label className={labelCls}>
          案件コード
          <input className={inputCls} value={form.projectCode} onChange={field('projectCode')} />
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? '保存中...' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
