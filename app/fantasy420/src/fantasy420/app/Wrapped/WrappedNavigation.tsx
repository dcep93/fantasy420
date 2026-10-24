import "./WrappedNavigation.css";

export const wrappedCategories = [
  { name: "CashMoney", tabs: ["ManagerPlot", "FantasyCalc", "PlayoffMachine", "StrengthOfSeason", "SpiciestMatchups"] },
  { name: "Dunked", tabs: ["WeekTopsAndBottoms", "SqueezesAndStomps", "Benchwarmers", "HeadToHead", "SecondLost"] },
  { name: "DoneDirty", tabs: ["Injuries", "GooseEggs", "Bopped", "ChosenWrong", "DeterminedByDiscreteScoring", "WhatIf"] },
  { name: "Positions", tabs: ["BestByPosition", "UniquesStarted", "UniquesRostered", "PositionTrends"] },
  { name: "Archive", tabs: ["PlayerStats", "DraftBoard", "ReachesAndSteals", "Performance", "PerformanceTotals", "Trades"] },
  { name: "Nerd", tabs: ["PlayerPlot", "AllTimeRecords", "DraftValue", "PointsAgainst"] },
  { name: "SuperNerd", tabs: ["Negatives", "BoomBust", "ExtremeStuds", "ConsistentlyAverage"] },
  { name: "Zodiac", tabs: ["Stacks", "OwnedTeams", "Simps"] },
  { name: "Beta", tabs: ["ProbabilityMachine", "Scoreboard", "ManagerTrend", "NFLTeams", "json"] },
] as const;

export default function WrappedNavigation({ activeTab, labels }: {
  activeTab: string;
  labels: Record<string, string>;
}) {
  return (
    <nav className="wrapped-navigation" aria-label="Wrapped views">
      {wrappedCategories.map(category => (
        <div className="wrapped-navigation-row" key={category.name}>
          <span className="wrapped-navigation-category" id={`wrapped-category-${category.name}`}>{category.name}</span>
          <div className="wrapped-navigation-links" role="group" aria-labelledby={`wrapped-category-${category.name}`}>
            {category.tabs.map(tab => (
              <a key={tab} href={`#${tab}`} aria-current={tab === activeTab ? "page" : undefined}>
                {labels[tab] ?? tab}
              </a>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
