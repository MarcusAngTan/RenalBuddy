import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { AuthFrame } from "../components/Shell";
import { Button, Disclaimer, ErrorText, Field, inputClass } from "../components/ui";
import type { TokenResponse } from "../types";

export function LoginPage() {
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const demoEmail = "ada.demo@example.com";
  const demoPassword = "password123";

  async function submitLogin(loginEmail: string, loginPassword: string) {
    setPending(true);
    setError(null);
    try {
      const session = await api<TokenResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      signIn(session);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthFrame>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await submitLogin(email, password);
        }}
      >
        <h1 className="text-3xl font-extrabold">Sign in</h1>
        <Field label="Email">
          <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password">
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button className="w-full" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
        <Button
          className="w-full"
          type="button"
          variant="quiet"
          disabled={pending}
          onClick={() => {
            setEmail(demoEmail);
            setPassword(demoPassword);
            void submitLogin(demoEmail, demoPassword);
          }}
        >
          Sign in as demo
        </Button>
      </form>
      <p className="mt-3 text-xs leading-relaxed text-ink/55">
        Demo account: {demoEmail} / {demoPassword}. After sign in, tap <strong>Demo data</strong> on Today to load a sample
        week, then open Visit.
      </p>
      <p className="mt-6 text-sm">
        New here?{" "}
        <Link className="font-extrabold text-teal" to="/register">
          Create an account
        </Link>
      </p>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const { user, signIn } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (user) return <Navigate to="/setup" replace />;

  return (
    <AuthFrame>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          try {
            const session = await api<TokenResponse>("/api/auth/register", {
              method: "POST",
              body: JSON.stringify({
                display_name: name,
                email,
                password,
                disclaimer_accepted: accepted,
              }),
            });
            signIn(session);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Could not create the account.");
          } finally {
            setPending(false);
          }
        }}
      >
        <h1 className="text-3xl font-extrabold">Create your log</h1>
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Email">
          <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password">
          <input
            className={inputClass}
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input
            className="mt-1"
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            required
          />
          <Disclaimer />
        </label>
        <ErrorText>{error}</ErrorText>
        <Button className="w-full" type="submit" disabled={pending || !accepted}>
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-sm">
        Already have an account?{" "}
        <Link className="font-extrabold text-teal" to="/login">
          Sign in
        </Link>
      </p>
    </AuthFrame>
  );
}
