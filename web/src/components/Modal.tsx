import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export const Modal = ({ title, onClose, children }: ModalProps) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal__backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Card
          title={title}
          action={
            <Button variant="tertiary" size="sm" onClick={onClose} aria-label="Close dialog">
              Close
            </Button>
          }
        >
          {children}
        </Card>
      </div>
    </div>
  );
};
