import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Dropdown } from '../components/Dropdown';
import { Input } from '../components/Input';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { User } from '../lib/types';

const NO_MANAGER = 'none';

export const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [startDate, setStartDate] = useState(user?.startDate ?? '');
  const [managerId, setManagerId] = useState(user?.managerId ? String(user.managerId) : NO_MANAGER);
  const [managers, setManagers] = useState<User[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ users: User[] }>('/users/managers')
      .then((payload) => setManagers(payload.users))
      .catch(() => setManagers([]));
  }, []);

  const save = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setError(undefined);
    try {
      await updateProfile({
        name,
        department,
        startDate,
        managerId: managerId === NO_MANAGER ? null : Number(managerId),
      });
      setStatus('Profile saved.');
    } catch (caught) {
      setStatus(null);
      setError(caught instanceof Error ? caught.message : 'Could not save your profile');
    }
  };

  return (
    <div className="stack stack--lg">
      <header className="page__header">
        <div>
          <h1>Profile</h1>
          <p className="muted">Keep your onboarding details up to date.</p>
        </div>
      </header>

      {status ? <p className="banner">{status}</p> : null}

      <Card title="Your details">
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <Input
            label="Email address"
            value={user?.email ?? ''}
            disabled
            hint="Contact an admin to change this."
          />
          <Input
            label="Full name"
            value={name}
            error={error}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            label="Department"
            placeholder="Engineering"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          />
          <Input
            label="Start date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Dropdown
            label="Manager"
            value={managerId}
            options={[
              { value: NO_MANAGER, label: 'No manager assigned' },
              ...managers
                .filter((manager) => manager.id !== user?.id)
                .map((manager) => ({ value: String(manager.id), label: manager.name })),
            ]}
            onChange={setManagerId}
          />
          <div className="actions">
            <Button type="submit">Save profile</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
