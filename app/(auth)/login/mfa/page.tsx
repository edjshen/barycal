import MfaPrompt from '@/components/MfaPrompt';

export default function LoginMfaPage() {
  return (
    <main className="main">
      <h1>Two-factor</h1>
      <MfaPrompt />
    </main>
  );
}
