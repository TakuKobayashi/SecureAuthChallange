import { SessionTokenKey } from '../commons/localstorage-const-keys';
import { useAuth } from '../context/auth';
import { useState, ChangeEvent } from 'react';
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

interface ErrorDialogInput {
  title: string;
  message: string;
  open: boolean;
}

export default function SignIn() {
  const [errorDialogInput, setErrorDialogInput] = useState<ErrorDialogInput>({
    title: '',
    message: '',
    open: false,
  });
  const router = useRouter();
  const [twoFAActive, setTwoFAActive] = useState(false);
  const [passKeyActive, setPassKeyActive] = useState(false);
  const { setSessionToken } = useAuth();

  const handle2FAToggle = (event: ChangeEvent<HTMLInputElement>) => {
    setTwoFAActive(event.target.checked);
  };
  const handlePassKeyToggle = (event: ChangeEvent<HTMLInputElement>) => {
    setPassKeyActive(event.target.checked);
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
            <FormControlLabel control={<Switch checked={twoFAActive} value={twoFAActive} onChange={handle2FAToggle} />} label="二段階認証" />
            <FormControlLabel control={<Switch checked={passKeyActive} value={passKeyActive} onChange={handlePassKeyToggle} />} label="パスキー" />
          </FormGroup>
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
