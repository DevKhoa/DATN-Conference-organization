import { useNavigate } from "@tanstack/react-router";
import { Loader2, Trophy, Zap, Target } from "lucide-react";
import type { Database } from "@/types/database.types";

type AwardLeaderboardRow =
  Database["public"]["Views"]["award_leaderboard_view"]["Row"];

interface AwardLeaderboardItem {
  awardName: string;
  rows: AwardLeaderboardRow[];
}

interface ConferenceAwardsLeaderboardProps {
  leaderboard: AwardLeaderboardItem[];
  isLoading: boolean;
}

const getMedalColor = (position: number) => {
  switch (position) {
    case 0:
      return {
        bg: "bg-yellow-50",
        border: "border-yellow-300",
        badge: "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white",
        text: "text-yellow-800",
      };
    case 1:
      return {
        bg: "bg-slate-100",
        border: "border-slate-400",
        badge: "bg-gradient-to-br from-slate-400 to-slate-600 text-white",
        text: "text-slate-800",
      };
    case 2:
      return {
        bg: "bg-orange-50",
        border: "border-orange-300",
        badge: "bg-gradient-to-br from-orange-400 to-orange-600 text-white",
        text: "text-orange-800",
      };
    default:
      return {
        bg: "bg-muted/30",
        border: "border-border",
        badge: "bg-primary/20 text-primary",
        text: "text-foreground",
      };
  }
};

const getMedalSymbol = (position: number) => {
  switch (position) {
    case 0:
      return "🥇";
    case 1:
      return "🥈";
    case 2:
      return "🥉";
    default:
      return `#${position + 1}`;
  }
};

const getScorePercentage = (score: number | null) => {
  if (!score) return 0;
  return Math.min(Math.max((score / 100) * 100, 0), 100);
};

export const ConferenceAwardsLeaderboard = ({
  leaderboard,
  isLoading,
}: ConferenceAwardsLeaderboardProps) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-2">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Award Leaderboard
          </h3>
        </div>
        <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ranking papers...
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-muted p-2">
            <Trophy className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Award Leaderboard
          </h3>
        </div>
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Leaderboard coming soon!</p>
          <p className="text-xs mt-1">
            Grading begins when marks are submitted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-card/80 p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 p-2 shadow-lg">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground">
            Award Leaderboard
          </h3>
          <p className="text-xs text-muted-foreground">
            Top 5 papers by average score
          </p>
        </div>
        <Zap className="h-5 w-5 text-yellow-500 animate-pulse" />
      </div>

      {/* Leaderboard */}
      <div className="space-y-4">
        {leaderboard.map(({ awardName, rows }) => (
          <div
            key={awardName}
            className="overflow-hidden rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm"
          >
            {/* Award Name Header */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/30">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                ✨ {awardName}
              </p>
            </div>

            {/* Rankings */}
            <div className="divide-y divide-border/30">
              {rows.map((item, index) => {
                const colors = getMedalColor(index);
                const scorePercentage = getScorePercentage(item.average_score);
                const medalSymbol = getMedalSymbol(index);

                return (
                  <button
                    key={`${item.award_id}-${item.paper_id}-${index}`}
                    type="button"
                    onClick={() =>
                      item.paper_id &&
                      navigate({
                        to: "/papers/$paperId",
                        params: { paperId: String(item.paper_id) },
                      })
                    }
                    className={`w-full px-4 py-3 text-left transition-all duration-200 hover:bg-primary/5 active:scale-98 ${colors.bg}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Medal/Position */}
                      <div
                        className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg font-bold text-sm ${colors.badge}`}
                      >
                        {medalSymbol}
                      </div>

                      {/* Paper Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {item.paper_title || "Untitled Paper"}
                          </p>
                        </div>
                        <p className="truncate text-xs text-muted-foreground mb-2">
                          by {item.author_name || "Unknown Author"}
                        </p>

                        {/* Score Bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${
                                index === 0
                                  ? "from-yellow-400 to-yellow-600"
                                  : index === 1
                                    ? "from-slate-400 to-slate-600"
                                    : index === 2
                                      ? "from-orange-400 to-orange-600"
                                      : "from-primary to-primary/60"
                              } rounded-full transition-all duration-500`}
                              style={{ width: `${scorePercentage}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-xs font-bold tabular-nums text-foreground">
                            {(item.average_score ?? 0).toFixed(1)}
                          </span>
                        </div>

                        {/* Meta */}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {item.total_graders || 0}{" "}
                          {item.total_graders === 1 ? "grader" : "graders"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
