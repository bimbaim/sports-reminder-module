import { LoginForm } from "@/components/login-form";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-background via-background/95 to-muted/20">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
