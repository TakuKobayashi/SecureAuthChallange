import { SessionTokenKey } from '../commons/localstorage-const-keys';
import { useAuth } from '../context/auth';
import { useState, ChangeEvent } from 'react';
import {
  Box,
  Button,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import axios, { AxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface ErrorDialogInput {
  title: string;
  message: string;
  open: boolean;
}

export default function ExtraAuth() {
  const [code, setCode] = useState('');
  const [errorDialogInput, setErrorDialogInput] = useState<ErrorDialogInput>({
    title: '',
    message: '',
    open: false,
  });
  const router = useRouter();
  const { setSessionToken } = useAuth();

  const handleSubmit = async () => {
    const response = await axios
      .post(
        `${process.env.NEXT_PUBLIC_API_ROOT_URL}/extraauth/challenge`,
        { code: code },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            session: router.query.session,
          },
        },
      )
      .catch((error: AxiosError) => {
        setErrorDialogInput({ ...errorDialogInput, title: '認証に失敗しました', message: error.message, open: true });
      });
    if (response && response.status < 400) {
      window.localStorage.setItem(SessionTokenKey, response.data.session);
      setSessionToken(response.data.session);
      router.replace('/settings');
    }
  };
  const handleChangeEmail = (e: ChangeEvent<HTMLInputElement>) => {
    setCode(e.currentTarget.value);
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
          <Typography component="h1" variant="h5">
            2段階認証のコードを入力してください
          </Typography>
          <Box sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="2FA Code"
              name="2FA Code"
              autoComplete="2FA Code"
              onChange={handleChangeEmail}
              autoFocus
            />
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} onClick={handleSubmit}>
              ログインする
            </Button>
          </Box>
        </Box>
      </Container>
      <Dialog
        open={errorDialogInput.open}
        onClose={(e) => setErrorDialogInput({ ...errorDialogInput, open: false })}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{errorDialogInput.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">{errorDialogInput.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={(e) => setErrorDialogInput({ ...errorDialogInput, open: false })} autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
