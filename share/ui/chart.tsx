"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@shared/lib/utils";

// Format: { [key in keyof any]: { label: string, color?: string, icon?: React.ComponentType } }
export type ChartConfig = {
  [k in string]: {
    label: React.ReactNode;
    color?: string;
    icon?: React.ComponentType;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a ChartContainer.");
  }
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ id, className, config, children, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-grid-horizontal_line]:stroke-slate-200 [&_.recharts-cartesian-grid-vertical_line]:stroke-slate-200 [&_.recharts-curve.recharts-area]:fill-opacity-50 [&_.recharts-curve.recharts-line]:fill-none [&_.recharts-default-tooltip]:bg-white [&_.recharts-default-tooltip]:border-slate-200 [&_.recharts-dependency-grid]:stroke-slate-200 [&_.recharts-legend-item]:text-slate-700 [&_.recharts-polar-grid-concentric-path]:stroke-slate-200 [&_.recharts-polar-grid-angle-line]:stroke-slate-200 [&_.recharts-radial-bar-background-sector]:fill-slate-100 [&_.recharts-sector.recharts-active-sector]:fill-slate-900 [&_.recharts-sector]:fill-slate-100 [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([_, config]) => config.color
  );

  if (colorConfig.length === 0) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
[data-chart=${id}] {
${colorConfig
  .map(([key, config]) => `  --color-${key}: ${config.color};`)
  .join("\n")}
}
`,
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    React.ComponentProps<typeof RechartsPrimitive.Tooltip> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: "line" | "dot" | "dashed";
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      className,
      active,
      payload,
      label,
      hideLabel = false,
      hideIndicator = false,
      indicator = "dot",
      nameKey,
      labelKey,
      ...props
    },
    ref
  ) => {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const [item] = payload;
      const key = `${labelKey || item.dataKey || item.name || "value"}`;
      const itemConfig = config[key];
      const value =
        config[label as keyof typeof config]?.label ||
        itemConfig?.label ||
        label;

      return <div className="font-semibold text-slate-800">{value}</div>;
    }, [label, labelKey, hideLabel, payload, config]);

    if (!active || !payload?.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-xs",
          className
        )}
      >
        {tooltipLabel}
        <div className="grid gap-1.5">
          {payload.map((item) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`;
            const itemConfig = config[key];
            const indicatorColor = item.color || item.payload.fill;

            return (
              <div
                key={String(item.dataKey)}
                className={cn(
                  "flex w-full items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-slate-500",
                  indicator === "dot" && "items-center"
                )}
              >
                {itemConfig?.icon ? (
                  <itemConfig.icon />
                ) : (
                  !hideIndicator && (
                    <div
                      className={cn(
                        "shrink-0 rounded-[2px] border-[inherit]",
                        indicator === "dot" && "h-2 w-2 rounded-full",
                        indicator === "line" && "w-1",
                        indicator === "dashed" &&
                          "w-0 border-r border-dashed bg-transparent"
                      )}
                      style={
                        {
                          backgroundColor: indicatorColor,
                          borderColor: indicatorColor,
                        } as React.CSSProperties
                      }
                    />
                  )
                )}
                <div className="flex flex-1 justify-between leading-none items-center gap-1.5">
                  <span className="text-slate-500">
                    {itemConfig?.label || item.name}
                  </span>
                  {item.value !== undefined && (
                    <span className="font-mono font-bold text-slate-900">
                      {item.value}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = "ChartTooltipContent";

export { ChartContainer, ChartTooltip, ChartTooltipContent };
