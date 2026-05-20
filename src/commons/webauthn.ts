type RegistrationOptionsJSON = Omit<PublicKeyCredentialCreationOptions, 'challenge' | 'user' | 'excludeCredentials'> & {
  challenge: string;
  user: Omit<PublicKeyCredentialUserEntity, 'id'> & { id: string };
  excludeCredentials?: Array<Omit<PublicKeyCredentialDescriptor, 'id'> & { id: string }>;
};

type AuthenticationOptionsJSON = Omit<PublicKeyCredentialRequestOptions, 'challenge' | 'allowCredentials'> & {
  challenge: string;
  allowCredentials?: Array<Omit<PublicKeyCredentialDescriptor, 'id'> & { id: string }>;
};

type RegistrationOptionsJSONWithOptionalRPID = RegistrationOptionsJSON & {
  rp: RegistrationOptionsJSON['rp'] & { id?: string };
};

type AuthenticationOptionsJSONWithOptionalRPID = AuthenticationOptionsJSON & {
  rpId?: string;
};

type PublicKeyCredentialConstructorWithJSON = typeof PublicKeyCredential & {
  parseCreationOptionsFromJSON?: (options: RegistrationOptionsJSONWithOptionalRPID) => PublicKeyCredentialCreationOptions;
  parseRequestOptionsFromJSON?: (options: AuthenticationOptionsJSONWithOptionalRPID) => PublicKeyCredentialRequestOptions;
};

type PublicKeyCredentialWithJSON = PublicKeyCredential & {
  toJSON?: () => unknown;
};

const assertPasskeyAvailable = () => {
  if (typeof window === 'undefined' || !window.isSecureContext) {
    throw new Error('Passkey requires HTTPS or localhost.');
  }
  if (!window.PublicKeyCredential || !navigator.credentials) {
    throw new Error('This browser does not support Passkey.');
  }
};

const shouldOmitClientRPID = (rpID?: string): boolean => {
  if (!rpID) {
    return false;
  }
  return (
    rpID === 'localhost' ||
    rpID === '0.0.0.0' ||
    rpID === '::1' ||
    /^127(?:\.\d{1,3}){3}$/.test(rpID) ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(rpID)
  );
};

const normalizeCreationOptions = (options: RegistrationOptionsJSON): RegistrationOptionsJSONWithOptionalRPID => {
  const normalized: RegistrationOptionsJSONWithOptionalRPID = {
    ...options,
    rp: { ...options.rp },
  };
  if (shouldOmitClientRPID(normalized.rp.id)) {
    delete normalized.rp.id;
  }
  return normalized;
};

const normalizeRequestOptions = (options: AuthenticationOptionsJSON): AuthenticationOptionsJSONWithOptionalRPID => {
  const normalized: AuthenticationOptionsJSONWithOptionalRPID = { ...options };
  if (shouldOmitClientRPID(normalized.rpId)) {
    delete normalized.rpId;
  }
  return normalized;
};

const base64UrlToBuffer = (value: string): ArrayBuffer => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
};

const bufferToBase64Url = (value: ArrayBuffer): string => {
  const bytes = new Uint8Array(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const parseCreationOptions = (options: RegistrationOptionsJSON): PublicKeyCredentialCreationOptions => ({
  ...options,
  challenge: base64UrlToBuffer(options.challenge),
  user: {
    ...options.user,
    id: base64UrlToBuffer(options.user.id),
  },
  excludeCredentials: options.excludeCredentials?.map((credential) => ({
    ...credential,
    id: base64UrlToBuffer(credential.id),
  })),
});

const parseRequestOptions = (options: AuthenticationOptionsJSON): PublicKeyCredentialRequestOptions => ({
  ...options,
  challenge: base64UrlToBuffer(options.challenge),
  allowCredentials: options.allowCredentials?.map((credential) => ({
    ...credential,
    id: base64UrlToBuffer(credential.id),
  })),
});

export async function createPasskey(options: RegistrationOptionsJSON) {
  assertPasskeyAvailable();
  const normalizedOptions = normalizeCreationOptions(options);
  const publicKeyCredential = window.PublicKeyCredential as PublicKeyCredentialConstructorWithJSON;
  const publicKey = publicKeyCredential.parseCreationOptionsFromJSON
    ? publicKeyCredential.parseCreationOptionsFromJSON(normalizedOptions)
    : parseCreationOptions(normalizedOptions);
  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredentialWithJSON | null;
  if (!credential) {
    throw new Error('Passkey registration was cancelled');
  }
  if (typeof credential.toJSON === 'function') {
    return credential.toJSON();
  }
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      attestationObject: bufferToBase64Url(response.attestationObject),
      transports: typeof response.getTransports === 'function' ? response.getTransports() : [],
    },
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: (credential as any).authenticatorAttachment,
  };
}

export async function getPasskey(options: AuthenticationOptionsJSON) {
  assertPasskeyAvailable();
  const normalizedOptions = normalizeRequestOptions(options);
  const publicKeyCredential = window.PublicKeyCredential as PublicKeyCredentialConstructorWithJSON;
  const publicKey = publicKeyCredential.parseRequestOptionsFromJSON
    ? publicKeyCredential.parseRequestOptionsFromJSON(normalizedOptions)
    : parseRequestOptions(normalizedOptions);
  const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredentialWithJSON | null;
  if (!credential) {
    throw new Error('Passkey authentication was cancelled');
  }
  if (typeof credential.toJSON === 'function') {
    return credential.toJSON();
  }
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : undefined,
    },
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: (credential as any).authenticatorAttachment,
  };
}
