import { useState, type FormEvent } from 'react';
import {
  useSecuritySummary,
  useStartMfa,
  useEnableMfa,
  useDisableMfa,
  usePasskeys,
  useDeletePasskey,
} from '@/hooks/use-security';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShieldCheck,
  Fingerprint,
  History,
  Smartphone,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react';

export function SecurityCenterPage() {
  const { data: summary, isLoading, refetch } = useSecuritySummary();
  const { data: passkeys } = usePasskeys();
  const deletePasskey = useDeletePasskey();

  const startMfa = useStartMfa();
  const enableMfa = useEnableMfa();
  const disableMfa = useDisableMfa();

  const [setupData, setSetupData] = useState<{
    secret: string;
    uri: string;
    recoveryCodes: string[];
    _hashedCodes: string[];
  } | null>(null);
  const [totpToken, setTotpToken] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [confirmRevokeKey, setConfirmRevokeKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-5xl">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  const handleStartMfa = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const data = await startMfa.mutateAsync();
      setSetupData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initiate MFA setup');
    }
  };

  const handleVerifyEnableMfa = async (e: FormEvent) => {
    e.preventDefault();
    if (!setupData) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await enableMfa.mutateAsync({
        secret: setupData.secret,
        token: totpToken,
        recoveryHashes: setupData._hashedCodes,
      });
      setSetupData(null);
      setTotpToken('');
      setSuccessMsg('Two-factor authentication successfully enabled on this workspace.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid 6-digit TOTP code');
    }
  };

  const handleDisableMfa = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await disableMfa.mutateAsync(disablePassword);
      setShowDisableModal(false);
      setDisablePassword('');
      setSuccessMsg('Two-factor authentication removed.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to disable MFA. Verify password.');
    }
  };

  const handleDeletePasskey = async (id: string) => {
    try {
      await deletePasskey.mutateAsync(id);
      setConfirmRevokeKey(null);
      setSuccessMsg('Hardware passkey removed.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to revoke passkey');
    }
  };

  const score = summary?.securityScore ?? 50;

  return (
    <div className="space-y-4 max-w-5xl min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#D9E1EC]/80 dark:border-[#2A313A] pb-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-[#101828] dark:text-[#F3F4F6] sm:text-xl truncate">
            Security & Access Center
          </h1>
          <p className="text-[11px] text-[#475467] dark:text-[#B7C0CC] mt-0.5">
            Multi-factor authentication, biometric passkeys, and account audit activity.
          </p>
        </div>
        <Button
          size="xs"
          variant="outline"
          onClick={() => refetch()}
          className="flex items-center gap-1 h-7 self-start sm:self-auto shrink-0"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Refresh</span>
        </Button>
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between rounded-lg border border-[#E05A67]/30 bg-[rgba(224,90,103,0.08)] dark:bg-[rgba(240,107,120,0.15)] p-2.5 text-xs text-[#C53B4B] dark:text-[#F06B78]">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#E05A67] dark:text-[#F06B78]" />
            <span className="truncate">{errorMsg}</span>
          </div>
          <X className="h-3.5 w-3.5 cursor-pointer shrink-0 ml-2" onClick={() => setErrorMsg('')} />
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-lg border border-[rgba(24,184,154,0.3)] bg-[rgba(24,184,154,0.08)] dark:bg-[rgba(40,199,167,0.15)] p-2.5 text-xs text-[#0E8A73] dark:text-[#28C7A7]">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#18B89A] dark:text-[#28C7A7]" />
            <span className="truncate">{successMsg}</span>
          </div>
          <X
            className="h-3.5 w-3.5 cursor-pointer shrink-0 ml-2"
            onClick={() => setSuccessMsg('')}
          />
        </div>
      )}

      {/* Security Health Score Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-4 shadow-2xs min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F0F4F8] dark:bg-[#181D24] text-[#101828] dark:text-[#F3F4F6]">
            <ShieldCheck className="h-4.5 w-4.5 text-[#18B89A] dark:text-[#28C7A7]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6] truncate">
              Account Protection Status
            </h2>
            <p className="text-[11px] text-[#475467] dark:text-[#B7C0CC] truncate">
              {summary?.user.mfaEnabled
                ? 'Two-Factor Authentication Active'
                : 'Two-Factor Authentication Disabled'}{' '}
              · {summary?.user.passkeyCount ?? 0} Passkey Credentials
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-2 self-start sm:self-auto shrink-0">
          <span className="text-xl font-bold text-[#101828] dark:text-[#F3F4F6] tabular-nums font-mono">
            {score}
          </span>
          <span className="text-[10px] text-[#98A2B3] dark:text-[#858F9D]">/ 100</span>
          <Badge variant={score >= 80 ? 'income' : 'warning'} size="sm" className="ml-1">
            {score >= 80 ? 'Strong' : 'Needs Review'}
          </Badge>
        </div>
      </div>

      {/* MFA & Passkeys Grid */}
      <div className="grid gap-4 md:grid-cols-2 min-w-0">
        {/* Two-Factor Authentication Card */}
        <Card className="border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] shadow-2xs min-w-0">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F0F4F8] dark:bg-[#181D24] text-[#101828] dark:text-[#F3F4F6] shrink-0">
                <Smartphone className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6] truncate">
                  Two-Factor Authentication
                </CardTitle>
                <p className="text-[10px] text-[#475467] dark:text-[#B7C0CC] truncate">
                  TOTP Authenticator Application
                </p>
              </div>
            </div>
            {summary?.user.mfaEnabled ? (
              <Badge variant="income" size="sm" className="shrink-0">
                <CheckCircle2 className="h-3 w-3" /> Active
              </Badge>
            ) : (
              <Badge variant="warning" size="sm" className="shrink-0">
                Disabled
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-3 text-xs text-[#475467] dark:text-[#B7C0CC] pt-2 min-w-0">
            <p className="leading-relaxed text-[11px]">
              Require a 6-digit verification code from Google Authenticator, 1Password, or Apple
              Keychain when signing in.
            </p>

            {!summary?.user.mfaEnabled && !setupData && (
              <Button
                size="sm"
                onClick={handleStartMfa}
                isLoading={startMfa.isPending}
                className="font-bold text-xs h-8 bg-[#101828] hover:bg-[#1E293B] dark:bg-[#5B8CFF] dark:hover:bg-[#4678F0] dark:text-white"
              >
                Configure Authenticator App
              </Button>
            )}

            {setupData && (
              <form
                onSubmit={handleVerifyEnableMfa}
                className="space-y-2.5 rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#181D24] p-3 min-w-0"
              >
                <div>
                  <div className="font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1 text-[11px]">
                    1. Add Secret Key to App:
                  </div>
                  <div className="rounded bg-white dark:bg-[#11151B] border border-[#D9E1EC] dark:border-[#2A313A] p-2 font-mono text-[10px] select-all break-all text-[#101828] dark:text-[#F3F4F6]">
                    {setupData.secret}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1 text-[11px]">
                    2. Single-Use Emergency Recovery Codes:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 rounded bg-white dark:bg-[#11151B] border border-[#D9E1EC] dark:border-[#2A313A] p-2 font-mono text-[10px] text-[#475467] dark:text-[#B7C0CC]">
                    {setupData.recoveryCodes.map((code) => (
                      <span key={code} className="truncate">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1 text-[11px]">
                    3. Enter 6-digit verification code:
                  </label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Input
                      maxLength={6}
                      required
                      value={totpToken}
                      onChange={(e) => setTotpToken(e.target.value)}
                      placeholder="123456"
                      className="w-28 font-mono text-center tracking-widest text-xs h-7"
                    />
                    <Button
                      type="submit"
                      size="xs"
                      isLoading={enableMfa.isPending}
                      className="h-7 bg-[#101828] dark:bg-[#5B8CFF] dark:text-white"
                    >
                      Confirm
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setSetupData(null)}
                      className="h-7"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {summary?.user.mfaEnabled && (
              <div className="pt-2 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]">
                <Button
                  variant="dangerOutline"
                  size="xs"
                  onClick={() => setShowDisableModal(true)}
                  className="h-7 text-[11px]"
                >
                  Disable Two-Factor Auth
                </Button>
              </div>
            )}

            {showDisableModal && (
              <form
                onSubmit={handleDisableMfa}
                className="rounded-lg border border-[#E05A67]/30 bg-[rgba(224,90,103,0.08)] dark:bg-[rgba(240,107,120,0.15)] p-2.5 space-y-2"
              >
                <span className="block text-xs font-semibold text-[#C53B4B] dark:text-[#F06B78]">
                  Enter your account password to confirm removal:
                </span>
                <Input
                  type="password"
                  required
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Account Password"
                  className="h-7 text-xs"
                />
                <div className="flex gap-1.5 pt-1">
                  <Button
                    type="submit"
                    variant="danger"
                    size="xs"
                    isLoading={disableMfa.isPending}
                    className="h-7 bg-[#E05A67] dark:bg-[#F06B78]"
                  >
                    Confirm Disable
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowDisableModal(false)}
                    className="h-7"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Passkeys (WebAuthn) Card */}
        <Card className="border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] shadow-2xs min-w-0">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F0F4F8] dark:bg-[#181D24] text-[#101828] dark:text-[#F3F4F6] shrink-0">
                <Fingerprint className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6] truncate">
                  Passkeys
                </CardTitle>
                <p className="text-[10px] text-[#475467] dark:text-[#B7C0CC] truncate">
                  Biometric & Hardware Security Keys
                </p>
              </div>
            </div>
            <Badge variant="neutral" size="sm" className="shrink-0">
              {passkeys?.length ?? 0} Active
            </Badge>
          </CardHeader>

          <CardContent className="space-y-3 text-xs text-[#475467] dark:text-[#B7C0CC] pt-2 min-w-0">
            <p className="leading-relaxed text-[11px]">
              Use Touch ID, Windows Hello, or hardware security keys for fast, secure sign-in.
            </p>

            <div className="space-y-1.5">
              {!passkeys || passkeys.length === 0 ? (
                <div className="py-5 text-center text-[11px] text-[#98A2B3] dark:text-[#858F9D]">
                  No passkey security credentials registered yet.
                </div>
              ) : (
                passkeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#181D24] p-2 min-w-0"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[#101828] dark:text-[#F3F4F6] text-xs truncate">
                        {key.name || 'Security Key'}
                      </div>
                      <div className="text-[9px] text-[#98A2B3] dark:text-[#858F9D] font-mono">
                        Added {new Date(key.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {confirmRevokeKey === key.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="xs"
                          variant="danger"
                          onClick={() => handleDeletePasskey(key.id)}
                          className="h-6 text-[10px] bg-[#E05A67] dark:bg-[#F06B78]"
                        >
                          Revoke
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setConfirmRevokeKey(null)}
                          className="h-6 text-[10px]"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRevokeKey(key.id)}
                        className="rounded p-1 text-[#98A2B3] hover:bg-[#F0F4F8] hover:text-[#E05A67] dark:hover:bg-[#11151B] dark:hover:text-[#F06B78] transition shrink-0"
                        title="Remove passkey"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Audit Events Log */}
      <Card className="border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] shadow-2xs min-w-0">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <History className="h-4 w-4 text-[#356AE6] dark:text-[#5B8CFF] shrink-0" />
          <div className="min-w-0">
            <CardTitle className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6] truncate">
              Security Activity Log
            </CardTitle>
            <p className="text-[10px] text-[#475467] dark:text-[#B7C0CC] truncate">
              Recent security-sensitive events and login activity
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-2 min-w-0">
          {!summary?.recentEvents || summary.recentEvents.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#98A2B3] dark:text-[#858F9D]">
              No recent security activity logged.
            </div>
          ) : (
            <div className="overflow-x-auto min-w-70">
              <table className="w-full text-left text-xs min-w-90">
                <thead>
                  <tr className="border-b border-[#D9E1EC]/60 dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#181D24] text-[10px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#858F9D]">
                    <th className="px-3 py-1.5">Event</th>
                    <th className="px-3 py-1.5">Status</th>
                    <th className="px-3 py-1.5">Source IP</th>
                    <th className="px-3 py-1.5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9E1EC]/40 dark:divide-[#2A313A]">
                  {summary.recentEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-[#F6F8FB] dark:hover:bg-[#181D24] transition-colors"
                    >
                      <td className="px-3 py-2 font-medium text-[#101828] dark:text-[#F3F4F6] text-xs whitespace-nowrap">
                        {event.eventType}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge
                          variant={
                            event.severity === 'CRITICAL' || event.severity === 'HIGH'
                              ? 'expense'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {event.severity}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-[#475467] dark:text-[#B7C0CC] whitespace-nowrap">
                        {event.ipAddress || 'Internal'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-[#98A2B3] dark:text-[#858F9D] whitespace-nowrap">
                        {new Date(event.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
