import { SessionTokenKey } from '../commons/localstorage-const-keys';
import { useAuth } from '../context/auth';
import { useState, ChangeEvent } from 'react';
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
import { useRouter } from 'next/router';

interface UnlockConfirmDialogInput {
  title: string;
  negativeButtonText: string;
  positiveButtonText: string;
  onClickPositiveButtion: () => void;
  open: boolean;
}

export default function Settings() {
  const [unlockConfirmDialogInput, setUnlockConfirmDialogInput] = useState<UnlockConfirmDialogInput>({
    title: '',
    negativeButtonText: '',
    positiveButtonText: '',
    onClickPositiveButtion: () => {},
    open: false,
  });
  const router = useRouter();
  const [twoFAActive, setTwoFAActive] = useState(false);
  const [passKeyActive, setPassKeyActive] = useState(false);
  const { setSessionToken } = useAuth();

  const handle2FAToggle = (event: ChangeEvent<HTMLInputElement>) => {
    if (twoFAActive) {
      setUnlockConfirmDialogInput({
        ...unlockConfirmDialogInput,
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
      setUnlockConfirmDialogInput({
        ...unlockConfirmDialogInput,
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
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_ROOT_URL}/account/signout`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    if (response && response.status < 400) {
      window.localStorage.removeItem(SessionTokenKey);
      router.replace('/signin');
    }
  };

  const execute2FALockUnlock = async (isLock: boolean) => {
    const requestUrl = isLock
      ? `${process.env.NEXT_PUBLIC_API_ROOT_URL}/extraauth/regist`
      : `${process.env.NEXT_PUBLIC_API_ROOT_URL}/extraauth/unregist`;
    const response = await axios.post(requestUrl, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    if (response && response.status < 400) {
      setTwoFAActive(isLock);
    }
    setUnlockConfirmDialogInput({ ...unlockConfirmDialogInput, open: false });
  };

  const executePasskeyLockUnlock = async () => {};

  const handleSignOut = async () => {
    setUnlockConfirmDialogInput({
      ...unlockConfirmDialogInput,
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
        open={unlockConfirmDialogInput.open}
        onClose={(e) => setUnlockConfirmDialogInput({ ...unlockConfirmDialogInput, open: false })}
        aria-labelledby="unlock-dialog-title"
        aria-describedby="unlock-dialog-description"
      >
        <DialogTitle id="unlock-dialog-title">{unlockConfirmDialogInput.title}</DialogTitle>
        <DialogActions>
          <Button
            onClick={(e) => setUnlockConfirmDialogInput({ ...unlockConfirmDialogInput, open: false })}
            variant="contained"
            color="error"
          >
            {unlockConfirmDialogInput.negativeButtonText}
          </Button>
          <Button onClick={unlockConfirmDialogInput.onClickPositiveButtion} variant="contained">
            {unlockConfirmDialogInput.positiveButtonText}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
