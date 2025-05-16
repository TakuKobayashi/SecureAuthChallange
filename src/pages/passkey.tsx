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

export default function Passkey() {
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
        setPassKeyActive(response.data.passkeyActive);
      }
    })();
  }, [sessionToken]);

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
      executePasskeyLockUnlock();
    }
    //    setPassKeyActive(event.target.checked);
  };

  const executePasskeyLockUnlock = async () => {
    const response = await axios
    .post(`${process.env.NEXT_PUBLIC_API_ROOT_URL}/passkey/generate/publickey`)
    console.log(response.data);
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
                control={<Switch checked={passKeyActive} value={passKeyActive} onChange={handlePassKeyToggle} />}
                label="パスキー"
              />
            </FormGroup>
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
