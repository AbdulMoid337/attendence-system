let activeSession = null;
export const getActiveSession = () => activeSession;

export const setActiveSession = (newSession) => {
  activeSession = newSession;
};

export const clearActiveSession = () => {
  activeSession = null;
};
