export default function TaxiIllustration() {
  return <svg className="taxi-illustration" viewBox="0 0 800 400" role="img" aria-label="IntelliMarg sea-glass taxi, side profile">
    <ellipse cx="410" cy="323" rx="310" ry="20" fill="#111C21" opacity=".3" />
    <path d="M85 282 103 222 227 201 303 126 484 126 583 203 700 231 730 286 714 313 90 313Z" fill="#A8C5BF" stroke="#477781" strokeWidth="3" />
    <path d="m254 201 62-60h73v60zm151-60h72l77 60H405Z" fill="#263B43"/>
    <path d="M398 209v88m164-88 29 87M110 254h60m490 0h47" fill="none" stroke="#477781" strokeWidth="3"/>
    <rect x="357" y="108" width="63" height="20" rx="3" fill="#F2F3EF"/><text x="389" y="123" textAnchor="middle" fontSize="13" fill="#111C21">TAXI</text>
    {[218,606].map(x=><g key={x}><circle cx={x} cy="299" r="48" fill="#111C21"/><circle cx={x} cy="299" r="29" fill="#899B9F"/><circle cx={x} cy="299" r="16" fill="#263B43"/></g>)}
    <text x="400" y="263" textAnchor="middle" fontSize="22" fill="#263B43" fontFamily="sans-serif" letterSpacing="4">INTELLIMARG</text>
  </svg>;
}
