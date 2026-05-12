import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State { error: Error | null; info: string | null; }

/**
 * Catches render-time errors anywhere in the admin tree and shows a visible
 * overlay instead of leaving the panel blank. Without this, a single bad
 * subtree (e.g. a TabsContent outside Tabs) was painting the whole page black.
 */
export class AdminErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error, info: info.componentStack || null });
    // Surface to console for the diagnostics panel
    (window as any).__ADMIN_LAST_ERROR__ = {
      message: error.message,
      stack: error.stack,
      component: info.componentStack,
      at: new Date().toISOString(),
    };
    console.error("[AdminErrorBoundary]", error, info);
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-background p-4 sm:p-8">
        <Card className="max-w-3xl mx-auto border-destructive/40 bg-card/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="w-5 h-5" /> Admin panel hit a render error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-foreground font-mono break-words">
              {this.state.error.message}
            </p>
            {this.state.info && (
              <pre className="text-[10px] text-muted-foreground overflow-auto max-h-64 p-3 rounded-lg bg-muted/30 border border-border whitespace-pre-wrap">
                {this.state.info}
              </pre>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={this.reset} variant="outline">
                <RefreshCw className="w-3 h-3 mr-1" /> Retry render
              </Button>
              <Button size="sm" onClick={() => window.location.reload()}>
                Hard reload
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Tip: check the Settings → Diagnostics card for the last successful queries and theme state.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
