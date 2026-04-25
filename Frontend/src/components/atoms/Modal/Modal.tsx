import React, { useEffect, useCallback } from 'react';
import { cn } from '../../../lib/utils';
import { X, AlertTriangle, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from '../Button';
import { motion, AnimatePresence } from 'framer-motion';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  className?: string;
  footer?: React.ReactNode;
  variant?: 'default' | 'danger' | 'success' | 'warning';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw] max-h-[90vh]',
};

const variantHeaderStyles = {
  default: 'from-white/[0.04] to-transparent',
  danger: 'from-danger-500/10 to-transparent',
  success: 'from-success-500/10 to-transparent',
  warning: 'from-warning-500/10 to-transparent',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  className,
  footer,
  variant = 'default',
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gradient-to-br from-neutral-950/78 via-neutral-950/66 to-neutral-950/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,27,45,0.96)_0%,rgba(10,18,32,0.98)_100%)] shadow-float',
              sizeClasses[size],
              className
            )}
          >
            {/* Top gradient line */}
            <div className={cn(
              'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r',
              variant === 'default' && 'from-brand-500 to-brand-600',
              variant === 'danger' && 'from-danger-500 to-danger-600',
              variant === 'success' && 'from-success-500 to-emerald-500',
              variant === 'warning' && 'from-warning-500 to-amber-500'
            )} />

            {/* Header */}
            <div className={cn(
              'border-b border-white/10 px-6 py-5',
              variantHeaderStyles[variant]
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {variant !== 'default' && (
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      variant === 'danger' && 'bg-danger-500/12 text-danger-200 border border-danger-400/20',
                      variant === 'success' && 'bg-success-500/12 text-success-200 border border-success-400/20',
                      variant === 'warning' && 'bg-warning-500/12 text-warning-100 border border-warning-400/20'
                    )}>
                      {variant === 'danger' && <AlertTriangle className="w-5 h-5" />}
                      {variant === 'success' && <CheckCircle className="w-5 h-5" />}
                      {variant === 'warning' && <AlertCircle className="w-5 h-5" />}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                    <p className="mt-0.5 text-xs text-neutral-500">Fill in details below</p>
                  </div>
                </div>
                {showCloseButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 rounded-full p-0 text-neutral-500 transition-all hover:bg-white/8 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="scrollbar-thin max-h-[60vh] overflow-y-auto px-6 py-5">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-5 bg-gradient-to-b from-white/[0.02] to-transparent">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: {
      icon: 'bg-danger-100 text-danger-600',
      button: 'bg-gradient-to-br from-danger-500 to-danger-600 hover:from-danger-600 hover:to-danger-700 shadow-danger-200',
      dot: 'bg-danger-500',
    },
    warning: {
      icon: 'bg-warning-100 text-warning-600',
      button: 'bg-gradient-to-br from-warning-500 to-amber-500 hover:from-warning-600 hover:to-amber-600 shadow-warning-200',
      dot: 'bg-warning-500',
    },
    default: {
      icon: 'bg-brand-100 text-brand-600',
      button: 'bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 shadow-brand-200',
      dot: 'bg-brand-500',
    },
  };

  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gradient-to-br from-neutral-950/78 via-neutral-950/66 to-neutral-950/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,27,45,0.96)_0%,rgba(10,18,32,0.98)_100%)] shadow-float"
          >
            {/* Top gradient line */}
            <div className={cn(
              'absolute top-0 left-0 right-0 h-1',
              variant === 'danger' && 'bg-gradient-to-r from-danger-400 via-danger-500 to-danger-600',
              variant === 'warning' && 'bg-gradient-to-r from-warning-400 via-warning-500 to-amber-500',
              variant === 'default' && 'bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600'
            )} />

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                  styles.icon
                )}>
                  {icon || (
                    variant === 'danger' ? <AlertTriangle className="w-6 h-6" /> :
                    variant === 'warning' ? <AlertCircle className="w-6 h-6" /> :
                    <Info className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">{message}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 h-11 rounded-full font-medium"
                >
                  {cancelText}
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={cn(
                    'flex-1 h-11 text-white font-medium rounded-xl transition-all',
                    styles.button,
                    'shadow-lg hover:shadow-xl'
                  )}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    confirmText
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

Modal.displayName = 'Modal';
ConfirmDialog.displayName = 'ConfirmDialog';

export default Modal;
