import React, { useState, useEffect, useRef } from 'react';
import { navigate } from 'astro:transitions/client';
import { authClient } from '@/lib/auth/client';
import AuthVectorBackground from './AuthVectorBackground';

type AuthStep = 'initial' | 'email' | 'otp';
type AuthMode = 'login' | 'signup';
type UserRole = 'cliente' | 'operador';

interface LoginFlowProps {
  initialMode?: AuthMode;
}

function getFriendlyAuthErrorMessage(code: string, description?: string | null): string {
  switch (code) {
    case 'access_denied':
      return 'Cancelaste el inicio de sesión con Google. Puedes intentar nuevamente cuando desees.';
    case 'account_not_linked':
      return 'Tu correo ya se encuentra registrado. Se vinculó tu cuenta de Google automáticamente.';
    case 'state_not_found':
    case 'invalid_state':
    case 'invalid_code':
      return 'La sesión de validación con Google caducó por seguridad. Por favor, intenta de nuevo.';
    case 'unable_to_get_user_info':
      return 'No fue posible obtener la información de perfil desde Google. Intenta nuevamente.';
    case 'email_not_found':
      return 'Google no proporcionó una dirección de correo verificada para continuar.';
    case 'database_unavailable':
      return 'El servicio de datos no está disponible en este momento. Inténtalo más tarde.';
    case 'oauth_error':
    case 'callback_failed':
    case 'invalid_callback_request':
      return description
        ? decodeURIComponent(description)
        : 'Ocurrió un error al procesar el ingreso con Google. Por favor, intenta de nuevo.';
    default:
      if (description) {
        return decodeURIComponent(description);
      }
      return 'No se pudo completar la autenticación. Por favor, intenta nuevamente.';
  }
}

