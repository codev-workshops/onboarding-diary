import { Link } from 'react-router-dom';
import { ROLE_LABELS, type User } from '../../api/types';
import Badge from '../../components/Badge';
import EntryListShell from '../../components/EntryListShell';
import OptionSelect from '../../components/OptionSelect';
import { formatDate } from '../../dates';
import { useFilters } from '../../hooks/useFilters';
import { usePaged } from '../../hooks/usePaged';

const ACTIVE_OPTIONS = { true: 'Active', false: 'Deactivated' };

export default function UsersPage() {
  const filters = useFilters();
  const { data, loading, error } = usePaged<User>('/api/admin/users', filters.params);

  return (
    <EntryListShell
      title="Users"
      newPath="/admin/users/new"
      newLabel="New user"
      data={data}
      loading={loading}
      error={error}
      emptyText="No users match these filters."
      onPage={(page) => filters.setFilter('page', String(page))}
      filters={
        <>
          <label className="filter">
            <span>Search</span>
            <input
              type="search"
              placeholder="Name or email"
              value={filters.get('q')}
              onChange={(e) => filters.setFilter('q', e.target.value)}
            />
          </label>
          <label className="filter">
            <span>Role</span>
            <OptionSelect
              options={ROLE_LABELS}
              emptyLabel="All roles"
              value={filters.get('role')}
              onChange={(value) => filters.setFilter('role', value)}
            />
          </label>
          <label className="filter">
            <span>Status</span>
            <OptionSelect
              options={ACTIVE_OPTIONS}
              emptyLabel="Any"
              value={filters.get('active')}
              onChange={(value) => filters.setFilter('active', value)}
            />
          </label>
          <button type="button" className="link-button" onClick={filters.clear}>
            Clear
          </button>
        </>
      }
      renderItem={(user) => (
        <>
          <div className="entry-head">
            <Link to={`/admin/users/${user.id}`} className="entry-title">
              {user.name}
            </Link>
            <span className="muted">{user.email}</span>
          </div>
          <div className="badges">
            <Badge value={`role-${user.role}`} label={ROLE_LABELS[user.role]} />
            {!user.active && <Badge value="inactive" label="Deactivated" />}
            {user.department && <span className="tag">{user.department}</span>}
            {user.manager && <span className="tag">Manager: {user.manager.name}</span>}
            {user.startDate && <span className="muted">Starts {formatDate(user.startDate)}</span>}
          </div>
        </>
      )}
    />
  );
}
