import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
          <NavLink to="/" className="font-bold text-lg text-primary-600 dark:text-primary-100">
            💸 Expense Tracker
          </NavLink>
          <nav className="ml-auto flex items-center gap-1 sm:gap-3 text-sm">
            {user && (
              <>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg ${isActive ? 'bg-primary-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/expenses"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg ${isActive ? 'bg-primary-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`
                  }
                >
                  Expenses
                </NavLink>
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg hidden sm:block ${isActive ? 'bg-primary-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`
                  }
                >
                  Settings
                </NavLink>
              </>
            )}
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {user ? (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-600 text-white text-sm"
              >
                Logout
              </button>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">{children}</main>
    </div>
  );
}
