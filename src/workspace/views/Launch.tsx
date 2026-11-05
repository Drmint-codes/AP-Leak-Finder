import { AlertCircle, ArrowRight, Upload } from 'lucide-react'

interface LaunchProps {
  onRunSample: () => void
  onUseOwn: () => void
  /** Set while the checks are running, so the same view reports progress. */
  running?: boolean
  note?: string
  /** The shell titles every page but the Overview, which draws its own heading. */
  showHeading?: boolean
}

/** The Overview for a workspace with no audit in it yet: the dashboard, with one way forward. */
export function Launch({ onRunSample, onUseOwn, running = false, note, showHeading = false }: LaunchProps) {
  return (
    <>
      {showHeading ? (
        <header className="wk-head">
          <div className="wk-head-copy">
            <h1>Overview</h1>
          </div>
        </header>
      ) : null}
      <section className="wk-section">
        <div className="wk-empty">
          <span className="wk-label">No audit yet</span>
          <p>Upload a CSV export of your payments, or try Reclaim on a made-up sample. Nothing is sent to a vendor unless you send it.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            <button type="button" className="wk-btn" data-variant="primary" disabled={running} onClick={onUseOwn}>
              <Upload aria-hidden="true" />
              Upload a ledger
            </button>
            <button type="button" className="wk-btn" data-variant="outline" disabled={running} onClick={onRunSample}>
              Run the sample
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Always in the tree, so screen readers hear the change when it starts. */}
        <div className="wk-launch-status" role="status" aria-live="polite">
          {running ? (
            <>
              <span className="wk-launch-spinner" aria-hidden="true" />
              <span className="wk-launch-status-copy">
                <strong>Reading the ledger…</strong>
                <small>Running the checks against every payment record.</small>
              </span>
              <i className="wk-launch-progress" aria-hidden="true" />
            </>
          ) : null}
        </div>

        {note ? (
          <div className="wk-callout" data-tone="danger" role="alert">
            <AlertCircle aria-hidden="true" />
            <p>{note}</p>
          </div>
        ) : null}
      </section>
    </>
  )
}
