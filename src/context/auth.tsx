import { createContext, ReactNode, useState, useContext, Dispatch } from 'react';

interface UserContextState {
  sessionToken?: string;
  setSessionToken: Dispatch<string | undefined>;
}

// コンテクストを作成
export const AuthContext = createContext<UserContextState>({
  setSessionToken: () => {},
});

// 以下のコードを追加
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [sessionToken, setSessionToken] = useState<string>();
  // プロバイダーを作成し、配布物を格納する
  return <AuthContext.Provider value={{ sessionToken: sessionToken, setSessionToken: setSessionToken }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
