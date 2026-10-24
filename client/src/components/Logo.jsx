export const BaykeepIcon = ({ className = 'h-8 w-8' }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topFace" x1="16" y1="14" x2="84" y2="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#4F46E5"/>
        <stop offset="100%" stopColor="#4338CA"/>
      </linearGradient>
      <linearGradient id="leftFace" x1="16" y1="35" x2="48" y2="86" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3730A3"/>
        <stop offset="100%" stopColor="#312E81"/>
      </linearGradient>
      <linearGradient id="cyanAccent" x1="34" y1="34" x2="84" y2="70" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38BDF8"/>
        <stop offset="100%" stopColor="#06B6D4"/>
      </linearGradient>
    </defs>
    <path d="M50 14L84 32.5L50 51L16 32.5L50 14Z" fill="url(#topFace)"/>
    <path d="M50 14L50 51" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 36L48 53.5V86L16 68.5V36Z" fill="url(#leftFace)"/>
    <path d="M22 43L42 54V77L22 66V43Z" fill="#0EA5E9" fillOpacity="0.25"/>
    <path d="M52 53.5L84 36V68.5L52 86V53.5Z" fill="#1E1B4B"/>
    <path d="M38 52L50 65L82 32" stroke="url(#cyanAccent)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const BaykeepLogo = ({ className = '' }) => (
  <div className={`flex items-center gap-2.5 ${className}`}>
    <BaykeepIcon className="h-8 w-8 shrink-0" />
    <div className="flex flex-col">
      <span className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
        Bay<span className="text-indigo-600">keep</span>
      </span>
      <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase mt-0.5">
        Inventory &amp; Ledger
      </span>
    </div>
  </div>
);

export default BaykeepLogo;