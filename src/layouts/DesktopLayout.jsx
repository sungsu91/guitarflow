import BrandHeader from "../components/BrandHeader";

const DESKTOP_NAV_ITEMS = [
  { href: "#rhythm-training", label: "훈련장" },
  { href: "#fretboard", label: "지판보기" },
  { href: "#metronome", label: "메트로놈" },
  { href: "#shooter", label: "슈팅게임" },
  { href: "#stage3-storage", label: "저장실" },
];

export default function DesktopLayout({ children }) {
  return (
    <div className="desktopLayout">
      <aside className="desktopSidebar" aria-label="RIFFLAB desktop navigation">
        <BrandHeader />
        <nav className="desktopNav" aria-label="데스크톱 메뉴">
          {DESKTOP_NAV_ITEMS.map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <section className="desktopWorkspace" aria-label="RIFFLAB workspace">
        <div className="desktopWorkspaceHeader">
          <strong>Guitar Training Workspace</strong>
          <span>모바일 앱 경험을 유지하면서 데스크톱 확장을 준비합니다.</span>
        </div>
        <div className="desktopWorkspaceContent">
          {children}
        </div>
      </section>
    </div>
  );
}
