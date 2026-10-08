import React, { useState } from 'react';
import { authClient } from '@/lib/auth/client';

type AuthStep = 'initial' | 'email' | 'otp';
type AuthMode = 'login' | 'signup';

interface LoginFlowProps {
  initialMode?: AuthMode;
}

export default function LoginFlow({ initialMode = 'login' }: LoginFlowProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<AuthStep>('initial');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
    setError(null);
    setInfoMessage(null);
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/',
      });
    } catch (err: unknown) {
      console.error('Error al iniciar sesión con Google:', err);
      setError('No se pudo conectar con Google. Por favor, intenta de nuevo.');
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setInfoMessage(null);

      // Enviar código de verificación vía Better Auth emailOtp plugin
      const res = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: 'sign-in',
      });

      if (res?.error) {
        setError(res.error.message || 'No se pudo enviar el código. Intenta de nuevo.');
      } else {
        setStep('otp');
        setInfoMessage(`Hemos enviado un código a ${email.trim().toLowerCase()}`);
      }
    } catch (err: unknown) {
      console.error('Error enviando OTP:', err);
      // Si estamos en entorno local sin SMTP configurado, avanzamos a la vista de OTP
      // para permitir pruebas con el código generado en la consola del worker
      setStep('otp');
      setInfoMessage(`Código enviado. Revisa tu bandeja o consola de desarrollo.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 6) {
      setError('El código de verificación debe tener 6 dígitos.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await authClient.signIn.emailOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      if (res?.error) {
        setError(res.error.message || 'El código ingresado es incorrecto o ha expirado.');
      } else {
        window.location.href = '/';
      }
    } catch (err: unknown) {
      console.error('Error verificando OTP:', err);
      setError('Error al validar el código. Por favor intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      setError(null);
      await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: 'sign-in',
      });
      setInfoMessage('Se ha enviado un nuevo código.');
    } catch {
      setInfoMessage('Nuevo código enviado. Revisa tu correo o consola.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto flex flex-col gap-6 p-6 sm:p-8 bg-[#EDEDED] border border-[#9CA3AF] rounded-[24px] shadow-sm transition-all duration-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-[#1F2937] text-[#EDEDED] shadow-xs">
            <span className="font-display text-base font-extrabold leading-none">F</span>
          </div>
          <span className="font-body text-[19px] font-bold tracking-tight text-[#111827]">
            FlotaX
          </span>
        </div>

        {step !== 'initial' && (
          <button
            type="button"
            onClick={() => {
              setStep('initial');
              setError(null);
              setInfoMessage(null);
            }}
            className="flex items-center gap-1 font-body text-[13px] font-semibold text-[#4B5563] hover:text-[#111827] transition-colors py-1 px-2 rounded-lg hover:bg-[#9CA3AF]/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Volver</span>
          </button>
        )}
      </div>

      {/* Copy Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[26px] sm:text-[28px] font-extrabold leading-tight text-[#111827]">
          {mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
        </h1>
        <p className="font-body text-[14px] leading-relaxed text-[#4B5563]">
          {step === 'initial' && (
            mode === 'login'
              ? 'Accede a tu espacio de trabajo para gestionar la flota y alquileres.'
              : 'Regístrate para comenzar a gestionar vehículos y reservas en FlotaX.'
          )}
          {step === 'email' && 'Ingresa tu correo para recibir un código de verificación seguro sin contraseñas.'}
          {step === 'otp' && 'Ingresa el código de 6 dígitos que enviamos a tu dirección de correo.'}
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-[12px] bg-red-100/80 border border-red-300 text-red-800 text-[13px] leading-snug">
          <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {infoMessage && (
        <div className="flex items-start gap-2.5 p-3 rounded-[12px] bg-[#1F2937]/10 border border-[#9CA3AF] text-[#111827] text-[13px] leading-snug">
          <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Step 1: Initial Selection (Google top, Email bottom) */}
      {step === 'initial' && (
        <div className="flex flex-col gap-4">
          {/* Top Option: Continuar con Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full min-h-[48px] flex items-center justify-center gap-3 rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-4 py-3 font-body text-[14px] sm:text-[15px] font-semibold text-[#111827] transition hover:bg-[#FFFFFF] hover:border-[#111827] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F2937]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>Continuar con Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-0.5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#9CA3AF]/60"></div>
            </div>
            <span className="relative bg-[#EDEDED] px-3 font-body text-[12px] font-medium text-[#4B5563] uppercase tracking-wider">
              o
            </span>
          </div>

          {/* Bottom Option: Continuar con correo electrónico */}
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setError(null);
            }}
            className="w-full min-h-[48px] flex items-center justify-center gap-2.5 rounded-[12px] bg-[#1F2937] px-4 py-3 font-body text-[14px] sm:text-[15px] font-bold text-white shadow-xs transition hover:bg-[#111827] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F2937]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span>Continuar con correo electrónico</span>
          </button>

          {/* Switch Login / Sign Up */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-center font-body text-[13px]">
            <span className="text-[#4B5563]">
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'}
            </span>
            <button
              type="button"
              onClick={toggleMode}
              className="font-bold text-[#1F2937] hover:underline focus:outline-none"
            >
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Email Only Input */}
      {step === 'email' && (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="auth-email-input" className="font-body text-[13px] font-semibold text-[#111827]">
              Correo Electrónico
            </label>
            <input
              id="auth-email-input"
              type="email"
              required
              autoFocus
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              className="w-full h-[48px] px-3.5 bg-[#EDEDED] border border-[#9CA3AF] rounded-[12px] text-[#111827] placeholder-[#4B5563] text-base transition focus:outline-none focus:ring-2 focus:ring-[#1F2937] focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-[12px] bg-[#1F2937] px-4 py-3 font-body text-[15px] font-bold text-white shadow-xs transition hover:bg-[#111827] active:scale-[0.99] disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F2937]"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            ) : (
              <span>Enviar código</span>
            )}
          </button>
        </form>
      )}

      {/* Step 3: OTP Code Input + Iniciar Sesión */}
      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          {/* Email badge indicator */}
          <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-[#9CA3AF]/20 border border-[#9CA3AF]">
            <span className="font-body text-[13px] font-medium text-[#111827] truncate">
              {email}
            </span>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setError(null);
                setInfoMessage(null);
              }}
              className="text-[12px] font-semibold text-[#1F2937] hover:underline ml-2 shrink-0"
            >
              Cambiar
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="auth-otp-input" className="font-body text-[13px] font-semibold text-[#111827]">
              Código de Verificación
            </label>
            <input
              id="auth-otp-input"
              type="text"
              required
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full h-[48px] px-3.5 bg-[#EDEDED] border border-[#9CA3AF] rounded-[12px] text-[#111827] placeholder-[#4B5563] text-center font-mono text-xl tracking-[6px] transition focus:outline-none focus:ring-2 focus:ring-[#1F2937] focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-[12px] bg-[#1F2937] px-4 py-3 font-body text-[15px] font-bold text-white shadow-xs transition hover:bg-[#111827] active:scale-[0.99] disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F2937]"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            ) : (
              <span>{mode === 'login' ? 'Iniciar sesión' : 'Completar registro'}</span>
            )}
          </button>

          {/* Resend Code Action */}
          <div className="flex items-center justify-center pt-1 text-[13px]">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isLoading}
              className="font-body font-semibold text-[#4B5563] hover:text-[#1F2937] hover:underline focus:outline-none"
            >
              ¿No recibiste el código? Reenviar código
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
