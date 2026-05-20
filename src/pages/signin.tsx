import { SessionTokenKey } from '../commons/localstorage-const-keys';
import { getPasskey } from '../commons/webauthn';
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

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string } | string>;
    const responseData = axiosError.response?.data;
    if (typeof responseData === 'string') {
      return responseData;
    }
    return responseData?.message || axiosError.message;
  }
  return error instanceof Error ? error.message : 'Passkey authentication failed';
};

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        `${process.env.NEXT_PUBLIC_API_ROOT_URL}/account/signin`,
        { email: email, password: password },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )
      .catch((error: AxiosError) => {
        setErrorDialogInput({ ...errorDialogInput, title: '認証に失敗しました', message: getErrorMessage(error), open: true });
      });
    if (response && response.status < 400) {
      if (response.data.state === 'extraauth') {
        router.push({
          pathname: '/extraauth',
          query: { session: response.data.session },
        });
      } else if (response.data.state === 'success') {
        window.localStorage.setItem(SessionTokenKey, response.data.session);
        setSessionToken(response.data.session);
        router.push('/settings');
      }
    }
  };

  const handlePasskeySignIn = async () => {
    if (!email) {
      setErrorDialogInput({
        ...errorDialogInput,
        title: 'Email required',
        message: 'Passkeyログインにはメールアドレスが必要です。',
        open: true,
      });
      return;
    }
    const optionsResponse = await axios
      .post(
        `${process.env.NEXT_PUBLIC_API_ROOT_URL}/passkey/authentication/options`,
        { email },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )
      .catch((error: AxiosError) => {
        setErrorDialogInput({ ...errorDialogInput, title: 'Passkey認証に失敗しました', message: getErrorMessage(error), open: true });
      });
    if (!optionsResponse) {
      return;
    }
    const credential = await getPasskey(optionsResponse.data.options).catch((error: Error) => {
      setErrorDialogInput({ ...errorDialogInput, title: 'Passkey認証に失敗しました', message: error.message, open: true });
    });
    if (!credential) {
      return;
    }
    const response = await axios
      .post(`${process.env.NEXT_PUBLIC_API_ROOT_URL}/passkey/authentication/verify`, {
        session: optionsResponse.data.challengeSession,
        credential,
      })
      .catch((error: AxiosError) => {
        setErrorDialogInput({ ...errorDialogInput, title: 'Passkey認証に失敗しました', message: getErrorMessage(error), open: true });
      });
    if (response && response.status < 400) {
      window.localStorage.setItem(SessionTokenKey, response.data.session);
      setSessionToken(response.data.session);
      router.push('/settings');
    }
  };
  const handleChangeEmail = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.currentTarget.value);
  };
  const handleChangePassword = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.currentTarget.value);
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
            Sign in
          </Typography>
          <Box sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              onChange={handleChangeEmail}
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              onChange={handleChangePassword}
            />
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} onClick={handleSubmit}>
              Sign In
            </Button>
            <Button fullWidth variant="outlined" sx={{ mb: 2 }} onClick={handlePasskeySignIn}>
              Sign in with Passkey
            </Button>
            <Grid container>
              <Grid></Grid>
              <Grid>
                <Link href="/signup">{'Sign Up'}</Link>
              </Grid>
            </Grid>
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