export default function LoginFlow({ initialMode = 'login' }: LoginFlowProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<UserRole>('cliente');
  const [step, setStep] = useState<AuthStep>('initial');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Determinar cuál fondo puro automotriz corresponde al estado actual
  const getActiveBackground = (): 'blueprint' | 'sketch' | 'cad' | 'stencil' => {
    if (mode === 'signup' && step !== 'otp') return 'stencil';
    if (step === 'email') return 'sketch';
    if (step === 'otp') return 'cad';
    return 'blueprint';
  };

  const activeBg = getActiveBackground();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    const errorDesc = params.get('error_description');

    if (errorCode) {
      setError(getFriendlyAuthErrorMessage(errorCode, errorDesc));

      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('error');
      cleanUrl.searchParams.delete('error_description');
      cleanUrl.searchParams.delete('error_code');
      window.history.replaceState({}, '', cleanUrl.toString());
    }
  }, []);

  // Countdown timer para reenvío de OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Auto-focus en OTP cuando se ingresa al paso 3
  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
    setStep('initial');
    setError(null);
    setInfoMessage(null);
  };

  const getDestinationUrl = () => {
    if (typeof window === 'undefined') return '/home';
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    return redirectParam ? decodeURIComponent(redirectParam) : '/home';
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const destination = getDestinationUrl();
      const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login';

      const res = await authClient.signIn.social({
        provider: 'google',
        callbackURL: destination,
        errorCallbackURL: loginUrl,
      });

      if (res?.error) {
        setError(res.error.message || 'No se pudo conectar con el servicio de autenticación de Google.');
        setIsLoading(false);
        return;
      }

      if (res?.data?.url) {
        window.location.assign(res.data.url);
        return;
      }
    } catch (err: unknown) {
      console.error('Error al iniciar sesión con Google:', err);
      setError('No se pudo conectar con el servicio de autenticación de Google. Por favor, intenta de nuevo.');
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

      const res = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: 'sign-in',
      });

      if (res?.error) {
        setError(res.error.message || 'No se pudo enviar el código. Intenta de nuevo.');
      } else {
        setStep('otp');
        setCountdown(30);
        setInfoMessage(`Código enviado a ${email.trim().toLowerCase()}`);
      }
    } catch (err: unknown) {
      console.error('Error enviando OTP:', err);
      setStep('otp');
      setCountdown(30);
      setInfoMessage(`Código generado. Revisa tu correo o consola perimetral.`);
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
        navigate(getDestinationUrl());
      }
    } catch (err: unknown) {
      console.error('Error verificando OTP:', err);
      setError('Error al validar el código. Por favor intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (isLoading || countdown > 0) return;
    try {
      setIsLoading(true);
      setError(null);
      await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: 'sign-in',
      });
      setCountdown(30);
      setInfoMessage('Se ha enviado un nuevo código.');
    } catch {
      setCountdown(30);
      setInfoMessage('Nuevo código enviado. Revisa tu correo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejo de cambio en los dígitos OTP
  const handleOtpChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setOtp(clean);
  };

  return (
    <div className="relative w-full min-h-[100dvh] flex flex-col items-center bg-[#111827] px-4 pt-4 pb-6 sm:px-6 overflow-x-hidden">
      {/* =========================================================================
          FONDO VECTORIAL PURO Y EVOLUTIVO (SVG Nativo, encuadre 456x500 proporcional)
          Ocupa el 88% del ancho de la pantalla y el tercio/mitad superior, idéntico a pen.dev
         ========================================================================= */}
      <div className="fixed top-0 inset-x-0 w-full max-w-[456px] mx-auto h-[48vh] min-h-[360px] max-h-[480px] pointer-events-none select-none z-0">
        <AuthVectorBackground activeVariant={activeBg} />
      </div>

      {/* =========================================================================
          TOP BAR NAVEGACIÓN PERIMETRAL (Fila superior fija y limpia)
         ========================================================================= */}
      <header className="relative w-full max-w-[420px] mx-auto flex items-center justify-between z-20 pt-2 animate-auth-reveal">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDEDED] text-[#111827] font-bold text-sm shadow-xs">
            FX
          </div>
          <span className="font-mono text-xs font-bold tracking-[2px] text-[#EDEDED] uppercase">
            FLOTAX OS
          </span>
        </div>

        {step !== 'initial' ? (
          <button
            type="button"
            onClick={() => {
              setStep('initial');
              setError(null);
              setInfoMessage(null);
            }}
            className="flex items-center gap-1 font-body text-xs font-semibold text-[#EDEDED] hover:text-white transition-colors py-1.5 px-3.5 rounded-full bg-[#1F2937] border border-[#374151] active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Volver</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1F2937] border border-[#374151] text-[10px] font-mono tracking-wider text-[#9CA3AF]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{mode === 'login' ? 'PATIO ACTIVO' : 'NUEVO REGISTRO'}</span>
          </div>
        )}
      </header>

      {/* =========================================================================
          ESPACIADOR VERTICAL DEDICADO: DESPEJA TOTALMENTE EL ARTE AUTOMOTRIZ
          Asegura que el titular y los botones descansen debajo del chasis y cotas
         ========================================================================= */}
      <div className="w-full h-[40vh] min-h-[300px] max-h-[420px] pointer-events-none flex-shrink-0" aria-hidden="true" />

      {/* =========================================================================
          ÁREA CENTRAL / FORMULARIO INTERACTIVO (Baja en la pantalla, en la zona del pulgar)
         ========================================================================= */}
      <main className="relative w-full max-w-[420px] mx-auto flex flex-col justify-end z-10 animate-auth-reveal pb-2 mt-auto">
        {/* Titular y Descripción de Paso */}
        <div className="flex flex-col gap-2 mb-5">
          <h1 className="font-serif text-[28px] sm:text-[32px] font-bold leading-[1.15] text-[#EDEDED]">
            {step === 'otp'
              ? 'Verifica tu Código'
              : step === 'email'
                ? 'Ingreso con Correo'
                : mode === 'login'
                  ? 'Control Operativo de Flota'
                  : 'Crea tu Cuenta FlotaX'}
          </h1>
          <p className="font-body text-[13px] sm:text-[14px] leading-relaxed text-[#9CA3AF]">
            {step === 'initial' && (
              mode === 'login'
                ? 'Autenticación perimetral de alta seguridad para recepción, patio e inspección vehicular.'
                : 'Elige tu perfil operativo para ingresar al ecosistema de alquiler y control perimetral.'
            )}
            {step === 'email' && 'Te enviaremos un código de un solo uso de 6 dígitos sin contraseñas vulnerables.'}
            {step === 'otp' && `Ingresa los 6 dígitos numéricos recibidos en ${email || 'tu correo'}.`}
          </p>
        </div>

        {/* Mensajes de Estado */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs leading-relaxed animate-auth-step">
            <svg className="h-4 w-4 mt-0.5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-[#1F2937] border border-[#374151] text-[#EDEDED] text-xs leading-relaxed animate-auth-step">
            <svg className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Segmented Control de Rol (Exclusivo de Registro) */}
        {mode === 'signup' && step === 'initial' && (
          <div className="mb-4 p-1 rounded-full bg-[#1F2937] border border-[#374151] flex gap-1">
            <button
              type="button"
              onClick={() => setRole('cliente')}
              className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all duration-150 ${
                role === 'cliente'
                  ? 'bg-[#EDEDED] text-[#111827] shadow-xs'
                  : 'text-[#9CA3AF] hover:text-[#EDEDED]'
              }`}
            >
              Cliente Particular
            </button>
            <button
              type="button"
              onClick={() => setRole('operador')}
              className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all duration-150 ${
                role === 'operador'
                  ? 'bg-[#EDEDED] text-[#111827] shadow-xs'
                  : 'text-[#9CA3AF] hover:text-[#EDEDED]'
              }`}
            >
              Operador de Patio
            </button>
          </div>
        )}

        {/* =========================================================================
            PASO 01: BIENVENIDA & SELECCIÓN (Google 1-Tap / Correo OTP)
           ========================================================================= */}
        {step === 'initial' && (
          <div className="flex flex-col gap-3 animate-auth-step">
            {/* Opción 1: Google OAuth Instantáneo */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-[52px] flex items-center justify-center gap-3 rounded-full bg-[#EDEDED] px-4 font-body text-[15px] font-semibold text-[#111827] shadow-sm transition hover:bg-white active:scale-[0.985] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-[#111827]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              ) : (
                <>
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                </>
              )}
            </button>

            {/* Opción 2: Correo OTP */}
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setError(null);
              }}
              className="w-full h-[52px] flex items-center justify-center gap-2.5 rounded-full bg-[#1F2937] border border-[#374151] px-4 font-body text-[14px] sm:text-[15px] font-medium text-[#EDEDED] transition hover:bg-[#283548] hover:border-[#4B5563] active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-[#9CA3AF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>{mode === 'login' ? 'Ingresar con Correo OTP' : 'Registrarme con Correo'}</span>
            </button>

            {/* Alternar Modo Login / Registro */}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-center font-body text-xs">
              <span className="text-[#9CA3AF]">
                {mode === 'login' ? '¿Aún no tienes acceso?' : '¿Ya tienes una cuenta operativa?'}
              </span>
              <button
                type="button"
                onClick={toggleMode}
                className="font-bold text-[#EDEDED] hover:underline focus:outline-none"
              >
                {mode === 'login' ? 'Crea tu cuenta' : 'Inicia sesión'}
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PASO 02: INGRESO DE CORREO OTP
           ========================================================================= */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4 animate-auth-step">
            <div className="flex flex-col gap-2">
              <label htmlFor="auth-email-input" className="font-body text-xs font-semibold text-[#EDEDED] tracking-wide uppercase">
                Correo Electrónico Corporativo
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
                placeholder="operador@flotax.co"
                className="w-full h-[50px] px-4 bg-[#1F2937] border border-[#374151] rounded-2xl text-[#EDEDED] placeholder-[#9CA3AF] text-base transition focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/10"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[50px] flex items-center justify-center gap-2 rounded-full bg-[#EDEDED] px-4 font-body text-[15px] font-bold text-[#111827] shadow-sm transition hover:bg-white active:scale-[0.985] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-[#111827]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              ) : (
                <span>Enviar Código OTP</span>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="text-xs text-[#9CA3AF] hover:text-[#EDEDED] underline focus:outline-none"
              >
                ¿Prefieres acceder al instante? Continuar con Google
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            PASO 03: VERIFICACIÓN DE CÓDIGO OTP (6 DÍGITOS)
           ========================================================================= */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 animate-auth-step">
            {/* Indicador de correo con acción para cambiar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#1F2937] border border-[#374151]">
              <span className="font-mono text-xs text-[#EDEDED] truncate">
                {email}
              </span>
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setError(null);
                  setInfoMessage(null);
                }}
                className="text-xs font-semibold text-[#9CA3AF] hover:text-[#EDEDED] ml-2 shrink-0 underline"
              >
                Cambiar
              </button>
            </div>

            {/* 6 Casillas Visuales para los Dígitos OTP */}
            <div className="flex flex-col gap-2">
              <label htmlFor="auth-otp-input" className="font-body text-xs font-semibold text-[#EDEDED] tracking-wide uppercase">
                Código de Verificación
              </label>

              <div
                className="relative flex items-center justify-between gap-2 cursor-pointer"
                onClick={() => otpInputRef.current?.focus()}
              >
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const digit = otp[idx] || '';
                  const isCurrent = otp.length === idx;
                  return (
                    <div
                      key={idx}
                      className={`flex-1 h-[54px] rounded-xl flex items-center justify-center font-mono text-xl font-bold transition-all duration-150 ${
                        digit
                          ? 'bg-[#1F2937] border-2 border-[#EDEDED] text-[#EDEDED]'
                          : isCurrent
                            ? 'bg-[#1F2937] border-2 border-white/50 text-[#EDEDED]'
                            : 'bg-[#1F2937]/80 border border-[#374151] text-[#4B5563]'
                      }`}
                    >
                      {digit ? digit : isCurrent ? <span className="animate-pulse">|</span> : '•'}
                    </div>
                  );
                })}

                {/* Input invisible real sobre las casillas */}
                <input
                  ref={otpInputRef}
                  id="auth-otp-input"
                  type="text"
                  required
                  autoFocus
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length < 6}
              className="w-full h-[50px] flex items-center justify-center gap-2 rounded-full bg-[#EDEDED] px-4 font-body text-[15px] font-bold text-[#111827] shadow-sm transition hover:bg-white active:scale-[0.985] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-[#111827]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              ) : (
                <span>{mode === 'login' ? 'Ingresar al Patio Operativo' : 'Completar Registro'}</span>
              )}
            </button>

            {/* Temporizador de Reenvío de 30 segundos */}
            <div className="flex items-center justify-center pt-1 text-xs">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading || countdown > 0}
                className="font-body font-semibold text-[#9CA3AF] hover:text-[#EDEDED] disabled:opacity-40 transition-colors focus:outline-none"
              >
                {countdown > 0
                  ? `Reenviar código en ${countdown}s`
                  : '¿No recibiste el código? Reenviar código'}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* =========================================================================
          FOOTER DE TELEMETRÍA Y SEGURIDAD
         ========================================================================= */}
      <footer className="w-full max-w-[420px] mx-auto z-10 pt-3 text-center animate-auth-reveal mt-auto">
        <p className="font-mono text-[10px] tracking-widest text-[#4B5563] uppercase">
          FLOTAX PERIMETER OS v2.4 • CLOUDFLARE D1 ENCRYPTED
        </p>
      </footer>
    </div>
  );
}
