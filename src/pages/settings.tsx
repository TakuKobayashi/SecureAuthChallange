import { SessionTokenKey } from '../commons/localstorage-const-keys';
import { useAuth } from '../context/auth';
import { useState, useEffect, ChangeEvent } from 'react';
import axios, { AxiosError } from 'axios';
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

export default function Settings() {
  const [confirmDialogInput, setConfirmDialogInput] = useState<ConfirmDialogInput>({
    title: '',
    negativeButtonText: '',
    positiveButtonText: '',
    onClickPositiveButtion: () => {},
    open: false,
  });
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
        .catch((error: AxiosError) => {
          router.replace('/signin');
        });
      if (response) {
        setTwoFAActive(response.data.extraAuthActive);
        setPassKeyActive(response.data.passkeyActive);
      }
    })();
  }, [sessionToken]);

  const handle2FAToggle = (event: ChangeEvent<HTMLInputElement>) => {
    if (twoFAActive) {
      setConfirmDialogInput({
        ...confirmDialogInput,
        title: '二段回認証の設定を解除しますか?',
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
  const handlePassKeyToggle = (event: ChangeEvent<HTMLInputElement>) => {
    if (passKeyActive) {
      setConfirmDialogInput({
        ...confirmDialogInput,
        title: 'パスキーの設定を解除しますか?',
        negativeButtonText: 'キャンセル',
        positiveButtonText: '解除する',
        open: true,
      });
    } else {
    }
    //    setPassKeyActive(event.target.checked);
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
          ...extraAuthDialogInput,
          otpImageDataUrl: otpauthUrlQrcodeDataUrl,
          open: true,
        });
      } else {
        setTwoFAActive(false);
      }
    }
    setConfirmDialogInput({ ...confirmDialogInput, open: false });
  };

  const executePasskeyLockUnlock = async () => {};

  const handleSignOut = async () => {
    setConfirmDialogInput({
      ...confirmDialogInput,
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
                label="二段階認証"
              />
              <FormControlLabel
                control={<Switch checked={passKeyActive} value={passKeyActive} onChange={handlePassKeyToggle} />}
                label="パスキー"
              />
            </FormGroup>
            <Button onClick={(e) => handleSignOut()} variant="contained" color="error">
              サインアウト
            </Button>
          </Box>
        </Box>
      </Container>
      <Dialog
        open={confirmDialogInput.open}
        onClose={(e) => setConfirmDialogInput({ ...confirmDialogInput, open: false })}
        aria-labelledby="unlock-dialog-title"
        aria-describedby="unlock-dialog-description"
      >
        <DialogTitle id="unlock-dialog-title">{confirmDialogInput.title}</DialogTitle>
        <DialogActions>
          <Button onClick={(e) => setConfirmDialogInput({ ...confirmDialogInput, open: false })} variant="contained" color="error">
            {confirmDialogInput.negativeButtonText}
          </Button>
          <Button onClick={confirmDialogInput.onClickPositiveButtion} variant="contained">
            {confirmDialogInput.positiveButtonText}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={extraAuthDialogInput.open}
        onClose={(e) => setExtraAuthDialogInput({ ...extraAuthDialogInput, open: false })}
        aria-labelledby="extra-auth-dialog-title"
        aria-describedby="extra-auth-dialog-description"
      >
        <DialogTitle id="extra-auth-dialog-title">2段解認証の設定</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Google AuthenticatorでQRCodeを読み取って登録してください
            <Image src={extraAuthDialogInput.otpImageDataUrl} alt="2FA QRcode" width={200} height={200} />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={(e) => setExtraAuthDialogInput({ ...extraAuthDialogInput, open: false })} variant="contained">
            読み取りました
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
