import { Link } from 'react-router-dom';
import { LogIn, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useDiscordAuth } from '../lib/discordAuth';
import { usePageTitle } from '../lib/usePageTitle';

export default function DiscordAccountPage() {
  const { user, ready, login, logout } = useDiscordAuth();
  usePageTitle('My Discord Account');
  return (
    <div className="pt-32 pb-16 animate-fade-in">
      <div className="max-w-lg mx-auto px-4">
        <div className="glass-card p-6 sm:p-8 text-center">
          {!ready ? (
            <p className="text-volcanic-400">Loading Discord account...</p>
          ) : !user ? (
            <>
              <UserRound className="w-12 h-12 text-ark-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-heading mb-3">Discord login</h1>
              <p className="text-volcanic-400 mb-6">Sign in securely with your Discord account.</p>
              <button className="btn-primary px-6 py-3" onClick={login}>
                <LogIn className="w-4 h-4" /> Log in with Discord
              </button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-volcanic-800 overflow-hidden flex items-center justify-center">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt="Discord avatar" className="w-full h-full object-cover" />
                  : <UserRound className="w-10 h-10 text-volcanic-400" />}
              </div>
              <h1 className="text-2xl font-bold text-heading mb-2">{user.global_name || user.username}</h1>
              <p className="text-sm text-volcanic-400 mb-2">@{user.username}</p>
              <p className="text-sm text-volcanic-400 mb-6">Discord ID: {user.id}</p>
              <p className="inline-flex items-center justify-center gap-2 text-emerald-400 text-sm mb-8">
                <ShieldCheck className="w-4 h-4" /> Discord account verified
              </p>
              <div>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-rose-300 hover:bg-rose-500/10 border border-volcanic-800/60" onClick={() => void logout()}>
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </>
          )}
          <p className="mt-7 text-xs text-volcanic-500">
            Discord login identifies your account on Shadow. Tip4Serv still handles payments and downloads.
          </p>
          <p className="mt-3 text-xs text-volcanic-500">
            Need to manage existing subscriptions?{' '}
            <Link to="/tip4serv-account?tab=subscriptions" className="text-ark-400 hover:underline">
              Open Tip4Serv subscription management
            </Link>
            {' '}(requires separate Tip4Serv sign-in).
          </p>
        </div>
      </div>
    </div>
  );
}
