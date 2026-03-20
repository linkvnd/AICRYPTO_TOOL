import { motion, AnimatePresence } from 'motion/react';
import { Shield, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  language: 'vi' | 'en';
}

export default function TermsModal({ isOpen, onAccept, language }: TermsModalProps) {
  if (!isOpen) return null;

  const content = {
    vi: {
      title: 'Quy định & Bản quyền 2026',
      description: 'Chào mừng bạn đến với AI TM3. Vui lòng đọc kỹ các quy định sau trước khi sử dụng dịch vụ.',
      terms: [
        {
          icon: <Shield className="w-4 h-4 text-emerald-500" />,
          title: 'Bảo mật dữ liệu',
          text: 'Dữ liệu được mã hóa và lưu trữ an toàn trên hệ thống Firebase.'
        },
        {
          icon: <CheckCircle2 className="w-4 h-4 text-blue-500" />,
          title: 'Quyền sở hữu',
          text: 'Tất cả nội dung và thiết kế thuộc bản quyền của AI TM3.'
        },
        {
          icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
          title: 'Trách nhiệm',
          text: 'Không sử dụng AI để tạo ra các nội dung độc hại hoặc vi phạm pháp luật.'
        }
      ],
      button: 'Tôi đồng ý',
      footer: '© 2026 AI TM3. Tất cả quyền được bảo lưu.'
    },
    en: {
      title: 'Terms & Copyright 2026',
      description: 'Welcome to AI TM3. Please read the following regulations carefully.',
      terms: [
        {
          icon: <Shield className="w-4 h-4 text-emerald-500" />,
          title: 'Data Privacy',
          text: 'Data is encrypted and stored securely on Firebase.'
        },
        {
          icon: <CheckCircle2 className="w-4 h-4 text-blue-500" />,
          title: 'Ownership',
          text: 'All content and design are copyrighted by AI TM3.'
        },
        {
          icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
          title: 'Responsibility',
          text: 'Do not use AI to create harmful or illegal content.'
        }
      ],
      button: 'I Agree',
      footer: '© 2026 AI TM3. All rights reserved.'
    }
  };

  const t = content[language];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative"
        >
          <div className="p-8 space-y-6">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {t.title}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.description}
              </p>
            </div>

            <div className="space-y-4">
              {t.terms.map((term, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex gap-3 items-start"
                >
                  <div className="flex-shrink-0 mt-1 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    {term.icon}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{term.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {term.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="space-y-4 pt-2">
              <button
                onClick={onAccept}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
              >
                {t.button}
              </button>
              <p className="text-[9px] text-center text-slate-400 uppercase tracking-widest font-bold">
                {t.footer}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
