import { LoginForm } from "@/components/login-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm space-y-4">
        <OAuthButtons />
        <LoginForm />
      </div>
    </div>
  );
}
