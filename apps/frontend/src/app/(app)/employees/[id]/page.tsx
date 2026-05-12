'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api, type EmployeeDetail, type EmploymentView, type WorkHistory, type WorkHistoryInput, ApiError } from '@/lib/api';

const EMPLOYMENT_STATUS: Record<number, string> = { 1: '在籍', 2: '休職', 3: '退職' };
const EMPLOYMENT_TYPE: Record<number, string> = {
  1: '正社員',
  2: '契約社員',
  3: 'パートタイム',
  4: '派遣',
  5: '業務委託',
};

// roleType: 1=HR_ADMIN, 2=MANAGER
const ASSIST_EDIT_ROLES = new Set([1, 2]);

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

const EMPTY_FORM: FormState = {
  yearMonthFrom: '', yearMonthTo: '', isCurrent: false,
  workSummary: '', toolsUsed: '', roleName: '', teamSizeStr: '', projectCode: '',
};

export default function EmployeeDetailPage() {
  const { me, loading: authLoading } = useAuth();
  const params = useParams();
  const id = Number(params.id);
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [workHistories, setWorkHistories] = useState<WorkHistory[] | null>(null);
  const [whForbidden, setWhForbidden] = useState(false);
  const [whError, setWhError] = useState('');

  // WorkHistory 補助編集
  const [assistEditingId, setAssistEditingId] = useState<number | null>(null);
  const [assistEditForm, setAssistEditForm] = useState<FormState>(EMPTY_FORM);
  const [assistEditError, setAssistEditError] = useState('');
  const [assistEditSaving, setAssistEditSaving] = useState(false);

  // WorkHistory 補助新規作成
  const [assistCreating, setAssistCreating] = useState(false);
  const [assistCreateForm, setAssistCreateForm] = useState<FormState>(EMPTY_FORM);
  const [assistCreateError, setAssistCreateError] = useState('');
  const [assistCreateSaving, setAssistCreateSaving] = useState(false);

  // profileFreeText 補助編集
  const [profileText, setProfileText] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  // 写真アップロード
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  // マネージャー設定
  const [managerEditingEmpId, setManagerEditingEmpId] = useState<number | null>(null);
  const [managerInput, setManagerInput] = useState('');
  const [managerSaving, setManagerSaving] = useState(false);
  const [managerError, setManagerError] = useState('');

  useEffect(() => {
    if (authLoading || !id) return;

    setWorkHistories(null);
    setWhForbidden(false);
    setWhError('');
    setAssistEditingId(null);
    setAssistCreating(false);
    setAssistCreateForm(EMPTY_FORM);
    setAssistCreateError('');
    setProfileSaved(false);
    setManagerEditingEmpId(null);

    api.employees
      .get(id)
      .then((emp) => {
        setEmployee(emp);
        setProfileText(emp.profileFreeText ?? '');
      })
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
    api.workHistories
      .list(id)
      .then(setWorkHistories)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 403) {
          setWhForbidden(true);
        } else {
          setWhError('職歴の読み込みに失敗しました');
        }
      });
  }, [authLoading, id]);

  const isSelf = !!me && me.employeeId === id;
  const canAssistEdit = !isSelf && !!me && me.roleTypes.some((r) => ASSIST_EDIT_ROLES.has(r));

  async function handleAssistCreate(e: React.FormEvent) {
    e.preventDefault();
    setAssistCreateSaving(true);
    setAssistCreateError('');
    try {
      const created = await api.workHistories.create(id, toInput(assistCreateForm));
      setWorkHistories((prev) => [...(prev ?? []), created]);
      setAssistCreating(false);
      setAssistCreateForm(EMPTY_FORM);
    } catch (err) {
      setAssistCreateError(err instanceof ApiError && err.status === 403
        ? '作成権限がありません'
        : String(err));
    } finally {
      setAssistCreateSaving(false);
    }
  }

  async function handleAssistEdit(e: React.FormEvent) {
    e.preventDefault();
    if (assistEditingId == null) return;
    setAssistEditSaving(true);
    setAssistEditError('');
    try {
      const updated = await api.workHistories.update(assistEditingId, toInput(assistEditForm));
      setWorkHistories((prev) => prev?.map((r) => (r.id === assistEditingId ? updated : r)) ?? prev);
      setAssistEditingId(null);
    } catch (err) {
      setAssistEditError(err instanceof ApiError && err.status === 403
        ? '編集権限がありません'
        : String(err));
    } finally {
      setAssistEditSaving(false);
    }
  }

  async function handleAssistDelete(whId: number) {
    if (!window.confirm('この職歴を削除しますか？')) return;
    try {
      await api.workHistories.remove(whId);
      setWorkHistories((prev) => prev?.filter((r) => r.id !== whId) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError && err.status === 403 ? '削除権限がありません' : String(err));
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileSaved(false);
    try {
      await api.employees.assistUpdateProfile(id, { profileFreeText: profileText });
      setEmployee((prev) => prev ? { ...prev, profileFreeText: profileText } : prev);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err instanceof ApiError && err.status === 403 ? '編集権限がありません' : String(err));
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoError('');
    try {
      const { photoStorageKey } = await api.employees.uploadPhoto(id, file);
      setEmployee((prev) => prev ? { ...prev, photoStorageKey } : prev);
    } catch (err) {
      setPhotoError(err instanceof ApiError && err.status === 403 ? '編集権限がありません' : String(err));
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  async function handlePhotoDelete() {
    if (!window.confirm('プロフィール写真を削除しますか？')) return;
    setPhotoError('');
    try {
      await api.employees.deletePhoto(id);
      setEmployee((prev) => prev ? { ...prev, photoStorageKey: null } : prev);
    } catch (err) {
      setPhotoError(err instanceof ApiError && err.status === 403 ? '削除権限がありません' : String(err));
    }
  }

  function startManagerEdit(emp: EmploymentView) {
    setManagerEditingEmpId(emp.id);
    setManagerInput(emp.managerEmployeeId != null ? String(emp.managerEmployeeId) : '');
    setManagerError('');
  }

  async function handleSaveManager(e: React.FormEvent, empId: number) {
    e.preventDefault();
    setManagerSaving(true);
    setManagerError('');
    const managerEmployeeId = managerInput ? Number(managerInput) : null;
    try {
      await api.employees.setManagerEmployee(id, empId, managerEmployeeId);
      setEmployee((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          employments: prev.employments.map((e) =>
            e.id === empId ? { ...e, managerEmployeeId } : e,
          ),
        };
      });
      setManagerEditingEmpId(null);
    } catch (err) {
      setManagerError(err instanceof ApiError && err.status === 403 ? '編集権限がありません' : String(err));
    } finally {
      setManagerSaving(false);
    }
  }

  if (authLoading || loading) return <p>読み込み中...</p>;
  if (error) return <p className="error-msg">{error}</p>;
  if (!employee) return null;

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link href="/employees">← 社員一覧へ戻る</Link>
      </div>
      <h1 className="page-title">
        {employee.fullName}
        {isSelf && <span style={{ fontSize: 13, fontWeight: 400, color: '#888', marginLeft: 8 }}>（自分）</span>}
      </h1>

      <div className="card">
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#555' }}>基本情報</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 24px', margin: 0 }}>
          <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>社員 ID</dt>
          <dd style={{ margin: 0 }}>{employee.id}</dd>

          {employee.employeeNumber !== undefined && (
            <>
              <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>社員番号</dt>
              <dd style={{ margin: 0 }}>{employee.employeeNumber ?? '—'}</dd>
            </>
          )}

          <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>氏名</dt>
          <dd style={{ margin: 0 }}>{employee.fullName}</dd>

          <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>表示名</dt>
          <dd style={{ margin: 0 }}>{employee.displayName ?? '—'}</dd>

          <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>メール</dt>
          <dd style={{ margin: 0 }}>{employee.email ?? '—'}</dd>

          {employee.birthDate !== undefined && (
            <>
              <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>生年月日</dt>
              <dd style={{ margin: 0 }}>{employee.birthDate ?? '—'}</dd>
            </>
          )}

          {employee.profileFreeText && (
            <>
              <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>プロフィール</dt>
              <dd style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{employee.profileFreeText}</dd>
            </>
          )}
        </dl>
      </div>

      {canAssistEdit && (
        <div className="card" style={{ marginTop: 8, borderLeft: '3px solid #4f83cc' }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', color: '#4f83cc' }}>補助編集</h2>

          {/* プロフィールテキスト */}
          <form onSubmit={(e) => { void handleSaveProfile(e); }} style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              プロフィールテキスト
              <textarea
                style={{ ...inputStyle, minHeight: 120, resize: 'vertical', marginTop: 4 }}
                value={profileText}
                onChange={(e) => { setProfileText(e.target.value); setProfileSaved(false); }}
                maxLength={10000}
                placeholder={'スキルや経歴を自由に記入できます。Markdown 記法（# 見出し、**太字**、- リストなど）が使えます。'}
              />
            </label>
            <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0', textAlign: 'right' }}>
              {profileText.length} / 10000
            </p>
            {profileError && <p className="error-msg" style={{ marginTop: 4, marginBottom: 4 }}>{profileError}</p>}
            {profileSaved && <p style={{ color: '#4caf50', fontSize: 12, marginTop: 4, marginBottom: 4 }}>保存しました</p>}
            <button type="submit" className="btn-primary" disabled={profileSaving} style={{ fontSize: 12, marginTop: 6 }}>
              {profileSaving ? '保存中...' : 'プロフィールを保存'}
            </button>
          </form>

          {/* 写真 */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#555', margin: '0 0 6px' }}>プロフィール写真</p>
            {employee.photoStorageKey && (
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>
                現在の写真キー: {employee.photoStorageKey}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 12, cursor: 'pointer' }}>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={(e) => { void handlePhotoUpload(e); }}
                  disabled={photoUploading}
                />
                <span className="btn-secondary" style={{ fontSize: 12, display: 'inline-block', cursor: 'pointer' }}>
                  {photoUploading ? 'アップロード中...' : '写真をアップロード'}
                </span>
              </label>
              {employee.photoStorageKey && (
                <button
                  type="button"
                  className="btn-danger"
                  style={{ fontSize: 12 }}
                  onClick={() => { void handlePhotoDelete(); }}
                  disabled={photoUploading}
                >
                  写真を削除
                </button>
              )}
            </div>
            {photoError && <p className="error-msg" style={{ marginTop: 4 }}>{photoError}</p>}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 8 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#555' }}>所属情報</h2>
        {employee.employments.length === 0 ? (
          <p style={{ color: '#aaa', margin: 0 }}>所属なし</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>所属 ID</th>
                  <th>組織 ID</th>
                  <th>種別</th>
                  <th>役職</th>
                  <th>主所属</th>
                  <th>担当マネージャー</th>
                  <th>開始日</th>
                  <th>終了日</th>
                  <th>状態</th>
                  {canAssistEdit && <th>操作</th>}
                </tr>
              </thead>
              <tbody>
                {employee.employments.map((emp) => (
                  <Fragment key={emp.id}>
                    <tr>
                      <td>{emp.id}</td>
                      <td>{emp.organizationId}</td>
                      <td>{emp.employmentType !== undefined ? (EMPLOYMENT_TYPE[emp.employmentType] ?? emp.employmentType) : '—'}</td>
                      <td>{emp.positionName ?? '—'}</td>
                      <td>{emp.isPrimaryAssignment ? <span className="badge badge-green">主所属</span> : '—'}</td>
                      <td>{emp.managerEmployeeId != null ? `社員ID: ${emp.managerEmployeeId}` : '—'}</td>
                      <td>{emp.startDate ? new Date(emp.startDate).toLocaleDateString('ja-JP') : '—'}</td>
                      <td>{emp.endDate ? new Date(emp.endDate).toLocaleDateString('ja-JP') : '—'}</td>
                      <td>
                        <span className={emp.status === 1 ? 'badge badge-green' : 'badge badge-gray'}>
                          {EMPLOYMENT_STATUS[emp.status] ?? emp.status}
                        </span>
                      </td>
                      {canAssistEdit && (
                        <td>
                          <button
                            className="btn-secondary"
                            style={{ fontSize: 11 }}
                            onClick={() => { managerEditingEmpId === emp.id ? setManagerEditingEmpId(null) : startManagerEdit(emp); }}
                          >
                            {managerEditingEmpId === emp.id ? 'キャンセル' : 'マネージャー設定'}
                          </button>
                        </td>
                      )}
                    </tr>
                    {canAssistEdit && managerEditingEmpId === emp.id && (
                      <tr>
                        <td colSpan={10} style={{ background: '#f8f9ff', padding: 12 }}>
                          <form onSubmit={(e) => { void handleSaveManager(e, emp.id); }} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <label style={{ ...labelStyle, flex: '0 0 auto' }}>
                              マネージャー社員ID（空欄で解除）
                              <input
                                type="number"
                                min={1}
                                style={{ ...inputStyle, width: 140 }}
                                value={managerInput}
                                onChange={(e) => setManagerInput(e.target.value)}
                                placeholder="社員ID"
                              />
                            </label>
                            {managerError && <p className="error-msg" style={{ margin: 0, alignSelf: 'center' }}>{managerError}</p>}
                            <button type="submit" className="btn-primary" disabled={managerSaving} style={{ fontSize: 12, marginBottom: 1 }}>
                              {managerSaving ? '設定中...' : '設定'}
                            </button>
                          </form>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!whForbidden && (
        <div className="card" style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#555' }}>職歴</h2>
            {isSelf && (
              <Link href="/work-histories" style={{ fontSize: 12 }}>
                自分の職歴を管理する →
              </Link>
            )}
            {canAssistEdit && !assistCreating && (
              <button
                className="btn-secondary"
                style={{ fontSize: 12 }}
                onClick={() => { setAssistCreating(true); setAssistCreateForm(EMPTY_FORM); setAssistCreateError(''); }}
              >
                新規追加
              </button>
            )}
          </div>
          {canAssistEdit && assistCreating && (
            <div style={{ marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px', color: '#555' }}>職歴を新規追加</p>
              <AssistWorkHistoryForm
                form={assistCreateForm}
                onChange={setAssistCreateForm}
                onSubmit={handleAssistCreate}
                onCancel={() => { setAssistCreating(false); setAssistCreateError(''); }}
                error={assistCreateError}
                saving={assistCreateSaving}
                submitLabel="追加"
              />
            </div>
          )}
          {whError ? (
            <p className="error-msg" style={{ margin: 0 }}>{whError}</p>
          ) : workHistories === null ? (
            <p style={{ color: '#aaa', margin: 0 }}>読み込み中...</p>
          ) : workHistories.length === 0 ? (
            <p style={{ color: '#aaa', margin: 0 }}>
              {isSelf ? '職歴が登録されていません。「自分の職歴を管理する」から追加できます。' : '職歴がありません'}
            </p>
          ) : (
            workHistories.map((wh) =>
              canAssistEdit && assistEditingId === wh.id ? (
                <div key={wh.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 16, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px', color: '#555' }}>職歴を編集</p>
                  <AssistWorkHistoryForm
                    form={assistEditForm}
                    onChange={setAssistEditForm}
                    onSubmit={handleAssistEdit}
                    onCancel={() => setAssistEditingId(null)}
                    error={assistEditError}
                    saving={assistEditSaving}
                  />
                </div>
              ) : (
                <WorkHistoryCard
                  key={wh.id}
                  wh={wh}
                  showActions={canAssistEdit}
                  onEdit={() => { setAssistEditingId(wh.id); setAssistEditForm(toFormState(wh)); setAssistEditError(''); }}
                  onDelete={() => { void handleAssistDelete(wh.id); }}
                />
              )
            )
          )}
        </div>
      )}
    </>
  );
}

function WorkHistoryCard({
  wh,
  showActions,
  onEdit,
  onDelete,
}: {
  wh: WorkHistory;
  showActions: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const period = wh.isCurrent
    ? `${wh.yearMonthFrom} 〜 現在`
    : wh.yearMonthTo
    ? `${wh.yearMonthFrom} 〜 ${wh.yearMonthTo}`
    : wh.yearMonthFrom;

  return (
    <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 12, marginBottom: 12 }}>
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
        {showActions && (
          <div style={{ display: 'flex', gap: 8, marginLeft: 16, flexShrink: 0 }}>
            <button className="btn-secondary" onClick={onEdit} style={{ fontSize: 12 }}>編集</button>
            <button className="btn-danger" onClick={onDelete} style={{ fontSize: 12 }}>削除</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AssistWorkHistoryForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  error,
  saving,
  submitLabel = '保存',
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  error: string;
  saving: boolean;
  submitLabel?: string;
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
            value={form.yearMonthTo as string}
            onChange={field('yearMonthTo')}
            placeholder="例: 2024-03"
            pattern="\d{4}-(0[1-9]|1[0-2])"
            disabled={form.isCurrent}
          />
        </label>
      </div>
      <label style={{ ...labelStyle, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={form.isCurrent}
          onChange={(e) => onChange({ ...form, isCurrent: e.target.checked, yearMonthTo: e.target.checked ? '' : form.yearMonthTo as string })}
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
          <input style={inputStyle} value={form.roleName as string} onChange={field('roleName')} />
        </label>
        <label style={labelStyle}>
          使用技術・ツール
          <input style={inputStyle} value={form.toolsUsed as string} onChange={field('toolsUsed')} />
        </label>
        <label style={labelStyle}>
          チーム規模（名）
          <input style={inputStyle} type="number" min={1} value={form.teamSizeStr} onChange={field('teamSizeStr')} />
        </label>
        <label style={labelStyle}>
          案件コード
          <input style={inputStyle} value={form.projectCode as string} onChange={field('projectCode')} />
        </label>
      </div>
      {error && <p className="error-msg" style={{ marginBottom: 8 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn-primary" disabled={saving} style={{ fontSize: 12 }}>
          {saving ? `${submitLabel}中...` : submitLabel}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving} style={{ fontSize: 12 }}>
          キャンセル
        </button>
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#555',
};
const inputStyle: React.CSSProperties = {
  padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4,
  fontSize: 13, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
};
