import { AuthLogo } from "@/components/auth/auth-logo";
import { SignUpForm } from "@/components/sign-up-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6 md:p-10">
      <AuthLogo />
      <div className="w-full max-w-96">
        <SignUpForm oauth={<OAuthButtons next="/auth/consent?next=/explore" />} />
      </div>
    </div>
  );
}
