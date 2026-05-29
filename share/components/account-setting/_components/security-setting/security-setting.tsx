import { Alert, AlertDescription } from '@shared/ui';
import { Badge } from '@shared/ui';
import { Button } from '@shared/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui';
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from '@shared/ui';
import { Input } from '@shared/ui/input';
import { WorkflowLoading } from '../../deps';
import { useTwoFA } from '../../deps';
import { AlertCircle, CheckCircle, Copy, Download, Key, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-qr-code';

export function SecuritySettingContent() {
  const { t } = useTranslation(['auth', 'accountSetting']);
  const { twoFAInfoQuery, getSetupInfoMutation, enableMutation, disableMutation } = useTwoFA();
  const [showSetup, setShowSetup] = useState(false);
  const [openEnableConfirm, setOpenEnableConfirm] = useState(false);
  const [openDisableConfirm, setOpenDisableConfirm] = useState(false);

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  const copyToClipboard = (text: string, type: 'secret' | 'backup') => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
  };

  const downloadBackupCodes = () => {
    const text = `${t('auth:2fa.backupCodesTitle')} - DocFlow\n\n${new Date().toLocaleDateString()}\n\n${getSetupInfoMutation?.data?.data?.backupCodes?.join('\n')}\n\n${t('auth:2fa.backupCodesWarning')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleEnableClick = () => {
    getSetupInfoMutation.mutate();
    setShowSetup(true);
  };

  const handleDisableClick = () => {
    setOpenDisableConfirm(true);
  };

  // Get 2FA status from API
  const is2FAEnabled = twoFAInfoQuery?.data?.data?.isEnabled || false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold mb-2">{t('accountSetting:security.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('accountSetting:security.description')}</p>
      </div>

      {/* 2FA Status Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>{t('auth:2fa.title')}</CardTitle>
          <CardDescription>{t('auth:2fa.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              {is2FAEnabled ? (
                <>
                  <Badge variant="default" className="bg-green-500 w-fit">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {t('auth:2fa.statusEnabled')}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {t('auth:2fa.statusEnabledDescription')}
                  </span>
                </>
              ) : (
                <>
                  <Badge variant="outline" className="border-gray-300 w-fit">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {t('auth:2fa.statusDisabled')}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {t('auth:2fa.statusDisabledDescription')}
                  </span>
                </>
              )}
            </div>
            {!showSetup && (
              <Button
                onClick={is2FAEnabled ? handleDisableClick : handleEnableClick}
                className="w-full sm:w-auto"
              >
                {is2FAEnabled ? t('auth:2fa.disableButton') : t('auth:2fa.enableButton')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2FA Setup Section - Only show when user clicks Enable */}
      {showSetup && !is2FAEnabled && (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 rounded-lg relative min-h-[400px]">
          {getSetupInfoMutation.isPending && <WorkflowLoading overlay size="md" />}
          {getSetupInfoMutation.isSuccess && getSetupInfoMutation.data?.data && (
            <>
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 sm:gap-6 w-full">
                {/* Step 1: QR Code Card */}
                <Card className="border-2 gap-4 py-4">
                  <CardHeader>
                    <div className="flex items-center gap-0">
                      <Badge
                        variant="default"
                        className="rounded-full w-8 h-8 flex items-center justify-center p-0"
                      >
                        1
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-primary" />
                        <CardTitle>{t('auth:2fa.qrCodeTitle')}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 px-3 sm:px-4">
                    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 sm:gap-6">
                      {/* QR Code */}
                      <div className="flex flex-col items-center justify-start space-y-3">
                        <div className="bg-white p-3 sm:p-4 2xl:p-5 rounded-lg border-2 shadow-sm w-full flex justify-center">
                          {getSetupInfoMutation.data?.data?.qrCodeText && (
                            <div className="w-full max-w-[180px] sm:max-w-[200px] 2xl:max-w-[140px] aspect-square">
                              <QRCode
                                value={getSetupInfoMutation.data?.data?.qrCodeText}
                                size={200}
                                className="w-full h-full"
                                style={{ width: '100%', height: '100%' }}
                              />
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground text-center max-w-xs px-2">
                          {t('auth:2fa.qrCodeDescription')}
                        </p>
                      </div>

                      {/* Instructions */}
                      <div className="space-y-4">
                        <Card className="bg-muted/50 gap-1 py-4">
                          <CardHeader>
                            <CardTitle className="text-base">
                              {t('auth:2fa.instructionsTitle')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-4">
                            <ol className="space-y-3 text-sm">
                              <li className="flex gap-3">
                                <span className="font-semibold text-primary shrink-0">1.</span>
                                <span>
                                  {t('auth:2fa.instructionsStep1.1-1')}{' '}
                                  <strong>Google Authenticator</strong>{' '}
                                  {t('auth:2fa.instructionsStep1.1-3')}
                                </span>
                              </li>
                              <li className="flex gap-3">
                                <span className="font-semibold text-primary shrink-0">2.</span>
                                <span>
                                  {t('auth:2fa.instructionsStep2.2-1')}{' '}
                                  <strong>{t('auth:2fa.instructionsStep2.2-2')}</strong>{' '}
                                  {t('auth:2fa.instructionsStep2.2-3')}
                                </span>
                              </li>
                              <li className="flex gap-3">
                                <span className="font-semibold text-primary shrink-0">3.</span>
                                <span>
                                  {t('auth:2fa.instructionsStep3.3-1')}{' '}
                                  <strong>{t('auth:2fa.instructionsStep3.3-2')}</strong>
                                </span>
                              </li>
                              <li className="flex gap-3">
                                <span className="font-semibold text-primary shrink-0">4.</span>
                                <span>{t('auth:2fa.instructionsStep4')}</span>
                              </li>
                            </ol>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    {/* Manual Entry */}
                    <Alert className="w-full border-amber-200 bg-amber-50">
                      <Key className="h-4 w-4 text-amber-600 shrink-0" />
                      <AlertDescription className="w-full">
                        <p className="font-semibold mb-2 text-amber-900">
                          {t('auth:2fa.cannotScanQR')}
                        </p>
                        <p className="text-sm text-amber-800 mb-3">
                          {t('auth:2fa.manualEntryDescription')}
                        </p>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <code className="flex-1 bg-white px-3 py-2 rounded-md border border-amber-300 text-xs font-mono break-all overflow-x-auto">
                            {getSetupInfoMutation.data?.data?.secretKey}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              getSetupInfoMutation.data?.data?.secretKey &&
                              copyToClipboard(getSetupInfoMutation.data?.data?.secretKey, 'secret')
                            }
                            className="shrink-0 border-amber-300 hover:bg-amber-100 w-full sm:w-auto"
                          >
                            {copiedSecret ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                {/* Step 2: Backup Codes Card */}
                <Card className="border-2 border-destructive/20">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="default"
                        className="rounded-full w-8 h-8 flex items-center justify-center p-0"
                      >
                        2
                      </Badge>
                      <div className="flex items-center gap-2 flex-wrap">
                        <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                        <CardTitle className="break-words">
                          {t('auth:2fa.backupCodesCardTitle')}
                        </CardTitle>
                      </div>
                    </div>
                    <CardDescription className="break-words">
                      {t('auth:2fa.backupCodesCardDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Backup Codes Grid */}
                    <div className="bg-muted/30 p-3 sm:p-4 rounded-lg border">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3 mb-4">
                        {getSetupInfoMutation?.data?.data?.backupCodes?.map((code, index) => (
                          <div
                            key={index}
                            className="bg-background border rounded-md px-2 sm:px-3 py-2 sm:py-2.5 text-center font-mono text-xs sm:text-sm font-medium shadow-sm min-w-0 overflow-hidden break-all hyphens-auto"
                          >
                            {code}
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            getSetupInfoMutation?.data?.data?.backupCodes &&
                            copyToClipboard(
                              getSetupInfoMutation?.data?.data?.backupCodes?.join('\n'),
                              'backup',
                            )
                          }
                          className="flex-1 sm:flex-none"
                        >
                          {copiedBackup ? (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4 shrink-0" />
                              {t('auth:2fa.copied')}
                            </>
                          ) : (
                            <>
                              <Copy className="mr-2 h-4 w-4 shrink-0" />
                              {t('auth:2fa.copyAll')}
                            </>
                          )}
                        </Button>
                        <Button onClick={downloadBackupCodes} className="flex-1 sm:flex-none">
                          <Download className="mr-2 h-4 w-4 shrink-0" />
                          {t('auth:2fa.download')}
                        </Button>
                      </div>
                    </div>

                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <AlertDescription className="break-words">
                        {t('auth:2fa.backupCodesWarning')}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
              {/* Finish Button */}
              <div className="flex justify-center pt-4 px-4">
                <Dialog open={openEnableConfirm} onOpenChange={setOpenEnableConfirm}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="w-full sm:max-w-md">
                      <CheckCircle className="mr-2 h-5 w-5 shrink-0" />
                      {t('auth:2fa.finishSetup')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md max-w-[95vw]">
                    <DialogHeader>
                      <h2 className="text-xl font-bold text-center break-words">
                        {t('auth:2fa.confirmSetup')}
                      </h2>
                      <p className="text-muted-foreground text-center text-sm break-words">
                        {t('auth:2fa.confirmSetupDescription')}
                      </p>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex gap-1.5 sm:gap-2 justify-center px-2">
                        {[...Array(6)].map((_, index) => (
                          <input
                            key={index}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            name={`twofa-code-${index}`}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            data-lpignore="true"
                            data-form-type="other"
                            data-1p-ignore="true"
                            className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={code[index] || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              const newCode = [...code];
                              newCode[index] = val.slice(-1) || ''; // Chỉ lấy ký tự cuối cùng hoặc rỗng
                              setCode(newCode);
                              if (val && index < 5) {
                                const next = e.target.nextElementSibling as HTMLInputElement;
                                next?.focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace') {
                                if (code[index]) {
                                  // Nếu có giá trị, xóa giá trị hiện tại
                                  const newCode = [...code];
                                  newCode[index] = '';
                                  setCode(newCode);
                                } else if (index > 0) {
                                  // Nếu ô hiện tại rỗng, chuyển sang ô trước và xóa
                                  const prev = (e.target as HTMLInputElement)
                                    .previousElementSibling as HTMLInputElement;
                                  prev?.focus();
                                  const newCode = [...code];
                                  newCode[index - 1] = '';
                                  setCode(newCode);
                                }
                              } else if (e.key === 'Delete') {
                                // Xử lý phím Delete
                                const newCode = [...code];
                                newCode[index] = '';
                                setCode(newCode);
                              }
                            }}
                          />
                        ))}
                      </div>
                      <Button
                        size="lg"
                        onClick={() => {
                          enableMutation.mutate(code?.join(''), {
                            onSuccess: () => {
                              setOpenEnableConfirm(false);
                              setShowSetup(false);
                              setCode(['', '', '', '', '', '']);
                            },
                            onError: () => {
                              setCode(['', '', '', '', '', '']);
                            },
                          });
                        }}
                        className="w-full"
                      >
                        <CheckCircle className="mr-2 h-5 w-5 shrink-0" />
                        {t('auth:2fa.confirm')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </>
          )}
        </div>
      )}

      {/* Disable Confirmation Dialog */}
      <Dialog
        open={openDisableConfirm}
        onOpenChange={(open) => {
          setOpenDisableConfirm(open);
          if (!open) {
            setCode(['', '', '', '', '', '']);
            setPassword('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <h2 className="text-xl font-bold text-center break-words">
              {t('auth:2fa.disableTitle')}
            </h2>
            <p className="text-muted-foreground text-center text-sm break-words">
              {t('auth:2fa.disableDescription')}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block break-words">
                {t('auth:2fa.authCodeLabel')}
              </label>
              <div className="flex gap-1.5 sm:gap-2 justify-center px-2">
                {[...Array(6)].map((_, index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    name={`twofa-disable-code-${index}`}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-form-type="other"
                    data-1p-ignore="true"
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={code[index] || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      const newCode = [...code];
                      newCode[index] = val.slice(-1) || ''; // Chỉ lấy ký tự cuối cùng hoặc rỗng
                      setCode(newCode);
                      if (val && index < 5) {
                        const next = e.target.nextElementSibling as HTMLInputElement;
                        next?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') {
                        if (code[index]) {
                          // Nếu có giá trị, xóa giá trị hiện tại
                          const newCode = [...code];
                          newCode[index] = '';
                          setCode(newCode);
                        } else if (index > 0) {
                          // Nếu ô hiện tại rỗng, chuyển sang ô trước và xóa
                          const prev = (e.target as HTMLInputElement)
                            .previousElementSibling as HTMLInputElement;
                          prev?.focus();
                          const newCode = [...code];
                          newCode[index - 1] = '';
                          setCode(newCode);
                        }
                      } else if (e.key === 'Delete') {
                        // Xử lý phím Delete
                        const newCode = [...code];
                        newCode[index] = '';
                        setCode(newCode);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block break-words">
                {t('auth:2fa.passwordLabel')}
              </label>
              <Input
                type="password"
                name="twofa-disable-password"
                autoComplete="new-password"
                placeholder={t('auth:2fa.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                className="w-full"
              />
            </div>
            <Button
              size="lg"
              onClick={() => {
                disableMutation.mutate(
                  { code: code?.join(''), password: password },
                  {
                    onSuccess: () => {
                      setOpenDisableConfirm(false);
                      setCode(['', '', '', '', '', '']);
                      setPassword('');
                    },
                    onError: () => {
                      setCode(['', '', '', '', '', '']);
                      setPassword('');
                    },
                  },
                );
              }}
              className="w-full"
              variant="destructive"
              disabled={!code.every((c) => c) || !password}
            >
              <AlertCircle className="mr-2 h-5 w-5 shrink-0" />
              {t('auth:2fa.disableButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
