import { FloatingNav } from "@/components/FloatingNav";
import { Vault, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";

const BlackVault = () => {
  const transactions = [
    { type: "Earning", amount: "+$2,450", date: "2 hours ago", status: "success", icon: ArrowUpRight },
    { type: "Course Payment", amount: "-$199", date: "1 day ago", status: "pending", icon: ArrowDownRight },
    { type: "Referral Bonus", amount: "+$350", date: "2 days ago", status: "success", icon: ArrowUpRight },
    { type: "Token Purchase", amount: "-$500", date: "3 days ago", status: "success", icon: ArrowDownRight },
    { type: "Achievement Reward", amount: "+$1,200", date: "5 days ago", status: "success", icon: ArrowUpRight },
  ];

  return (
    <div className="min-h-screen p-8 relative overflow-hidden">
      <FloatingNav />
      
      {/* Animated background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-background to-gold/5">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-gold/20 rounded-full animate-particle blur-sm"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto">
        <header className="mb-12 animate-slide-up">
          <h1 className="text-5xl font-bold mb-3 gradient-text-wealth flex items-center gap-3">
            <Vault className="w-12 h-12" />
            BlackVault
          </h1>
          <p className="text-xl text-muted-foreground">
            Transaction & Earnings Nexus — Your financial command center
          </p>
        </header>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-wealth rounded-3xl p-8 shadow-depth-xl card-3d animate-scale-in">
            <DollarSign className="w-10 h-10 text-white mb-4" />
            <p className="text-white/80 text-sm mb-2">Total Balance</p>
            <h2 className="text-4xl font-bold text-white">$15,430</h2>
          </div>
          
          <div className="bg-gradient-green rounded-3xl p-8 shadow-depth-xl card-3d animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <TrendingUp className="w-10 h-10 text-white mb-4" />
            <p className="text-white/80 text-sm mb-2">This Month</p>
            <h2 className="text-4xl font-bold text-white">+$3,801</h2>
          </div>
          
          <div className="bg-gradient-purple rounded-3xl p-8 shadow-depth-xl card-3d animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <Vault className="w-10 h-10 text-white mb-4" />
            <p className="text-white/80 text-sm mb-2">Available</p>
            <h2 className="text-4xl font-bold text-white">$12,980</h2>
          </div>
        </div>

        {/* Transaction History */}
        <div className="glass-strong rounded-3xl p-8 shadow-depth-xl animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-2xl font-bold mb-6 gradient-text-wealth">Transaction History</h2>
          
          <div className="space-y-4">
            {transactions.map((transaction, index) => {
              const Icon = transaction.icon;
              const isPositive = transaction.amount.startsWith('+');
              
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-5 rounded-2xl bg-background/50 hover:bg-background/80 transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isPositive ? 'bg-accent/20' : 'bg-secondary/20'}`}>
                      <Icon className={`w-5 h-5 ${isPositive ? 'text-accent' : 'text-secondary'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{transaction.type}</p>
                      <p className="text-sm text-muted-foreground">{transaction.date}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-xl font-bold ${isPositive ? 'text-accent' : 'text-secondary'}`}>
                      {transaction.amount}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{transaction.status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlackVault;
