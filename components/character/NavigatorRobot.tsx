import Image from "next/image";
import { useState } from "react";

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
  warning: "Red Flag",
  complete: "確認完了",
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
  const [imageAvailable, setImageAvailable] = useState(true);

  return (
    <div
      className={`navigator-robot navigator-robot--${variant} navigator-robot--${state} ${className}`}
      role="img"
      aria-label={label}
      data-navigator-state={state}
      data-image-path={ROBOT_IMAGE_PATHS[state]}
    >
      {imageAvailable ? (
        <Image
          className="navigator-robot__image"
          src={ROBOT_IMAGE_PATHS[state]}
          alt=""
          width={1254}
          height={1254}
          sizes={variant === "icon" ? "42px" : "112px"}
          loading="eager"
          onError={() => setImageAvailable(false)}
        />
      ) : (
        <span className="navigator-robot__fallback" aria-hidden="true">
          <span className="navigator-robot__antenna" />
          <span className="navigator-robot__head">
            <span className="navigator-robot__visor">
              <i className="navigator-robot__eye" />
              <i className="navigator-robot__eye" />
            </span>
          </span>
          {variant === "full" && (
            <>
              <span className="navigator-robot__neck" />
              <span className="navigator-robot__body">
                <span className="navigator-robot__display"><i /></span>
                <span className="navigator-robot__status-dot" />
              </span>
              <span className="navigator-robot__arm navigator-robot__arm--left" />
              <span className="navigator-robot__arm navigator-robot__arm--right" />
              <span className="navigator-robot__base" />
            </>
          )}
        </span>
      )}
      <span className="sr-only">{stateLabels[state]}</span>
    </div>
  );
}
