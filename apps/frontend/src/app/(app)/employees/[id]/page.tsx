'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api, type EmployeeDetail, type EmployeeListItem, type EmploymentView, type WorkHistory, type WorkHistoryInput, type AddEmploymentInput, type UpdateEmploymentInput, type OrganizationView, type PositionMasterView, ApiError } from '@/lib/api';

const EMPLOYMENT_STATUS: Record<number, string> = { 1: '在籍中', 2: '休職中', 3: '退職' };
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

  // 上長設定
  const [supervisorEditingEmpId, setSupervisorEditingEmpId] = useState<number | null>(null);
  const [supervisorInput, setSupervisorInput] = useState('');
  const [supervisorSaving, setSupervisorSaving] = useState(false);
  const [supervisorError, setSupervisorError] = useState('');

  // 所属追加
  const [addingEmployment, setAddingEmployment] = useState(false);
  const [addEmpForm, setAddEmpForm] = useState<AddEmploymentForm>(EMPTY_ADD_EMP_FORM);
  const [addEmpError, setAddEmpError] = useState('');
  const [addEmpSaving, setAddEmpSaving] = useState(false);

  // 所属編集
  const [editingEmpId, setEditingEmpId] = useState<number | null>(null);
  const [editEmpForm, setEditEmpForm] = useState<EditEmploymentForm>(EMPTY_EDIT_EMP_FORM);
  const [editEmpError, setEditEmpError] = useState('');
  const [editEmpSaving, setEditEmpSaving] = useState(false);

  // 組織一覧（所属追加フォーム用）
  const [organizations, setOrganizations] = useState<OrganizationView[] | null>(null);

  // 役職マスタ一覧（所属追加フォーム用）
  const [positionMasters, setPositionMasters] = useState<PositionMasterView[] | null>(null);

  // 社員一覧（マネージャー候補選択用）
  const [allEmployees, setAllEmployees] = useState<EmployeeListItem[] | null>(null);

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
    setSupervisorEditingEmpId(null);
    setAddingEmployment(false);
    setAddEmpForm(EMPTY_ADD_EMP_FORM);
    setAddEmpError('');
    setEditingEmpId(null);
    setEditEmpForm(EMPTY_EDIT_EMP_FORM);
    setEditEmpError('');
    setOrganizations(null);
    setPositionMasters(null);
    setAllEmployees(null);

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
    api.organizations.list().then(setOrganizations).catch(() => setOrganizations([]));
    api.positionMasters.list().then(setPositionMasters).catch(() => setPositionMasters([]));
    api.employees.list().then(setAllEmployees).catch(() => setAllEmployees([]));
  }, [authLoading, id]);

  const isSelf = !!me && me.employeeId === id;
  const canAssistEdit = !isSelf && !!me && me.roleTypes.some((r) => ASSIST_EDIT_ROLES.has(r));
  // isSelf でもプロフィール/写真/所属追加・編集は許可（上長設定は canAssistEdit のみ）
  const canEditSelf = canAssistEdit || isSelf;

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

  function startSupervisorEdit(emp: EmploymentView) {
    setSupervisorEditingEmpId(emp.id);
    setSupervisorInput(emp.supervisorEmployeeId != null ? String(emp.supervisorEmployeeId) : '');
    setSupervisorError('');
  }

  async function handleSaveSupervisor(e: React.FormEvent, empId: number) {
    e.preventDefault();
    setSupervisorSaving(true);
    setSupervisorError('');
    const supervisorEmployeeId = supervisorInput ? Number(supervisorInput) : null;
    try {
      await api.employees.setSupervisorEmployee(id, empId, supervisorEmployeeId);
      setEmployee((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          employments: prev.employments.map((e) =>
            e.id === empId ? { ...e, supervisorEmployeeId } : e,
          ),
        };
      });
      setSupervisorEditingEmpId(null);
    } catch (err) {
      setSupervisorError(err instanceof ApiError && err.status === 403 ? '編集権限がありません' : String(err));
    } finally {
      setSupervisorSaving(false);
    }
  }

  async function handleAddEmployment(e: React.FormEvent) {
    e.preventDefault();
    setAddEmpSaving(true);
    setAddEmpError('');
    try {
      const input: AddEmploymentInput = {
        organizationId: Number(addEmpForm.organizationId),
        employmentType: Number(addEmpForm.employmentType),
        startDate: addEmpForm.startDate,
        positionMasterId: addEmpForm.positionMasterId ? Number(addEmpForm.positionMasterId) : undefined,
        supervisorEmployeeId: addEmpForm.supervisorEmployeeId ? Number(addEmpForm.supervisorEmployeeId) : undefined,
        status: addEmpForm.status ? Number(addEmpForm.status) : undefined,
      };
      const emp = await api.employees.addEmployment(id, input);
      setEmployee((prev) => prev ? { ...prev, employments: [...prev.employments, emp] } : prev);
      setAddingEmployment(false);
      setAddEmpForm(EMPTY_ADD_EMP_FORM);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const msg = err.message;
        setAddEmpError(
          msg.includes('overlapping period')
            ? 'この組織への所属が既に登録されています（期間重複）。'
            : `競合エラー: ${msg}`,
        );
      } else {
        setAddEmpError(err instanceof ApiError && err.status === 403 ? '追加権限がありません' : String(err));
      }
    } finally {
      setAddEmpSaving(false);
    }
  }

  async function handleEditEmployment(e: React.FormEvent) {
    e.preventDefault();
    if (editingEmpId == null) return;
    setEditEmpSaving(true);
    setEditEmpError('');
    try {
      const input: UpdateEmploymentInput = {
        organizationId: editEmpForm.organizationId ? Number(editEmpForm.organizationId) : undefined,
        employmentType: editEmpForm.employmentType ? Number(editEmpForm.employmentType) : undefined,
        positionMasterId: editEmpForm.positionMasterId !== '' ? Number(editEmpForm.positionMasterId) : null,
        startDate: editEmpForm.startDate || undefined,
      };
      const updated = await api.employees.updateEmployment(id, editingEmpId, input);
      setEmployee((prev) => prev ? { ...prev, employments: prev.employments.map((emp) => emp.id === editingEmpId ? updated : emp) } : prev);
      setEditingEmpId(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const msg = err.message;
        setEditEmpError(
          msg.includes('overlapping period')
            ? 'この組織への所属が既に登録されています（期間重複）。'
            : `競合エラー: ${msg}`,
        );
      } else {
        setEditEmpError(err instanceof ApiError && err.status === 403 ? '編集権限がありません' : String(err));
      }
    } finally {
      setEditEmpSaving(false);
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

          <dt style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>
            表示名
            <span style={{ fontWeight: 400, fontSize: 11, color: '#aaa', marginLeft: 6 }}>
              読み仮名・英語名など、組織図や一覧に表示される名前
            </span>
          </dt>
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

      {canEditSelf && (
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#555' }}>所属情報</h2>
          {canEditSelf && !addingEmployment && (
            <button
              className="btn-secondary"
              style={{ fontSize: 12 }}
              onClick={() => { setAddingEmployment(true); setAddEmpForm(EMPTY_ADD_EMP_FORM); setAddEmpError(''); }}
            >
              所属を追加
            </button>
          )}
        </div>
        {canEditSelf && addingEmployment && (
          <div style={{ marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px', color: '#555' }}>所属を新規追加</p>
            <EmploymentAddForm
              form={addEmpForm}
              onChange={setAddEmpForm}
              onSubmit={handleAddEmployment}
              onCancel={() => { setAddingEmployment(false); setAddEmpError(''); }}
              error={addEmpError}
              saving={addEmpSaving}
              organizations={organizations}
              positionMasters={positionMasters}
              allEmployees={allEmployees !== null ? allEmployees.filter((e) => e.id !== id) : null}
            />
          </div>
        )}
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
                  <th>上長</th>
                  <th>開始日</th>
                  <th>終了日</th>
                  <th>状態</th>
                  {canEditSelf && <th>操作</th>}
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
                      <td>{emp.supervisorEmployeeId != null ? `社員ID: ${emp.supervisorEmployeeId}` : '—'}</td>
                      <td>{emp.startDate ? new Date(emp.startDate).toLocaleDateString('ja-JP') : '—'}</td>
                      <td>{emp.endDate ? new Date(emp.endDate).toLocaleDateString('ja-JP') : '—'}</td>
                      <td>
                        <span className={emp.status === 1 ? 'badge badge-green' : 'badge badge-gray'}>
                          {EMPLOYMENT_STATUS[emp.status] ?? emp.status}
                        </span>
                      </td>
                      {canEditSelf && (
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            className="btn-secondary"
                            style={{ fontSize: 11, marginRight: 4 }}
                            onClick={() => {
                              if (editingEmpId === emp.id) {
                                setEditingEmpId(null);
                              } else {
                                setEditingEmpId(emp.id);
                                setEditEmpForm({
                                  organizationId: String(emp.organizationId),
                                  employmentType: emp.employmentType !== undefined ? String(emp.employmentType) : '1',
                                  startDate: emp.startDate ? emp.startDate.substring(0, 10) : '',
                                  positionMasterId: '',
                                });
                                setEditEmpError('');
                                setSupervisorEditingEmpId(null);
                              }
                            }}
                          >
                            {editingEmpId === emp.id ? 'キャンセル' : '編集'}
                          </button>
                          {canAssistEdit && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: 11 }}
                              onClick={() => { supervisorEditingEmpId === emp.id ? setSupervisorEditingEmpId(null) : startSupervisorEdit(emp); setEditingEmpId(null); }}
                            >
                              {supervisorEditingEmpId === emp.id ? 'キャンセル' : '上長設定'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                    {canEditSelf && editingEmpId === emp.id && (
                      <tr>
                        <td colSpan={10} style={{ background: '#f8f9ff', padding: 12 }}>
                          <EmploymentEditForm
                            form={editEmpForm}
                            onChange={setEditEmpForm}
                            onSubmit={handleEditEmployment}
                            onCancel={() => { setEditingEmpId(null); setEditEmpError(''); }}
                            error={editEmpError}
                            saving={editEmpSaving}
                            organizations={organizations}
                            positionMasters={positionMasters}
                          />
                        </td>
                      </tr>
                    )}
                    {canAssistEdit && supervisorEditingEmpId === emp.id && (
                      <tr>
                        <td colSpan={10} style={{ background: '#f8f9ff', padding: 12 }}>
                          <form onSubmit={(e) => { void handleSaveSupervisor(e, emp.id); }} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <label style={{ ...labelStyle, flex: '0 0 auto' }}>
                              上長（空欄で解除）
                              {allEmployees === null ? (
                                <span style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>読み込み中...</span>
                              ) : (
                                <select
                                  style={{ ...inputStyle, width: 260 }}
                                  value={supervisorInput}
                                  onChange={(e) => setSupervisorInput(e.target.value)}
                                >
                                  <option value="">未設定（解除）</option>
                                  {allEmployees.filter((e) => e.id !== id).map((e) => (
                                    <option key={e.id} value={String(e.id)}>
                                      {`${e.displayName ?? e.fullName} (ID: ${e.id})`}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </label>
                            {supervisorError && <p className="error-msg" style={{ margin: 0, alignSelf: 'center' }}>{supervisorError}</p>}
                            <button type="submit" className="btn-primary" disabled={supervisorSaving} style={{ fontSize: 12, marginBottom: 1 }}>
                              {supervisorSaving ? '設定中...' : '設定'}
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

// ─── 所属編集フォーム ──────────────────────────────────────────

type EditEmploymentForm = {
  organizationId: string;
  employmentType: string;
  startDate: string;
  positionMasterId: string;
};

const EMPTY_EDIT_EMP_FORM: EditEmploymentForm = {
  organizationId: '',
  employmentType: '1',
  startDate: '',
  positionMasterId: '',
};

function EmploymentEditForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  error,
  saving,
  organizations,
  positionMasters,
}: {
  form: EditEmploymentForm;
  onChange: (f: EditEmploymentForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  error: string;
  saving: boolean;
  organizations: OrganizationView[] | null;
  positionMasters: PositionMasterView[] | null;
}) {
  function field(key: keyof EditEmploymentForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...form, [key]: e.target.value });
  }

  function orgLabel(org: OrganizationView): string {
    return org.organizationCode
      ? `${org.organizationName} [Code: ${org.organizationCode}]`
      : org.organizationName;
  }

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <label style={labelStyle}>
          組織
          {organizations === null ? (
            <span style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>読み込み中...</span>
          ) : (
            <select style={inputStyle} value={form.organizationId} onChange={field('organizationId')}>
              <option value="">未変更</option>
              {organizations.map((org) => (
                <option key={org.id} value={String(org.id)}>
                  {orgLabel(org)}
                </option>
              ))}
            </select>
          )}
        </label>
        <label style={labelStyle}>
          雇用区分
          <select style={inputStyle} value={form.employmentType} onChange={field('employmentType')}>
            <option value="1">正社員</option>
            <option value="2">契約社員</option>
            <option value="3">パートタイム</option>
            <option value="4">派遣</option>
            <option value="5">業務委託</option>
          </select>
        </label>
        <label style={labelStyle}>
          開始日
          <input type="date" style={inputStyle} value={form.startDate} onChange={field('startDate')} />
        </label>
        <label style={labelStyle}>
          役職（任意）
          {positionMasters === null ? (
            <span style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>読み込み中...</span>
          ) : (
            <select style={inputStyle} value={form.positionMasterId} onChange={field('positionMasterId')}>
              <option value="">未変更</option>
              {positionMasters.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </label>
      </div>
      {error && <p className="error-msg" style={{ marginBottom: 8 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn-primary" disabled={saving} style={{ fontSize: 12 }}>
          {saving ? '更新中...' : '更新'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving} style={{ fontSize: 12 }}>
          キャンセル
        </button>
      </div>
    </form>
  );
}

// ─── 所属追加フォーム ──────────────────────────────────────────

type AddEmploymentForm = {
  organizationId: string;
  employmentType: string;
  startDate: string;
  positionMasterId: string;
  supervisorEmployeeId: string;
  status: string;
};

const EMPTY_ADD_EMP_FORM: AddEmploymentForm = {
  organizationId: '',
  employmentType: '1',
  startDate: '',
  positionMasterId: '',
  supervisorEmployeeId: '',
  status: '1',
};

function EmploymentAddForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  error,
  saving,
  organizations,
  positionMasters,
  allEmployees,
}: {
  form: AddEmploymentForm;
  onChange: (f: AddEmploymentForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  error: string;
  saving: boolean;
  organizations: OrganizationView[] | null;
  positionMasters: PositionMasterView[] | null;
  allEmployees: EmployeeListItem[] | null;
}) {
  function field(key: keyof AddEmploymentForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...form, [key]: e.target.value });
  }

  function orgLabel(org: OrganizationView): string {
    return org.organizationCode
      ? `${org.organizationName} [Code: ${org.organizationCode}]`
      : org.organizationName;
  }

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <label style={labelStyle}>
          組織 <span style={{ color: 'red' }}>*</span>
          {organizations === null ? (
            <span style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>読み込み中...</span>
          ) : organizations.length === 0 ? (
            <span style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>登録された組織がありません</span>
          ) : (
            <select
              style={inputStyle}
              value={form.organizationId}
              onChange={field('organizationId')}
              required
            >
              <option value="">選択してください</option>
              {organizations.map((org) => (
                <option key={org.id} value={String(org.id)}>
                  {orgLabel(org)}
                </option>
              ))}
            </select>
          )}
        </label>
        <label style={labelStyle}>
          雇用区分 <span style={{ color: 'red' }}>*</span>
          <select style={inputStyle} value={form.employmentType} onChange={field('employmentType')} required>
            <option value="1">正社員</option>
            <option value="2">契約社員</option>
            <option value="3">パートタイム</option>
            <option value="4">派遣</option>
            <option value="5">業務委託</option>
          </select>
        </label>
        <label style={labelStyle}>
          開始日 <span style={{ color: 'red' }}>*</span>
          <input
            type="date"
            style={inputStyle}
            value={form.startDate}
            onChange={field('startDate')}
            required
          />
        </label>
        <label style={labelStyle}>
          状態
          <select style={inputStyle} value={form.status} onChange={field('status')}>
            <option value="1">在籍中</option>
            <option value="2">休職中</option>
          </select>
        </label>
        <label style={labelStyle}>
          役職（任意）
          {positionMasters === null ? (
            <span style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>読み込み中...</span>
          ) : (
            <select
              style={inputStyle}
              value={form.positionMasterId}
              onChange={field('positionMasterId')}
            >
              <option value="">未設定</option>
              {positionMasters.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </label>
        <label style={labelStyle}>
          上長（任意）
          {allEmployees === null ? (
            <span style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>読み込み中...</span>
          ) : (
            <select
              style={inputStyle}
              value={form.supervisorEmployeeId}
              onChange={field('supervisorEmployeeId')}
            >
              <option value="">未設定</option>
              {allEmployees.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {`${e.displayName ?? e.fullName} (ID: ${e.id})`}
                </option>
              ))}
            </select>
          )}
        </label>
      </div>
      {error && <p className="error-msg" style={{ marginBottom: 8 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn-primary" disabled={saving} style={{ fontSize: 12 }}>
          {saving ? '追加中...' : '追加'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving} style={{ fontSize: 12 }}>
          キャンセル
        </button>
      </div>
    </form>
  );
}
