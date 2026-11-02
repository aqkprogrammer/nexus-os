import { AgentTeam, AutomationCard, IdeaVault, MemoryTimeline, PrivacyVault } from "@/components/dashboard/cards-bottom";
import { ActionCenter, AnalyticsOverview, GoalRadar, MorningBrief } from "@/components/dashboard/cards-top";
import { Companion } from "@/components/dashboard/Companion";
import { DailyInsight } from "@/components/dashboard/DailyInsight";
import { Hero } from "@/components/dashboard/Hero";

export default function Dashboard() {
  return (
    <div className="rounded-3xl border border-line/50 px-3 pt-2 pb-3">
      <div className="dash">
        <div className="dash-center">
          <Hero />
          <div className="dash-row1">
            <MorningBrief />
            <ActionCenter />
            <AnalyticsOverview />
            <GoalRadar />
          </div>
          <div className="dash-row2">
            <MemoryTimeline />
            <AgentTeam />
            <IdeaVault />
          </div>
          <div className="dash-row3">
            <PrivacyVault />
            <AutomationCard />
          </div>
        </div>
        <div className="dash-right">
          <div className="dash-right-inner">
            <Companion />
            <DailyInsight />
          </div>
        </div>
      </div>
    </div>
  );
}
