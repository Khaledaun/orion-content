"use client";

type Props = {
  hasAuth: boolean;
  hasSites?: boolean;
  demoMode?: boolean;
};

export default function SetupGate({ hasAuth, hasSites, demoMode }: Props) {
  if (demoMode) {
    return (
      <main className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-semibold mb-3">Demo Mode</h1>
        <p className="opacity-80 mb-6">
          We couldn’t reach the database right now. You can still explore a demo UI.
        </p>
        <a className="inline-block rounded-lg px-4 py-2 bg-black text-white" href="/login">Try Login</a>
      </main>
    );
  }
  if (!hasAuth) {
    return (
      <main className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-semibold mb-3">Sign in to continue</h1>
        <p className="opacity-80 mb-6">You need to authenticate to access the dashboard.</p>
        <a className="inline-block rounded-lg px-4 py-2 bg-black text-white" href="/login">Go to Login</a>
      </main>
    );
  }
  if (!hasSites) {
    return (
      <main className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-semibold mb-3">Finish setup</h1>
        <p className="opacity-80 mb-6">No sites found yet. Let’s create your first site.</p>
        <a className="inline-block rounded-lg px-4 py-2 bg-black text-white" href="/onboarding">Start Onboarding</a>
      </main>
    );
  }
  return null;
}
