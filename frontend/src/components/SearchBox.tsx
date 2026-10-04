import { InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

/** App-bar search field; submitting opens the search page. */
export function SearchBox() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const urlQuery = location.pathname === '/search' ? (params.get('q') ?? '') : '';
  const [value, setValue] = useState(urlQuery);

  useEffect(() => setValue(urlQuery), [urlQuery]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = value.trim();
    if (!q) return;
    const next = new URLSearchParams({ q });
    const scope = location.pathname === '/search' ? params.get('scope') : null;
    if (scope) next.set('scope', scope);
    navigate(`/search?${next}`);
  };

  return (
    <form role="search" onSubmit={submit}>
      <TextField
        size="small"
        placeholder="Search diary…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputProps={{ 'aria-label': 'Search diary', maxLength: 100 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ width: { xs: 160, sm: 300 } }}
      />
    </form>
  );
}
