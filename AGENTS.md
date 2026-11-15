# Architecture decisions

- Wrap route rendering in a shared error boundary so failed lazy page imports can recover without leaving users on a blank screen.