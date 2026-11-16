import { AuthLogo } from "@/components/auth/auth-logo";
import { UpdatePasswordForm } from "@/components/update-password-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6 md:p-10">
      <AuthLogo />
      <div className="w-full max-w-96">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
