export type NavigatorState = "default" | "analyzing" | "warning" | "complete";

export const ROBOT_IMAGE_PATHS: Record<NavigatorState, string> = {
  default: "/images/robot/robot-default.png",
  analyzing: "/images/robot/robot-analyzing.png",
  warning: "/images/robot/robot-warning.png",
  complete: "/images/robot/robot-complete.png",
};

export const STEP_NAVIGATOR_COMMENTS = [
  "画像品質と電極装着を確認します",
  "心電図画像を読み込みます",
  "抽出所見を確認してください",
  "危険な所見を確認します",
  "読影結果を整理しました",
  "次の対応を提示します",
] as const;

const stateLabels: Record<NavigatorState, string> = {
  default: "待機中",
  analyzing: "解析中",
  warning: "警告",
  complete: "解析完了",
};

type NavigatorRobotProps = {
  state?: NavigatorState;
  variant?: "full" | "icon";
  className?: string;
};

export function NavigatorRobot({
  state = "default",
  variant = "full",
  className = "",
}: NavigatorRobotProps) {
  const label = `医療AIナビゲーター：${stateLabels[state]}`;

  return (
    <div
      className={`navigator-robot navigator-robot--${variant} navigator-robot--${state} ${className}`}
      role="img"
      aria-label={label}
      data-navigator-state={state}
      data-image-path={ROBOT_IMAGE_PATHS[state]}
    >
      <div className="navigator-robot__antenna" aria-hidden="true" />
      <div className="navigator-robot__head" aria-hidden="true">
        <span className="navigator-robot__visor">
          <i className="navigator-robot__eye" />
          <i className="navigator-robot__eye" />
        </span>
      </div>
      {variant === "full" && (
        <>
          <div className="navigator-robot__neck" aria-hidden="true" />
          <div className="navigator-robot__body" aria-hidden="true">
            <span className="navigator-robot__display">
              <i />
            </span>
            <span className="navigator-robot__status-dot" />
          </div>
          <div className="navigator-robot__arm navigator-robot__arm--left" aria-hidden="true" />
          <div className="navigator-robot__arm navigator-robot__arm--right" aria-hidden="true" />
          <div className="navigator-robot__base" aria-hidden="true" />
        </>
      )}
      <span className="sr-only">{stateLabels[state]}</span>
    </div>
  );
}
