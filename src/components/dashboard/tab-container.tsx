"use client";

import { useState, useEffect, ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footprints, Lightbulb, Bot, Trophy, Heart } from "lucide-react";

interface TabContainerProps {
  activityContent: ReactNode;
  insightsContent: ReactNode;
  coachContent: ReactNode;
  gamificationContent: ReactNode;
  healthContent?: ReactNode;
}

const STORAGE_KEY = "wt-tab-state";

export function TabContainer({
  activityContent,
  insightsContent,
  coachContent,
  gamificationContent,
  healthContent
}: TabContainerProps) {
  const [activeTab, setActiveTab] = useState("activity");

  // Load saved tab state
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setActiveTab(saved);
  }, []);

  // Save tab state
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-5 mb-4">
        <TabsTrigger value="activity" className="flex items-center gap-2">
          <Footprints className="h-4 w-4" />
          <span className="hidden sm:inline">Activity</span>
        </TabsTrigger>
        <TabsTrigger value="health" className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          <span className="hidden sm:inline">Health</span>
        </TabsTrigger>
        <TabsTrigger value="insights" className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          <span className="hidden sm:inline">Insights</span>
        </TabsTrigger>
        <TabsTrigger value="coach" className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          <span className="hidden sm:inline">AI Coach</span>
        </TabsTrigger>
        <TabsTrigger value="gamification" className="flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          <span className="hidden sm:inline">Progress</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="activity" className="mt-0">
        {activityContent}
      </TabsContent>

      <TabsContent value="health" className="mt-0">
        {healthContent}
      </TabsContent>

      <TabsContent value="insights" className="mt-0">
        {insightsContent}
      </TabsContent>

      <TabsContent value="coach" className="mt-0">
        {coachContent}
      </TabsContent>

      <TabsContent value="gamification" className="mt-0">
        {gamificationContent}
      </TabsContent>
    </Tabs>
  );
}
