import { Mail, Send } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from '../../hooks/useTranslation'
import { haptic } from '../../hooks/useHaptics'
import DarkCard from './DarkCard'



export default function ContactFooter() {
  const { lang } = useTranslation()
  const isAr = lang === 'ar'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full mt-4"
    >
      <DarkCard className="p-5 border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent relative overflow-hidden rounded-2xl shadow-xl">
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-accent/3 rounded-full blur-lg pointer-events-none" />

        <div className="flex flex-col items-center text-center gap-3 relative z-10">
          <h3 className="font-bold text-accent text-sm tracking-wide uppercase">
            {isAr ? 'تواصل معنا' : 'Contact Us'}
          </h3>
          <p className="text-xs font-bold text-text-primary">
            {isAr ? 'معروف أحمد' : 'Maruf Ahmed'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-1.5 w-full">
            {/* Email */}
            <a
              href="mailto:ahmedmaruf474@gmail.com"
              onClick={() => haptic.light()}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-bg-surface hover:bg-accent/5 border border-border hover:border-accent/40 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] group duration-200"
            >
              <Mail size={15} className="text-accent group-hover:scale-110 transition-transform" />
              <span className="text-text-secondary group-hover:text-text-primary" dir="ltr">ahmedmaruf474@gmail.com</span>
            </a>

            {/* Telegram */}
            <a
              href="https://t.me/LION_DADDY"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptic.light()}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-bg-surface hover:bg-blue-500/5 border border-border hover:border-blue-400/40 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] group duration-200"
            >
              <Send size={15} className="text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-text-secondary group-hover:text-text-primary" dir="ltr">@LION_DADDY</span>
            </a>
          </div>
        </div>
      </DarkCard>
    </motion.div>
  )
}

