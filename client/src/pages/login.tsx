import { Button } from '@/components/ui/button';

export default function LoginPage(){
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Sign in</h2>
      <div className="flex gap-4">
        <a href="/auth/github"><Button>Sign in with GitHub</Button></a>
        <a href="/auth/google"><Button>Sign in with Google</Button></a>
      </div>
      <p className="text-sm text-muted-foreground mt-4">After signing in you'll be redirected back to the app. Make sure to configure OAuth apps and set environment variables: <code>GITHUB_CLIENT_ID</code>, <code>GITHUB_CLIENT_SECRET</code>, <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, and <code>COOKIE_SECRET</code>.</p>
    </div>
  );
}
