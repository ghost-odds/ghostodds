export function HowItWorks() {
  const steps = [
    { icon: "🎯", title: "Pick a Market", desc: "Browse predictions on crypto, DeFi, and more." },
    { icon: "💰", title: "Trade Shares", desc: "Buy YES or NO shares. Prices reflect probability." },
    { icon: "🏆", title: "Win or Redeem", desc: "Correct predictions pay $1 per share. No KYC required." },
  ];

  return (
    <div className="mt-16 mb-8">
      <h2 className="text-2xl font-bold text-text-primary text-center mb-8">How It Works</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {steps.map((s) => (
          <div key={s.title} className="bg-surface border border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors">
            <div className="text-4xl mb-3">{s.icon}</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">{s.title}</h3>
            <p className="text-sm text-text-secondary">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
