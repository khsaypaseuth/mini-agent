'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@mini-agent/types';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

interface StaffUser {
  id: string;
  name: string;
  email: string | null;
  role: string;
  staffServiceAssignments?: { serviceId: string }[];
}

const STAFF_ROLES = [
  UserRole.BACK_OFFICE_STAFF,
  UserRole.MAIN_OFFICE_STAFF,
  UserRole.DELIVERY_MAN,
  UserRole.MANAGER,
];

export default function StaffPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.BACK_OFFICE_STAFF as string,
  });

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get<StaffUser[]>('/admin/users')).data,
  });

  const createStaff = useMutation({
    mutationFn: async () => (await api.post('/admin/users', form)).data,
    onSuccess: () => {
      setForm({ name: '', email: '', password: '', role: UserRole.BACK_OFFICE_STAFF });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold">{t('admin.staff')}</h1>

      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">+ {t('admin.staff')}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createStaff.mutate();
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            placeholder="Password (min 8)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={createStaff.isPending}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 sm:col-span-2"
          >
            {t('common.save')}
          </button>
        </form>
        {createStaff.isError && <p className="mt-2 text-sm text-red-600">{t('common.error')}</p>}
      </section>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">{u.role.replace(/_/g, ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
