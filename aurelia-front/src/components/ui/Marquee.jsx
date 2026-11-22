export default function Marquee({ duration = 50, children }) {
  return (
    <div className="mqw">
      <div className="mq" style={{ animationDuration: duration + 's' }}>{children}{children}</div>
    </div>
  );
}
