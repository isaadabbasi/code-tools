const ActivityObserver = (function(_ctx) {
  let ActivityObserverCore = {
    snapshots: [],
    timeout: null,

    timer: fn => setTimeout(fn, 10 * 1000),
    clearTimeouts() {
      clearTimeout(this.timeout);
      this.timeout = null;
    },
    onFocus() {
      this.snap = this.snapshots.push(new Date());
      this.clearTimeouts();
      const lastSnapshot =
        this.snapshots.length > 0
          ? this.snapshots[this.snapshots.length - 1]
          : null;
      this.timeout = this.timer(
        function(lastSnapshot) {
          localStorage.setItem('LastActivity', lastSnapshot);
        }.bind(this, lastSnapshot)
      );
    },
    onBlur() {
      this.snapshots = [];
    }
  };

  document.addEventListener('click', () => ActivityObserver.onFocus());
  return ActivityObserverCore;
})(this);
