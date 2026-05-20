import { SessionTokenKey } from '../commons/localstorage-const-keys';
import { createPasskey } from '../commons/webauthn';
import { useAuth } from '../context/auth';
import { useState, useEffect, ChangeEvent } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Switch,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormGroup,
  FormControlLabel,
} from '@mui/material';
import qrcode from 'qrcode';
import { useRouter } from 'next/router';
import Image from 'next/image';

interface ConfirmDialogInput {
  title: string;
  negativeButtonText: string;
  positiveButtonText: string;
  onClickPositiveButtion: () => void;
  open: boolean;
}

interface ExtraAuthDialogInput {
  otpImageDataUrl: string;
  open: boolean;
}

const emptyConfirmDialog: ConfirmDialogInput = {
  title: '',
  negativeButtonText: 'Cancel',
  positiveButtonText: 'OK',
  onClickPositiveButtion: () => {},
  open: false,
};

export default function Settings() {
  const [confirmDialogInput, setConfirmDialogInput] = useState<ConfirmDialogInput>(emptyConfirmDialog);
  const [extraAuthDialogInput, setExtraAuthDialogInput] = useState<ExtraAuthDialogInput>({
    otpImageDataUrl: '',
    open: false,
  });
  const router = useRouter();
  const [twoFAActive, setTwoFAActive] = useState(false);
  const [passKeyActive, setPassKeyActive] = useState(false);
  const { sessionToken } = useAuth();

  useEffect(() => {
    (async () => {
      if (!sessionToken) {
        return;
      }
      const response = await axios
        .get(`${process.env.NEXT_PUBLIC_API_ROOT_URL}/account/settings`, {
          headers: { session: sessionToken },
        })
        .catch(() => {
          router.replace('/signin');
        });
      if (response) {
        setTwoFAActive(response.data.extraAuthActive);
        setPassKeyActive(response.data.passkeyActive);
      }
    })();
  }, [sessionToken, router]);

  const handle2FAToggle = (_event: ChangeEvent<HTMLInputElement>) => {
    if (twoFAActive) {
      setConfirmDialogInput({
        title: '2段階認証を解除しますか?',
        onClickPositiveButtion: () => {
          execute2FALockUnlock(false);
        },
        negativeButtonText: 'キャンセル',
        positiveButtonText: '解除する',
        open: true,
      });
    } else {
      execute2FALockUnlock(true);
    }
  };

  const handlePassKeyToggle = (_event: ChangeEvent<HTMLInputElement>) => {
    if (passKeyActive) {
      setConfirmDialogInput({
        title: 'Passkeyを解除しますか?',
        negativeButtonText: 'キャンセル',
        positiveButtonText: '解除する',
        onClickPositiveButtion: () => executePasskeyLockUnlock(false),
        open: true,
      });
    } else {
      executePasskeyLockUnlock(true);
    }
  };

  const executeSignOut = async () => {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_ROOT_URL}/account/signout`,
      {},
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          session: sessionToken,
        },
      },
    );
    if (response && response.status < 400) {
      window.localStorage.removeItem(SessionTokenKey);
      router.replace('/signin');
    }
  };

  const execute2FALockUnlock = async (isLock: boolean) => {
    const requestUrl = isLock
      ? `${process.env.NEXT_PUBLIC_API_ROOT_URL}/extraauth/regist`
      : `${process.env.NEXT_PUBLIC_API_ROOT_URL}/extraauth/unregist`;
    const response = await axios.post(
      requestUrl,
      {},
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          session: sessionToken,
        },
      },
    );
    if (response && response.status < 400) {
      if (isLock) {
        const otpauthUrl = response.data.otpauth_url;
        const otpauthUrlQrcodeDataUrl = await qrcode.toDataURL(otpauthUrl);
        setTwoFAActive(true);
        setExtraAuthDialogInput({
          otpImageDataUrl: otpauthUrlQrcodeDataUrl,
          open: true,
        });
      } else {
        setTwoFAActive(false);
      }
    }
    setConfirmDialogInput(emptyConfirmDialog);
  };

  const executePasskeyLockUnlock = async (isLock: boolean) => {
    if (isLock) {
      const optionsResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_ROOT_URL}/passkey/registration/options`,
        {},
        { headers: { session: sessionToken } },
      );
      const credential = await createPasskey(optionsResponse.data.options);
      await axios.post(`${process.env.NEXT_PUBLIC_API_ROOT_URL}/passkey/registration/verify`, {
        session: optionsResponse.data.challengeSession,
        credential,
      });
      setPassKeyActive(true);
    } else {
      await axios.post(`${process.env.NEXT_PUBLIC_API_ROOT_URL}/passkey/unregister`, {}, { headers: { session: sessionToken } });
      setPassKeyActive(false);
    }
    setConfirmDialogInput(emptyConfirmDialog);
  };

  const handleSignOut = async () => {
    setConfirmDialogInput({
      title: 'サインアウトしますか?',
      negativeButtonText: 'キャンセル',
      positiveButtonText: 'サインアウトする',
      onClickPositiveButtion: executeSignOut,
      open: true,
    });
  };

  return (
    <>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Box sx={{ mt: 1 }}>
            <FormGroup>
              <FormControlLabel
                control={<Switch checked={twoFAActive} value={twoFAActive} onChange={handle2FAToggle} />}
                label="2段階認証"
              />
              <FormControlLabel
                control={<Switch checked={passKeyActive} value={passKeyActive} onChange={handlePassKeyToggle} />}
                label="Passkey"
              />
            </FormGroup>
            <Button onClick={handleSignOut} variant="contained" color="error">
              サインアウト
            </Button>
          </Box>
        </Box>
      </Container>
      <Dialog
        open={confirmDialogInput.open}
        onClose={() => setConfirmDialogInput(emptyConfirmDialog)}
        aria-labelledby="unlock-dialog-title"
      >
        <DialogTitle id="unlock-dialog-title">{confirmDialogInput.title}</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmDialogInput(emptyConfirmDialog)} variant="contained" color="error">
            {confirmDialogInput.negativeButtonText}
          </Button>
          <Button onClick={confirmDialogInput.onClickPositiveButtion} variant="contained">
            {confirmDialogInput.positiveButtonText}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={extraAuthDialogInput.open}
        onClose={() => setExtraAuthDialogInput({ ...extraAuthDialogInput, open: false })}
        aria-labelledby="extra-auth-dialog-title"
      >
        <DialogTitle id="extra-auth-dialog-title">2段階認証の設定</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Google AuthenticatorでQRコードを読み取って登録してください。
            <Image src={extraAuthDialogInput.otpImageDataUrl} alt="2FA QRcode" width={200} height={200} />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtraAuthDialogInput({ ...extraAuthDialogInput, open: false })} variant="contained">
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
