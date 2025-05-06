import { SessionTokenKey } from '../commons/localstorage-const-keys';
import { useAuth } from '../context/auth';
import { useState, ChangeEvent } from 'react';
import {
  Box,
  Button,
  Checkbox,
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
        setErrorDialogInput({ ...errorDialogInput, title: '認証に失敗しました', message: error.message, open: true });
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
            <FormControlLabel control={<Checkbox value="remember" color="primary" />} label="Remember me" />
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} onClick={handleSubmit}>
              Sign In
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
