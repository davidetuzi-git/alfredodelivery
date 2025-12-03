import { useState, useEffect } from "react";

const IMPERSONATION_KEY = "admin_impersonating_user";

export interface ImpersonationState {
  isImpersonating: boolean;
  impersonatedUserId: string | null;
  impersonatedUserName: string | null;
}

export const useImpersonation = () => {
  const [state, setState] = useState<ImpersonationState>({
    isImpersonating: false,
    impersonatedUserId: null,
    impersonatedUserName: null,
  });

  useEffect(() => {
    const stored = localStorage.getItem(IMPERSONATION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState({
          isImpersonating: true,
          impersonatedUserId: parsed.userId,
          impersonatedUserName: parsed.userName,
        });
      } catch {
        localStorage.removeItem(IMPERSONATION_KEY);
      }
    }
  }, []);

  const startImpersonation = (userId: string, userName: string) => {
    const data = { userId, userName };
    localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(data));
    setState({
      isImpersonating: true,
      impersonatedUserId: userId,
      impersonatedUserName: userName,
    });
  };

  const stopImpersonation = () => {
    localStorage.removeItem(IMPERSONATION_KEY);
    setState({
      isImpersonating: false,
      impersonatedUserId: null,
      impersonatedUserName: null,
    });
  };

  const getEffectiveUserId = (currentUserId: string | undefined) => {
    if (state.isImpersonating && state.impersonatedUserId) {
      return state.impersonatedUserId;
    }
    return currentUserId;
  };

  return {
    ...state,
    startImpersonation,
    stopImpersonation,
    getEffectiveUserId,
  };
};
