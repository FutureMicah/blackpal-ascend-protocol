import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> Back to dashboard
        </Link>

        <div className="frost-card p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Academy Terms &amp; Conditions</h1>
              <p className="text-xs text-muted-foreground">Practice-account ladder rules</p>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              The full Terms &amp; Conditions are being drafted by the academy team.
              This page is a placeholder — the document will be added here once finalised.
            </p>

            <h3>Practice-account ladder (summary)</h3>
            <ol>
              <li><strong>Starter $200,000</strong> — grow to $300,000 to request a $200,000 cash-out.</li>
              <li><strong>Builder $500,000</strong> — grow to $600,000 to request a $100,000 cash-out.</li>
              <li><strong>Master $1,000,000</strong> — grow to $1,100,000 to request a $100,000 cash-out.</li>
              <li><strong>Pro $2,000</strong> — requires a $1,000 activation top-up. Grow to $3,000 to request a $1,000 cash-out.</li>
              <li><strong>Elite $5,000</strong> — requires a $1,000 activation top-up. Grow to $6,000 to request a $1,000 cash-out.</li>
            </ol>

            <p className="text-xs text-muted-foreground">
              Every cash-out must be approved by an admin. After approval the practice account is reset to its starting balance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
