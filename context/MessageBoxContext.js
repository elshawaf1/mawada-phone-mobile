import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useTranslation, useAppSettings } from './AppSettingsContext';
import MessageBox from '../components/MessageBox';

const MessageBoxContext = createContext(null);

export function MessageBoxProvider({ children }) {
  const [boxState, setBoxState] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });
  const { t } = useTranslation();
  const { isRTL } = useAppSettings();
  const autoDismissRef = useRef(3000);

  const showMessageBox = useCallback(
    ({ type = 'info', title = '', message = '', buttons = [], autoDismissMs = 3000 }) => {
      autoDismissRef.current = autoDismissMs;
      setBoxState({
        visible: true,
        type,
        title,
        message,
        buttons,
      });
    },
    []
  );

  const hideMessageBox = useCallback(() => {
    setBoxState((prev) => ({ ...prev, visible: false }));
  }, []);

  const { visible, type, title, message, buttons } = boxState;

  return (
    <MessageBoxContext.Provider value={{ showMessageBox, hideMessageBox }}>
      {children}
      <MessageBox
        visible={visible}
        type={type}
        title={title}
        message={message}
        buttons={buttons}
        onClose={hideMessageBox}
        t={t}
        isRTL={isRTL}
        autoDismissMs={
          type === 'success' || type === 'info' ? autoDismissRef.current : undefined
        }
      />
    </MessageBoxContext.Provider>
  );
}

export function useMessageBox() {
  const ctx = useContext(MessageBoxContext);
  if (!ctx) throw new Error('useMessageBox must be used within MessageBoxProvider');
  return ctx;
}
