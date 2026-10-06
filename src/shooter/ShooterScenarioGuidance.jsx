import './scenario-guidance.css';

// All instruments share the same announcement content; the scene owns placement.
export default function ShooterScenarioGuidance({ countdown, layout = 'mobile' }) {
  const { sectionLabel, sectionAnnouncement, seconds } = countdown;
  return (
    <div className={`shooterScenarioGuidance shooterScenarioGuidance--${layout}`} role="status" aria-live="polite" aria-atomic="true">
      <h2>{sectionLabel}</h2>
      {sectionAnnouncement && sectionAnnouncement !== sectionLabel ? <p>{sectionAnnouncement}</p> : null}
      <b className="shooterScenarioGuidanceCount">{seconds}</b>
    </div>
  );
}
