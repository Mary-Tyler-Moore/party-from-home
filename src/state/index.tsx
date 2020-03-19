import React, { createContext, useContext, useState } from 'react';
import { TwilioError } from 'twilio-video';
import usePasscodeAuth from './usePasscodeAuth/usePasscodeAuth';

export interface User {
  uid: string;
  displayName: string;
  photoURL: string;
  passcode?: string;
  token?: string;
}

export interface StateContextType {
  error: TwilioError | null;
  setError(error: TwilioError | null): void;
  getToken(name: string, room: string, passcode?: string): Promise<string>;
  getSyncToken(): Promise<string>;
  user?: User | null;
  setUser?(displayName: string, photoURL?: string): Promise<void>;
  signIn?(passcode?: string): Promise<void>;
  signOut?(): Promise<void>;
  isAuthReady?: boolean;
}

export const StateContext = createContext<StateContextType>(null!);

/*
  The 'react-hooks/rules-of-hooks' linting rules prevent React Hooks fron being called
  inside of if() statements. This is because hooks must always be called in the same order
  every time a component is rendered. The 'react-hooks/rules-of-hooks' rule is disabled below
  because the "if (process.env.REACT_APP_SET_AUTH === 'firebase')" statements are evaluated
  at build time (not runtime). If the statement evaluates to false, then the code is not
  included in the bundle that is produced (due to tree-shaking). Thus, in this instance, it
  is ok to call hooks inside if() statements.
*/
export default function AppStateProvider(props: React.PropsWithChildren<{}>) {
  const [error, setError] = useState<TwilioError | null>(null);
  let contextValue = {
    error,
    setError,
  } as StateContextType;

  if (process.env.REACT_APP_SET_AUTH === 'passcode') {
    contextValue = {
      ...contextValue,
      ...usePasscodeAuth(), // eslint-disable-line react-hooks/rules-of-hooks
    };
  } else {
    contextValue = {
      ...contextValue,
      getToken: async (identity, roomName) => {
        const headers = new window.Headers();
        const endpoint = process.env.REACT_APP_TOKEN_ENDPOINT || '/api/token';
        const params = new window.URLSearchParams({ identity, roomName });

        return fetch(`${endpoint}?${params}`, { headers }).then(res => res.text());
      },
    };
  }

  const getToken: StateContextType['getToken'] = (name, room) =>
    contextValue.getToken(name, room).catch(err => {
      setError(err);
      return Promise.reject(err);
    });

  const getSyncToken: StateContextType['getSyncToken'] = () => {
    const identity = contextValue.user?.uid;
    const passcode = contextValue.user?.passcode;

    return new Promise((resolve, reject) => {
      fetch(`/api/sync_token?identity=${identity}`)
        .then(res => {
          res
            .text()
            .then(token => resolve(token))
            .catch(reject);
        })
        .catch(reject);
    });
  };

  return (
    <StateContext.Provider value={{ ...contextValue, getToken, getSyncToken }}>{props.children}</StateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used within the AppStateProvider');
  }
  return context;
}
