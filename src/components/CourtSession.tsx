export default function CourtSession() {
  return (
    <div className="flex flex-col items-center justify-center border-2 border-ink bg-paper px-6 py-20 text-center">
      <img src="/logo.png" alt="" className="mb-6 h-12 w-12 animate-blink" />
      <p className="font-mono text-sm tracking-widest2 text-ink">COURT IS NOW IN SESSION</p>
      <p className="mt-2 font-mono text-xs text-stone">
        reading the chain, then the judge&nbsp;...
      </p>
    </div>
  );
}
