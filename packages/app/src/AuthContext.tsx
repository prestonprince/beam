import { type ReactNode, useContext, createContext } from "react";
import { client } from "./lib/api";

type CallbackArgs = {
  state: string;
  code: string;
};

type UserInfo = {
  userId: string;
  email: string;
  username: string;
};

function decodeJWT(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      userId: payload.userId,
      email: payload.email,
      username: payload.username,
    } as UserInfo;
  } catch {
    return null;
  }
}

export type AuthContextType = {
  login(): Promise<void>;
  callback(args: CallbackArgs): Promise<boolean>;
  isAuthenticated(): boolean;
  getCurrentUser(): UserInfo | null;
};

const AuthContext = createContext({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const login = async () => {
    const response = await client.api.auth.github.$get();
    if (response.ok) {
      const { stateId, url } = await response.json();
      localStorage.setItem("stateId", stateId);
      window.location.href = url;
    }
  };

  const isAuthenticated = () => {
    const jwt = localStorage.getItem("jwt");
    return jwt ? decodeJWT(jwt) !== null : false;
  };

  const getCurrentUser = () => {
    const jwt = localStorage.getItem("jwt");
    return jwt ? decodeJWT(jwt) : null;
  };

  const callback = async ({ state, code }: CallbackArgs) => {
    const stateId = localStorage.getItem("stateId");
    if (!stateId) {
      return false;
    }

    const response = await client.api.auth.github.callback.$post({
      json: {
        state,
        code,
        stateId,
      },
    });
    if (!response.ok) {
      return false;
    }
    localStorage.removeItem("stateId");

    const { jwt } = await response.json();
    localStorage.setItem("jwt", jwt);

    const userInfo = decodeJWT(jwt);
    if (!userInfo) {
      return false;
    }

    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        login,
        callback,
        isAuthenticated,
        getCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
