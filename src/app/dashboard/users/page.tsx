'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Search,
  Loader2,
  KeyRound,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Trash2,
  Pencil,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  displayEmail: string;
  role: string;
  registerNumber: string | null;
}

interface PasswordResetRequest {
  id: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string; role: string };
}

export default function ManageUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRegisterNumber, setNewRegisterNumber] = useState('');
  const [newRole, setNewRole] = useState('STUDENT');
  const [creating, setCreating] = useState(false);

  // Active tab
  const [tab, setTab] = useState<'users' | 'resets'>('users');

  // Edit user dialog
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({ name: '', registerNumber: '' });
  const [saving, setSaving] = useState(false);

  // Sorting
  type SortKey = 'name' | 'registerNumber' | 'role';
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="inline h-3 w-3 ml-1 text-muted-foreground" />;
    return sortDir === 'asc'
      ? <ChevronUp className="inline h-3 w-3 ml-1" />
      : <ChevronDown className="inline h-3 w-3 ml-1" />;
  }

  const sortedUsers = [...users].sort((a, b) => {
    const aVal = (a[sortKey] ?? '').toString().toLowerCase();
    const bVal = (b[sortKey] ?? '').toString().toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchUsers();
    fetchResetRequests();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      params.set('limit', '100');

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      
      console.log('Fetch users response:', { status: res.status, data });
      
      if (res.ok && Array.isArray(data.users)) {
        // Map to ensure we have the correct fields
        const mappedUsers = data.users.map((u: any) => {
          const regNo = u.registerNumber || null;
          // Derive display email: for students with regNo, show regno@psgtech.ac.in
          const displayEmail = regNo
            ? `${regNo.toLowerCase()}@psgtech.ac.in`
            : u.email;
          return {
            id: u.id,
            name: u.name || null,
            email: u.email,
            displayEmail,
            role: u.role,
            registerNumber: regNo,
          };
        });
        setUsers(mappedUsers);
        console.log('Users set:', mappedUsers.length);
      } else {
        console.error('API error:', data.error);
        setUsers([]);
        toast.error('Failed to fetch users');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  async function fetchResetRequests() {
    try {
      const res = await fetch('/api/admin/password-resets?status=PENDING');
      if (res.ok) {
        const data = await res.json();
        setResetRequests(data.requests);
      }
    } catch {
      // Silently fail
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (newRole === 'STUDENT' && !newRegisterNumber) {
      toast.error('Register number is required for students');
      return;
    }
    if (newRole !== 'STUDENT' && !newEmail) {
      toast.error('Email is required for admin/instructor');
      return;
    }
    setCreating(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newRole !== 'STUDENT' ? newEmail : undefined,
          name: newName,
          role: newRole,
          registerNumber: newRegisterNumber || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to create user');
        return;
      }

      const displayId = newRole === 'STUDENT' ? newRegisterNumber : newEmail;
      toast.success(`User ${displayId} created with default password`);
      setNewEmail('');
      setNewName('');
      setNewRegisterNumber('');
      setNewRole('STUDENT');
      setShowCreateForm(false);
      fetchUsers();
    } catch {
      toast.error('Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  async function handleResetAction(requestId: string, action: 'APPROVED' | 'REJECTED') {
    try {
      const res = await fetch('/api/admin/password-resets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to process request');
        return;
      }

      toast.success(data.message);
      fetchResetRequests();
    } catch {
      toast.error('Failed to process request');
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to delete user');
        return;
      }

      toast.success('User deleted successfully');
      fetchUsers();
    } catch {
      toast.error('Failed to delete user');
    }
  }

  function openEditDialog(u: UserData) {
    setEditingUser(u);
    setEditForm({
      name: u.name || '',
      registerNumber: u.registerNumber || '',
    });
  }

  async function handleEditUser() {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          name: editForm.name || null,
          registerNumber: editForm.registerNumber || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to update user');
        return;
      }

      toast.success('User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch {
      toast.error('Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });

      if (!res.ok) {
        toast.error('Failed to update role');
        return;
      }

      toast.success('Role updated');
      fetchUsers();
    } catch {
      toast.error('Failed to update role');
    }
  }

  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter]);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" /> Manage Users
          </h1>
          <p className="text-muted-foreground mt-1">
            Create users, manage roles, and handle password resets
          </p>
        </div>
        <div className="flex items-center gap-2">
          {resetRequests.length > 0 && (
            <Button
              variant={tab === 'resets' ? 'arena' : 'outline'}
              onClick={() => setTab('resets')}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Reset Requests
              <Badge variant="warning" className="ml-2">
                {resetRequests.length}
              </Badge>
            </Button>
          )}
          <Button
            variant={tab === 'users' ? 'arena' : 'outline'}
            onClick={() => setTab('users')}
          >
            <Users className="mr-2 h-4 w-4" /> Users
          </Button>
          <Button variant="arena" onClick={() => setShowCreateForm(!showCreateForm)}>
            <UserPlus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">Create New User</CardTitle>
            <CardDescription>
              Default passwords — Student: <code className="font-bold">register number</code>,
              Admin: <code className="font-bold">admin@123</code>,
              Instructor: <code className="font-bold">instruct@123</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2 w-[150px]">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-1 min-w-[160px]">
                <Label htmlFor="newRegNo">Register No. {newRole === 'STUDENT' ? '*' : ''}</Label>
                <Input
                  id="newRegNo"
                  type="text"
                  placeholder="e.g. 25MX101"
                  value={newRegisterNumber}
                  onChange={(e) => setNewRegisterNumber(e.target.value.toUpperCase())}
                  required={newRole === 'STUDENT'}
                />
              </div>
              {newRole !== 'STUDENT' && (
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <Label htmlFor="newEmail">Email *</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    placeholder="user@college.edu"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-2 flex-1 min-w-[200px]">
                <Label htmlFor="newName">Name</Label>
                <Input
                  id="newName"
                  type="text"
                  placeholder="Full Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <Button type="submit" variant="arena" disabled={creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Create
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Password Reset Requests */}
      {tab === 'resets' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Pending Password Reset Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resetRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No pending password reset requests
              </p>
            ) : (
              <div className="space-y-3">
                {resetRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{req.user.name || req.user.email}</p>
                      <p className="text-sm text-muted-foreground">{req.user.email}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(req.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleResetAction(req.id, 'APPROVED')}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleResetAction(req.id, 'REJECTED')}
                      >
                        <XCircle className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      {tab === 'users' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Users</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchUsers}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-3 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email or register no..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                  <SelectItem value="STUDENT">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No users found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th
                        className="pb-3 font-medium cursor-pointer select-none hover:text-primary"
                        onClick={() => toggleSort('name')}
                      >
                        Name <SortIcon col="name" />
                      </th>
                      <th
                        className="pb-3 font-medium cursor-pointer select-none hover:text-primary"
                        onClick={() => toggleSort('registerNumber')}
                      >
                        Reg. No. <SortIcon col="registerNumber" />
                      </th>
                      <th className="pb-3 font-medium">Email</th>
                      <th
                        className="pb-3 font-medium cursor-pointer select-none hover:text-primary"
                        onClick={() => toggleSort('role')}
                      >
                        Role <SortIcon col="role" />
                      </th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((u) => (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="py-3 font-medium">{u.name || '—'}</td>
                        <td className="py-3 text-sm font-mono text-muted-foreground">{u.registerNumber || '—'}</td>
                        <td className="py-3 text-sm text-muted-foreground">{u.displayEmail}</td>
                        <td className="py-3">
                          <Select
                            value={u.role}
                            onValueChange={(val) => handleRoleChange(u.id, val)}
                          >
                            <SelectTrigger className="w-[130px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                              <SelectItem value="STUDENT">Student</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                            onClick={() => openEditDialog(u)}
                            title="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={u.id === user?.id}
                            title={u.id === user?.id ? 'Cannot delete yourself' : 'Delete user'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editingUser?.displayEmail || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRegNo">Register Number</Label>
              <Input
                id="editRegNo"
                value={editForm.registerNumber}
                onChange={(e) => setEditForm((f) => ({ ...f, registerNumber: e.target.value.toUpperCase() }))}
                placeholder="e.g. 25MX101"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button variant="arena" onClick={handleEditUser} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
