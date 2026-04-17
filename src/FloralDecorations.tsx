export function FloralDecorations() {
  return (
    <>
      <svg 
        className="fixed z-0 pointer-events-none opacity-[0.18]" 
        style={{ top: '-60px', left: '-60px', transform: 'rotate(-20deg)' }}
        width="240" 
        height="240" 
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="15" fill="#e8c9be"/>
        <ellipse cx="100" cy="60" rx="20" ry="35" fill="#e8c9be" transform="rotate(0 100 100)"/>
        <ellipse cx="100" cy="60" rx="20" ry="35" fill="#c5dbc8" transform="rotate(45 100 100)"/>
        <ellipse cx="100" cy="60" rx="20" ry="35" fill="#e8c9be" transform="rotate(90 100 100)"/>
        <ellipse cx="100" cy="60" rx="20" ry="35" fill="#c5dbc8" transform="rotate(135 100 100)"/>
        <ellipse cx="100" cy="60" rx="20" ry="35" fill="#e8c9be" transform="rotate(180 100 100)"/>
        <ellipse cx="100" cy="60" rx="20" ry="35" fill="#c5dbc8" transform="rotate(225 100 100)"/>
        <ellipse cx="100" cy="60" rx="20" ry="35" fill="#e8c9be" transform="rotate(270 100 100)"/>
        <ellipse cx="100" cy="60" rx="20" ry="35" fill="#c5dbc8" transform="rotate(315 100 100)"/>
      </svg>
      
      <svg 
        className="fixed z-0 pointer-events-none opacity-[0.18]" 
        style={{ bottom: '-60px', right: '-60px', transform: 'rotate(160deg)' }}
        width="300" 
        height="300" 
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="12" fill="#c5dbc8"/>
        <ellipse cx="100" cy="55" rx="25" ry="40" fill="#e8c9be" transform="rotate(0 100 100)"/>
        <ellipse cx="100" cy="55" rx="25" ry="40" fill="#f7ede8" transform="rotate(60 100 100)"/>
        <ellipse cx="100" cy="55" rx="25" ry="40" fill="#e8c9be" transform="rotate(120 100 100)"/>
        <ellipse cx="100" cy="55" rx="25" ry="40" fill="#f7ede8" transform="rotate(180 100 100)"/>
        <ellipse cx="100" cy="55" rx="25" ry="40" fill="#e8c9be" transform="rotate(240 100 100)"/>
        <ellipse cx="100" cy="55" rx="25" ry="40" fill="#f7ede8" transform="rotate(300 100 100)"/>
      </svg>
    </>
  );
}
